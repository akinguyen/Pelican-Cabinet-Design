import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import type { SceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";
import { createWallGraphs3DEdges, type Wall3DEdge } from "@/engine/walls/wall3DGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { SceneEntityMeasurementPolicy } from "@/engine/scene-entities/measurement/sceneEntityMeasurementPolicyTypes";
import { createSpatialGuideFrame, FLOOR_PLANE_MEASUREMENT_Z_INCHES, type SpatialGuideFrame } from "../spatialGuideFrame";
import { createPointInSpatialGuideFrame, projectPointToSpatialGuideFrame } from "../spatialGuideFrame";
import { createSpatialGuideBoundsFromSceneEntityBounds } from "./spatialMeasurementTargets";
import type { SceneEntityWallMeasurementGuide, SpatialGuideBounds } from "../spatialGuideTypes";
import { getSpatialGuideOverlayNInches } from "../spatialGuideOverlay";

const MIN_MEASUREMENT_LENGTH_INCHES = 3;
const WALL_SEGMENT_INTERSECTION_TOLERANCE_INCHES = 0.001;
const WALL_BODY_MEASUREMENT_OVERLAY_OFFSET_INCHES = 0.35;
const FLOOR_MEASUREMENT_LABEL_ROTATION_DEGREES = 90;
const ZERO_Z_INCHES = 0;

export function buildSceneEntitySpatialMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  placedWallGraphs: readonly PlacedWallGraph[];
  measurementPolicy: SceneEntityMeasurementPolicy;
  movementFrame?: SceneEntityMovementFrame | null;
}): readonly SceneEntityWallMeasurementGuide[] {
  const sourceId = `${args.bounds.entityKind}:${args.bounds.entityId}`;

  if (args.measurementPolicy === "elevation-wall-face") {
    return args.movementFrame?.kind === "wall-face-plane"
      ? createElevationWallFaceMeasurementGuides({ bounds: args.bounds, frame: createSpatialGuideFrame(args.movementFrame), sourceId })
      : [];
  }

  return [
    ...createPlanWallFaceCenterMeasurementGuides({
      bounds: args.bounds,
      placedWallGraphs: args.placedWallGraphs,
      sourceId,
    }),
    ...(args.measurementPolicy === "perspective-xy-plus-floor"
      ? [createFloorMeasurementGuide({ bounds: args.bounds, sourceId })].filter(isSceneEntityWallMeasurementGuide)
      : []),
  ];
}

export function buildSceneEntitySpatialMeasurementGuidesFromFootprint(args: {
  footprint: SceneEntityPlanFootprint;
  placedWallGraphs: readonly PlacedWallGraph[];
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  return createPlanFootprintWallMeasurementGuides({
    footprintPointsInches: args.footprint.cornerPointsInches,
    footprintCenterInches: args.footprint.centerPointInches,
    measurementZInches: FLOOR_PLANE_MEASUREMENT_Z_INCHES,
    placedWallGraphs: args.placedWallGraphs,
    sourceId: args.sourceId,
  });
}

type PlanFaceAnchor = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  directionInches: Point3DInches;
}>;

type PlanWallRayHit = Readonly<{
  wallEdge: Wall3DEdge;
  endPointInches: Point3DInches;
  lengthInches: number;
}>;

function createPlanWallFaceCenterMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  placedWallGraphs: readonly PlacedWallGraph[];
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  return createPlanFaceAnchors(args.bounds).flatMap((faceAnchor) => {
    const hit = findNearestWallHitFromPlanFaceAnchor({
      faceAnchor,
      placedWallGraphs: args.placedWallGraphs,
    });

    if (hit === null) {
      return [];
    }

    const guide = createPlanWallMeasurementGuide({
      sourceId: args.sourceId,
      faceAnchor,
      hit,
    });

    return guide === null ? [] : [guide];
  });
}

function createPlanFootprintWallMeasurementGuides(args: {
  footprintPointsInches: readonly Point3DInches[];
  footprintCenterInches: Point3DInches;
  measurementZInches: number;
  placedWallGraphs: readonly PlacedWallGraph[];
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  return createPlanFaceAnchorsFromFootprint({
    footprintPointsInches: args.footprintPointsInches,
    footprintCenterInches: args.footprintCenterInches,
    measurementZInches: args.measurementZInches,
  }).flatMap((faceAnchor) => {
    const hit = findNearestWallHitFromPlanFaceAnchor({
      faceAnchor,
      placedWallGraphs: args.placedWallGraphs,
    });

    if (hit === null) {
      return [];
    }

    const guide = createPlanWallMeasurementGuide({ sourceId: args.sourceId, faceAnchor, hit });
    return guide === null ? [] : [guide];
  });
}

function createPlanFaceAnchors(bounds: SceneEntityBounds): readonly PlanFaceAnchor[] {
  return createPlanFaceAnchorsFromFootprint({
    footprintPointsInches: bounds.footprintCornersInches,
    footprintCenterInches: bounds.footprint.centerPointInches,
    measurementZInches: getBodyMeasurementZInches(bounds),
  });
}

function createPlanFaceAnchorsFromFootprint(args: {
  footprintPointsInches: readonly Point3DInches[];
  footprintCenterInches: Point3DInches;
  measurementZInches: number;
}): readonly PlanFaceAnchor[] {
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

function findNearestWallHitFromPlanFaceAnchor(args: {
  faceAnchor: PlanFaceAnchor;
  placedWallGraphs: readonly PlacedWallGraph[];
}): PlanWallRayHit | null {
  const hits = createWallGraphs3DEdges(args.placedWallGraphs)
    .filter(isPlanWallOutlineMeasurementEdge)
    .map((wallEdge) => createRayWallEdgeIntersection({ faceAnchor: args.faceAnchor, wallEdge }))
    .filter(isPlanWallRayHit)
    .sort((firstHit, secondHit) => firstHit.lengthInches - secondHit.lengthInches);

  return hits[0] ?? null;
}

function createRayWallEdgeIntersection(args: {
  faceAnchor: PlanFaceAnchor;
  wallEdge: Wall3DEdge;
}): PlanWallRayHit | null {
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

function createPlanWallMeasurementGuide(args: {
  sourceId: string;
  faceAnchor: PlanFaceAnchor;
  hit: PlanWallRayHit;
}): SceneEntityWallMeasurementGuide | null {
  const overlayDirection = normalizePlanVector(args.faceAnchor.directionInches);

  if (overlayDirection === null) {
    return null;
  }

  const overlayOffset = multiplyPoint(overlayDirection, WALL_BODY_MEASUREMENT_OVERLAY_OFFSET_INCHES);
  const startPointInches = addPoint(args.faceAnchor.startPointInches, overlayOffset);
  const endPointInches = addPoint(args.hit.endPointInches, overlayOffset);

  return {
    id: `scene-entity-wall-measurement:${args.sourceId}:${args.faceAnchor.id}:${args.hit.wallEdge.id}`,
    startPointInches,
    endPointInches,
    lengthInches: args.hit.lengthInches,
    labelPointInches: getMidpoint(startPointInches, endPointInches),
    labelRotationDegrees: 0,
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

  const bottomCenterPointInches = {
    xInches: args.bounds.centerPointInches.xInches,
    yInches: args.bounds.centerPointInches.yInches,
    zInches: args.bounds.heightRangeInches.minZInches,
  };
  const floorPointInches = {
    ...bottomCenterPointInches,
    zInches: ZERO_Z_INCHES,
  };

  return {
    id: `scene-entity-wall-measurement:${args.sourceId}:floor`,
    startPointInches: bottomCenterPointInches,
    endPointInches: floorPointInches,
    lengthInches: floorDistanceInches,
    labelPointInches: getMidpoint(bottomCenterPointInches, floorPointInches),
    labelRotationDegrees: FLOOR_MEASUREMENT_LABEL_ROTATION_DEGREES,
  };
}

function createElevationWallFaceMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  frame: SpatialGuideFrame;
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  const wallFaceBounds = createWallFaceBoundsInSpatialFrame(args.frame);

  if (wallFaceBounds === null) {
    return [];
  }

  const objectBounds = createSpatialGuideBoundsFromSceneEntityBounds({ bounds: args.bounds, frame: args.frame });
  const guides = [
    createWallFaceFrameGuide({
      id: `scene-entity-wall-measurement:${args.sourceId}:wall-face:left`,
      frame: args.frame,
      objectBounds,
      targetBounds: wallFaceBounds,
      startUInches: objectBounds.minUInches,
      startVInches: objectBounds.centerVInches,
      endUInches: wallFaceBounds.minUInches,
      endVInches: objectBounds.centerVInches,
      labelRotationDegrees: 0,
    }),
    createWallFaceFrameGuide({
      id: `scene-entity-wall-measurement:${args.sourceId}:wall-face:right`,
      frame: args.frame,
      objectBounds,
      targetBounds: wallFaceBounds,
      startUInches: objectBounds.maxUInches,
      startVInches: objectBounds.centerVInches,
      endUInches: wallFaceBounds.maxUInches,
      endVInches: objectBounds.centerVInches,
      labelRotationDegrees: 0,
    }),
    createWallFaceFrameGuide({
      id: `scene-entity-wall-measurement:${args.sourceId}:wall-face:top`,
      frame: args.frame,
      objectBounds,
      targetBounds: wallFaceBounds,
      startUInches: objectBounds.centerUInches,
      startVInches: objectBounds.maxVInches,
      endUInches: objectBounds.centerUInches,
      endVInches: wallFaceBounds.maxVInches,
      labelRotationDegrees: 90,
    }),
    createWallFaceFrameGuide({
      id: `scene-entity-wall-measurement:${args.sourceId}:wall-face:bottom`,
      frame: args.frame,
      objectBounds,
      targetBounds: wallFaceBounds,
      startUInches: objectBounds.centerUInches,
      startVInches: objectBounds.minVInches,
      endUInches: objectBounds.centerUInches,
      endVInches: wallFaceBounds.minVInches,
      labelRotationDegrees: 90,
    }),
  ];

  return guides.filter(isSceneEntityWallMeasurementGuide);
}

function createWallFaceBoundsInSpatialFrame(frame: SpatialGuideFrame): SpatialGuideBounds | null {
  const wallFace = frame.movementFrame.elevationFrame?.wallFaceInches;

  if (frame.kind !== "wall-face-plane" || wallFace === undefined) {
    return null;
  }

  const wallFacePoints = [
    { ...wallFace.faceStartInches, zInches: 0 },
    { ...wallFace.faceEndInches, zInches: 0 },
    { ...wallFace.faceStartInches, zInches: wallFace.wallHeightInches },
    { ...wallFace.faceEndInches, zInches: wallFace.wallHeightInches },
  ].map((pointInches) => projectPointToSpatialGuideFrame({ pointInches, frame }));
  const uValues = wallFacePoints.map((point) => point.uInches);
  const nValues = wallFacePoints.map((point) => point.nInches);

  return {
    minUInches: Math.min(...uValues),
    centerUInches: (Math.min(...uValues) + Math.max(...uValues)) / 2,
    maxUInches: Math.max(...uValues),
    minVInches: 0,
    centerVInches: wallFace.wallHeightInches / 2,
    maxVInches: wallFace.wallHeightInches,
    minNInches: Math.min(...nValues),
    maxNInches: Math.max(...nValues),
  };
}

function createWallFaceFrameGuide(args: {
  id: string;
  frame: SpatialGuideFrame;
  objectBounds: SpatialGuideBounds;
  targetBounds: SpatialGuideBounds;
  startUInches: number;
  startVInches: number;
  endUInches: number;
  endVInches: number;
  labelRotationDegrees: number;
}): SceneEntityWallMeasurementGuide | null {
  const lengthInches = Math.hypot(
    args.endUInches - args.startUInches,
    args.endVInches - args.startVInches,
  );

  if (lengthInches < MIN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const overlayNInches = getSpatialGuideOverlayNInches({
    frame: args.frame,
    movingBounds: args.objectBounds,
    targetBounds: args.targetBounds,
  });
  const startPointInches = createPointInSpatialGuideFrame({
    frame: args.frame,
    uInches: args.startUInches,
    vInches: args.startVInches,
    nInches: overlayNInches,
  });
  const endPointInches = createPointInSpatialGuideFrame({
    frame: args.frame,
    uInches: args.endUInches,
    vInches: args.endVInches,
    nInches: overlayNInches,
  });

  return {
    id: args.id,
    startPointInches,
    endPointInches,
    lengthInches,
    labelPointInches: getMidpoint(startPointInches, endPointInches),
    labelRotationDegrees: args.labelRotationDegrees,
    renderOffsetMode: "pre-offset",
  };
}

function isPlanWallOutlineMeasurementEdge(wallEdge: Wall3DEdge): boolean {
  return wallEdge.role === "bottom-footprint";
}

function getBodyMeasurementZInches(bounds: SceneEntityBounds): number {
  return (bounds.heightRangeInches.minZInches + bounds.heightRangeInches.maxZInches) / 2;
}

function isPlanWallRayHit<T>(value: T | null): value is T {
  return value !== null;
}

function isSceneEntityWallMeasurementGuide<T>(value: T | null): value is T {
  return value !== null;
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

function crossPlan(firstPointInches: Point3DInches, secondPointInches: Point3DInches): number {
  return firstPointInches.xInches * secondPointInches.yInches - firstPointInches.yInches * secondPointInches.xInches;
}

function addPoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: firstPointInches.xInches + secondPointInches.xInches,
    yInches: firstPointInches.yInches + secondPointInches.yInches,
    zInches: firstPointInches.zInches + secondPointInches.zInches,
  };
}

function multiplyPoint(pointInches: Point3DInches, scalar: number): Point3DInches {
  return {
    xInches: pointInches.xInches * scalar,
    yInches: pointInches.yInches * scalar,
    zInches: pointInches.zInches * scalar,
  };
}

function getMidpoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: (firstPointInches.xInches + secondPointInches.xInches) / 2,
    yInches: (firstPointInches.yInches + secondPointInches.yInches) / 2,
    zInches: (firstPointInches.zInches + secondPointInches.zInches) / 2,
  };
}
