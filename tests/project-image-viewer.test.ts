import test from "node:test";
import assert from "node:assert/strict";

import {
  MIN_ZOOM,
  clamp,
  clampOffsetToBounds,
  getContainedSize,
  getDistance,
  getMidpoint,
  roundZoom,
} from "../src/lib/project-image-viewer.ts";

test("clamp keeps values within inclusive bounds", () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(15, 0, 10), 10);
});

test("roundZoom snaps near-minimum zoom back to the default scale", () => {
  assert.equal(roundZoom(1.024), MIN_ZOOM);
  assert.equal(roundZoom(1.026), 1.026);
  assert.equal(roundZoom(2.34567), 2.346);
});

test("getDistance and getMidpoint calculate pointer geometry", () => {
  const first = { x: 0, y: 0 };
  const second = { x: 6, y: 8 };

  assert.equal(getDistance(first, second), 10);
  assert.deepEqual(getMidpoint(first, second), { x: 3, y: 4 });
});

test("getContainedSize preserves image aspect ratio within the viewport", () => {
  assert.deepEqual(
    getContainedSize({ width: 1600, height: 900 }, { width: 800, height: 800 }),
    { width: 800, height: 450 },
  );

  assert.deepEqual(
    getContainedSize({ width: 900, height: 1600 }, { width: 800, height: 800 }),
    { width: 450, height: 800 },
  );
});

test("getContainedSize handles empty viewport and missing image dimensions", () => {
  assert.deepEqual(
    getContainedSize({ width: 1600, height: 900 }, { width: 0, height: 800 }),
    { width: 0, height: 0 },
  );

  assert.deepEqual(
    getContainedSize({ width: 0, height: 0 }, { width: 800, height: 600 }),
    { width: 800, height: 600 },
  );
});

test("clampOffsetToBounds resets offsets at minimum zoom", () => {
  const offset = clampOffsetToBounds(
    { x: 100, y: -100 },
    MIN_ZOOM,
    { width: 400, height: 300 },
    { width: 200, height: 150 },
  );

  assert.deepEqual(offset, { x: 0, y: 0 });
});

test("clampOffsetToBounds limits panning to scaled content edges", () => {
  const offset = clampOffsetToBounds(
    { x: 999, y: -999 },
    2,
    { width: 400, height: 300 },
    { width: 500, height: 200 },
  );

  assert.deepEqual(offset, { x: 150, y: -200 });
});
