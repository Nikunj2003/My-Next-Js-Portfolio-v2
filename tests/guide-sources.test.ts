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

test("the hero avatar is the handoff source for the companion", () => {
  const hero = readFileSync("src/components/guide/GuideHeroAvatar.tsx", "utf8");
  assert.match(hero, /data-guide-hero-avatar/);
  assert.match(hero, /followPointer/, "the hero avatar follows the pointer");
  // The hero reports whether it is on screen; the companion only shows once it isn't.
  assert.match(hero, /setHeroVisible\(/);
  assert.match(readFileSync("src/components/guide/GuideCompanion.tsx", "utf8"), /companion\.heroVisible/);
});
