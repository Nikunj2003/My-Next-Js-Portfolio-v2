import test from "node:test";
import assert from "node:assert/strict";

import { stateNames, stateAliases } from "@bible-strong/avatar-core";
import * as cues from "../src/lib/guide/expressions.ts";
import { initialGuideModel, reduceGuide, selectGuideView } from "../src/lib/guide/reducer.ts";
import type { GuideEvent, GuideModel } from "../src/lib/guide/types.ts";

const run = (events: GuideEvent[], start: GuideModel = initialGuideModel) =>
  events.reduce((model, event) => reduceGuide(model, event), start);

test("every cue names a state that exists in the avatar catalogue", () => {
  const known = new Set<string>([...stateNames, ...Object.keys(stateAliases)]);
  const all = [
    ...Object.values(cues).filter((value): value is { state: string } => typeof value === "object" && value !== null && "state" in value),
    ...Object.values(cues.TOOL_CUES),
    ...Object.values(cues.SECTION_CUES),
    ...cues.PET_STREAK,
  ];
  for (const cue of all) assert.ok(known.has(cue.state), `unknown avatar state: ${cue.state}`);
});

test("idle by default, listening once the chat opens", () => {
  assert.equal(selectGuideView(initialGuideModel).state, "idle");
  assert.equal(selectGuideView(run([{ type: "chat/open" }])).state, "listening");
});

test("a sent message is happy for a beat, then thinks, then each tool maps to its own expression", () => {
  const sent = run([{ type: "chat/open" }, { type: "chat/send" }]);
  assert.equal(selectGuideView(sent).state, "happy");
  assert.equal(sent.poke?.kind, "nod");
  const thinking = reduceGuide(sent, { type: "tick", now: sent.transient!.until });
  assert.equal(selectGuideView(thinking).state, "thinking");
  assert.equal(selectGuideView(reduceGuide(thinking, { type: "chat/tool_call", name: "search_work" })).state, "searching");
  assert.equal(selectGuideView(reduceGuide(thinking, { type: "chat/tool_call", name: "get_case_study" })).state, "reading");
  assert.equal(selectGuideView(reduceGuide(thinking, { type: "chat/tool_call", name: "unknown_tool" })).state, "working");
});

test("a refused tool looks confused and says why", () => {
  const model = run([{ type: "chat/send" }, { type: "chat/tool_call", name: "get_metric" }, { type: "chat/tool_result", name: "get_metric", refused: true }]);
  const view = selectGuideView({ ...model, transient: null });
  assert.equal(view.state, "confused");
  assert.match(view.caption, /measured/);
});

test("navigation is proud and nods", () => {
  const model = run([{ type: "chat/send" }, { type: "chat/tool_call", name: "navigate_to" }, { type: "chat/tool_result", name: "navigate_to", refused: false }]);
  assert.equal(selectGuideView({ ...model, transient: null }).state, "proud");
  assert.equal(model.poke?.kind, "nod");
});

test("streaming then finished, which expires back to listening", () => {
  const sent = run([{ type: "chat/open" }, { type: "chat/send" }, { type: "chat/stream_start" }]);
  const streaming = { ...sent, transient: null };
  assert.equal(selectGuideView(streaming).state, "streaming");
  const done = reduceGuide(streaming, { type: "chat/answer_end", grounded: false });
  assert.equal(selectGuideView(done).state, "finished");
  const later = reduceGuide(done, { type: "tick", now: done.transient!.until + 1 });
  assert.equal(selectGuideView(later).state, "listening");
});

test("grounded answers nod, ungrounded ones do not", () => {
  const before = run([{ type: "chat/open" }]);
  const grounded = reduceGuide(before, { type: "chat/answer_end", grounded: true });
  const plain = reduceGuide(before, { type: "chat/answer_end", grounded: false });
  assert.notEqual(grounded.poke?.nonce, before.poke?.nonce);
  assert.equal(plain.poke?.nonce, before.poke?.nonce);
});

test("errors: retryable is confused, final has failed", () => {
  assert.equal(selectGuideView(run([{ type: "chat/error", retryable: true }])).state, "confused");
  assert.equal(selectGuideView(run([{ type: "chat/error", retryable: false }])).state, "failed");
});

test("idle ladder: bored, drowsy, asleep; never mid-answer; wakes on activity", () => {
  assert.equal(selectGuideView(run([{ type: "page/idle", stage: 1 }])).state, "bored");
  assert.equal(selectGuideView(run([{ type: "page/idle", stage: 2 }])).state, "drowsy");
  const asleep = run([{ type: "page/idle", stage: 3 }]);
  assert.equal(selectGuideView(asleep).state, "sleeping");
  const busy = run([{ type: "chat/send" }, { type: "page/idle", stage: 3 }]);
  assert.equal(busy.idle, 0);
  const awake = reduceGuide(asleep, { type: "page/activity" });
  assert.equal(selectGuideView(awake).state, "waking");
  const unbored = reduceGuide(run([{ type: "page/idle", stage: 1 }]), { type: "page/activity" });
  assert.equal(selectGuideView(unbored).state, "idle", "boredom snaps out without a waking animation");
});

test("steady clicks walk the pet streak and the sixth spins", () => {
  let model = initialGuideModel;
  const seen: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    model = reduceGuide(model, { type: "pet/click", now: 10_000 + i * 600 });
    seen.push(selectGuideView(model).state);
  }
  assert.deepEqual(seen, ["playful", "laughing", "excited", "proud", "shy", "celebrate"]);
  assert.equal(model.poke?.kind, "spin");
});

test("a pause restarts the streak, and reactions expire", () => {
  const first = reduceGuide(initialGuideModel, { type: "pet/click", now: 1_000 });
  const second = reduceGuide(first, { type: "pet/click", now: 1_000 + 5_000 });
  assert.equal(selectGuideView(second).state, "playful");
  const later = reduceGuide(second, { type: "tick", now: second.reaction!.until });
  assert.equal(selectGuideView(later).state, "idle");
});

test("five fast clicks make it dizzy and ignore clicks for a moment", () => {
  let model = initialGuideModel;
  for (let i = 0; i < 5; i += 1) model = reduceGuide(model, { type: "pet/click", now: 20_000 + i * 200 });
  const view = selectGuideView(model);
  assert.equal(view.state, "confused");
  assert.equal(view.face, "surprised");
  assert.equal(model.poke?.kind, "spin");
  const ignored = reduceGuide(model, { type: "pet/click", now: 20_000 + 900 });
  assert.equal(ignored.reaction, model.reaction);
});

test("a click never overrides an answer in flight", () => {
  const busy = { ...run([{ type: "chat/send" }, { type: "chat/stream_start" }]), transient: null };
  const clicked = reduceGuide(busy, { type: "pet/click", now: 5_000 });
  assert.equal(selectGuideView(clicked).state, "streaming");
  assert.equal(clicked.reaction, null);
});

test("tour steps outrank hover and ambient, and completion celebrates", () => {
  const touring = run([{ type: "tour/start" }, { type: "page/hover", active: true }, { type: "page/section", id: "work" }, { type: "tour/step", cue: { state: "proud" } }]);
  assert.equal(selectGuideView(touring).state, "proud");
  const done = reduceGuide(touring, { type: "tour/end", completed: true });
  assert.equal(selectGuideView(done).state, "celebrate");
  assert.equal(done.poke?.kind, "spin");
  const skipped = reduceGuide(touring, { type: "tour/end", completed: false });
  assert.notEqual(selectGuideView(skipped).state, "celebrate");
});

test("offline shows as sleeping", () => {
  assert.equal(selectGuideView(run([{ type: "availability", available: false }])).state, "sleeping");
});

test("no-op events return the same model reference", () => {
  const open = run([{ type: "chat/open" }]);
  assert.equal(reduceGuide(open, { type: "page/activity" }), open);
  assert.equal(reduceGuide(open, { type: "availability", available: true }), open);
  assert.equal(reduceGuide(open, { type: "tick", now: 0 }), open);
  const streaming = run([{ type: "chat/stream_start" }]);
  assert.equal(reduceGuide(streaming, { type: "chat/stream_start" }), streaming);
  const bored = run([{ type: "page/idle", stage: 2 }]);
  assert.equal(reduceGuide(bored, { type: "page/idle", stage: 1 }), bored);
});

test("closing the chat mid-answer keeps the busy phase, and the answer ends closed", () => {
  const busy = run([{ type: "chat/open" }, { type: "chat/send" }, { type: "chat/stream_start" }, { type: "chat/close" }]);
  assert.equal(busy.phase, "streaming");
  assert.equal(busy.chatOpen, false);
  const done = reduceGuide({ ...busy, transient: null }, { type: "chat/answer_end", grounded: false });
  assert.equal(done.phase, "closed");
  const settled = reduceGuide(done, { type: "tick", now: done.transient!.until + 1 });
  assert.equal(selectGuideView(settled).caption, "Ready to help");
  assert.equal(selectGuideView(settled).state, "idle", "not stuck listening with nothing open");
  const failed = run([{ type: "chat/open" }, { type: "chat/send" }, { type: "chat/close" }, { type: "chat/error", retryable: true }]);
  assert.equal(failed.phase, "closed");
});

test("opening the chat while an answer is in flight keeps the busy phase", () => {
  const model = run([{ type: "chat/send" }, { type: "chat/tool_call", name: "search_work" }, { type: "chat/open" }]);
  assert.equal(model.phase, "tool");
  assert.equal(model.chatOpen, true);
  assert.equal(reduceGuide(model, { type: "chat/answer_end", grounded: false }).phase, "open");
});

test("the idle ladder stands still behind an open chat, and closing does not play a false waking", () => {
  const open = run([{ type: "chat/open" }]);
  assert.equal(reduceGuide(open, { type: "page/idle", stage: 3 }), open);
  const closed = reduceGuide(open, { type: "chat/close" });
  assert.equal(closed.idle, 0);
  assert.equal(closed.transient, null);
  // Opening resets a ladder that had climbed before the chat opened.
  const asleep = run([{ type: "page/idle", stage: 3 }, { type: "chat/open" }]);
  assert.equal(asleep.idle, 0);
});

test("chat/reset returns a request that ended without an answer to open or closed", () => {
  const sending = run([{ type: "chat/open" }, { type: "chat/send" }, { type: "chat/tool_call", name: "search_work" }]);
  assert.equal(reduceGuide(sending, { type: "chat/reset" }).phase, "open");
  const hidden = run([{ type: "chat/send" }, { type: "chat/stream_start" }]);
  assert.equal(reduceGuide(hidden, { type: "chat/reset" }).phase, "closed");
  const idle = run([{ type: "chat/open" }]);
  assert.equal(reduceGuide(idle, { type: "chat/reset" }), idle, "no-op when nothing is in flight");
});

test("a late tour step cannot revive a tour that has ended", () => {
  const touring = run([{ type: "tour/start" }, { type: "tour/step", cue: { state: "proud" } }]);
  assert.equal(touring.tour?.state, "proud");
  const ended = reduceGuide(touring, { type: "tour/end", completed: false });
  assert.equal(ended.tour, null);
  const late = reduceGuide(ended, { type: "tour/step", cue: { state: "proud" }, pointAt: { x: 1, y: 2 } });
  assert.equal(late, ended);
  assert.equal(late.pointAt, null);
  assert.equal(reduceGuide(ended, { type: "tour/end", completed: true }), ended, "a stray end does not celebrate");
});

test("closing the chat with a draft typed ends 'typing' (it stayed Listening for good)", () => {
  let model = reduceGuide(initialGuideModel, { type: "chat/open" } as GuideEvent);
  model = reduceGuide(model, { type: "chat/typing", active: true } as GuideEvent);
  assert.equal(model.phase, "typing");
  model = reduceGuide(model, { type: "chat/close" } as GuideEvent);
  assert.equal(model.phase, "closed");
  assert.equal(model.chatOpen, false);
});

test("the hero avatar wakes up on arrival, but never over a chat", () => {
  const woke = reduceGuide(initialGuideModel, { type: "intro/wake", now: 1000 } as GuideEvent);
  assert.equal(woke.transient?.state, "waking");
  assert.equal(woke.poke?.kind, "nod");
  let busy = reduceGuide(initialGuideModel, { type: "chat/open" } as GuideEvent);
  busy = reduceGuide(busy, { type: "chat/send" } as GuideEvent);
  const after = reduceGuide(busy, { type: "intro/wake", now: 2000 } as GuideEvent);
  assert.equal(after.transient, busy.transient, "no waking cue over a chat");
  assert.equal(after.phase, busy.phase);
});

test("the hero avatar sleeps until the entrance wakes it; the visitor can wake it early", () => {
  const asleep = reduceGuide(initialGuideModel, { type: "intro/sleep" } as GuideEvent);
  assert.equal(selectGuideView(asleep).state, "sleeping");
  const woke = reduceGuide(asleep, { type: "intro/wake", now: 1000 } as GuideEvent);
  assert.equal(woke.introAsleep, false);
  assert.equal(selectGuideView(woke).state, "waking");
  const clicked = reduceGuide(asleep, { type: "pet/click", now: 500 } as GuideEvent);
  assert.equal(clicked.introAsleep, false);
  const opened = reduceGuide(asleep, { type: "chat/open" } as GuideEvent);
  assert.notEqual(selectGuideView(opened).state, "sleeping");
});
