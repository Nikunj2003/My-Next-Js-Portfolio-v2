import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the fluid cursor knows nothing about the guide", () => {
  /*
   * Pausing or unmounting the WebGL fluid sim from guide events brought back
   * the white-flash bug and sometimes left the cursor dead. The avatar has to
   * coexist with the sim as it is, so neither file may reference the guide.
   */
  for (const file of ["src/components/FluidCursor.tsx", "src/hooks/useFluidCursor.tsx"]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /guide/i, `${file} must not reference the guide`);
  }
});

test("the hero is a socket the one Nex sits in", () => {
  const hero = readFileSync("src/components/guide/GuideHeroAvatar.tsx", "utf8");
  assert.match(hero, /data-guide-hero-avatar/);
  // The companion follows the pointer while it sits in the hero.
  const companion = readFileSync("src/components/guide/GuideCompanion.tsx", "utf8");
  assert.match(companion, /followPointer=\{inHero\}/);
  // The hero reports whether it is on screen; that decides where the ask box opens.
  assert.match(hero, /setHeroVisible\(/);
  assert.match(companion, /setHeroVisible\(heroHere \? morph < HANDOFF_SWAP_AT/);
});
