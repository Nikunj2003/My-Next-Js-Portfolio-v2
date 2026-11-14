import test from "node:test";
import assert from "node:assert/strict";

import { initialBubbleState, reduceBubble, type BubbleAction, type BubbleState } from "../src/lib/guide/bubble-policy.ts";

const visible: BubbleState = { ...initialBubbleState, companionVisible: true };
const run = (actions: BubbleAction[], start = visible) => actions.reduce(reduceBubble, start);

test("a tip shows when nothing else is open", () => {
  const state = run([{ type: "tip/offer", section: "work", text: "hi", now: 1_000 }]);
  assert.equal(state.bubble, "tip");
  assert.equal(state.tip?.section, "work");
});

test("tips never show while the ask bubble, tour or panel is open", () => {
  for (const opener of ["ask/open", "tour/open", "panel/open"] as const) {
    const state = run([{ type: opener }, { type: "tip/offer", section: "work", text: "hi", now: 1_000 }]);
    assert.notEqual(state.bubble, "tip", opener);
    assert.equal(state.tip, null, opener);
  }
});

test("opening ask or tour replaces a showing tip", () => {
  const tip = run([{ type: "tip/offer", section: "work", text: "hi", now: 1_000 }]);
  assert.equal(reduceBubble(tip, { type: "ask/open" }).bubble, "ask");
  assert.equal(reduceBubble(tip, { type: "ask/open" }).tip, null);
  assert.equal(reduceBubble(tip, { type: "tour/open" }).bubble, "tour");
});

test("hiding the companion takes its tip with it", () => {
  const tip = run([{ type: "tip/offer", section: "work", text: "hi", now: 1_000 }]);
  const hidden = reduceBubble(tip, { type: "companion/visible", visible: false });
  assert.equal(hidden.bubble, "none");
  assert.equal(hidden.tip, null);
  assert.equal(reduceBubble(initialBubbleState, { type: "tip/offer", section: "work", text: "hi", now: 1 }).bubble, "none");
});

test("tip budget: one per section, a cooldown, and a cap", () => {
  let state = run([{ type: "tip/offer", section: "work", text: "a", now: 1_000 }, { type: "tip/expire" }]);
  assert.equal(reduceBubble(state, { type: "tip/offer", section: "work", text: "a", now: 100_000 }).bubble, "none");
  assert.equal(reduceBubble(state, { type: "tip/offer", section: "skills", text: "b", now: 5_000 }).bubble, "none");
  state = run([{ type: "tip/offer", section: "skills", text: "b", now: 30_000 }, { type: "tip/expire" }, { type: "tip/offer", section: "contact", text: "c", now: 60_000 }, { type: "tip/expire" }], state);
  assert.equal(state.tipBudget.shown.length, 3);
  assert.equal(reduceBubble(state, { type: "tip/offer", section: "about", text: "d", now: 200_000 }).bubble, "none");
});

test("dismissing mutes: once for the session, twice or 'never' for good", () => {
  const once = run([{ type: "tip/offer", section: "work", text: "a", now: 1_000 }, { type: "tip/dismiss", forever: false }]);
  assert.equal(once.tipBudget.muted, false);
  assert.equal(reduceBubble(once, { type: "tip/offer", section: "skills", text: "b", now: 60_000 }).bubble, "none");
  const forever = run([{ type: "tip/offer", section: "work", text: "a", now: 1_000 }, { type: "tip/dismiss", forever: true }]);
  assert.equal(forever.tipBudget.muted, true);
});

test("escape closes the bubble first, then the panel", () => {
  const both = run([{ type: "panel/open" }, { type: "tour/open" }]);
  const first = reduceBubble(both, { type: "escape" });
  assert.equal(first.bubble, "none");
  assert.equal(first.panelOpen, true);
  assert.equal(reduceBubble(first, { type: "escape" }).panelOpen, false);
});

test("the ask bubble does not open beside the full panel", () => {
  const panel = run([{ type: "panel/open" }]);
  assert.equal(reduceBubble(panel, { type: "ask/open" }).bubble, "none");
});
