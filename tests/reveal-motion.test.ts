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

test("the hero's markup is static; its intro lives in HeroIntro", () => {
  const source = readFileSync("src/components/HeroSection.tsx", "utf8");
  assert.doesNotMatch(source, /framer-motion|initial=|variants=/);
  assert.match(source, /<HeroIntro \/>/);
});
