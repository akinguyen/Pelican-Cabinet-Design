import { ExtrudeGeometry, Path, Shape } from "three";
import type { Point2DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import { canUseDirectCountertopHoleGeometry } from "@/engine/countertops/countertopHoleGeometryStrategy";
import { createCountertopSolidAreaLoops } from "@/engine/countertops/countertopRemovedAreaGeometry";
import type { PrimitiveCountertopSlabGeometry } from "../primitiveGeometryTypes";

export function createCountertopSlabGeometry(
  geometry: PrimitiveCountertopSlabGeometry,
  sizeInches: Size3DInches,
): ExtrudeGeometry {
  const removedPolygonsInches = geometry.openingsInches.map(
    (openingInches) => openingInches.clippedPolygonInches,
  );
  const slabShapes = canUseDirectCountertopHoleGeometry(sizeInches, removedPolygonsInches)
    ? createCountertopShapeWithDirectHoles(sizeInches, removedPolygonsInches)
    : createCountertopSolidAreaShapes(
        createCountertopSolidAreaLoops({
          countertopSizeInches: sizeInches,
          removedPolygonsInches,
        }),
      );
  const slabGeometry = new ExtrudeGeometry(slabShapes, {
    bevelEnabled: false,
    depth: sizeInches.heightInches,
  });

  slabGeometry.translate(0, 0, -sizeInches.heightInches / 2);
  slabGeometry.computeVertexNormals();
  slabGeometry.computeBoundingBox();
  slabGeometry.computeBoundingSphere();

  return slabGeometry;
}


function createCountertopShapeWithDirectHoles(
  sizeInches: Size3DInches,
  removedPolygonsInches: readonly (readonly Point2DInches[])[],
): Shape[] {
  const halfWidthInches = sizeInches.widthInches / 2;
  const halfDepthInches = sizeInches.depthInches / 2;
  const countertopShape = createShapeFromLoop([
    { xInches: -halfWidthInches, yInches: -halfDepthInches },
    { xInches: halfWidthInches, yInches: -halfDepthInches },
    { xInches: halfWidthInches, yInches: halfDepthInches },
    { xInches: -halfWidthInches, yInches: halfDepthInches },
  ]);

  removedPolygonsInches.forEach((polygonInches) => {
    if (polygonInches.length >= 3) {
      countertopShape.holes.push(createPathFromLoop(createClockwisePolygon(polygonInches)));
    }
  });

  return [countertopShape];
}

function createCountertopSolidAreaShapes(
  solidAreaLoopsInches: readonly (readonly Point2DInches[])[],
): Shape[] {
  const outerLoopsInches = solidAreaLoopsInches.filter(
    (loopInches) => getSignedPolygonAreaInches(loopInches) > 0,
  );
  const holeLoopsInches = solidAreaLoopsInches.filter(
    (loopInches) => getSignedPolygonAreaInches(loopInches) < 0,
  );

  return outerLoopsInches.map((outerLoopInches) => {
    const outerShape = createShapeFromLoop(createCounterClockwisePolygon(outerLoopInches));

    holeLoopsInches
      .filter((holeLoopInches) => isPointInsidePolygon(holeLoopInches[0], outerLoopInches))
      .forEach((holeLoopInches) => {
        outerShape.holes.push(createPathFromLoop(createClockwisePolygon(holeLoopInches)));
      });

    return outerShape;
  });
}

function createShapeFromLoop(loopInches: readonly Point2DInches[]): Shape {
  const shape = new Shape();
  const firstPointInches = loopInches[0];

  shape.moveTo(firstPointInches.xInches, firstPointInches.yInches);
  loopInches.slice(1).forEach((pointInches) => {
    shape.lineTo(pointInches.xInches, pointInches.yInches);
  });
  shape.lineTo(firstPointInches.xInches, firstPointInches.yInches);

  return shape;
}

function createPathFromLoop(loopInches: readonly Point2DInches[]): Path {
  const path = new Path();
  const firstPointInches = loopInches[0];

  path.moveTo(firstPointInches.xInches, firstPointInches.yInches);
  loopInches.slice(1).forEach((pointInches) => {
    path.lineTo(pointInches.xInches, pointInches.yInches);
  });
  path.lineTo(firstPointInches.xInches, firstPointInches.yInches);

  return path;
}

function createCounterClockwisePolygon(polygonInches: readonly Point2DInches[]): readonly Point2DInches[] {
  return getSignedPolygonAreaInches(polygonInches) < 0
    ? [...polygonInches].reverse()
    : polygonInches;
}

function createClockwisePolygon(polygonInches: readonly Point2DInches[]): readonly Point2DInches[] {
  return getSignedPolygonAreaInches(polygonInches) > 0
    ? [...polygonInches].reverse()
    : polygonInches;
}

function getSignedPolygonAreaInches(polygonInches: readonly Point2DInches[]): number {
  let doubledAreaInches = 0;

  polygonInches.forEach((pointInches, pointIndex) => {
    const nextPointInches = polygonInches[(pointIndex + 1) % polygonInches.length];
    doubledAreaInches +=
      pointInches.xInches * nextPointInches.yInches -
      nextPointInches.xInches * pointInches.yInches;
  });

  return doubledAreaInches / 2;
}

function isPointInsidePolygon(pointInches: Point2DInches, polygonInches: readonly Point2DInches[]): boolean {
  let isInside = false;

  for (let pointIndex = 0, previousIndex = polygonInches.length - 1; pointIndex < polygonInches.length; previousIndex = pointIndex, pointIndex += 1) {
    const currentPoint = polygonInches[pointIndex];
    const previousPoint = polygonInches[previousIndex];
    const intersects =
      currentPoint.yInches > pointInches.yInches !== previousPoint.yInches > pointInches.yInches &&
      pointInches.xInches <
        ((previousPoint.xInches - currentPoint.xInches) *
          (pointInches.yInches - currentPoint.yInches)) /
          (previousPoint.yInches - currentPoint.yInches) +
          currentPoint.xInches;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}
