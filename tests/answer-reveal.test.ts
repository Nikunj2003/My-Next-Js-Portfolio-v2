import test from "node:test";
import assert from "node:assert/strict";

import { advanceReveal, answerPace, initialReveal, paceAt, splitMarkdownBlocks } from "../src/lib/answer-reveal.ts";

test("pace starts slow, ramps with smoothstep, and caps at the fast rate", () => {
  assert.equal(paceAt(0), answerPace.slowCharactersPerSecond);
  assert.equal(paceAt(answerPace.slowStartMs), answerPace.slowCharactersPerSecond);
  const mid = paceAt(answerPace.slowStartMs + answerPace.rampMs / 2);
  assert.ok(mid > answerPace.slowCharactersPerSecond && mid < answerPace.fastCharactersPerSecond);
  assert.equal(paceAt(answerPace.slowStartMs + answerPace.rampMs * 2), answerPace.fastCharactersPerSecond);
});

test("reveals whole words only", () => {
  const text = "Hello brave new world of agents ";
  const state = advanceReveal(initialReveal, text, false, 200);
  const shown = text.slice(0, state.shown);
  assert.ok(state.shown > 0);
  assert.ok(shown.endsWith(" "), `revealed "${shown}" should end on a word boundary`);
});

test("holds the last word while the stream is open", () => {
  const text = "Streaming tokens arri";
  let state = initialReveal;
  for (let i = 0; i < 100; i += 1) state = advanceReveal(state, text, true, 40);
  assert.equal(text.slice(0, state.shown), "Streaming tokens ");
});

test("finishes the text once the stream closes", () => {
  const text = "Streaming tokens arrived";
  let state = initialReveal;
  for (let i = 0; i < 100; i += 1) state = advanceReveal(state, text, false, 40);
  assert.equal(state.shown, text.length);
});

test("does not bank time spent waiting on the network", () => {
  const text = "one ";
  let state = initialReveal;
  for (let i = 0; i < 50; i += 1) state = advanceReveal(state, text, true, 40);
  assert.ok(state.budget <= paceAt(state.writtenMs) * 0.1 + 1e-9);
});

test("a shorter replacement text clamps what is shown", () => {
  let state = initialReveal;
  for (let i = 0; i < 100; i += 1) state = advanceReveal(state, "a long first draft of text", false, 40);
  state = advanceReveal(state, "short", false, 0);
  assert.equal(state.shown, "short".length);
});

test("markdown blocks split on blank lines but keep code fences whole", () => {
  const blocks = splitMarkdownBlocks("Intro\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nOutro");
  assert.equal(blocks.length, 3);
  assert.match(blocks[1], /const a = 1;\n\nconst b = 2;/);
});
