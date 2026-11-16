import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { hashText, scoreCase, summarise, type GoldenCase } from "../src/lib/nex/eval-score.ts";
import { caseStudies } from "../src/data/case-studies.ts";

const goldenText = readFileSync("evals/nex/golden.json", "utf8");
const golden = JSON.parse(goldenText) as GoldenCase[];
const slugs = new Set(caseStudies.map((study) => study.slug));
const CATEGORIES = ["answerable", "not-measured", "off-topic", "identity", "adversarial", "navigation"];

test("the golden set is well formed and covers every category", () => {
  assert.ok(golden.length >= 24);
  assert.equal(new Set(golden.map((item) => item.id)).size, golden.length, "ids are unique");
  for (const item of golden) {
    assert.ok(CATEGORIES.includes(item.category), item.id);
    assert.ok(item.question.trim().length > 0, item.id);
    assert.ok(item.expect.tools || item.expect.include || item.expect.exclude, `${item.id} checks nothing`);
  }
  for (const category of CATEGORIES) assert.ok(golden.some((item) => item.category === category), category);
});

test("scoring: tools, phrases, length, voice and links", () => {
  const kappa = golden.find((item) => item.id === "kappa")!;
  const good = { text: "A judge needs Cohen's kappa of at least 0.7 against human labels. See /work/llm-evaluation-platform.", tools: [{ name: "get_metric", refused: false }] };
  assert.equal(scoreCase(kappa, good, slugs).status, "passed");
  assert.match(scoreCase(kappa, { ...good, tools: [{ name: "get_metric", refused: true }] }, slugs).reasons.join(), /expected a call/);
  assert.match(scoreCase(kappa, { ...good, text: good.text + " /work/made-up" }, slugs).reasons.join(), /unknown study/);
  assert.match(scoreCase(kappa, { ...good, text: good.text + " I built it." }, slugs).reasons.join(), /speaks as Nikunj/);
  assert.match(scoreCase(kappa, { ...good, text: `${good.text} ${"word ".repeat(200)}` }, slugs).reasons.join(), /words/);
});

test("an infrastructure failure is errored, never failed, and blocks the summary", () => {
  const [first, second] = golden;
  const errored = scoreCase(first!, { text: "", tools: [], error: "HTTP 429" }, slugs);
  assert.equal(errored.status, "errored");
  const passed = scoreCase(second!, { text: "x", tools: [] }, slugs);
  assert.equal(summarise([first!, second!], [errored, passed], { date: "d", model: "m", goldenHash: "h" }), null);
  assert.equal(summarise([first!, second!], [passed], { date: "d", model: "m", goldenHash: "h" }), null, "a partial run is not a score");
});

test("the summary counts by category", () => {
  const items = golden.slice(0, 3);
  const scores = items.map((item, index) => ({ id: item.id, status: index === 0 ? ("failed" as const) : ("passed" as const), reasons: [] }));
  const summary = summarise(items, scores, { date: "d", model: "m", goldenHash: "h" })!;
  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 2);
  assert.deepEqual(summary.failures, [items[0]!.id]);
});

test("a published scorecard matches the current golden set", () => {
  const published = JSON.parse(readFileSync("src/data/nex-eval.json", "utf8")) as { measured: boolean; goldenHash?: string };
  if (!published.measured) return;
  assert.equal(published.goldenHash, hashText(goldenText), "golden.json changed since the last run: rerun `npm run eval:nex`");
});
