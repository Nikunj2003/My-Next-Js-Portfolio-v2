import test from "node:test";
import assert from "node:assert/strict";

import {
  activeSectionAt,
  blendPoint,
  chooseBubbleSide,
  clampToViewport,
  cornerPoint,
  easeInOutCubic,
  gutterPoint,
  placeBubbleBeside,
} from "../src/lib/guide/placement.ts";
import { lookToward } from "../src/lib/guide/gaze.ts";

const viewport = { width: 1440, height: 900, insetTop: 85, insetBottom: 0 };

test("the avatar is kept below the navbar, above the bottom edge and above the footer", () => {
  assert.deepEqual(clampToViewport({ x: 100, y: 10 }, 68, viewport), { x: 100, y: 97 });
  assert.equal(clampToViewport({ x: 100, y: 2000 }, 68, viewport).y, 900 - 68 - 12);
  assert.equal(clampToViewport({ x: 100, y: 800 }, 68, viewport, 700).y, 700 - 68 - 12);
});

test("the margin spot exists only where the margin holds the avatar", () => {
  assert.equal(gutterPoint(64, 68, viewport), null);
  const point = gutterPoint(144, 68, viewport)!;
  assert.equal(point.x, 144 / 2 - 34);
  assert.deepEqual(cornerPoint(68, viewport), { x: 1440 - 68 - 20, y: 900 - 68 - 20 });
});

test("the bubble side: preferred if it fits, kept while it fits, re-chosen when it stops fitting", () => {
  const bubble = { width: 360, height: 300 };
  // Under a panel with room below: below.
  assert.equal(chooseBubbleSide({ x: 196, y: 300 }, 68, bubble, viewport, ["bottom", "right", "top"]), "bottom");
  // Near the bottom of the screen: no room below, so the next preference.
  assert.equal(chooseBubbleSide({ x: 196, y: 760 }, 68, bubble, viewport, ["bottom", "right", "top"]), "right");
  // Kept while it still fits, even if a better side opens up.
  assert.equal(chooseBubbleSide({ x: 196, y: 300 }, 68, bubble, viewport, ["bottom", "right", "top"], "right"), "right");
  // Dropped once it no longer fits.
  assert.equal(chooseBubbleSide({ x: 1300, y: 300 }, 68, bubble, viewport, ["right", "bottom"], "right"), "bottom");
  // Reading text in the way of the first choice: the next clean side.
  const text = [{ left: 150, top: 400, width: 120, height: 200 }];
  assert.equal(chooseBubbleSide({ x: 196, y: 300 }, 68, bubble, viewport, ["bottom", "right", "top"], null, text), "right");
});

test("below the avatar, the bubble lines up with its left edge", () => {
  const placed = placeBubbleBeside({ x: 196, y: 300 }, 68, "bottom", { width: 360, height: 300 }, viewport);
  assert.equal(placed.top, 300 + 68 + 12);
  assert.equal(placed.left, 196 - 8);
});

test("the bubble sits beside the avatar, bottom-aligned, clamped to the screen", () => {
  const placed = placeBubbleBeside({ x: 196, y: 500 }, 68, "right", { width: 360, height: 300 }, viewport);
  assert.equal(placed.left, 196 + 68 + 12);
  assert.equal(placed.top, 500 + 68 - 300);
  const high = placeBubbleBeside({ x: 196, y: 100 }, 68, "right", { width: 360, height: 300 }, viewport);
  assert.equal(high.top, 85 + 8, "never under the navbar");
  const tall = placeBubbleBeside({ x: 196, y: 500 }, 68, "right", { width: 360, height: 2000 }, viewport);
  assert.ok(tall.top + Math.min(2000, tall.maxHeight) <= 900 - 8, "never off the bottom");
});

test("the bubble's height cap doesn't depend on where the avatar is", () => {
  const a = placeBubbleBeside({ x: 196, y: 120 }, 68, "right", { width: 360, height: 300 }, viewport).maxHeight;
  const b = placeBubbleBeside({ x: 196, y: 780 }, 68, "right", { width: 360, height: 300 }, viewport).maxHeight;
  assert.equal(a, b);
});

test("the glide eases in and out and lands exactly", () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.ok(easeInOutCubic(0.1) < 0.1 && easeInOutCubic(0.9) > 0.9);
  assert.deepEqual(blendPoint({ x: 0, y: 0 }, { x: 100, y: 50 }, 1), { x: 100, y: 50 });
});

const sections = (offset: number) => [
  { id: "about", top: 0 - offset, bottom: 1000 - offset },
  { id: "experience", top: 1000 - offset, bottom: 2500 - offset },
  { id: "work", top: 2500 - offset, bottom: 4000 - offset },
];

test("the active section is the one spanning the middle of the screen", () => {
  assert.equal(activeSectionAt(sections(0), 800, null), "about");
  assert.equal(activeSectionAt(sections(1200), 800, null), "experience");
});

test("hysteresis: hovering a boundary never flips between two sections", () => {
  let current: string | null = "about";
  const seen: string[] = [];
  for (const offset of [580, 590, 600, 610, 600, 590, 600, 610, 620]) {
    current = activeSectionAt(sections(offset), 800, current);
    seen.push(current!);
  }
  assert.deepEqual([...new Set(seen)], ["about"]);
  current = activeSectionAt(sections(700), 800, current);
  assert.equal(current, "experience");
  current = activeSectionAt(sections(590), 800, current);
  assert.equal(current, "experience");
});

test("lookToward points the head at a target, clamped to the library's range", () => {
  const [x, y] = lookToward({ x: 100, y: 400 }, { x: 820, y: 400 }, 1440, 800);
  assert.equal(x, 1);
  assert.equal(Math.abs(y), 0);
});
