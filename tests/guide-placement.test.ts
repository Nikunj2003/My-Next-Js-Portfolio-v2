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
  socketDockPoint,
  heroDockFrame,
  heroHandoffProgress,
  COMPANION_FACE_SHARE, HERO_FACE_SHARE, freeBubbleSide, routeSocketProgress } from "../src/lib/guide/placement.ts";
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

test("a section dock: margin while the socket is below, in the socket on screen, out again under the navbar; the same both ways", () => {
  const viewport = { width: 1440, height: 900, insetTop: 88, insetBottom: 0 };
  const gutter = { x: 38, y: 416 };
  const at = (y: number) => socketDockPoint({ socket: { x: 300, y }, size: 68, viewport, gutter });
  // Below the screen: waits in the margin.
  assert.deepEqual(at(1400).point, gutter);
  assert.equal(at(1400).hold, 0);
  // On screen: resting in the socket (top-left = centre - size/2).
  assert.deepEqual(at(500).point, { x: 266, y: 466 });
  assert.equal(at(500).hold, 1);
  // Pinned just under the navbar (a sticky panel at top 128): still in it.
  assert.equal(at(128 + 24 + 34).hold, 1);
  // Under the navbar: back in the margin.
  assert.deepEqual(at(-200).point, gutter);
  // Continuous: no single scroll step moves it further than a scroll can explain.
  for (let y = 1400; y >= -240; y -= 8) {
    const a = at(y).point, b = at(y - 8).point;
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 60, `step at ${y}`);
  }
});

test("without a margin, a dock just holds Nex on its socket", () => {
  const viewport = { width: 1100, height: 800, insetTop: 88, insetBottom: 0 };
  assert.deepEqual(socketDockPoint({ socket: { x: 200, y: 1500 }, size: 68, viewport, gutter: null }), { point: { x: 166, y: 1466 }, hold: 1 });
});

const handoff = (t: number) => heroDockFrame({ t, heroCentre: { x: 1047, y: 300 }, heroDiameter: 240, size: 68, spot: { x: 54, y: 689 } });

test("leaving the hero: starts on the socket at the hero's face size", () => {
  const start = handoff(0);
  assert.deepEqual(start.position, { x: 1047 - 34, y: 300 - 34 });
  const face = 68 * start.scale * COMPANION_FACE_SHARE;
  assert.ok(Math.abs(face - 240 * HERO_FACE_SHARE) < 1e-6);
  assert.equal(start.chrome, 0);
});

test("leaving the hero: ends on the spot at full size, and never reverses", () => {
  const end = handoff(1);
  assert.deepEqual(end.position, { x: 54, y: 689 });
  assert.equal(end.scale, 1);
  assert.equal(end.chrome, 1);
  let last = handoff(0);
  for (let t = 0.02; t <= 1.0001; t += 0.02) {
    const f = handoff(t);
    assert.ok(f.position.x <= last.position.x + 1e-9, `x reversed at t=${t}`);
    assert.ok(f.position.y >= last.position.y - 1e-9, `y reversed at t=${t}`);
    assert.ok(f.scale <= last.scale + 1e-9, `size grew back at t=${t}`);
    assert.ok(f.chrome >= last.chrome - 1e-9, `disc faded back at t=${t}`);
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

test("the bubble opens on the side covering the least text, even against preference", () => {
  const viewport = { width: 972, height: 575, insetTop: 85, insetBottom: 0 };
  // A paragraph to the left of the avatar, nothing above it.
  const text = [{ left: 400, top: 430, width: 470, height: 145 }];
  // From the corner, "left" is preferred but lands on the paragraph; "top" is clear of it.
  const side = chooseBubbleSide({ x: 884, y: 487 }, 68, { width: 360, height: 112 }, viewport, ["left", "top"], null, text);
  assert.equal(side, "top");
  // With nothing to avoid, preference still decides.
  assert.equal(chooseBubbleSide({ x: 884, y: 487 }, 68, { width: 360, height: 112 }, viewport, ["left", "top"], null, []), "left");
});

test("page trip: starts where it was, ends on the new spot, arcs above the line, never reverses", async () => {
  const { routeTravelFrame, routeTravelMs } = await import("../src/lib/guide/placement.ts");
  const from = { x: 50, y: 450 };
  const to = { x: 1086, y: 303 };
  assert.deepEqual(routeTravelFrame({ t: 0, from, to }).position, from);
  assert.deepEqual(routeTravelFrame({ t: 1, from, to }).position, to);
  const mid = routeTravelFrame({ t: 0.5, from, to });
  assert.ok(mid.position.y < (from.y + to.y) / 2 - 20, "lifts above the straight line");
  let lastX = -Infinity;
  for (let t = 0; t <= 1; t += 0.05) {
    const { position } = routeTravelFrame({ t, from, to });
    assert.ok(position.x >= lastX - 1e-9);
    lastX = position.x;
  }
  assert.equal(routeTravelFrame({ t: 1, from, to, fromScale: 5, toScale: 1 }).scale, 1);
  assert.ok(routeTravelMs(from, to) >= 620 && routeTravelMs(from, to) <= 940);
});

test("footer landing: paced like the hero hand-off, both ways, landed at the end of the page", async () => {
  const { footerDockProgress } = await import("../src/lib/guide/placement.ts");
  const span = 990;
  const at = (remaining: number, scrolled = 10000) => footerDockProgress({ remaining, span, scrolled });
  assert.equal(at(span), 0, "starts a full span before the end");
  assert.equal(at(span + 400), 0);
  assert.ok(Math.abs(at(span / 2) - 0.5) < 1e-9, "half way after half the span");
  assert.equal(at(0), 1, "landed at the last scroll position");
  // A short page: it runs over the scroll there is.
  assert.equal(footerDockProgress({ remaining: 300, span, scrolled: 300 }), 0.5);
  assert.equal(at(420), at(420), "same position, same frame");
});

test("footer landing: starts at the spot, ends centred on the slot at its size, fully shown", async () => {
  const { footerDockFrame } = await import("../src/lib/guide/placement.ts");
  const from = { x: 80, y: 420 };
  const slotCentre = { x: 720, y: 640 };
  const start = footerDockFrame({ t: 0, from, slotCentre, size: 68, slotSize: 150 });
  assert.deepEqual(start.position, from);
  assert.equal(start.scale, 1);
  const end = footerDockFrame({ t: 1, from, slotCentre, size: 68, slotSize: 150 });
  assert.ok(Math.abs(end.position.x + 34 - 720) < 1e-9 && Math.abs(end.position.y + 34 - 640) < 1e-9, "centred on the slot");
  assert.ok(Math.abs(68 * end.scale - 150) < 1e-9, "drawn at the slot's size");
  assert.equal(end.opacity, 1);
  assert.equal(start.opacity, 1);
  let previous = start;
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const frame = footerDockFrame({ t, from, slotCentre, size: 68, slotSize: 150 });
    assert.ok(frame.position.x >= previous.position.x - 1e-9, `turns back at t=${t}`);
    assert.ok(frame.scale >= previous.scale - 1e-9, "never shrinks on the way in");
    assert.ok(frame.opacity > 0.4 && frame.opacity <= 1);
    previous = frame;
  }
});

test("a tip only takes a side that covers no reading text", () => {
  const viewport = { width: 1280, height: 720, insetTop: 88, insetBottom: 0 };
  const bubble = { width: 360, height: 112 };
  // Text to the right of Nex: the right side is taken, so it opens elsewhere free.
  const right = [{ left: 200, top: 560, width: 600, height: 160 }];
  const side = freeBubbleSide({ x: 116, y: 640 }, 68, bubble, viewport, ["bottom", "right", "top"], right);
  assert.notEqual(side, "right");
  // Text all around: no free side, so no tip.
  const everywhere = [{ left: 0, top: 88, width: 1280, height: 632 }];
  assert.equal(freeBubbleSide({ x: 116, y: 640 }, 68, bubble, viewport, ["bottom", "right", "top"], everywhere), null);
});

test("leaving a page header's socket is done by the time it reaches the navbar, and reverses exactly", () => {
  // Socket rests with its top at 250; the navbar ends at 88.
  assert.equal(routeSocketProgress(250, 250, 88), 0);
  assert.equal(routeSocketProgress(88, 250, 88), 1);
  assert.equal(routeSocketProgress(-300, 250, 88), 1);
  assert.ok(Math.abs(routeSocketProgress(169, 250, 88) - 0.5) < 1e-9);
  assert.ok(routeSocketProgress(200, 250, 88) < routeSocketProgress(199, 250, 88));
});
