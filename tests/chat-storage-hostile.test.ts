import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeStoredMessages } from "../src/lib/chat/nex-chat-store.ts";

/** Stored history is whatever is in localStorage: treat it as hostile. */
const turn = (assistant: Record<string, unknown>) => [
  { id: "u1", role: "user", content: "hi" },
  { id: "a1", role: "assistant", content: "hello", ...assistant },
];
const answer = (assistant: Record<string, unknown>) => sanitizeStoredMessages(turn(assistant)).find((m) => m.id === "a1")!;

test("a trace missing its arrays is completed, not trusted (it used to crash the panel on every load)", () => {
  const trace = answer({ trace: {} }).trace!;
  assert.deepEqual(trace.sources, []);
  assert.deepEqual(trace.refusals, []);
  assert.equal(trace.rounds, 0);
  const odd = answer({ trace: { sources: "nope", refusals: [1, "x"], elapsedMs: "5" } }).trace!;
  assert.deepEqual(odd.sources, []);
  assert.deepEqual(odd.refusals, ["x"]);
  assert.equal(odd.elapsedMs, 0);
});

test("stored tool-call links can't leave the site", () => {
  const calls = answer({
    toolCalls: [
      { id: "1", label: "a", href: "//evil.example" },
      { id: "2", label: "b", href: "javascript:alert(1)" },
      { id: "3", label: "c", href: "https://evil.example" },
      { id: "4", label: "d", href: "/work/llm-evaluation-platform", highlight: "project:llm-evaluation-platform" },
      { id: "5", label: "e", href: "#contact", highlight: "x\"] , body" },
      { label: "no id" },
    ],
  }).toolCalls!;
  assert.deepEqual(
    calls.map((call) => [call.id, call.href ?? null, call.highlight ?? null, call.status]),
    [
      ["1", null, null, "done"],
      ["2", null, null, "done"],
      ["3", null, null, "done"],
      ["4", "/work/llm-evaluation-platform", "project:llm-evaluation-platform", "done"],
      ["5", "#contact", null, "done"],
    ]
  );
});

test("oversized and non-string fields are cut or dropped", () => {
  const message = answer({ content: "x".repeat(50_000), suggestions: ["a", 2, "b"] });
  assert.equal(message.content.length, 20_000);
  assert.deepEqual(message.suggestions, ["a", "b"]);
  assert.equal(message.streaming, false);
});

test("non-arrays and junk entries fall back to the welcome message", () => {
  for (const value of [null, {}, "x", 5]) assert.equal(sanitizeStoredMessages(value).length, 1);
  assert.equal(sanitizeStoredMessages([null, 1, { id: 2 }]).length, 1);
});
