import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bubble = readFileSync(new URL("../src/components/guide/TwinBubble.tsx", import.meta.url), "utf8");
const companion = readFileSync(new URL("../src/components/guide/GuideCompanion.tsx", import.meta.url), "utf8");

test("one frame loop places the avatar; the bubble is derived from the same values in the same frame", () => {
  assert.match(companion, /requestAnimationFrame\(tick\)/);
  assert.match(companion, /anchorX=\{posX\}/);
  assert.match(bubble, /useTransform\(\[anchorX, anchorY\]/);
  assert.match(bubble, /placeBubbleBeside/);
});

test("no springs chasing targets, no async positioning, no freezing", () => {
  assert.doesNotMatch(companion, /useSpring/);
  assert.doesNotMatch(bubble, /floating-ui/);
  assert.doesNotMatch(companion, /frozenRef/);
});

test("scrolling the page is never blocked by the bubble riding under a still pointer", () => {
  // The bubble used to cancel every wheel event over it, so the page froze
  // whenever it slid under the cursor. Only the answer area takes the wheel,
  // and only while it actually overflows.
  assert.doesNotMatch(bubble, /addEventListener\("wheel"/);
  assert.doesNotMatch(bubble, /preventDefault/);
  const ask = readFileSync(new URL("../src/components/guide/AskContent.tsx", import.meta.url), "utf8");
  assert.match(ask, /data-lenis-prevent=\{bodyScrolls \|\| undefined\}/);
});

test("the hand-off has no timer or rate cap: it is drawn from the scroll position each frame", () => {
  assert.doesNotMatch(companion, /MORPH_MS/);
  assert.match(companion, /heroHandoffProgress\(heroBox\.top/);
  // The hero is styled from the same frame object as the companion.
  assert.match(companion, /styleHero\(frame\)/);
});

test("nothing is drawn until the page has settled after a load or refresh", () => {
  assert.match(companion, /\(!isHome \|\| settled\) &&/);
  const slot = readFileSync(new URL("../src/components/guide/GuideAvatarSlot.tsx", import.meta.url), "utf8");
  // The still drawing stays until the live avatar has drawn, then they cross-fade.
  assert.match(slot, /opacity: drawn \? 0 : 1/);
});

test("the hero hand-off measures the hero's layout box, not the box it is scaling", () => {
  // Reading the transformed box fed each frame's shrink into the next frame's
  // progress, so the hand-off never settled near its midpoint.
  assert.match(companion, /heroLayoutRect\(hero\)/);
  assert.doesNotMatch(companion, /hero\?\.getBoundingClientRect\(\)/);
});

test("the hero hands off straight to About's spot (no second hop at the hero/About boundary)", () => {
  assert.match(companion, /hero: ABOUT,\n\s+about: ABOUT,/);
  assert.match(companion, /underPanelPoint\(/);
});

test("the faded hero never catches clicks", () => {
  assert.match(companion, /hero\.style\.pointerEvents = frame && frame\.heroOpacity < 0\.5 \? "none" : ""/);
});
