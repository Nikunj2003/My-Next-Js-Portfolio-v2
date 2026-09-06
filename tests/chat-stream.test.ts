import test from "node:test";
import assert from "node:assert/strict";

import { createChatEventParser, type ChatStreamEvent } from "../src/lib/chat-contract.ts";

const line = (event: ChatStreamEvent) => `${JSON.stringify(event)}\n`;

test("parses whole events from a single chunk", () => {
  const parser = createChatEventParser();
  const events = parser.push(line({ type: "text_delta", text: "hi" }) + line({ type: "done" }));

  assert.equal(events.length, 2);
  assert.equal(events[0].type, "text_delta");
  assert.equal(events[1].type, "done");
});

test("buffers a partial line until its newline arrives", () => {
  const parser = createChatEventParser();
  const full = line({ type: "text_delta", text: "streamed" });
  const split = Math.floor(full.length / 2);

  // This is the real-world case: TCP chunks do not respect line boundaries.
  assert.deepEqual(parser.push(full.slice(0, split)), []);

  const events = parser.push(full.slice(split));
  assert.equal(events.length, 1);
  assert.equal((events[0] as { text: string }).text, "streamed");
});

test("reassembles an event split across three chunks", () => {
  const parser = createChatEventParser();
  const full = line({ type: "text_delta", text: "abc" });

  const collected = [
    ...parser.push(full.slice(0, 5)),
    ...parser.push(full.slice(5, 12)),
    ...parser.push(full.slice(12)),
  ];

  assert.equal(collected.length, 1);
  assert.equal((collected[0] as { text: string }).text, "abc");
});

test("keeps text deltas in order so the answer reads correctly", () => {
  const parser = createChatEventParser();
  const payload = ["The ", "answer ", "streams."].map((text) => line({ type: "text_delta", text })).join("");

  const text = parser
    .push(payload)
    .filter((event): event is { type: "text_delta"; text: string } => event.type === "text_delta")
    .map((event) => event.text)
    .join("");

  assert.equal(text, "The answer streams.");
});

test("a malformed line does not kill the stream", () => {
  const parser = createChatEventParser();
  const events = parser.push(`{ not json at all\n${line({ type: "done" })}`);

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "done");
});

test("ignores blank lines", () => {
  const parser = createChatEventParser();
  assert.deepEqual(parser.push("\n\n   \n"), []);
});

test("flush emits a trailing event that never got its newline", () => {
  const parser = createChatEventParser();
  const withoutNewline = JSON.stringify({ type: "done" } satisfies ChatStreamEvent);

  assert.deepEqual(parser.push(withoutNewline), []);
  const flushed = parser.flush();

  assert.equal(flushed.length, 1);
  assert.equal(flushed[0].type, "done");
});

test("flush is empty when the buffer holds nothing usable", () => {
  const parser = createChatEventParser();
  parser.push(line({ type: "done" }));
  assert.deepEqual(parser.flush(), []);

  const partial = createChatEventParser();
  partial.push("{ incomplete");
  assert.deepEqual(partial.flush(), []);
});

test("carries tool call and trace events through intact", () => {
  const parser = createChatEventParser();
  const events = parser.push(
    line({
      type: "tool_result",
      call: { id: "a", name: "get_metric", label: 'get_metric("kappa")', status: "done", summary: "≥ 0.7", durationMs: 1 },
    }) +
      line({
        type: "trace",
        trace: { rounds: 2, toolCount: 1, elapsedMs: 1400, sources: ["LLM Evaluation Platform"], refusals: [], model: "test" },
      })
  );

  assert.equal(events.length, 2);

  const toolResult = events[0];
  assert.equal(toolResult.type, "tool_result");
  if (toolResult.type !== "tool_result") return;
  assert.equal(toolResult.call.name, "get_metric");
  assert.equal(toolResult.call.summary, "≥ 0.7");

  const trace = events[1];
  assert.equal(trace.type, "trace");
  if (trace.type !== "trace") return;
  assert.equal(trace.trace.rounds, 2);
  assert.deepEqual(trace.trace.sources, ["LLM Evaluation Platform"]);
});
