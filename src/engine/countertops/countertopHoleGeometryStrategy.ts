import type { Point2DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";

const BOUNDS_TOUCH_EPSILON_INCHES = 0.001;

export function canUseDirectCountertopHoleGeometry(
  countertopSizeInches: Size3DInches,
  removedPolygonsInches: readonly (readonly Point2DInches[])[],
): boolean {
  if (removedPolygonsInches.length === 0) {
    return true;
  }

  return (
    removedPolygonsInches.every((polygonInches) =>
      isPolygonFullyInsideCountertopBounds(countertopSizeInches, polygonInches),
    ) && !doAnyPolygonsOverlap(removedPolygonsInches)
  );
}

function isPolygonFullyInsideCountertopBounds(
  countertopSizeInches: Size3DInches,
  polygonInches: readonly Point2DInches[],
): boolean {
  const halfWidthInches = countertopSizeInches.widthInches / 2;
  const halfDepthInches = countertopSizeInches.depthInches / 2;

  return polygonInches.every(
    (pointInches) =>
      pointInches.xInches > -halfWidthInches + BOUNDS_TOUCH_EPSILON_INCHES &&
      pointInches.xInches < halfWidthInches - BOUNDS_TOUCH_EPSILON_INCHES &&
      pointInches.yInches > -halfDepthInches + BOUNDS_TOUCH_EPSILON_INCHES &&
      pointInches.yInches < halfDepthInches - BOUNDS_TOUCH_EPSILON_INCHES,
  );
}

function doAnyPolygonsOverlap(polygonsInches: readonly (readonly Point2DInches[])[]): boolean {
  for (let firstIndex = 0; firstIndex < polygonsInches.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < polygonsInches.length; secondIndex += 1) {
      if (doPolygonsOverlap(polygonsInches[firstIndex], polygonsInches[secondIndex])) {
        return true;
      }
    }
  }

  return false;
}

function doPolygonsOverlap(
  firstPolygonInches: readonly Point2DInches[],
  secondPolygonInches: readonly Point2DInches[],
): boolean {
  return (
    firstPolygonInches.some((pointInches) => isPointInsidePolygon(pointInches, secondPolygonInches)) ||
    secondPolygonInches.some((pointInches) => isPointInsidePolygon(pointInches, firstPolygonInches)) ||
    doPolygonEdgesIntersect(firstPolygonInches, secondPolygonInches)
  );
}

function doPolygonEdgesIntersect(
  firstPolygonInches: readonly Point2DInches[],
  secondPolygonInches: readonly Point2DInches[],
): boolean {
  return firstPolygonInches.some((firstStartInches, firstIndex) => {
    const firstEndInches = firstPolygonInches[(firstIndex + 1) % firstPolygonInches.length];

    return secondPolygonInches.some((secondStartInches, secondIndex) => {
      const secondEndInches = secondPolygonInches[(secondIndex + 1) % secondPolygonInches.length];

      return doSegmentsIntersect(
        firstStartInches,
        firstEndInches,
        secondStartInches,
        secondEndInches,
      );
    });
  });
}

function doSegmentsIntersect(
  firstStartInches: Point2DInches,
  firstEndInches: Point2DInches,
  secondStartInches: Point2DInches,
  secondEndInches: Point2DInches,
): boolean {
  const firstDirection = getOrientation(firstStartInches, firstEndInches, secondStartInches);
  const secondDirection = getOrientation(firstStartInches, firstEndInches, secondEndInches);
  const thirdDirection = getOrientation(secondStartInches, secondEndInches, firstStartInches);
  const fourthDirection = getOrientation(secondStartInches, secondEndInches, firstEndInches);

  return firstDirection * secondDirection < 0 && thirdDirection * fourthDirection < 0;
}

function getOrientation(
  startInches: Point2DInches,
  endInches: Point2DInches,
  pointInches: Point2DInches,
): number {
  return (
    (endInches.xInches - startInches.xInches) * (pointInches.yInches - startInches.yInches) -
    (endInches.yInches - startInches.yInches) * (pointInches.xInches - startInches.xInches)
  );
}

function isPointInsidePolygon(pointInches: Point2DInches, polygonInches: readonly Point2DInches[]): boolean {
  let isInside = false;

  for (
    let pointIndex = 0, previousIndex = polygonInches.length - 1;
    pointIndex < polygonInches.length;
    previousIndex = pointIndex, pointIndex += 1
  ) {
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
