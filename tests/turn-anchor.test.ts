import test from "node:test";
import assert from "node:assert/strict";

import { anchorScrollTop, computeReserve, distanceToContentEnd, shouldAnchor } from "../src/lib/chat/turn-anchor.ts";
import { selectLatestExchange } from "../src/lib/chat/latest-exchange.ts";

test("the anchor lands just below the top of the scroller", () => {
  // Scroller at y=100, scrolled 300px; question rect at y=700 → content offset 900.
  assert.equal(anchorScrollTop(700, 100, 300, 16), 884);
  assert.equal(anchorScrollTop(90, 100, 0, 16), 0, "never negative");
});

test("the reserve makes room for a short answer and is a fixed point", () => {
  const target = 884;
  const clientHeight = 500;
  const first = computeReserve({ targetScrollTop: target, clientHeight, scrollHeight: 1100, currentReserve: 0 });
  assert.equal(first, 284);
  const again = computeReserve({ targetScrollTop: target, clientHeight, scrollHeight: 1100 + first, currentReserve: first });
  assert.equal(again, first, "recomputing with the spacer applied gives the same height");
});

test("the reserve shrinks as the answer grows and reaches zero", () => {
  const base = { targetScrollTop: 884, clientHeight: 500, currentReserve: 0 };
  const short = computeReserve({ ...base, scrollHeight: 1100 });
  const longer = computeReserve({ ...base, scrollHeight: 1300 });
  const full = computeReserve({ ...base, scrollHeight: 1500 });
  assert.ok(longer < short);
  assert.equal(full, 0);
});

test("anchors once per new question", () => {
  assert.equal(shouldAnchor(null, "q1"), true);
  assert.equal(shouldAnchor("q1", "q1"), false);
  assert.equal(shouldAnchor("q1", "q2"), true);
  assert.equal(shouldAnchor("q1", null), false);
});

test("distance to the real end ignores the spacer", () => {
  assert.equal(distanceToContentEnd({ scrollTop: 884, clientHeight: 500, scrollHeight: 1384, reserve: 284 }), -284);
  assert.equal(distanceToContentEnd({ scrollTop: 0, clientHeight: 500, scrollHeight: 2000, reserve: 0 }), 1500);
});

test("latest exchange picks the last question and the answer after it", () => {
  const welcome = { id: "w", role: "assistant" as const, content: "hi" };
  assert.equal(selectLatestExchange([welcome]), null);
  const q1 = { id: "q1", role: "user" as const, content: "one" };
  const a1 = { id: "a1", role: "assistant" as const, content: "first" };
  const q2 = { id: "q2", role: "user" as const, content: "two" };
  assert.deepEqual(selectLatestExchange([welcome, q1, a1, q2]), { question: q2, answer: null });
  assert.deepEqual(selectLatestExchange([welcome, q1, a1]), { question: q1, answer: a1 });
});
