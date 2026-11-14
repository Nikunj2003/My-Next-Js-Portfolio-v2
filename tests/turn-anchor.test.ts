import test from "node:test";
import assert from "node:assert/strict";

import { anchorScrollTop, computeReserve, contentHeightAboveSpacer, distanceToContentEnd, reachedAnchor, shouldAnchor } from "../src/lib/chat/turn-anchor.ts";
import { selectLatestExchange } from "../src/lib/chat/latest-exchange.ts";

test("the anchor lands just below the top of the scroller", () => {
  // Scroller at y=100, scrolled 300px; question rect at y=700 → content offset 900.
  assert.equal(anchorScrollTop(700, 100, 300, 16), 884);
  assert.equal(anchorScrollTop(90, 100, 0, 16), 0, "never negative");
});

test("the reserve makes room for a short answer and is a fixed point", () => {
  const target = 884;
  const clientHeight = 500;
  const first = computeReserve({ targetScrollTop: target, clientHeight, contentHeight: 1100 });
  assert.equal(first, 284);
  // Applying the spacer moves the spacer's own offset not at all: content above it is unchanged.
  assert.equal(computeReserve({ targetScrollTop: target, clientHeight, contentHeight: 1100 }), first);
});

test("the reserve shrinks as the answer grows and reaches zero", () => {
  const base = { targetScrollTop: 884, clientHeight: 500 };
  const short = computeReserve({ ...base, contentHeight: 1100 });
  const longer = computeReserve({ ...base, contentHeight: 1300 });
  const full = computeReserve({ ...base, contentHeight: 1500 });
  assert.ok(longer < short);
  assert.equal(full, 0);
});

test("content shorter than the scroller still gets the full reserve (first question on a short mobile sheet)", () => {
  // Welcome + first question: 300px of content in a 600px scroller. scrollHeight is
  // clamped to 600, so "scrollHeight - spacer" would say 600 and under-reserve.
  const scrollerTop = 100;
  const content = contentHeightAboveSpacer({ spacerRectTop: 400, scrollerRectTop: scrollerTop, scrollTop: 0 });
  assert.equal(content, 300);
  // Question sits at y=150 inside the scroller; target = 150 - 16.
  const target = anchorScrollTop(250, scrollerTop, 0, 16);
  assert.equal(target, 134);
  assert.equal(computeReserve({ targetScrollTop: target, clientHeight: 600, contentHeight: content }), 434);
});

test("content height follows the spacer when the scroller is scrolled", () => {
  assert.equal(contentHeightAboveSpacer({ spacerRectTop: 100, scrollerRectTop: 100, scrollTop: 884 }), 884);
  assert.equal(contentHeightAboveSpacer({ spacerRectTop: 0, scrollerRectTop: 100, scrollTop: 0 }), 0, "never negative");
});

test("the anchor counts as reached within a couple of pixels", () => {
  assert.equal(reachedAnchor(884, 884), true);
  assert.equal(reachedAnchor(882, 884), true);
  assert.equal(reachedAnchor(700, 884), false);
});

test("anchors once per new question", () => {
  assert.equal(shouldAnchor(null, "q1"), true);
  assert.equal(shouldAnchor("q1", "q1"), false);
  assert.equal(shouldAnchor("q1", "q2"), true);
  assert.equal(shouldAnchor("q1", null), false);
});

test("distance to the real end ignores the spacer", () => {
  assert.equal(distanceToContentEnd({ scrollTop: 884, clientHeight: 500, contentHeight: 1100 }), -284);
  assert.equal(distanceToContentEnd({ scrollTop: 0, clientHeight: 500, contentHeight: 2000 }), 1500);
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
