import test from "node:test";
import assert from "node:assert/strict";

import {
  add,
  cabinetPolarPoint,
  clamp,
  closestPointOnSegment,
  degreesToRadians,
  distance,
  getAngleDegrees,
  getRotatedRectBounds,
  getRotatedRectCorners,
  getTextRotation,
  getUnitVector,
  normalize,
  normalizeDegrees,
  pointInPolygon,
  pointToSegmentDistance,
  polarPoint,
  segmentsIntersect,
} from "../components/editor/geometry.ts";

function assertPointClose(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual.x - expected.x) <= tolerance, `x mismatch: ${actual.x} vs ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) <= tolerance, `y mismatch: ${actual.y} vs ${expected.y}`);
}

test("geometry helpers preserve current scalar and vector behavior", () => {
  assert.equal(clamp(12, 0, 10), 10);
  assert.deepEqual(add({ x: 2, y: 3 }, { x: -1, y: 5 }), { x: 1, y: 8 });
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.deepEqual(normalize({ x: 0, y: 0 }), { x: 0, y: 0 });
  assert.deepEqual(getUnitVector({ x: 4, y: 4 }, { x: 4, y: 4 }), { x: 1, y: 0 });
  assert.equal(getTextRotation({ x: 0, y: 0 }, { x: -10, y: 0 }), 360);
  assert.equal(normalizeDegrees(-450), 270);
  assert.equal(degreesToRadians(180), Math.PI);
  assert.equal(getAngleDegrees({ x: 0, y: 0 }, { x: 0, y: 1 }), 90);
});

test("segment and polygon helpers preserve current edge cases", () => {
  assert.deepEqual(
    closestPointOnSegment({ x: 5, y: 8 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    { x: 5, y: 0 }
  );
  assert.deepEqual(
    closestPointOnSegment({ x: 5, y: 8 }, { x: 2, y: 2 }, { x: 2, y: 2 }),
    { x: 2, y: 2 }
  );
  assert.equal(
    pointToSegmentDistance({ x: 5, y: 8 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    8
  );
  assert.equal(
    pointInPolygon(
      { x: 4, y: 4 },
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]
    ),
    true
  );
  assert.equal(
    segmentsIntersect(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 }
    ),
    true
  );
  assert.equal(
    segmentsIntersect(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 15, y: 0 }
    ),
    true
  );
});

test("rotated rectangle helpers preserve current bounds and corner math", () => {
  const corners = getRotatedRectCorners({ x: 0, y: 0 }, 10, 4, 90);
  assertPointClose(corners[0], { x: 2, y: -5 });
  assertPointClose(corners[1], { x: 2, y: 5 });
  assertPointClose(corners[2], { x: -2, y: 5 });
  assertPointClose(corners[3], { x: -2, y: -5 });

  const bounds = getRotatedRectBounds({ x: 10, y: 20 }, 8, 6, 0);
  assert.deepEqual(bounds, {
    minX: 6,
    maxX: 14,
    minY: 17,
    maxY: 23,
  });
});

test("polar helpers preserve current axis orientation", () => {
  assertPointClose(polarPoint(10, 20, 5, 90), { x: 10, y: 25 });
  assertPointClose(cabinetPolarPoint({ x: 10, y: 20 }, 5, 90), { x: 10, y: 15 });
});
