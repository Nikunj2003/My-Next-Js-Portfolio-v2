import test from "node:test";
import assert from "node:assert/strict";

import { computeDock, placeBubble, type DockInput } from "../src/lib/guide/placement.ts";
import { lookToward } from "../src/lib/guide/gaze.ts";

/** The real content column: max-w-6xl (1152px) centred, 88rem from 1536px. */
function at(width: number, anchor: DockInput["anchor"], extra: Partial<DockInput> = {}): DockInput {
  const column = width >= 1536 ? 1408 : 1152;
  const left = Math.max(0, (width - column) / 2);
  return {
    viewportWidth: width,
    viewportHeight: 800,
    content: { left, right: width - left },
    size: 68,
    anchor,
    insetTop: 85,
    insetBottom: 0,
    ...extra,
  };
}

const left = { side: "left" as const, yRatio: 0.5 };
const right = { side: "right" as const, yRatio: 0.5 };

test("narrow screens dock in the corner; wide screens use the gutter", () => {
  assert.equal(computeDock(at(1100, left)).mode, "corner");
  // A 68px avatar needs a 92px gutter: (vw - 1152) / 2 >= 92, so 1336px and up.
  assert.equal(computeDock(at(1280, left)).mode, "corner", "64px gutter is too small");
  assert.equal(computeDock(at(1336, left)).mode, "gutter");
  assert.equal(computeDock(at(1440, right)).mode, "gutter");
  assert.equal(computeDock(at(1920, left)).mode, "gutter");
});

test("gutter docks are centred in the margin on the anchor's side", () => {
  const dockLeft = computeDock(at(1440, left));
  assert.equal(dockLeft.x, Math.round(144 / 2 - 34));
  const dockRight = computeDock(at(1440, right));
  assert.equal(dockRight.x, Math.round(1440 - 144 / 2 - 34));
  assert.equal(dockRight.side, "right");
});

test("the companion never goes under the navbar or below the screen", () => {
  assert.equal(computeDock(at(1440, { side: "left", yRatio: 0 })).y, 85 + 12);
  assert.equal(computeDock(at(1440, { side: "left", yRatio: 1 })).y, 800 - 68 - 12);
});

test("no anchor means the corner, lifted above a visible footer", () => {
  const corner = computeDock(at(1440, null));
  assert.equal(corner.mode, "corner");
  assert.equal(corner.y, 800 - 68 - 20);
  const lifted = computeDock(at(1440, null, { footerTop: 700 }));
  assert.equal(lifted.y, 800 - 68 - 20 - (100 + 12));
});

test("the bubble takes the first side that fits", () => {
  const viewport = { width: 1440, height: 800, insetTop: 85, insetBottom: 0 };
  const anchor = { left: 1330, top: 400, width: 68, height: 68 };
  const placed = placeBubble({ anchor, bubble: { width: 360, height: 300 }, viewport, prefer: ["right", "left", "top"] });
  assert.equal(placed.side, "left", "no room to the right of a right-gutter avatar");
  assert.equal(placed.left, 1330 - 12 - 360);
});

test("the bubble avoids rectangles it must not cover and stays on screen", () => {
  const viewport = { width: 1440, height: 800, insetTop: 85, insetBottom: 0 };
  const anchor = { left: 40, top: 700, width: 68, height: 68 };
  // A card to the right of the avatar; above the avatar is free.
  const avoid = [{ left: 360, top: 450, width: 400, height: 350 }];
  const placed = placeBubble({ anchor, bubble: { width: 300, height: 260 }, viewport, prefer: ["right", "top"], avoid });
  assert.equal(placed.side, "top");
  assert.ok(placed.top >= 85 + 8);
  assert.ok(placed.left >= 8);
});

test("lookToward points the head at a target, clamped to the library's range", () => {
  const [x, y] = lookToward({ x: 100, y: 400 }, { x: 820, y: 400 }, 1440, 800);
  assert.equal(x, 1);
  assert.equal(Math.abs(y), 0);
  assert.deepEqual(lookToward({ x: 720, y: 400 }, { x: 720, y: 200 }, 1440, 800), [0, 0.5]);
});

import { pickSpot } from "../src/lib/guide/placement.ts";

test("About, Experience and Skills: sit in the free space under the sticky panel", () => {
  const spot = pickSpot({ ...at(1440, left), perches: { under: { left: 176, top: 128, width: 363, height: 537 } } });
  assert.equal(spot.mode, "perch");
  assert.equal(spot.x, 196);
  assert.equal(spot.y, 128 + 537 + 24);
  assert.deepEqual(spot.prefer.slice(0, 2), ["bottom", "top"]);
  assert.equal(spot.align, "start");
});

test("a panel too tall to leave room underneath falls back to the gutter or corner", () => {
  const spot = pickSpot({ ...at(1440, left), perches: { under: { left: 176, top: 128, width: 363, height: 700 } } });
  assert.notEqual(spot.mode, "perch");
});

test("Work: beside the centred header while it is on screen", () => {
  const spot = pickSpot({ ...at(1440, left), perches: { beside: { left: 176, top: 300, width: 1088, height: 230 } } });
  assert.equal(spot.mode, "perch");
  assert.equal(spot.y, Math.round(300 + 115 - 34));
  const scrolledPast = pickSpot({ ...at(1440, left), perches: { beside: { left: 176, top: -400, width: 1088, height: 230 } } });
  assert.notEqual(scrolledPast.mode, "perch");
});

test("AI Twin and Contact: perched on the card's top edge, bubble above", () => {
  const spot = pickSpot({ ...at(1440, left), perches: { onTop: { left: 176, top: 400, width: 1088, height: 610 } } });
  assert.equal(spot.mode, "perch");
  assert.equal(spot.x, 204);
  assert.equal(spot.prefer[0], "top");
});

test("start-aligned bubbles line up with the avatar's left edge", () => {
  const viewport = { width: 1440, height: 900, insetTop: 85, insetBottom: 0 };
  const placed = placeBubble({ anchor: { left: 196, top: 300, width: 68, height: 68 }, bubble: { width: 360, height: 300 }, viewport, prefer: ["bottom"], align: "start" });
  assert.equal(placed.left, 188);
  assert.equal(placed.top, 300 + 68 + 12);
});

test("over the hero, the companion stands at the hero avatar's lower left with the bubble beside it", () => {
  const spot = pickSpot({ ...at(1440, { side: "left", yRatio: 0.5 }), perches: { hero: { left: 875, top: 246, width: 344, height: 344 } } });
  assert.equal(spot.mode, "perch");
  assert.equal(spot.x, 875 - 34);
  assert.equal(spot.y, 246 + 344 - 68);
  assert.equal(spot.prefer[0], "right");
});
