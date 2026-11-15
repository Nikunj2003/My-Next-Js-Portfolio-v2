import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Only the hero animates in. Every other section and the /work pages render
 * in place: they have their own motion (sticky panels, the card deck, the
 * timeline), and scroll-triggered reveals stacked on top of it cost an
 * IntersectionObserver and a motion node per block on every scroll.
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

test("no scroll-triggered entrance animations outside the hero", () => {
  const skip = /HeroSection\.tsx$|FluidCursor|\/guide\/|AITwinChat\.tsx$|\/ai\//;
  for (const file of [...files("src/components"), ...files("src/app")]) {
    if (skip.test(file)) continue;
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /components\/ui\/reveal/, `${file} imports the removed Reveal`);
    assert.doesNotMatch(source, /whileInView/, `${file} animates on scroll (whileInView)`);
    assert.doesNotMatch(source, /animateOnEnter/, `${file} uses a card entrance`);
  }
});

test("the hero's entrance is CSS, and glass and solid buttons are never shown translucent", () => {
  const hero = readFileSync("src/components/HeroSection.tsx", "utf8");
  const avatar = readFileSync("src/components/guide/GuideHeroAvatar.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.doesNotMatch(hero, /initial=|variants=/, "plays from the first paint, not after hydration");
  assert.match(hero, /hero-wipe inline-flex[^"]*glass-subtle/, "the glass badge wipes in");
  assert.match(hero, /hero-wipe-up btn-cta-secondary/, "the glass Resume button wipes in");
  assert.match(hero, /hero-pop inline-flex[^"]*bg-primary/, "the solid CTA pops open, no opacity");
  assert.doesNotMatch(css.slice(css.indexOf("@keyframes hero-pop"), css.indexOf("@keyframes hero-fade")), /opacity/);
  assert.match(avatar, /className=\{`hero-chip /, "the glass chips burst out");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.hero-anim/);
  assert.match(css, /html\[data-hero-intro="skip"\]/, "skipped on reload and deep links");
});

test("the name keeps its space, and stats never read as a wrong number", () => {
  const hero = readFileSync("src/components/HeroSection.tsx", "utf8");
  // The space sits between the word masks, not inside one (it collapsed there).
  assert.match(hero, /\{index > 0 \? " " : null\}\s*<span className="hero-mask">/);
  // The figure's first text is its final value; counting starts from 60%.
  assert.match(hero, /className="tabular-nums">\{value\}\{suffix\}<\/span>/);
  assert.match(hero, /const COUNT_FROM = 0\.6;/);
});

test("the hero avatar appears alive: no still drawing before the live one", () => {
  const slot = readFileSync("src/components/guide/GuideAvatarSlot.tsx", "utf8");
  const avatar = readFileSync("src/components/guide/GuideHeroAvatar.tsx", "utf8");
  assert.match(slot, /hero-still-nojs/, "the still drawing is only the no-JS picture");
  assert.match(avatar, /<GuideAvatarSlot size=\{300\} intro onAwake=\{onAwake\}/);
  assert.match(avatar, /emitGuide\(\{ type: "intro\/wake"/, "it wakes up as it appears");
});
