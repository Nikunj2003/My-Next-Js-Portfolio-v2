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
  underPanelPoint,
  heroHandoffFrame,
  heroHandoffProgress,
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

test("under a sticky panel: one continuous path, the same both ways, never dipping to the screen bottom", () => {
  // About at 1440x900: the panel pins at 128 with height 537, so it rests at 665 + 24.
  const at = (panelBottom: number) => underPanelPoint({ panelLeft: 176, panelBottom, pinnedBottom: 665, gutterX: 38 });
  // Arriving (panel still below the screen): waits in the margin at its resting height.
  assert.deepEqual(at(1600), { x: 38, y: 689 });
  assert.deepEqual(at(1000), { x: 38, y: 689 });
  // Pinned: under the panel.
  assert.deepEqual(at(665), { x: 196, y: 689 });
  // Leaving at the end of the section: rides up with the panel.
  assert.deepEqual(at(500), { x: 196, y: 524 });
  // Height never increases as the panel moves up the screen (no dip and climb back).
  let last = Infinity;
  for (let bottom = 2000; bottom >= 300; bottom -= 7) {
    const point = at(bottom);
    assert.ok(point.y <= last + 1e-9, `height went back down at panelBottom ${bottom}`);
    last = point.y;
  }
  // The slide in is continuous (no single step larger than a scroll step can explain).
  for (let bottom = 900; bottom >= 600; bottom -= 10) assert.ok(Math.abs(at(bottom).x - at(bottom - 10).x) < 20, `step at ${bottom}`);
});

test("without a margin, the under-panel spot doesn't slide; it waits at its resting height", () => {
  assert.deepEqual(underPanelPoint({ panelLeft: 96, panelBottom: 1200, pinnedBottom: 665, gutterX: null }), { x: 116, y: 689 });
});

const handoff = (t: number) => heroHandoffFrame({ t, heroCentre: { x: 1047, y: 300 }, heroDiameter: 364, size: 68, spot: { x: 54, y: 689 } });

test("hand-off: the two avatars are one disc (same centre, same face size) at every step", () => {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const f = handoff(t);
    const companionCentre = { x: f.position.x + 34, y: f.position.y + 34 };
    const heroCentre = { x: 1047 + f.heroOffset.x, y: 300 + f.heroOffset.y };
    assert.ok(Math.abs(companionCentre.x - heroCentre.x) < 1e-6 && Math.abs(companionCentre.y - heroCentre.y) < 1e-6, `centres apart at t=${t}`);
    const heroFace = 364 * f.heroScale * 0.82;
    const companionFace = 68 * f.companionScale * 0.76;
    assert.ok(Math.abs(heroFace - companionFace) < 1e-6, `faces differ at t=${t}`);
  }
});

test("hand-off: starts as the hero, ends on the spot at full size, and never reverses", () => {
  const start = handoff(0);
  assert.equal(start.heroOpacity, 1);
  assert.equal(start.companionOpacity, 0);
  assert.equal(start.heroScale, 1);
  const end = handoff(1);
  assert.deepEqual(end.position, { x: 54, y: 689 });
  assert.equal(end.companionScale, 1);
  assert.equal(end.companionOpacity, 1);
  let last = handoff(0);
  for (let t = 0.02; t <= 1.0001; t += 0.02) {
    const f = handoff(t);
    assert.ok(f.position.x <= last.position.x + 1e-9, `x reversed at t=${t}`);
    assert.ok(f.position.y >= last.position.y - 1e-9, `y reversed at t=${t}`);
    assert.ok(f.companionScale <= last.companionScale + 1e-9, `size grew back at t=${t}`);
    assert.ok(f.companionOpacity >= last.companionOpacity - 1e-9, `fade reversed at t=${t}`);
    last = f;
  }
});

test("hand-off progress is a plain function of the hero's position (same scroll, same frame)", () => {
  assert.equal(heroHandoffProgress(400, 105, 300), 0);
  assert.equal(heroHandoffProgress(105, 105, 300), 0);
  assert.equal(heroHandoffProgress(-45, 105, 300), 0.5);
  assert.equal(heroHandoffProgress(-500, 105, 300), 1);
  assert.equal(heroHandoffProgress(-45, 105, 300), heroHandoffProgress(-45, 105, 300));
});
