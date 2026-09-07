import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { revealAnimate, revealInitial } from "../src/lib/motion.ts";

/**
 * Scroll reveals must not fade opacity.
 *
 * Backdrop blur only reads as glass once the element is opaque enough to have a
 * visible fill, so animating a glass panel up from `opacity: 0` left it looking
 * flat for the whole reveal and then snapping to glass. At 0.6s duration plus
 * up to 0.4s of stagger, that was a full second of every glass surface on the
 * page rendering wrong after load — measured as 18 glass-wrapping elements
 * shipped at `opacity: 0` in the production HTML.
 *
 * The slide is what carries the entrance; the fade was the part that broke.
 */
test("revealInitial slides without fading", () => {
  const initial = revealInitial(false) as Record<string, unknown>;

  assert.ok(!("opacity" in initial), "a reveal must not start transparent");
  assert.equal(initial.y, 24, "the slide offset must survive");

  const horizontal = revealInitial(false, "x", -24) as Record<string, unknown>;
  assert.equal(horizontal.x, -24, "the x axis must still slide");
  assert.ok(!("opacity" in horizontal), "neither axis may fade");
});

test("revealAnimate settles position without touching opacity", () => {
  const animate = revealAnimate() as Record<string, unknown>;

  assert.equal(animate.y, 0, "must animate back to resting position");
  assert.ok(!("opacity" in animate), "must not animate opacity");
});

test("reduced motion renders final state rather than fading", () => {
  const initial = revealInitial(true) as Record<string, unknown>;

  // With nothing to animate, the element paints correct on the first frame —
  // which is the desired outcome under prefers-reduced-motion anyway.
  assert.deepEqual(initial, {}, "reduced motion must have no initial offset or fade");
});

test("SpotlightCard's enter animation does not fade either", () => {
  // It has its own hardcoded initial state rather than using lib/motion, which
  // is how it kept fading after the shared helper was fixed.
  const source = readFileSync("src/components/ui/spotlight-card.tsx", "utf8");
  const enter = source.slice(source.indexOf("initial={animateOnEnter"), source.indexOf("transition={animateOnEnter"));

  assert.ok(enter.length > 0, "expected to find the enter animation");
  assert.doesNotMatch(enter, /opacity:\s*0/, "the card must not fade in; it wraps glass surfaces");
  assert.match(enter, /y:\s*30/, "the slide must survive");
});

test("the hero's staggered items do not fade", () => {
  // The availability badge is a glass pill, so the hero's shared `item` variant
  // is subject to the same rule.
  const source = readFileSync("src/components/HeroSection.tsx", "utf8");
  const variant = source.slice(source.indexOf("const item = {"), source.indexOf("return (", source.indexOf("const item = {")));

  assert.ok(variant.length > 0, "expected to find the hero item variant");
  assert.doesNotMatch(variant, /opacity:\s*0/, "hero items must not fade; one is a glass pill");
});
