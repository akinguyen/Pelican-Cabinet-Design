import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { createWallGraphs3DEdges, type Wall3DEdge } from "@/engine/walls/wall3DGeometry";
import type { SceneEntityBounds } from "../sceneEntityBoundsTypes";
import type { SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";

const MIN_MEASUREMENT_LENGTH_INCHES = 3;
const OVERLAP_TOLERANCE_INCHES = 0.5;
const DEFAULT_MEASUREMENT_Z_INCHES = 8.5;
const WALL_BODY_MEASUREMENT_OVERLAY_OFFSET_INCHES = 0.35;
const FLOOR_MEASUREMENT_OVERLAY_OFFSET_INCHES = 3;
const ZERO_Z_INCHES = 0;

export type SceneEntityWallMeasurementGuide = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
  labelPointInches: Point3DInches;
  labelRotationDegrees: number;
}>;

export function buildSceneEntityWallMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly SceneEntityWallMeasurementGuide[] {
  const sourceId = `${args.bounds.entityKind}:${args.bounds.entityId}`;
  return [
    createNearestWallMeasurementGuide({
      footprintPointsInches: args.bounds.footprintCornersInches,
      footprintCenterInches: args.bounds.footprint.centerPointInches,
      measurementZInches: getBodyMeasurementZInches(args.bounds),
      placedWallGraphs: args.placedWallGraphs,
      sourceId,
    }),
    createFloorMeasurementGuide({ bounds: args.bounds, sourceId }),
  ].filter(isSceneEntityWallMeasurementGuide);
}

export function buildSceneEntityWallMeasurementGuidesFromFootprint(args: {
  footprint: SceneEntityPlanFootprint;
  placedWallGraphs: readonly PlacedWallGraph[];
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  return [
    createNearestWallMeasurementGuide({
      footprintPointsInches: args.footprint.cornerPointsInches,
      footprintCenterInches: args.footprint.centerPointInches,
      measurementZInches: DEFAULT_MEASUREMENT_Z_INCHES,
      placedWallGraphs: args.placedWallGraphs,
      sourceId: args.sourceId,
    }),
  ].filter(isSceneEntityWallMeasurementGuide);
}

type WallDistanceCandidate = Readonly<{
  wallEdge: Wall3DEdge;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
  labelPointInches: Point3DInches;
}>;

function createNearestWallMeasurementGuide(args: {
  footprintPointsInches: readonly Point3DInches[];
  footprintCenterInches: Point3DInches;
  measurementZInches: number;
  placedWallGraphs: readonly PlacedWallGraph[];
  sourceId: string;
}): SceneEntityWallMeasurementGuide | null {
  const nearestCandidate = createWallGraphs3DEdges(args.placedWallGraphs)
    .filter(isWallFaceBottomEdge)
    .map((wallEdge) => createWallDistanceCandidate({
      wallEdge,
      footprintPointsInches: args.footprintPointsInches,
      footprintCenterInches: args.footprintCenterInches,
      measurementZInches: args.measurementZInches,
    }))
    .filter(isWallDistanceCandidate)
    .sort((firstCandidate, secondCandidate) => firstCandidate.lengthInches - secondCandidate.lengthInches)[0];

  if (nearestCandidate === undefined) {
    return null;
  }

  return {
    id: `scene-entity-wall-measurement:${args.sourceId}:nearest-wall:${nearestCandidate.wallEdge.id}`,
    startPointInches: nearestCandidate.startPointInches,
    endPointInches: nearestCandidate.endPointInches,
    lengthInches: nearestCandidate.lengthInches,
    labelPointInches: nearestCandidate.labelPointInches,
    labelRotationDegrees: 0,
  };
}

function createWallDistanceCandidate(args: {
  wallEdge: Wall3DEdge;
  footprintPointsInches: readonly Point3DInches[];
  footprintCenterInches: Point3DInches;
  measurementZInches: number;
}): WallDistanceCandidate | null {
  const wallNormalInches = normalizePlanVector(args.wallEdge.normalInches);
  const wallTangentInches = normalizePlanVector({
    xInches: args.wallEdge.endPointInches.xInches - args.wallEdge.startPointInches.xInches,
    yInches: args.wallEdge.endPointInches.yInches - args.wallEdge.startPointInches.yInches,
    zInches: 0,
  });

  if (wallNormalInches === null || wallTangentInches === null || args.footprintPointsInches.length === 0) {
    return null;
  }

  const wallCoordinateInches = dotPlan(args.wallEdge.startPointInches, wallNormalInches);
  const wallStartTangentInches = dotPlan(args.wallEdge.startPointInches, wallTangentInches);
  const wallEndTangentInches = dotPlan(args.wallEdge.endPointInches, wallTangentInches);
  const wallMinTangentInches = Math.min(wallStartTangentInches, wallEndTangentInches);
  const wallMaxTangentInches = Math.max(wallStartTangentInches, wallEndTangentInches);
  const footprintNormalValuesInches = args.footprintPointsInches.map((pointInches) => dotPlan(pointInches, wallNormalInches));
  const footprintTangentValuesInches = args.footprintPointsInches.map((pointInches) => dotPlan(pointInches, wallTangentInches));
  const footprintMinNormalInches = Math.min(...footprintNormalValuesInches);
  const footprintMaxNormalInches = Math.max(...footprintNormalValuesInches);
  const footprintMinTangentInches = Math.min(...footprintTangentValuesInches);
  const footprintMaxTangentInches = Math.max(...footprintTangentValuesInches);
  const overlapMinTangentInches = Math.max(footprintMinTangentInches, wallMinTangentInches);
  const overlapMaxTangentInches = Math.min(footprintMaxTangentInches, wallMaxTangentInches);

  if (overlapMaxTangentInches < overlapMinTangentInches - OVERLAP_TOLERANCE_INCHES) {
    return null;
  }

  const objectIsOnNormalSide = footprintMinNormalInches >= wallCoordinateInches;
  const objectIsOnOppositeSide = footprintMaxNormalInches <= wallCoordinateInches;

  if (!objectIsOnNormalSide && !objectIsOnOppositeSide) {
    return null;
  }

  const objectSideNormalInches = objectIsOnNormalSide ? footprintMinNormalInches : footprintMaxNormalInches;
  const lengthInches = Math.abs(objectSideNormalInches - wallCoordinateInches);

  if (lengthInches < MIN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const centerTangentInches = dotPlan(args.footprintCenterInches, wallTangentInches);
  const measurementTangentInches = clamp(centerTangentInches, overlapMinTangentInches, overlapMaxTangentInches);
  const overlaySign = objectIsOnNormalSide ? 1 : -1;
  const overlayOffsetInches = multiplyPlanVector(
    wallNormalInches,
    overlaySign * WALL_BODY_MEASUREMENT_OVERLAY_OFFSET_INCHES,
  );
  const startPointInches = addPoint(
    createPointFromPlanAxes({
      tangentAxisInches: wallTangentInches,
      normalAxisInches: wallNormalInches,
      tangentInches: measurementTangentInches,
      normalInches: objectSideNormalInches,
      zInches: args.measurementZInches,
    }),
    overlayOffsetInches,
  );
  const endPointInches = addPoint(
    createPointFromPlanAxes({
      tangentAxisInches: wallTangentInches,
      normalAxisInches: wallNormalInches,
      tangentInches: measurementTangentInches,
      normalInches: wallCoordinateInches,
      zInches: args.measurementZInches,
    }),
    overlayOffsetInches,
  );

  return {
    wallEdge: args.wallEdge,
    startPointInches,
    endPointInches,
    lengthInches,
    labelPointInches: getMidpoint(startPointInches, endPointInches),
  };
}

function createFloorMeasurementGuide(args: {
  bounds: SceneEntityBounds;
  sourceId: string;
}): SceneEntityWallMeasurementGuide | null {
  const floorDistanceInches = args.bounds.heightRangeInches.minZInches;

  if (floorDistanceInches < MIN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const anchorPointInches = createFloorMeasurementAnchorPoint(args.bounds);
  const startPointInches = {
    xInches: anchorPointInches.xInches,
    yInches: anchorPointInches.yInches,
    zInches: args.bounds.heightRangeInches.minZInches,
  };
  const endPointInches = {
    xInches: anchorPointInches.xInches,
    yInches: anchorPointInches.yInches,
    zInches: ZERO_Z_INCHES,
  };

  return {
    id: `scene-entity-wall-measurement:${args.sourceId}:floor`,
    startPointInches,
    endPointInches,
    lengthInches: floorDistanceInches,
    labelPointInches: getMidpoint(startPointInches, endPointInches),
    labelRotationDegrees: 90,
  };
}

function createFloorMeasurementAnchorPoint(bounds: SceneEntityBounds): Point3DInches {
  const centerPointInches = bounds.footprint.centerPointInches;
  const anchorCornerInches = bounds.footprintCornersInches
    .map((cornerPointInches) => ({
      cornerPointInches,
      distanceInches: getPlanDistance(cornerPointInches, centerPointInches),
    }))
    .sort((firstCorner, secondCorner) => secondCorner.distanceInches - firstCorner.distanceInches)[0]?.cornerPointInches ?? centerPointInches;
  const outwardVectorInches = normalizePlanVector({
    xInches: anchorCornerInches.xInches - centerPointInches.xInches,
    yInches: anchorCornerInches.yInches - centerPointInches.yInches,
    zInches: 0,
  }) ?? { xInches: 1, yInches: 0, zInches: 0 };

  return addPoint(
    anchorCornerInches,
    multiplyPlanVector(outwardVectorInches, FLOOR_MEASUREMENT_OVERLAY_OFFSET_INCHES),
  );
}

function isWallFaceBottomEdge(wallEdge: Wall3DEdge): boolean {
  return wallEdge.role === "face-bottom" && wallEdge.normalInches !== undefined;
}

function getBodyMeasurementZInches(bounds: SceneEntityBounds): number {
  return (bounds.heightRangeInches.minZInches + bounds.heightRangeInches.maxZInches) / 2;
}

function createPointFromPlanAxes(args: {
  tangentAxisInches: Point3DInches;
  normalAxisInches: Point3DInches;
  tangentInches: number;
  normalInches: number;
  zInches: number;
}): Point3DInches {
  return {
    xInches: args.tangentAxisInches.xInches * args.tangentInches + args.normalAxisInches.xInches * args.normalInches,
    yInches: args.tangentAxisInches.yInches * args.tangentInches + args.normalAxisInches.yInches * args.normalInches,
    zInches: args.zInches,
  };
}

function normalizePlanVector(pointInches: Point3DInches | undefined): Point3DInches | null {
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

function dotPlan(firstPointInches: Point3DInches, secondPointInches: Point3DInches): number {
  return firstPointInches.xInches * secondPointInches.xInches +
    firstPointInches.yInches * secondPointInches.yInches;
}

function multiplyPlanVector(pointInches: Point3DInches, scalar: number): Point3DInches {
  return {
    xInches: pointInches.xInches * scalar,
    yInches: pointInches.yInches * scalar,
    zInches: 0,
  };
}

function addPoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: firstPointInches.xInches + secondPointInches.xInches,
    yInches: firstPointInches.yInches + secondPointInches.yInches,
    zInches: firstPointInches.zInches + secondPointInches.zInches,
  };
}

function getMidpoint(startPointInches: Point3DInches, endPointInches: Point3DInches): Point3DInches {
  return {
    xInches: (startPointInches.xInches + endPointInches.xInches) / 2,
    yInches: (startPointInches.yInches + endPointInches.yInches) / 2,
    zInches: (startPointInches.zInches + endPointInches.zInches) / 2,
  };
}

function getPlanDistance(firstPointInches: Point3DInches, secondPointInches: Point3DInches): number {
  return Math.hypot(
    firstPointInches.xInches - secondPointInches.xInches,
    firstPointInches.yInches - secondPointInches.yInches,
  );
}

function clamp(valueInches: number, minInches: number, maxInches: number): number {
  return Math.min(Math.max(valueInches, minInches), maxInches);
}

function isSceneEntityWallMeasurementGuide(
  measurementGuide: SceneEntityWallMeasurementGuide | null,
): measurementGuide is SceneEntityWallMeasurementGuide {
  return measurementGuide !== null;
}

function isWallDistanceCandidate(
  candidate: WallDistanceCandidate | null,
): candidate is WallDistanceCandidate {
  return candidate !== null;
}
