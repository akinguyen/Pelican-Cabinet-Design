import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { WallFootprint } from "./wallFootprintTypes";

const GEOMETRY_EPSILON = 0.0001;

export function getWallFootprintEdgeCount(footprint: WallFootprint): number {
  return footprint.boundaryPointsInches.length;
}

export function getAllWallFootprintEdgeIndices(footprint: WallFootprint): readonly number[] {
  return Array.from({ length: getWallFootprintEdgeCount(footprint) }, (_, edgeIndex) => edgeIndex);
}

export function normalizeWallFootprintWinding(
  boundaryPointsInches: readonly Point3DInches[],
): readonly Point3DInches[] {
  if (getPolygonAreaSquareInches(boundaryPointsInches) >= 0) {
    return boundaryPointsInches;
  }

  return [...boundaryPointsInches].reverse();
}

export function getClosedPolygonEdges(
  boundaryPointsInches: readonly Point3DInches[],
): readonly Readonly<{
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>[] {
  if (boundaryPointsInches.length < 2) {
    return [];
  }

  return boundaryPointsInches.map((pointInches, pointIndex) => ({
    startPointInches: pointInches,
    endPointInches: boundaryPointsInches[(pointIndex + 1) % boundaryPointsInches.length],
  }));
}

export function getPolygonAreaSquareInches(pointsInches: readonly Point3DInches[]): number {
  if (pointsInches.length < 3) {
    return 0;
  }

  let areaSquareInches = 0;

  pointsInches.forEach((pointInches, pointIndex) => {
    const nextPointInches = pointsInches[(pointIndex + 1) % pointsInches.length];
    areaSquareInches +=
      pointInches.xInches * nextPointInches.yInches -
      nextPointInches.xInches * pointInches.yInches;
  });

  return areaSquareInches / 2;
}

export function projectPointToSegment(args: {
  pointInches: Point3DInches;
  segmentStartInches: Point3DInches;
  segmentEndInches: Point3DInches;
}): Readonly<{
  pointInches: Point3DInches;
  t: number;
  distanceInches: number;
}> {
  const segmentXInches = args.segmentEndInches.xInches - args.segmentStartInches.xInches;
  const segmentYInches = args.segmentEndInches.yInches - args.segmentStartInches.yInches;
  const segmentLengthSquaredInches = segmentXInches * segmentXInches + segmentYInches * segmentYInches;

  if (segmentLengthSquaredInches <= GEOMETRY_EPSILON) {
    return {
      pointInches: args.segmentStartInches,
      t: 0,
      distanceInches: getPoint3DDistanceInches(args.pointInches, args.segmentStartInches),
    };
  }

  const rawT =
    ((args.pointInches.xInches - args.segmentStartInches.xInches) * segmentXInches +
      (args.pointInches.yInches - args.segmentStartInches.yInches) * segmentYInches) /
    segmentLengthSquaredInches;
  const t = Math.min(1, Math.max(0, rawT));
  const projectedPointInches = {
    xInches: args.segmentStartInches.xInches + segmentXInches * t,
    yInches: args.segmentStartInches.yInches + segmentYInches * t,
    zInches: 0,
  };

  return {
    pointInches: projectedPointInches,
    t,
    distanceInches: getPoint3DDistanceInches(args.pointInches, projectedPointInches),
  };
}

export function isPointInsidePolygon(args: {
  pointInches: Point3DInches;
  polygonInches: readonly Point3DInches[];
}): boolean {
  let isInside = false;
  const { pointInches, polygonInches } = args;

  for (
    let pointIndex = 0, previousPointIndex = polygonInches.length - 1;
    pointIndex < polygonInches.length;
    previousPointIndex = pointIndex, pointIndex += 1
  ) {
    const point = polygonInches[pointIndex];
    const previousPoint = polygonInches[previousPointIndex];
    const intersects =
      point.yInches > pointInches.yInches !== previousPoint.yInches > pointInches.yInches &&
      pointInches.xInches <
        ((previousPoint.xInches - point.xInches) * (pointInches.yInches - point.yInches)) /
          (previousPoint.yInches - point.yInches) +
          point.xInches;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

export function removeDuplicateAdjacentPoints(
  pointsInches: readonly Point3DInches[],
): readonly Point3DInches[] {
  const dedupedPointsInches: Point3DInches[] = [];

  pointsInches.forEach((pointInches) => {
    const previousPointInches = dedupedPointsInches[dedupedPointsInches.length - 1];

    if (
      previousPointInches === undefined ||
      getPoint3DDistanceInches(previousPointInches, pointInches) > GEOMETRY_EPSILON
    ) {
      dedupedPointsInches.push(pointInches);
    }
  });

  if (
    dedupedPointsInches.length > 1 &&
    getPoint3DDistanceInches(
      dedupedPointsInches[0],
      dedupedPointsInches[dedupedPointsInches.length - 1],
    ) <= GEOMETRY_EPSILON
  ) {
    dedupedPointsInches.pop();
  }

  return dedupedPointsInches;
}

export function doWallFootprintSegmentsIntersect(
  firstEdge: Readonly<{ startPointInches: Point3DInches; endPointInches: Point3DInches }>,
  secondEdge: Readonly<{ startPointInches: Point3DInches; endPointInches: Point3DInches }>,
): boolean {
  const firstA = firstEdge.startPointInches;
  const firstB = firstEdge.endPointInches;
  const secondA = secondEdge.startPointInches;
  const secondB = secondEdge.endPointInches;
  const firstDirection = getOrientation(firstA, firstB, secondA);
  const secondDirection = getOrientation(firstA, firstB, secondB);
  const thirdDirection = getOrientation(secondA, secondB, firstA);
  const fourthDirection = getOrientation(secondA, secondB, firstB);

  if (firstDirection !== secondDirection && thirdDirection !== fourthDirection) {
    return true;
  }

  return (
    (firstDirection === 0 && isPointOnSegment(firstA, secondA, firstB)) ||
    (secondDirection === 0 && isPointOnSegment(firstA, secondB, firstB)) ||
    (thirdDirection === 0 && isPointOnSegment(secondA, firstA, secondB)) ||
    (fourthDirection === 0 && isPointOnSegment(secondA, firstB, secondB))
  );
}

function getOrientation(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
  thirdPointInches: Point3DInches,
): -1 | 0 | 1 {
  const value =
    (secondPointInches.yInches - firstPointInches.yInches) *
      (thirdPointInches.xInches - secondPointInches.xInches) -
    (secondPointInches.xInches - firstPointInches.xInches) *
      (thirdPointInches.yInches - secondPointInches.yInches);

  if (Math.abs(value) <= GEOMETRY_EPSILON) {
    return 0;
  }

  return value > 0 ? 1 : -1;
}

function isPointOnSegment(
  startPointInches: Point3DInches,
  testPointInches: Point3DInches,
  endPointInches: Point3DInches,
): boolean {
  return (
    testPointInches.xInches <= Math.max(startPointInches.xInches, endPointInches.xInches) + GEOMETRY_EPSILON &&
    testPointInches.xInches >= Math.min(startPointInches.xInches, endPointInches.xInches) - GEOMETRY_EPSILON &&
    testPointInches.yInches <= Math.max(startPointInches.yInches, endPointInches.yInches) + GEOMETRY_EPSILON &&
    testPointInches.yInches >= Math.min(startPointInches.yInches, endPointInches.yInches) - GEOMETRY_EPSILON
  );
}
