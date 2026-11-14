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
