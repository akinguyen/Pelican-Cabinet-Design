import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { WallSegmentFace } from "@/engine/walls/connectedWallGeometryTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import { createSceneEntityBounds } from "@/engine/scene-entities/sceneEntityBounds";
import type { SceneEntityElevationFrame, SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import { getPlanDotProduct, normalizePlanVector } from "@/engine/scene-entities/sceneEntityPlanGeometry";
import { createSceneEntityWithWorldPosition } from "@/engine/scene-entities/sceneEntityTransforms";
import {
  SCENE_ENTITY_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
  SCENE_ENTITY_PLAN_ALIGNMENT_SNAP_DISTANCE_INCHES,
} from "./sceneEntityAlignmentConstants";
import type { SceneEntityAlignmentGuide, SceneEntityAlignmentResult, SceneEntityGroupAlignmentResult } from "./sceneEntityAlignmentTypes";

const ALIGNMENT_GUIDE_PADDING_INCHES = 16;

type Axis = "x" | "y";
type PlanAnchorRole = "min" | "center" | "max";
type ElevationAnchorRole = "min" | "center" | "max";

type PlanAnchor = Readonly<{
  id: string;
  axis: Axis;
  role: PlanAnchorRole;
  valueInches: number;
}>;

type PlanAlignmentSubject = Readonly<{
  id: string;
  footprint: SceneEntityPlanFootprint;
  xAnchors: readonly PlanAnchor[];
  yAnchors: readonly PlanAnchor[];
}>;

type SelectedPlanCandidate = Readonly<{
  axis: Axis;
  movingAnchor: PlanAnchor;
  targetAnchor: PlanAnchor;
  targetSubject: PlanAlignmentSubject;
  deltaInches: number;
  distanceInches: number;
}>;

type ElevationAnchor = Readonly<{
  id: string;
  axis: "u" | "z";
  role: ElevationAnchorRole;
  valueInches: number;
}>;

type ElevationBox = Readonly<{
  id: string;
  leftInches: number;
  rightInches: number;
  centerInches: number;
  bottomInches: number;
  topInches: number;
  middleInches: number;
  depthInches: number;
  uAnchors: readonly ElevationAnchor[];
  zAnchors: readonly ElevationAnchor[];
}>;

type SelectedElevationCandidate = Readonly<{
  axis: "u" | "z";
  movingAnchor: ElevationAnchor;
  targetAnchor: ElevationAnchor;
  targetBox: ElevationBox;
  deltaInches: number;
  distanceInches: number;
}>;

export function alignSceneEntity(args: {
  movingSceneEntity: SceneEntity;
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds?: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
  movementSource: SceneViewMode;
  elevationMoveFrame?: SceneEntityElevationFrame;
}): SceneEntityAlignmentResult {
  if (args.movementSource === "elevation" && args.elevationMoveFrame !== undefined) {
    return alignSingleSceneEntityInElevation(args as {
      movingSceneEntity: SceneEntity;
      sceneEntities: readonly SceneEntity[];
      excludedSceneEntityIds?: readonly string[];
      placedWallGraphs: readonly PlacedWallGraph[];
      movementSource: SceneViewMode;
      elevationMoveFrame: SceneEntityElevationFrame;
    });
  }

  return alignSingleSceneEntityInPlan(args);
}

export function alignSceneEntityGroup(args: {
  movingSceneEntities: readonly SceneEntity[];
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
  movementSource: SceneViewMode;
  elevationMoveFrame?: SceneEntityElevationFrame;
}): SceneEntityGroupAlignmentResult {
  if (args.movingSceneEntities.length === 0) {
    return { sceneEntities: [], alignmentGuides: [] };
  }

  if (args.movementSource === "elevation" && args.elevationMoveFrame !== undefined) {
    return alignSceneEntityGroupInElevation(args as {
      movingSceneEntities: readonly SceneEntity[];
      sceneEntities: readonly SceneEntity[];
      excludedSceneEntityIds: readonly string[];
      placedWallGraphs: readonly PlacedWallGraph[];
      movementSource: SceneViewMode;
      elevationMoveFrame: SceneEntityElevationFrame;
    });
  }

  return alignSceneEntityGroupInPlan(args);
}

function alignSingleSceneEntityInPlan(args: {
  movingSceneEntity: SceneEntity;
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds?: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
}): SceneEntityAlignmentResult {
  const excludedIds = new Set([args.movingSceneEntity.id, ...(args.excludedSceneEntityIds ?? [])]);
  const movingSubject = createPlanAlignmentSubjectFromBounds(createSceneEntityBounds(args.movingSceneEntity));
  const targetSubjects = createPlanAlignmentTargets({
    sceneEntities: args.sceneEntities,
    excludedIds,
    placedWallGraphs: args.placedWallGraphs,
  });
  const xCandidate = selectPlanCandidate({ axis: "x", movingAnchors: movingSubject.xAnchors, targetSubjects });
  const yCandidate = selectPlanCandidate({ axis: "y", movingAnchors: movingSubject.yAnchors, targetSubjects });
  const deltaXInches = xCandidate?.deltaInches ?? 0;
  const deltaYInches = yCandidate?.deltaInches ?? 0;
  const sceneEntity = createSceneEntityWithWorldPosition(args.movingSceneEntity, {
    ...args.movingSceneEntity.worldPositionInches,
    xInches: args.movingSceneEntity.worldPositionInches.xInches + deltaXInches,
    yInches: args.movingSceneEntity.worldPositionInches.yInches + deltaYInches,
  });
  const alignedSubject = createPlanAlignmentSubjectFromBounds(createSceneEntityBounds(sceneEntity));

  return {
    sceneEntity,
    alignmentGuides: [xCandidate, yCandidate].flatMap((candidate) => (
      candidate === null ? [] : [createPlanAlignmentGuide({ candidate, movingSubject: alignedSubject })]
    )),
  };
}

function alignSceneEntityGroupInPlan(args: {
  movingSceneEntities: readonly SceneEntity[];
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
}): SceneEntityGroupAlignmentResult {
  const movingSubject = createPlanAlignmentSubjectFromBounds(createGroupBounds(args.movingSceneEntities.map(createSceneEntityBounds)));
  const targetSubjects = createPlanAlignmentTargets({
    sceneEntities: args.sceneEntities,
    excludedIds: new Set(args.excludedSceneEntityIds),
    placedWallGraphs: args.placedWallGraphs,
  });
  const xCandidate = selectPlanCandidate({ axis: "x", movingAnchors: movingSubject.xAnchors, targetSubjects });
  const yCandidate = selectPlanCandidate({ axis: "y", movingAnchors: movingSubject.yAnchors, targetSubjects });
  const deltaXInches = xCandidate?.deltaInches ?? 0;
  const deltaYInches = yCandidate?.deltaInches ?? 0;
  const sceneEntities = args.movingSceneEntities.map((sceneEntity) => createSceneEntityWithWorldPosition(sceneEntity, {
    ...sceneEntity.worldPositionInches,
    xInches: sceneEntity.worldPositionInches.xInches + deltaXInches,
    yInches: sceneEntity.worldPositionInches.yInches + deltaYInches,
  }));
  const alignedSubject = createPlanAlignmentSubjectFromBounds(createGroupBounds(sceneEntities.map(createSceneEntityBounds)));

  return {
    sceneEntities,
    alignmentGuides: [xCandidate, yCandidate].flatMap((candidate) => (
      candidate === null ? [] : [createPlanAlignmentGuide({ candidate, movingSubject: alignedSubject })]
    )),
  };
}

function alignSingleSceneEntityInElevation(args: {
  movingSceneEntity: SceneEntity;
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds?: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
  elevationMoveFrame: SceneEntityElevationFrame;
}): SceneEntityAlignmentResult {
  const movingBox = createElevationBoxFromBounds({ bounds: createSceneEntityBounds(args.movingSceneEntity), elevationFrame: args.elevationMoveFrame });
  if (movingBox === null) {
    return { sceneEntity: args.movingSceneEntity, alignmentGuides: [] };
  }

  const targetBoxes = createElevationTargets({
    sceneEntities: args.sceneEntities,
    excludedIds: new Set([args.movingSceneEntity.id, ...(args.excludedSceneEntityIds ?? [])]),
    elevationFrame: args.elevationMoveFrame,
  });
  const uCandidate = selectElevationCandidate({ axis: "u", movingAnchors: movingBox.uAnchors, targetBoxes });
  const zCandidate = selectElevationCandidate({ axis: "z", movingAnchors: movingBox.zAnchors, targetBoxes });
  const aligned = translateEntityInElevation({
    sceneEntity: args.movingSceneEntity,
    elevationFrame: args.elevationMoveFrame,
    deltaUInches: uCandidate?.deltaInches ?? 0,
    deltaZInches: zCandidate?.deltaInches ?? 0,
  });
  const alignedBox = createElevationBoxFromBounds({ bounds: createSceneEntityBounds(aligned), elevationFrame: args.elevationMoveFrame }) ?? movingBox;

  return {
    sceneEntity: aligned,
    alignmentGuides: [uCandidate, zCandidate].flatMap((candidate) => (
      candidate === null ? [] : [createElevationAlignmentGuide({ candidate, movingBox: alignedBox, elevationFrame: args.elevationMoveFrame })]
    )),
  };
}

function alignSceneEntityGroupInElevation(args: {
  movingSceneEntities: readonly SceneEntity[];
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
  elevationMoveFrame: SceneEntityElevationFrame;
}): SceneEntityGroupAlignmentResult {
  const movingBox = createElevationBoxFromBounds({ bounds: createGroupBounds(args.movingSceneEntities.map(createSceneEntityBounds)), elevationFrame: args.elevationMoveFrame });
  if (movingBox === null) {
    return { sceneEntities: args.movingSceneEntities, alignmentGuides: [] };
  }

  const targetBoxes = createElevationTargets({
    sceneEntities: args.sceneEntities,
    excludedIds: new Set(args.excludedSceneEntityIds),
    elevationFrame: args.elevationMoveFrame,
  });
  const uCandidate = selectElevationCandidate({ axis: "u", movingAnchors: movingBox.uAnchors, targetBoxes });
  const zCandidate = selectElevationCandidate({ axis: "z", movingAnchors: movingBox.zAnchors, targetBoxes });
  const sceneEntities = args.movingSceneEntities.map((sceneEntity) => translateEntityInElevation({
    sceneEntity,
    elevationFrame: args.elevationMoveFrame,
    deltaUInches: uCandidate?.deltaInches ?? 0,
    deltaZInches: zCandidate?.deltaInches ?? 0,
  }));
  const alignedBox = createElevationBoxFromBounds({ bounds: createGroupBounds(sceneEntities.map(createSceneEntityBounds)), elevationFrame: args.elevationMoveFrame }) ?? movingBox;

  return {
    sceneEntities,
    alignmentGuides: [uCandidate, zCandidate].flatMap((candidate) => (
      candidate === null ? [] : [createElevationAlignmentGuide({ candidate, movingBox: alignedBox, elevationFrame: args.elevationMoveFrame })]
    )),
  };
}

function createPlanAlignmentTargets(args: {
  sceneEntities: readonly SceneEntity[];
  excludedIds: ReadonlySet<string>;
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly PlanAlignmentSubject[] {
  return [
    ...args.sceneEntities
      .filter((sceneEntity) => !args.excludedIds.has(sceneEntity.id))
      .map((sceneEntity) => createPlanAlignmentSubjectFromBounds(createSceneEntityBounds(sceneEntity))),
    ...createWallPlanAlignmentSubjects(args.placedWallGraphs),
  ];
}

function createPlanAlignmentSubjectFromBounds(bounds: SceneEntityBounds): PlanAlignmentSubject {
  return createPlanAlignmentSubject({
    id: `${bounds.entityKind}:${bounds.entityId}`,
    footprint: bounds.footprint,
  });
}

function createPlanAlignmentSubject(args: { id: string; footprint: SceneEntityPlanFootprint }): PlanAlignmentSubject {
  const bounds = getFootprintBounds(args.footprint);
  return {
    id: args.id,
    footprint: args.footprint,
    xAnchors: createPlanAnchors({ id: args.id, axis: "x", minInches: bounds.minXInches, centerInches: bounds.centerXInches, maxInches: bounds.maxXInches }),
    yAnchors: createPlanAnchors({ id: args.id, axis: "y", minInches: bounds.minYInches, centerInches: bounds.centerYInches, maxInches: bounds.maxYInches }),
  };
}

function createPlanAnchors(args: { id: string; axis: Axis; minInches: number; centerInches: number; maxInches: number }): readonly PlanAnchor[] {
  return [
    { id: `${args.id}:${args.axis}:min`, axis: args.axis, role: "min", valueInches: args.minInches },
    { id: `${args.id}:${args.axis}:center`, axis: args.axis, role: "center", valueInches: args.centerInches },
    { id: `${args.id}:${args.axis}:max`, axis: args.axis, role: "max", valueInches: args.maxInches },
  ];
}

function createWallPlanAlignmentSubjects(placedWallGraphs: readonly PlacedWallGraph[]): readonly PlanAlignmentSubject[] {
  return placedWallGraphs.flatMap((placedWallGraph) => {
    const geometry = buildConnectedWallGeometry(placedWallGraph);
    const faceSubjects = geometry.faces.map(createWallFacePlanAlignmentSubject);
    const centerlineSubjects = geometry.segmentBodies.map((segmentBody) => createPlanAlignmentSubject({
      id: `wall-centerline:${segmentBody.wallGraphId}:${segmentBody.wallSegmentId}`,
      footprint: createLineFootprint({
        id: `wall-centerline:${segmentBody.wallGraphId}:${segmentBody.wallSegmentId}`,
        startPointInches: segmentBody.start.centerPointInches,
        endPointInches: segmentBody.end.centerPointInches,
      }),
    }));
    return [...faceSubjects, ...centerlineSubjects];
  });
}

function createWallFacePlanAlignmentSubject(wallFace: WallSegmentFace): PlanAlignmentSubject {
  return createPlanAlignmentSubject({
    id: `wall-face:${wallFace.wallGraphId}:${wallFace.wallSegmentId}:${wallFace.side}`,
    footprint: createLineFootprint({
      id: `wall-face:${wallFace.wallGraphId}:${wallFace.wallSegmentId}:${wallFace.side}`,
      startPointInches: wallFace.startPointInches,
      endPointInches: wallFace.endPointInches,
    }),
  });
}

function createLineFootprint(args: { id: string; startPointInches: Point3DInches; endPointInches: Point3DInches }): SceneEntityPlanFootprint {
  const centerPointInches = {
    xInches: (args.startPointInches.xInches + args.endPointInches.xInches) / 2,
    yInches: (args.startPointInches.yInches + args.endPointInches.yInches) / 2,
    zInches: (args.startPointInches.zInches + args.endPointInches.zInches) / 2,
  };
  return {
    centerPointInches,
    cornerPointsInches: [args.startPointInches, args.endPointInches],
    edges: [{
      index: 0,
      startPointInches: args.startPointInches,
      endPointInches: args.endPointInches,
      midpointInches: centerPointInches,
      lengthInches: Math.hypot(
        args.endPointInches.xInches - args.startPointInches.xInches,
        args.endPointInches.yInches - args.startPointInches.yInches,
      ),
    }],
  };
}

function getFootprintBounds(footprint: SceneEntityPlanFootprint) {
  const bounds = footprint.cornerPointsInches.reduce((currentBounds, cornerPointInches) => ({
    minXInches: Math.min(currentBounds.minXInches, cornerPointInches.xInches),
    maxXInches: Math.max(currentBounds.maxXInches, cornerPointInches.xInches),
    minYInches: Math.min(currentBounds.minYInches, cornerPointInches.yInches),
    maxYInches: Math.max(currentBounds.maxYInches, cornerPointInches.yInches),
  }), {
    minXInches: Number.POSITIVE_INFINITY,
    maxXInches: Number.NEGATIVE_INFINITY,
    minYInches: Number.POSITIVE_INFINITY,
    maxYInches: Number.NEGATIVE_INFINITY,
  });
  return {
    ...bounds,
    centerXInches: (bounds.minXInches + bounds.maxXInches) / 2,
    centerYInches: (bounds.minYInches + bounds.maxYInches) / 2,
  };
}

function selectPlanCandidate(args: {
  axis: Axis;
  movingAnchors: readonly PlanAnchor[];
  targetSubjects: readonly PlanAlignmentSubject[];
}): SelectedPlanCandidate | null {
  const candidates = args.movingAnchors.flatMap((movingAnchor) => args.targetSubjects.flatMap((targetSubject) => {
    const targetAnchors = args.axis === "x" ? targetSubject.xAnchors : targetSubject.yAnchors;
    return targetAnchors.map((targetAnchor): SelectedPlanCandidate => {
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
  })).filter((candidate) => candidate.distanceInches <= SCENE_ENTITY_PLAN_ALIGNMENT_SNAP_DISTANCE_INCHES);

  return candidates.sort((first, second) => first.distanceInches - second.distanceInches)[0] ?? null;
}

function createPlanAlignmentGuide(args: {
  candidate: SelectedPlanCandidate;
  movingSubject: PlanAlignmentSubject;
}): SceneEntityAlignmentGuide {
  const movingBounds = getFootprintBounds(args.movingSubject.footprint);
  const targetBounds = getFootprintBounds(args.candidate.targetSubject.footprint);

  if (args.candidate.axis === "x") {
    const minYInches = Math.min(movingBounds.minYInches, targetBounds.minYInches) - ALIGNMENT_GUIDE_PADDING_INCHES;
    const maxYInches = Math.max(movingBounds.maxYInches, targetBounds.maxYInches) + ALIGNMENT_GUIDE_PADDING_INCHES;
    return {
      id: `scene-entity-plan-alignment:x:${args.candidate.movingAnchor.id}:${args.candidate.targetAnchor.id}`,
      guidePlane: "plan",
      startPointInches: { xInches: args.candidate.targetAnchor.valueInches, yInches: minYInches, zInches: 0 },
      endPointInches: { xInches: args.candidate.targetAnchor.valueInches, yInches: maxYInches, zInches: 0 },
    };
  }

  const minXInches = Math.min(movingBounds.minXInches, targetBounds.minXInches) - ALIGNMENT_GUIDE_PADDING_INCHES;
  const maxXInches = Math.max(movingBounds.maxXInches, targetBounds.maxXInches) + ALIGNMENT_GUIDE_PADDING_INCHES;
  return {
    id: `scene-entity-plan-alignment:y:${args.candidate.movingAnchor.id}:${args.candidate.targetAnchor.id}`,
    guidePlane: "plan",
    startPointInches: { xInches: minXInches, yInches: args.candidate.targetAnchor.valueInches, zInches: 0 },
    endPointInches: { xInches: maxXInches, yInches: args.candidate.targetAnchor.valueInches, zInches: 0 },
  };
}

function createElevationTargets(args: {
  sceneEntities: readonly SceneEntity[];
  excludedIds: ReadonlySet<string>;
  elevationFrame: SceneEntityElevationFrame;
}): readonly ElevationBox[] {
  return [
    createFloorElevationBox(args.elevationFrame),
    createWallFaceElevationBox(args.elevationFrame),
    ...args.sceneEntities
      .filter((sceneEntity) => !args.excludedIds.has(sceneEntity.id))
      .map((sceneEntity) => createElevationBoxFromBounds({ bounds: createSceneEntityBounds(sceneEntity), elevationFrame: args.elevationFrame }))
      .filter(isElevationBox),
  ].filter(isElevationBox);
}

function createElevationBoxFromBounds(args: { bounds: SceneEntityBounds; elevationFrame: SceneEntityElevationFrame }): ElevationBox | null {
  const faceDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.faceDirectionInches.xInches,
    yInches: args.elevationFrame.faceDirectionInches.yInches,
  });
  const outwardDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.outwardDirectionInches.xInches,
    yInches: args.elevationFrame.outwardDirectionInches.yInches,
  });

  if (faceDirectionInches === null || outwardDirectionInches === null) {
    return null;
  }

  const projectedUValuesInches = args.bounds.footprint.cornerPointsInches.map((cornerPointInches) => getPlanDotProduct({
    xInches: cornerPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: cornerPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, faceDirectionInches));
  const projectedDepthValuesInches = args.bounds.footprint.cornerPointsInches.map((cornerPointInches) => getPlanDotProduct({
    xInches: cornerPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: cornerPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, outwardDirectionInches));
  const leftInches = Math.min(...projectedUValuesInches);
  const rightInches = Math.max(...projectedUValuesInches);
  const centerInches = (leftInches + rightInches) / 2;
  const depthInches = (Math.min(...projectedDepthValuesInches) + Math.max(...projectedDepthValuesInches)) / 2;

  return createElevationBox({
    id: `${args.bounds.entityKind}:${args.bounds.entityId}`,
    leftInches,
    rightInches,
    bottomInches: args.bounds.heightRangeInches.minZInches,
    topInches: args.bounds.heightRangeInches.maxZInches,
    depthInches,
  });
}

function createFloorElevationBox(elevationFrame: SceneEntityElevationFrame): ElevationBox {
  const leftInches = elevationFrame.viewZoneInches?.leftInches ?? -10000;
  const rightInches = elevationFrame.viewZoneInches?.rightInches ?? 10000;
  return createElevationBox({
    id: "floor-line",
    leftInches,
    rightInches,
    bottomInches: 0,
    topInches: 0,
    depthInches: 0,
  });
}

function createWallFaceElevationBox(elevationFrame: SceneEntityElevationFrame): ElevationBox | null {
  const viewZoneInches = elevationFrame.viewZoneInches;
  if (viewZoneInches === undefined) {
    return null;
  }
  return createElevationBox({
    id: "wall-face:elevation-view-zone",
    leftInches: viewZoneInches.leftInches,
    rightInches: viewZoneInches.rightInches,
    bottomInches: viewZoneInches.bottomInches,
    topInches: viewZoneInches.topInches,
    depthInches: 0,
  });
}

function createElevationBox(args: {
  id: string;
  leftInches: number;
  rightInches: number;
  bottomInches: number;
  topInches: number;
  depthInches: number;
}): ElevationBox {
  const centerInches = (args.leftInches + args.rightInches) / 2;
  const middleInches = (args.bottomInches + args.topInches) / 2;
  return {
    id: args.id,
    leftInches: args.leftInches,
    rightInches: args.rightInches,
    centerInches,
    bottomInches: args.bottomInches,
    topInches: args.topInches,
    middleInches,
    depthInches: args.depthInches,
    uAnchors: [
      { id: `${args.id}:u:min`, axis: "u", role: "min", valueInches: args.leftInches },
      { id: `${args.id}:u:center`, axis: "u", role: "center", valueInches: centerInches },
      { id: `${args.id}:u:max`, axis: "u", role: "max", valueInches: args.rightInches },
    ],
    zAnchors: [
      { id: `${args.id}:z:min`, axis: "z", role: "min", valueInches: args.bottomInches },
      { id: `${args.id}:z:center`, axis: "z", role: "center", valueInches: middleInches },
      { id: `${args.id}:z:max`, axis: "z", role: "max", valueInches: args.topInches },
    ],
  };
}

function selectElevationCandidate(args: {
  axis: "u" | "z";
  movingAnchors: readonly ElevationAnchor[];
  targetBoxes: readonly ElevationBox[];
}): SelectedElevationCandidate | null {
  const candidates = args.movingAnchors.flatMap((movingAnchor) => args.targetBoxes.flatMap((targetBox) => {
    const targetAnchors = args.axis === "u" ? targetBox.uAnchors : targetBox.zAnchors;
    return targetAnchors.map((targetAnchor): SelectedElevationCandidate => {
      const deltaInches = targetAnchor.valueInches - movingAnchor.valueInches;
      return {
        axis: args.axis,
        movingAnchor,
        targetAnchor,
        targetBox,
        deltaInches,
        distanceInches: Math.abs(deltaInches),
      };
    });
  })).filter((candidate) => candidate.distanceInches <= SCENE_ENTITY_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES);

  return candidates.sort((first, second) => first.distanceInches - second.distanceInches)[0] ?? null;
}

function translateEntityInElevation(args: {
  sceneEntity: SceneEntity;
  elevationFrame: SceneEntityElevationFrame;
  deltaUInches: number;
  deltaZInches: number;
}): SceneEntity {
  return createSceneEntityWithWorldPosition(args.sceneEntity, {
    xInches: args.sceneEntity.worldPositionInches.xInches + args.elevationFrame.faceDirectionInches.xInches * args.deltaUInches,
    yInches: args.sceneEntity.worldPositionInches.yInches + args.elevationFrame.faceDirectionInches.yInches * args.deltaUInches,
    zInches: args.sceneEntity.worldPositionInches.zInches + args.deltaZInches,
  });
}

function createElevationAlignmentGuide(args: {
  candidate: SelectedElevationCandidate;
  movingBox: ElevationBox;
  elevationFrame: SceneEntityElevationFrame;
}): SceneEntityAlignmentGuide {
  if (args.candidate.axis === "z") {
    const startUInches = Math.min(args.movingBox.leftInches, args.candidate.targetBox.leftInches) - ALIGNMENT_GUIDE_PADDING_INCHES;
    const endUInches = Math.max(args.movingBox.rightInches, args.candidate.targetBox.rightInches) + ALIGNMENT_GUIDE_PADDING_INCHES;
    return {
      id: `scene-entity-elevation-alignment:z:${args.candidate.movingAnchor.id}:${args.candidate.targetAnchor.id}`,
      guidePlane: "elevation",
      startPointInches: createElevationGuidePoint({ elevationFrame: args.elevationFrame, uInches: startUInches, zInches: args.candidate.targetAnchor.valueInches }),
      endPointInches: createElevationGuidePoint({ elevationFrame: args.elevationFrame, uInches: endUInches, zInches: args.candidate.targetAnchor.valueInches }),
    };
  }

  const startZInches = Math.min(args.movingBox.bottomInches, args.candidate.targetBox.bottomInches) - ALIGNMENT_GUIDE_PADDING_INCHES;
  const endZInches = Math.max(args.movingBox.topInches, args.candidate.targetBox.topInches) + ALIGNMENT_GUIDE_PADDING_INCHES;
  return {
    id: `scene-entity-elevation-alignment:u:${args.candidate.movingAnchor.id}:${args.candidate.targetAnchor.id}`,
    guidePlane: "elevation",
    startPointInches: createElevationGuidePoint({ elevationFrame: args.elevationFrame, uInches: args.candidate.targetAnchor.valueInches, zInches: startZInches }),
    endPointInches: createElevationGuidePoint({ elevationFrame: args.elevationFrame, uInches: args.candidate.targetAnchor.valueInches, zInches: endZInches }),
  };
}

function createElevationGuidePoint(args: {
  elevationFrame: SceneEntityElevationFrame;
  uInches: number;
  zInches: number;
}): Point3DInches {
  return {
    xInches: args.elevationFrame.planeOriginInches.xInches + args.elevationFrame.faceDirectionInches.xInches * args.uInches,
    yInches: args.elevationFrame.planeOriginInches.yInches + args.elevationFrame.faceDirectionInches.yInches * args.uInches,
    zInches: args.zInches,
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

function isElevationBox(value: ElevationBox | null): value is ElevationBox {
  return value !== null;
}
