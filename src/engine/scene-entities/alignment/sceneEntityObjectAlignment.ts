import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { createWallGraphs3DEdges, type Wall3DEdge } from "@/engine/walls/wall3DGeometry";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import { createSceneEntityBounds } from "@/engine/scene-entities/sceneEntityBounds";
import type { SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import { createSceneEntityWithWorldPosition } from "@/engine/scene-entities/sceneEntityTransforms";
import type { SceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";
import {
  createPointInSceneEntityMovementFrame,
  projectPointToSceneEntityMovementFrame,
  translatePointInSceneEntityMovementFrame,
} from "@/engine/scene-entities/sceneEntityMovementFrame";
import {
  SCENE_ENTITY_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
  SCENE_ENTITY_PLAN_ALIGNMENT_SNAP_DISTANCE_INCHES,
} from "./sceneEntityAlignmentConstants";
import type {
  SceneEntityAlignmentGuide,
  SceneEntityAlignmentResult,
  SceneEntityAlignmentTargetKind,
  SceneEntityGroupAlignmentResult,
} from "./sceneEntityAlignmentTypes";

const MOVEMENT_FRAME_ALIGNMENT_GUIDE_PADDING_INCHES = 3;
const FLOOR_PLANE_ALIGNMENT_GUIDE_Z_INCHES = 7.4;

type FrameAxis = "horizontal" | "vertical";
type FrameAnchorRole = "min" | "center" | "max";

type FrameAnchor = Readonly<{
  id: string;
  axis: FrameAxis;
  role: FrameAnchorRole;
  valueInches: number;
}>;

type MovementFrameAlignmentSubject = Readonly<{
  id: string;
  targetKind: SceneEntityAlignmentTargetKind;
  minHorizontalInches: number;
  maxHorizontalInches: number;
  centerHorizontalInches: number;
  minVerticalInches: number;
  maxVerticalInches: number;
  centerVerticalInches: number;
  normalInches: number;
  horizontalAnchors: readonly FrameAnchor[];
  verticalAnchors: readonly FrameAnchor[];
}>;

type SelectedMovementFrameCandidate = Readonly<{
  axis: FrameAxis;
  movingAnchor: FrameAnchor;
  targetAnchor: FrameAnchor;
  targetSubject: MovementFrameAlignmentSubject;
  deltaInches: number;
  distanceInches: number;
}>;

export function alignSceneEntity(args: {
  movingSceneEntity: SceneEntity;
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds?: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
  movementFrame: SceneEntityMovementFrame;
}): SceneEntityAlignmentResult {
  const excludedIds = new Set([args.movingSceneEntity.id, ...(args.excludedSceneEntityIds ?? [])]);
  const movingSubject = createMovementFrameAlignmentSubjectFromBounds({
    bounds: createSceneEntityBounds(args.movingSceneEntity),
    movementFrame: args.movementFrame,
  });
  const targetSubjects = createMovementFrameAlignmentTargets({
    sceneEntities: args.sceneEntities,
    excludedIds,
    placedWallGraphs: args.placedWallGraphs,
    movementFrame: args.movementFrame,
  });
  const horizontalCandidate = selectMovementFrameCandidate({
    axis: "horizontal",
    movingAnchors: movingSubject.horizontalAnchors,
    targetSubjects,
    movementFrame: args.movementFrame,
  });
  const verticalCandidate = selectMovementFrameCandidate({
    axis: "vertical",
    movingAnchors: movingSubject.verticalAnchors,
    targetSubjects,
    movementFrame: args.movementFrame,
  });
  const sceneEntity = translateSceneEntityInMovementFrame({
    sceneEntity: args.movingSceneEntity,
    movementFrame: args.movementFrame,
    deltaHorizontalInches: horizontalCandidate?.deltaInches ?? 0,
    deltaVerticalInches: verticalCandidate?.deltaInches ?? 0,
  });
  const alignedSubject = createMovementFrameAlignmentSubjectFromBounds({
    bounds: createSceneEntityBounds(sceneEntity),
    movementFrame: args.movementFrame,
  });

  return {
    sceneEntity,
    alignmentGuides: [horizontalCandidate, verticalCandidate].flatMap((candidate) => (
      candidate === null ? [] : [createMovementFrameAlignmentGuide({ candidate, movingSubject: alignedSubject, movementFrame: args.movementFrame })]
    )),
  };
}

export function alignSceneEntityGroup(args: {
  movingSceneEntities: readonly SceneEntity[];
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
  movementFrame: SceneEntityMovementFrame;
}): SceneEntityGroupAlignmentResult {
  if (args.movingSceneEntities.length === 0) {
    return { sceneEntities: [], alignmentGuides: [] };
  }

  const movingSubject = createMovementFrameAlignmentSubjectFromBounds({
    bounds: createGroupBounds(args.movingSceneEntities.map(createSceneEntityBounds)),
    movementFrame: args.movementFrame,
  });
  const targetSubjects = createMovementFrameAlignmentTargets({
    sceneEntities: args.sceneEntities,
    excludedIds: new Set(args.excludedSceneEntityIds),
    placedWallGraphs: args.placedWallGraphs,
    movementFrame: args.movementFrame,
  });
  const horizontalCandidate = selectMovementFrameCandidate({
    axis: "horizontal",
    movingAnchors: movingSubject.horizontalAnchors,
    targetSubjects,
    movementFrame: args.movementFrame,
  });
  const verticalCandidate = selectMovementFrameCandidate({
    axis: "vertical",
    movingAnchors: movingSubject.verticalAnchors,
    targetSubjects,
    movementFrame: args.movementFrame,
  });
  const sceneEntities = args.movingSceneEntities.map((sceneEntity) => translateSceneEntityInMovementFrame({
    sceneEntity,
    movementFrame: args.movementFrame,
    deltaHorizontalInches: horizontalCandidate?.deltaInches ?? 0,
    deltaVerticalInches: verticalCandidate?.deltaInches ?? 0,
  }));
  const alignedSubject = createMovementFrameAlignmentSubjectFromBounds({
    bounds: createGroupBounds(sceneEntities.map(createSceneEntityBounds)),
    movementFrame: args.movementFrame,
  });

  return {
    sceneEntities,
    alignmentGuides: [horizontalCandidate, verticalCandidate].flatMap((candidate) => (
      candidate === null ? [] : [createMovementFrameAlignmentGuide({ candidate, movingSubject: alignedSubject, movementFrame: args.movementFrame })]
    )),
  };
}

function createMovementFrameAlignmentTargets(args: {
  sceneEntities: readonly SceneEntity[];
  excludedIds: ReadonlySet<string>;
  placedWallGraphs: readonly PlacedWallGraph[];
  movementFrame: SceneEntityMovementFrame;
}): readonly MovementFrameAlignmentSubject[] {
  return [
    ...createWallMovementFrameAlignmentSubjects(args),
    ...args.sceneEntities
      .filter((sceneEntity) => !args.excludedIds.has(sceneEntity.id))
      .map((sceneEntity) => createMovementFrameAlignmentSubjectFromBounds({
        bounds: createSceneEntityBounds(sceneEntity),
        movementFrame: args.movementFrame,
      })),
  ];
}

function createMovementFrameAlignmentSubjectFromBounds(args: {
  bounds: SceneEntityBounds;
  movementFrame: SceneEntityMovementFrame;
}): MovementFrameAlignmentSubject {
  const horizontalValuesInches = args.bounds.footprintCornersInches.map((cornerPointInches) => (
    projectPointToSceneEntityMovementFrame({ pointInches: cornerPointInches, movementFrame: args.movementFrame }).horizontalInches
  ));
  const normalValuesInches = args.bounds.footprintCornersInches.map((cornerPointInches) => (
    projectPointToSceneEntityMovementFrame({ pointInches: cornerPointInches, movementFrame: args.movementFrame }).normalInches
  ));
  const verticalValuesInches = args.movementFrame.kind === "wall-face-plane"
    ? [args.bounds.heightRangeInches.minZInches, args.bounds.heightRangeInches.maxZInches]
    : args.bounds.footprintCornersInches.map((cornerPointInches) => (
      projectPointToSceneEntityMovementFrame({ pointInches: cornerPointInches, movementFrame: args.movementFrame }).verticalInches
    ));

  return createMovementFrameAlignmentSubject({
    id: `${args.bounds.entityKind}:${args.bounds.entityId}`,
    targetKind: "scene-entity",
    minHorizontalInches: Math.min(...horizontalValuesInches),
    maxHorizontalInches: Math.max(...horizontalValuesInches),
    minVerticalInches: Math.min(...verticalValuesInches),
    maxVerticalInches: Math.max(...verticalValuesInches),
    normalInches: (Math.min(...normalValuesInches) + Math.max(...normalValuesInches)) / 2,
  });
}

function createWallMovementFrameAlignmentSubjects(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  movementFrame: SceneEntityMovementFrame;
}): readonly MovementFrameAlignmentSubject[] {
  return createWallGraphs3DEdges(args.placedWallGraphs)
    .filter((wallEdge) => shouldUseWall3DEdgeForMovementFrame({ wallEdge, movementFrame: args.movementFrame }))
    .map((wallEdge) => createLineMovementFrameAlignmentSubject({
      id: `${wallEdge.targetKind}:${wallEdge.id}`,
      targetKind: wallEdge.targetKind,
      startPointInches: wallEdge.startPointInches,
      endPointInches: wallEdge.endPointInches,
      movementFrame: args.movementFrame,
    }));
}

function shouldUseWall3DEdgeForMovementFrame(args: {
  wallEdge: Wall3DEdge;
  movementFrame: SceneEntityMovementFrame;
}): boolean {
  if (args.movementFrame.kind === "wall-face-plane") {
    return isWallFacePlaneEdge(args);
  }

  return args.wallEdge.role === "bottom-footprint" ||
    args.wallEdge.role === "centerline" ||
    args.wallEdge.role === "face-bottom";
}

function isWallFacePlaneEdge(args: {
  wallEdge: Wall3DEdge;
  movementFrame: SceneEntityMovementFrame;
}): boolean {
  if (args.wallEdge.targetKind !== "wall-face") {
    return false;
  }

  if (!["face-bottom", "face-top", "face-left", "face-right"].includes(args.wallEdge.role)) {
    return false;
  }

  const startFramePoint = projectPointToSceneEntityMovementFrame({
    pointInches: args.wallEdge.startPointInches,
    movementFrame: args.movementFrame,
  });
  const endFramePoint = projectPointToSceneEntityMovementFrame({
    pointInches: args.wallEdge.endPointInches,
    movementFrame: args.movementFrame,
  });
  const averageNormalInches = (startFramePoint.normalInches + endFramePoint.normalInches) / 2;

  return Math.abs(averageNormalInches) <= 0.75;
}

function createLineMovementFrameAlignmentSubject(args: {
  id: string;
  targetKind: SceneEntityAlignmentTargetKind;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  movementFrame: SceneEntityMovementFrame;
}): MovementFrameAlignmentSubject {
  const startFramePoint = projectPointToSceneEntityMovementFrame({ pointInches: args.startPointInches, movementFrame: args.movementFrame });
  const endFramePoint = projectPointToSceneEntityMovementFrame({ pointInches: args.endPointInches, movementFrame: args.movementFrame });

  return createMovementFrameAlignmentSubject({
    id: args.id,
    targetKind: args.targetKind,
    minHorizontalInches: Math.min(startFramePoint.horizontalInches, endFramePoint.horizontalInches),
    maxHorizontalInches: Math.max(startFramePoint.horizontalInches, endFramePoint.horizontalInches),
    minVerticalInches: Math.min(startFramePoint.verticalInches, endFramePoint.verticalInches),
    maxVerticalInches: Math.max(startFramePoint.verticalInches, endFramePoint.verticalInches),
    normalInches: (startFramePoint.normalInches + endFramePoint.normalInches) / 2,
  });
}

function createMovementFrameAlignmentSubject(args: {
  id: string;
  targetKind: SceneEntityAlignmentTargetKind;
  minHorizontalInches: number;
  maxHorizontalInches: number;
  minVerticalInches: number;
  maxVerticalInches: number;
  normalInches: number;
}): MovementFrameAlignmentSubject {
  const centerHorizontalInches = (args.minHorizontalInches + args.maxHorizontalInches) / 2;
  const centerVerticalInches = (args.minVerticalInches + args.maxVerticalInches) / 2;
  return {
    ...args,
    centerHorizontalInches,
    centerVerticalInches,
    horizontalAnchors: createFrameAnchors({ id: args.id, axis: "horizontal", minInches: args.minHorizontalInches, centerInches: centerHorizontalInches, maxInches: args.maxHorizontalInches }),
    verticalAnchors: createFrameAnchors({ id: args.id, axis: "vertical", minInches: args.minVerticalInches, centerInches: centerVerticalInches, maxInches: args.maxVerticalInches }),
  };
}

function createFrameAnchors(args: {
  id: string;
  axis: FrameAxis;
  minInches: number;
  centerInches: number;
  maxInches: number;
}): readonly FrameAnchor[] {
  return [
    { id: `${args.id}:${args.axis}:min`, axis: args.axis, role: "min", valueInches: args.minInches },
    { id: `${args.id}:${args.axis}:center`, axis: args.axis, role: "center", valueInches: args.centerInches },
    { id: `${args.id}:${args.axis}:max`, axis: args.axis, role: "max", valueInches: args.maxInches },
  ];
}

function selectMovementFrameCandidate(args: {
  axis: FrameAxis;
  movingAnchors: readonly FrameAnchor[];
  targetSubjects: readonly MovementFrameAlignmentSubject[];
  movementFrame: SceneEntityMovementFrame;
}): SelectedMovementFrameCandidate | null {
  const snapDistanceInches = args.movementFrame.kind === "wall-face-plane"
    ? SCENE_ENTITY_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES
    : SCENE_ENTITY_PLAN_ALIGNMENT_SNAP_DISTANCE_INCHES;
  const candidates = args.movingAnchors.flatMap((movingAnchor) => args.targetSubjects.flatMap((targetSubject) => {
    const targetAnchors = args.axis === "horizontal" ? targetSubject.horizontalAnchors : targetSubject.verticalAnchors;
    return targetAnchors.map((targetAnchor): SelectedMovementFrameCandidate => {
      const deltaInches = targetAnchor.valueInches - movingAnchor.valueInches;
      return {
        axis: args.axis,
        movingAnchor,
        targetAnchor,
        targetSubject,
        deltaInches,
        distanceInches: Math.abs(deltaInches),
      };
    });
  })).filter((candidate) => candidate.distanceInches <= snapDistanceInches);

  return candidates.sort((first, second) => first.distanceInches - second.distanceInches)[0] ?? null;
}

function translateSceneEntityInMovementFrame(args: {
  sceneEntity: SceneEntity;
  movementFrame: SceneEntityMovementFrame;
  deltaHorizontalInches: number;
  deltaVerticalInches: number;
}): SceneEntity {
  return createSceneEntityWithWorldPosition(args.sceneEntity, translatePointInSceneEntityMovementFrame({
    pointInches: args.sceneEntity.worldPositionInches,
    movementFrame: args.movementFrame,
    deltaHorizontalInches: args.deltaHorizontalInches,
    deltaVerticalInches: args.deltaVerticalInches,
  }));
}

function createMovementFrameAlignmentGuide(args: {
  candidate: SelectedMovementFrameCandidate;
  movingSubject: MovementFrameAlignmentSubject;
  movementFrame: SceneEntityMovementFrame;
}): SceneEntityAlignmentGuide {
  const span = createMovementFrameAlignmentGuideSpan({
    axis: args.candidate.axis,
    movingSubject: args.movingSubject,
    targetSubject: args.candidate.targetSubject,
  });
  const normalInches = args.movementFrame.kind === "floor-plane"
    ? FLOOR_PLANE_ALIGNMENT_GUIDE_Z_INCHES
    : args.candidate.targetSubject.normalInches;

  if (args.candidate.axis === "horizontal") {
    return {
      id: `scene-entity-movement-frame-alignment:horizontal:${args.candidate.movingAnchor.id}:${args.candidate.targetAnchor.id}`,
      targetKind: args.candidate.targetSubject.targetKind,
      startPointInches: createPointInSceneEntityMovementFrame({ movementFrame: args.movementFrame, horizontalInches: args.candidate.targetAnchor.valueInches, verticalInches: span.minInches, normalInches }),
      endPointInches: createPointInSceneEntityMovementFrame({ movementFrame: args.movementFrame, horizontalInches: args.candidate.targetAnchor.valueInches, verticalInches: span.maxInches, normalInches }),
    };
  }

  return {
    id: `scene-entity-movement-frame-alignment:vertical:${args.candidate.movingAnchor.id}:${args.candidate.targetAnchor.id}`,
    targetKind: args.candidate.targetSubject.targetKind,
    startPointInches: createPointInSceneEntityMovementFrame({ movementFrame: args.movementFrame, horizontalInches: span.minInches, verticalInches: args.candidate.targetAnchor.valueInches, normalInches }),
    endPointInches: createPointInSceneEntityMovementFrame({ movementFrame: args.movementFrame, horizontalInches: span.maxInches, verticalInches: args.candidate.targetAnchor.valueInches, normalInches }),
  };
}

function createMovementFrameAlignmentGuideSpan(args: {
  axis: FrameAxis;
  movingSubject: MovementFrameAlignmentSubject;
  targetSubject: MovementFrameAlignmentSubject;
}): { minInches: number; maxInches: number } {
  const shouldUseMovingBoundsOnly = args.targetSubject.targetKind !== "scene-entity";

  if (args.axis === "horizontal") {
    return {
      minInches: (shouldUseMovingBoundsOnly
        ? args.movingSubject.minVerticalInches
        : Math.min(args.movingSubject.minVerticalInches, args.targetSubject.minVerticalInches)) - MOVEMENT_FRAME_ALIGNMENT_GUIDE_PADDING_INCHES,
      maxInches: (shouldUseMovingBoundsOnly
        ? args.movingSubject.maxVerticalInches
        : Math.max(args.movingSubject.maxVerticalInches, args.targetSubject.maxVerticalInches)) + MOVEMENT_FRAME_ALIGNMENT_GUIDE_PADDING_INCHES,
    };
  }

  return {
    minInches: (shouldUseMovingBoundsOnly
      ? args.movingSubject.minHorizontalInches
      : Math.min(args.movingSubject.minHorizontalInches, args.targetSubject.minHorizontalInches)) - MOVEMENT_FRAME_ALIGNMENT_GUIDE_PADDING_INCHES,
    maxInches: (shouldUseMovingBoundsOnly
      ? args.movingSubject.maxHorizontalInches
      : Math.max(args.movingSubject.maxHorizontalInches, args.targetSubject.maxHorizontalInches)) + MOVEMENT_FRAME_ALIGNMENT_GUIDE_PADDING_INCHES,
  };
}

function createGroupBounds(boundsList: readonly SceneEntityBounds[]): SceneEntityBounds {
  const firstBounds = boundsList[0];
  const allFootprintCorners = boundsList.flatMap((bounds) => bounds.footprintCornersInches);
  const allTopCorners = boundsList.flatMap((bounds) => bounds.topCornersInches);
  const planBounds = allFootprintCorners.reduce((currentBounds, pointInches) => ({
    minXInches: Math.min(currentBounds.minXInches, pointInches.xInches),
    maxXInches: Math.max(currentBounds.maxXInches, pointInches.xInches),
    minYInches: Math.min(currentBounds.minYInches, pointInches.yInches),
    maxYInches: Math.max(currentBounds.maxYInches, pointInches.yInches),
  }), {
    minXInches: Number.POSITIVE_INFINITY,
    maxXInches: Number.NEGATIVE_INFINITY,
    minYInches: Number.POSITIVE_INFINITY,
    maxYInches: Number.NEGATIVE_INFINITY,
  });
  const minZInches = Math.min(...boundsList.map((bounds) => bounds.heightRangeInches.minZInches));
  const maxZInches = Math.max(...boundsList.map((bounds) => bounds.heightRangeInches.maxZInches));
  const centerPointInches = {
    xInches: (planBounds.minXInches + planBounds.maxXInches) / 2,
    yInches: (planBounds.minYInches + planBounds.maxYInches) / 2,
    zInches: (minZInches + maxZInches) / 2,
  };
  const cornerPointsInches = [
    { xInches: planBounds.minXInches, yInches: planBounds.minYInches, zInches: centerPointInches.zInches },
    { xInches: planBounds.maxXInches, yInches: planBounds.minYInches, zInches: centerPointInches.zInches },
    { xInches: planBounds.maxXInches, yInches: planBounds.maxYInches, zInches: centerPointInches.zInches },
    { xInches: planBounds.minXInches, yInches: planBounds.maxYInches, zInches: centerPointInches.zInches },
  ];
  const footprint: SceneEntityPlanFootprint = {
    centerPointInches,
    cornerPointsInches,
    edges: cornerPointsInches.map((cornerPointInches, index) => {
      const endPointInches = cornerPointsInches[(index + 1) % cornerPointsInches.length];
      return {
        index,
        startPointInches: cornerPointInches,
        endPointInches,
        midpointInches: {
          xInches: (cornerPointInches.xInches + endPointInches.xInches) / 2,
          yInches: (cornerPointInches.yInches + endPointInches.yInches) / 2,
          zInches: centerPointInches.zInches,
        },
        lengthInches: Math.hypot(endPointInches.xInches - cornerPointInches.xInches, endPointInches.yInches - cornerPointInches.yInches),
      };
    }),
  };

  return {
    entityId: "scene-entity-group",
    entityKind: firstBounds.entityKind,
    centerPointInches,
    sizeInches: {
      widthInches: planBounds.maxXInches - planBounds.minXInches,
      depthInches: planBounds.maxYInches - planBounds.minYInches,
      heightInches: maxZInches - minZInches,
    },
    rotationDegrees: { zDegrees: 0 },
    footprint,
    footprintCornersInches: allFootprintCorners,
    topCornersInches: allTopCorners,
    heightRangeInches: { minZInches, maxZInches },
  };
}
