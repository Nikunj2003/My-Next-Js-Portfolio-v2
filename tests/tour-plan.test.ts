import test from "node:test";
import assert from "node:assert/strict";

import { planTourScroll, resolveTargetBox } from "../src/lib/guide/tour-plan.ts";

const base = { scrollY: 1000, viewportHeight: 800, navbar: 85, reserve: 232, gap: 12, maxScroll: 10_000 };
// Free band: 97 → 556, 459px tall.

test("a target already inside the free band is left alone", () => {
  assert.equal(planTourScroll({ ...base, box: { top: 120, height: 300 } }), null);
});

test("a target low on the screen is centred in the free band", () => {
  const y = planTourScroll({ ...base, box: { top: 560, height: 300 } });
  // desiredTop = 97 + (459 - 300) / 2 = 176.5
  assert.equal(y, Math.round(1000 + 560 - 176.5));
});

test("a target taller than the band is top-aligned so its heading shows", () => {
  const y = planTourScroll({ ...base, box: { top: 600, height: 900 } });
  assert.equal(y, 1000 + 600 - 97);
});

test("the narrator reserve keeps the target clear of the bottom strip", () => {
  const box = { top: 300, height: 300 };
  assert.equal(planTourScroll({ ...base, reserve: 0, box }), null, "fits when nothing is reserved");
  assert.notEqual(planTourScroll({ ...base, reserve: 232, box }), null, "overlaps the strip, so it moves");
});

test("scrolling is clamped to the page", () => {
  assert.equal(planTourScroll({ ...base, scrollY: 0, box: { top: 20, height: 100 } }), 0);
  assert.equal(planTourScroll({ ...base, maxScroll: 1200, box: { top: 900, height: 200 } }), 1200);
});

test("a sticky target is measured from its first non-sticky ancestor", () => {
  const row = { getBoundingClientRect: () => ({ top: 640, height: 1400 }), parentElement: null };
  const panel = { getBoundingClientRect: () => ({ top: 128, height: 420 }), parentElement: row };
  const box = resolveTargetBox(panel, (node) => node === panel);
  assert.deepEqual(box, { top: 640, height: 420 });
  const plain = resolveTargetBox(panel, () => false);
  assert.deepEqual(plain, { top: 128, height: 420 });
});
