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

test("the hero's entrance is CSS, and glass surfaces are wiped in, never faded", () => {
  const hero = readFileSync("src/components/HeroSection.tsx", "utf8");
  const avatar = readFileSync("src/components/guide/GuideHeroAvatar.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  // Plays from the first paint, before hydration: no framer-motion entrance.
  assert.doesNotMatch(hero, /initial=|variants=/);
  // Glass pills (backdrop blur) render flat while an ancestor's opacity < 1,
  // so they are clipped in. Checked on each glass element of the hero.
  assert.match(hero, /hero-wipe inline-flex[^"]*glass-subtle/, "the badge wipes in");
  assert.match(hero, /hero-wipe-up btn-cta-secondary/, "the glass Resume button wipes in");
  assert.match(avatar, /hero-chip-in/, "the glass orbit chips open out");
  assert.match(avatar, /hero-wipe-up flex flex-wrap/, "the glass ask pill wipes in");
  assert.doesNotMatch(hero, /data-guide-hero-column[^>]*hero-(fade|avatar)/, "the column holding glass chips never fades");
  // Off under reduced motion.
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.hero-rise,/);
});
