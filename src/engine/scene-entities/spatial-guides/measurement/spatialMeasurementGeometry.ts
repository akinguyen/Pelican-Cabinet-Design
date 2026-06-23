import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { Wall3DEdge } from "@/engine/walls/wall3DGeometry";

export const MIN_MEASUREMENT_LENGTH_INCHES = 3;
export const WALL_BODY_MEASUREMENT_OVERLAY_OFFSET_INCHES = 0.35;
export const WALL_SEGMENT_INTERSECTION_TOLERANCE_INCHES = 0.001;

export type SpatialPlanFaceAnchor = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  directionInches: Point3DInches;
}>;

export type SpatialPlanWallRayHit = Readonly<{
  wallEdge: Wall3DEdge;
  endPointInches: Point3DInches;
  lengthInches: number;
}>;

export function createPlanFaceAnchorsFromBounds(bounds: SceneEntityBounds): readonly SpatialPlanFaceAnchor[] {
  return createPlanFaceAnchorsFromFootprint({
    footprintPointsInches: bounds.footprintCornersInches,
    footprintCenterInches: bounds.footprint.centerPointInches,
    measurementZInches: getBodyMeasurementZInches(bounds),
  });
}

export function createPlanFaceAnchorsFromSceneEntityFootprint(args: {
  footprint: SceneEntityPlanFootprint;
  measurementZInches: number;
}): readonly SpatialPlanFaceAnchor[] {
  return createPlanFaceAnchorsFromFootprint({
    footprintPointsInches: args.footprint.cornerPointsInches,
    footprintCenterInches: args.footprint.centerPointInches,
    measurementZInches: args.measurementZInches,
  });
}

export function findNearestWallHitFromPlanFaceAnchor(args: {
  faceAnchor: SpatialPlanFaceAnchor;
  wallEdges: readonly Wall3DEdge[];
}): SpatialPlanWallRayHit | null {
  const hits = args.wallEdges
    .map((wallEdge) => createRayWallEdgeIntersection({ faceAnchor: args.faceAnchor, wallEdge }))
    .filter(isNonNullable)
    .sort((firstHit, secondHit) => firstHit.lengthInches - secondHit.lengthInches);

  return hits[0] ?? null;
}

export function normalizePlanVector(pointInches: Point3DInches | undefined): Point3DInches | null {
  if (pointInches === undefined) {
    return null;
  }

  const lengthInches = Math.hypot(pointInches.xInches, pointInches.yInches);
  if (lengthInches <= 0.000001) {
    return null;
  }

  return {
    xInches: pointInches.xInches / lengthInches,
    yInches: pointInches.yInches / lengthInches,
    zInches: 0,
  };
}

export function addPoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: firstPointInches.xInches + secondPointInches.xInches,
    yInches: firstPointInches.yInches + secondPointInches.yInches,
    zInches: firstPointInches.zInches + secondPointInches.zInches,
  };
}

export function multiplyPoint(pointInches: Point3DInches, scalar: number): Point3DInches {
  return {
    xInches: pointInches.xInches * scalar,
    yInches: pointInches.yInches * scalar,
    zInches: pointInches.zInches * scalar,
  };
}

export function getMidpoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: (firstPointInches.xInches + secondPointInches.xInches) / 2,
    yInches: (firstPointInches.yInches + secondPointInches.yInches) / 2,
    zInches: (firstPointInches.zInches + secondPointInches.zInches) / 2,
  };
}

export function isNonNullable<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function createPlanFaceAnchorsFromFootprint(args: {
  footprintPointsInches: readonly Point3DInches[];
  footprintCenterInches: Point3DInches;
  measurementZInches: number;
}): readonly SpatialPlanFaceAnchor[] {
  if (args.footprintPointsInches.length < 2) {
    return [];
  }

  return args.footprintPointsInches.map((startPointInches, edgeIndex) => {
    const endPointInches = args.footprintPointsInches[(edgeIndex + 1) % args.footprintPointsInches.length];
    const midpointInches = {
      xInches: (startPointInches.xInches + endPointInches.xInches) / 2,
      yInches: (startPointInches.yInches + endPointInches.yInches) / 2,
      zInches: args.measurementZInches,
    };
    const directionInches = normalizePlanVector({
      xInches: midpointInches.xInches - args.footprintCenterInches.xInches,
      yInches: midpointInches.yInches - args.footprintCenterInches.yInches,
      zInches: 0,
    }) ?? normalizePlanVector({
      xInches: endPointInches.yInches - startPointInches.yInches,
      yInches: -(endPointInches.xInches - startPointInches.xInches),
      zInches: 0,
    }) ?? { xInches: 1, yInches: 0, zInches: 0 };

    return {
      id: `face-${edgeIndex}`,
      startPointInches: midpointInches,
      directionInches,
    };
  });
}

function createRayWallEdgeIntersection(args: {
  faceAnchor: SpatialPlanFaceAnchor;
  wallEdge: Wall3DEdge;
}): SpatialPlanWallRayHit | null {
  const rayOrigin = args.faceAnchor.startPointInches;
  const rayDirection = normalizePlanVector(args.faceAnchor.directionInches);
  const segmentStart = args.wallEdge.startPointInches;
  const segmentVector = {
    xInches: args.wallEdge.endPointInches.xInches - args.wallEdge.startPointInches.xInches,
    yInches: args.wallEdge.endPointInches.yInches - args.wallEdge.startPointInches.yInches,
    zInches: 0,
  };

  if (rayDirection === null) {
    return null;
  }

  const denominator = crossPlan(rayDirection, segmentVector);

  if (Math.abs(denominator) < 0.000001) {
    return null;
  }

  const startDelta = {
    xInches: segmentStart.xInches - rayOrigin.xInches,
    yInches: segmentStart.yInches - rayOrigin.yInches,
    zInches: 0,
  };
  const rayDistanceInches = crossPlan(startDelta, segmentVector) / denominator;
  const wallSegmentRatio = crossPlan(startDelta, rayDirection) / denominator;

  if (
    rayDistanceInches < MIN_MEASUREMENT_LENGTH_INCHES ||
    wallSegmentRatio < -WALL_SEGMENT_INTERSECTION_TOLERANCE_INCHES ||
    wallSegmentRatio > 1 + WALL_SEGMENT_INTERSECTION_TOLERANCE_INCHES
  ) {
    return null;
  }

  return {
    wallEdge: args.wallEdge,
    endPointInches: {
      xInches: rayOrigin.xInches + rayDirection.xInches * rayDistanceInches,
      yInches: rayOrigin.yInches + rayDirection.yInches * rayDistanceInches,
      zInches: rayOrigin.zInches,
    },
    lengthInches: rayDistanceInches,
  };
}

function crossPlan(firstPointInches: Point3DInches, secondPointInches: Point3DInches): number {
  return firstPointInches.xInches * secondPointInches.yInches - firstPointInches.yInches * secondPointInches.xInches;
}

function getBodyMeasurementZInches(bounds: SceneEntityBounds): number {
  return (bounds.heightRangeInches.minZInches + bounds.heightRangeInches.maxZInches) / 2;
}
