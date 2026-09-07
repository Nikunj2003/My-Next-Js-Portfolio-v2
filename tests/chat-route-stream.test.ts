import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";

import { createChatEventParser, type ChatStreamEvent } from "../src/lib/chat-contract.ts";

/**
 * Route-level tests for the chat stream's LIFECYCLE.
 *
 * `chat-stream.test.ts` covers the NDJSON parser, which is a pure string
 * function. That is exactly why it could stay green while the route shipped a
 * `finish()` that recursed into itself instead of calling `controller.close()`:
 * the stream was well-formed and never ended. Every event parsed correctly and
 * the connection hung forever, so the client's abort timer fired on every
 * single message.
 *
 * The lesson encoded here: a stream is only correct if it also TERMINATES.
 * These tests read to completion with a deadline, so a non-closing stream fails
 * instead of passing.
 */

/**
 * Minimal OpenAI-compatible SSE upstream so no network or API key is involved.
 *
 * The route always requests `stream: true`, so the fixture speaks SSE rather
 * than returning a single JSON body — otherwise it exercises a shape the real
 * upstream never sends.
 */
function startFakeUpstream(handler: (body: Record<string, unknown>) => unknown) {
  return new Promise<{ server: Server; url: string }>((resolve) => {
    const server = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          // An unparsable body is the upstream's problem, not the test's.
        }

        const result = handler(parsed) as { status?: number; content?: string; toolCall?: { name: string; args: unknown } };

        if ((result?.status ?? 200) >= 400) {
          res.writeHead(result.status!, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "fake upstream failure" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });

        const frame = (delta: Record<string, unknown>) =>
          res.write(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`);

        if (result?.toolCall) {
          frame({
            tool_calls: [
              { index: 0, id: "call_test_1", function: { name: result.toolCall.name, arguments: "" } },
            ],
          });
          frame({ tool_calls: [{ index: 0, function: { arguments: JSON.stringify(result.toolCall.args) } }] });
        } else {
          // Split into a couple of chunks so the test exercises real streaming
          // rather than one giant frame.
          const text = result?.content ?? "";
          const mid = Math.ceil(text.length / 2);
          if (text.slice(0, mid)) frame({ content: text.slice(0, mid) });
          if (text.slice(mid)) frame({ content: text.slice(mid) });
        }

        res.write("data: [DONE]\n\n");
        res.end();
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}/v1/chat/completions` });
    });
  });
}

function completion(content: string) {
  return { content };
}

/**
 * Reads the whole NDJSON body with a hard deadline.
 *
 * The deadline is the assertion. Before the fix this rejects, because the
 * response body never closes.
 */
async function drain(response: Response, timeoutMs = 8_000): Promise<ChatStreamEvent[]> {
  const reader = response.body?.getReader();
  assert.ok(reader, "expected a readable response body");

  const decoder = new TextDecoder();
  const parser = createChatEventParser();
  const events: ChatStreamEvent[] = [];

  const deadline = new Promise<never>((_, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`stream did not close within ${timeoutMs}ms — controller.close() never ran`)),
      timeoutMs
    );
    // Node keeps the process alive for a pending timer; this one must not.
    if (typeof timer.unref === "function") timer.unref();
  });

  const read = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true })).forEach((event) => events.push(event));
    }
    parser.flush().forEach((event) => events.push(event));
    return events;
  })();

  return Promise.race([read, deadline]);
}

async function post(message = "Tell me about the evaluation platform") {
  const { POST } = await import("../src/app/api/chat/route.ts");
  return POST(
    new Request("https://example.test/live-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250) + 1}` },
      body: JSON.stringify({ message, conversationHistory: [] }),
    })
  );
}

test("the response stream closes on its own", async (t) => {
  const { server, url } = await startFakeUpstream(() => completion("A short grounded answer."));
  t.after(() => server.close());

  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = url;

  const response = await post();
  assert.equal(response.status, 200);

  // Fails with a timeout if the stream is never closed.
  const events = await drain(response);
  assert.ok(events.length > 0, "expected at least one event");
});

test("done is the final event and is emitted exactly once", async (t) => {
  const { server, url } = await startFakeUpstream(() => completion("Another answer."));
  t.after(() => server.close());

  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = url;

  const events = await drain(await post());
  const doneCount = events.filter((event) => event.type === "done").length;

  assert.equal(doneCount, 1, "done must be emitted exactly once");
  assert.equal(events[events.length - 1]?.type, "done", "done must be the last event");
});

test("the answer text survives the stream intact", async (t) => {
  const answer = "The evaluation platform scores AI surfaces against golden datasets.";
  const { server, url } = await startFakeUpstream(() => completion(answer));
  t.after(() => server.close());

  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = url;

  const events = await drain(await post());
  const text = events
    .filter((event): event is Extract<ChatStreamEvent, { type: "text_delta" }> => event.type === "text_delta")
    .map((event) => event.text)
    .join("");

  assert.ok(text.includes(answer), `expected the answer in the deltas, got: ${text.slice(0, 120)}`);
});

test("an upstream failure still closes the stream", async (t) => {
  const { server, url } = await startFakeUpstream(() => ({ status: 500 }));
  t.after(() => server.close());

  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = url;

  // A hung stream on the error path is the worse bug: the client shows a
  // spinner until its own timeout rather than the actual failure.
  const events = await drain(await post());

  assert.ok(
    events.some((event) => event.type === "error"),
    "expected an error event"
  );
  assert.equal(events[events.length - 1]?.type, "done", "the error path must still terminate the stream");
});

test("a missing API key fails fast without opening a stream", async () => {
  const previous = process.env.LLM_API_KEY;
  delete process.env.LLM_API_KEY;

  const response = await post();
  assert.equal(response.status, 503);

  if (previous !== undefined) process.env.LLM_API_KEY = previous;
});

test("finish() closes the controller rather than calling itself", () => {
  // A guard against the precise typo that caused this: `finish()` recursing
  // into itself is invisible in review and silently no-ops behind the `closed`
  // flag, so it is worth asserting structurally as well as behaviourally.
  const source = readFileSync("src/app/api/chat/route.ts", "utf8");
  const body = source.slice(source.indexOf("const finish = () =>"));
  const finishBody = body.slice(0, body.indexOf("};") + 2);

  assert.match(finishBody, /controller\.close\(\)/, "finish() must close the stream controller");
  assert.doesNotMatch(finishBody, /\bfinish\(\)/, "finish() must not call itself");
});

test("a tool call reassembled from streamed deltas still executes", async (t) => {
  // The provider streams `tool_calls` fragmented across multiple deltas and
  // keyed by `index`. Round 0 depends on that reassembly working, since every
  // round now streams — including the round offered `tools`.
  //
  // Deliberately captures request bodies rather than asserting INSIDE the
  // HTTP handler: an assertion thrown from within the server callback does
  // not fail the test in a controlled way, it just breaks the response
  // mid-stream, which produced a confusing, order-dependent failure. Asserting
  // after `drain()` completes is both simpler and correct.
  const receivedBodies: Record<string, unknown>[] = [];
  const { server, url } = await startFakeUpstream((body) => {
    receivedBodies.push(body);
    // Keyed on whether the request already carries a tool result, not on call
    // count — a stalled attempt legitimately retries the SAME round, which
    // must not be mistaken for the next round.
    const hasToolResult = JSON.stringify(body.messages).includes('"role":"tool"');
    if (!hasToolResult) {
      return { toolCall: { name: "get_metric", args: { name: "MCP servers" } } };
    }
    return { content: "He delivered 10+ production MCP servers." };
  });
  t.after(() => server.close());

  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = url;

  const events = await drain(await post("How many MCP servers did he deliver?"));

  assert.ok(events.some((event) => event.type === "tool_call"), "expected a tool_call event");
  assert.ok(events.some((event) => event.type === "tool_result"), "expected a tool_result event");

  const followUpCall = receivedBodies.find((body) => JSON.stringify(body.messages).includes('"role":"tool"'));
  assert.ok(followUpCall, "expected a follow-up round carrying the tool result");
  assert.ok(
    JSON.stringify(followUpCall.messages).includes("call_test_1"),
    "the tool result must reach the follow-up round"
  );

  const text = events
    .filter((event): event is Extract<ChatStreamEvent, { type: "text_delta" }> => event.type === "text_delta")
    .map((event) => event.text)
    .join("");
  assert.match(text, /10\+/, "the follow-up round's answer must reach the client");
});
