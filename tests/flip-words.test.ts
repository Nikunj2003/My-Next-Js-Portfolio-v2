import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("a flipping word never changes the size of the line it sits in", () => {
  // The leaving word used to go `position: absolute` in "line" mode, so the
  // line lost its height for a frame on every flip; the sticky panel around it
  // shrank by a line and grew back, and the guide resting under it jumped.
  const source = readFileSync("src/components/ui/flip-words.tsx", "utf8");
  assert.doesNotMatch(source, /position: "absolute"/);
  assert.match(source, /"inline-grid text-left"/);
  assert.match(source, /col-start-1 row-start-1/);
});
