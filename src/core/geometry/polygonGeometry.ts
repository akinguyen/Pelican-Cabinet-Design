import type { Point2DInches } from "./pointTypes";

export function isPointInsidePolygon(
  pointInches: Point2DInches,
  polygonInches: readonly Point2DInches[],
): boolean {
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
