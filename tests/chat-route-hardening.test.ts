import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";

import { createChatEventParser, type ChatStreamEvent } from "../src/lib/chat-contract.ts";

type UpstreamBody = { stream?: boolean; max_tokens?: number; messages: Array<{ role: string; content: string }> };

type Reply =
  | { kind: "text"; text: string; finish?: boolean }
  | { kind: "tool"; name: string; args: unknown; narration?: string }
  | { kind: "stall" };

/** Fake OpenAI-style upstream. `handler` sees each request body and picks a reply. */
function startUpstream(handler: (body: UpstreamBody) => Reply) {
  return new Promise<{ server: Server; url: string; bodies: UpstreamBody[] }>((resolve) => {
    const bodies: UpstreamBody[] = [];
    const server = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        bodies.push(body);
        const reply = handler(body);
        const frame = (delta: object, finish_reason?: string) =>
          res.write(`data: ${JSON.stringify({ choices: [{ delta, finish_reason }] })}\n\n`);

        if (reply.kind === "stall") {
          // Headers are sent, then the body never completes.
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          res.write(": open\n\n");
          return;
        }

        const isSuggestions = body.stream !== true;
        if (isSuggestions) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ choices: [{ message: { content: '["How did you build it?"]' } }] }));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/event-stream" });
        if (reply.kind === "tool") {
          if (reply.narration) frame({ content: reply.narration });
          frame({ tool_calls: [{ index: 0, id: "call_1", function: { name: reply.name, arguments: JSON.stringify(reply.args) } }] });
          frame({}, "tool_calls");
        } else {
          frame({ content: reply.text });
          if (reply.finish !== false) {
            frame({}, "stop");
            res.write("data: [DONE]\n\n");
          }
        }
        res.end();
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}/v1/chat/completions`, bodies });
    });
  });
}

async function drain(response: Response): Promise<ChatStreamEvent[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const parser = createChatEventParser();
  const events: ChatStreamEvent[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true })).forEach((event) => events.push(event));
  }
  parser.flush().forEach((event) => events.push(event));
  return events;
}

let ipCounter = 0;
async function post(body: unknown, extraHeaders: Record<string, string> = {}) {
  const { POST } = await import("../src/app/api/chat/route.ts");
  ipCounter += 1;
  return POST(
    new Request("https://example.test/live-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": `10.9.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`, ...extraHeaders },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

function configure(url: string) {
  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = url;
}

test("a body over the size cap is refused with 413 before parsing", async () => {
  const response = await post({ message: "hi", conversationHistory: [], pad: "x".repeat(70_000) });
  assert.equal(response.status, 413);
});

test("a declared Content-Length over the cap is refused with 413", async () => {
  const response = await post({ message: "hi" }, { "content-length": "999999" });
  assert.equal(response.status, 413);
});

test("an over-long stored history item is truncated, not rejected", async (t) => {
  const { server, url, bodies } = await startUpstream(() => ({ kind: "text", text: "ok." }));
  t.after(() => server.close());
  configure(url);

  const response = await post({
    message: "Tell me about the platform",
    conversationHistory: [
      { sender: "user", content: "earlier question" },
      { sender: "ai", content: "a".repeat(9_000) },
    ],
  });
  assert.equal(response.status, 200);
  await drain(response);

  const history = bodies[0].messages.find((m) => m.role === "assistant");
  assert.equal(history?.content.length, 4_000);
});

test("an over-long current message is still rejected with 400", async () => {
  const response = await post({ message: "m".repeat(1_300), conversationHistory: [] });
  assert.equal(response.status, 400);
});

test("the streamed answer request carries a max_tokens cap", async (t) => {
  const { server, url, bodies } = await startUpstream(() => ({ kind: "text", text: "capped." }));
  t.after(() => server.close());
  configure(url);

  await drain(await post({ message: "hello there", conversationHistory: [] }));
  const streamed = bodies.find((body) => body.stream === true);
  assert.equal(streamed?.max_tokens, 1200);
});

test("an upstream stream that closes without a finish marker ends with a retryable error then done", async (t) => {
  const { server, url } = await startUpstream(() => ({ kind: "text", text: "half an ans", finish: false }));
  t.after(() => server.close());
  configure(url);

  const events = await drain(await post({ message: "hello there", conversationHistory: [] }));
  const error = events.find((event) => event.type === "error");
  assert.ok(error && error.type === "error" && error.retryable, "expected a retryable error event");
  assert.equal(events.some((event) => event.type === "trace"), true);
  assert.equal(events[events.length - 1]?.type, "done");
});

test("narration streamed before a tool call is cleared before the answer", async (t) => {
  const { server, url } = await startUpstream((body) =>
    JSON.stringify(body.messages).includes('"role":"tool"')
      ? { kind: "text", text: "The answer." }
      : { kind: "tool", name: "get_metric", args: { name: "cohen kappa" }, narration: "Let me check..." }
  );
  t.after(() => server.close());
  configure(url);

  const events = await drain(await post({ message: "what is the kappa", conversationHistory: [] }));
  let text = "";
  for (const event of events) {
    if (event.type === "text_delta") text += event.text;
    if (event.type === "text_replace") text = event.text;
  }
  assert.ok(text.startsWith("The answer."), `answer must not be preceded by narration, got: ${text.slice(0, 60)}`);
  assert.ok(!text.includes("Let me check"));
});

test("a stalled suggestions body after the trace ends with done and no error", async (t) => {
  // Suggestions are the only non-stream request; make that one hang after headers.
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      if (body.stream === true) {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "Fine answer." }, finish_reason: "stop" }] })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        res.writeHead(200, { "Content-Type": "application/json", "Content-Length": "1000" });
        res.write('{"choices"'); // body never completes
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.closeAllConnections?.() ?? server.close());
  const address = server.address();
  configure(`http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/v1/chat/completions`);

  const events = await drain(await post({ message: "hello there", conversationHistory: [] }));
  const types = events.map((event) => event.type);
  assert.ok(types.includes("trace"));
  assert.ok(!types.includes("error"), "no error event may follow a delivered answer");
  assert.equal(types[types.length - 1], "done");
});
