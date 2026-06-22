import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneEntity, SceneEntityRef } from "@/engine/scene-entities/sceneEntityTypes";
import { createSceneEntityBounds } from "@/engine/scene-entities/sceneEntityBounds";
import type { SceneEntityAlignmentGuide } from "@/engine/scene-entities/alignment/sceneEntityAlignmentTypes";
import { createSceneEntityWithWorldPosition } from "@/engine/scene-entities/sceneEntityTransforms";
import type { SceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";
import { createSpatialGuideFrame, translatePointInSpatialGuideFrame } from "./spatialGuideFrame";
import { createSpatialGuideBoundsFromSubjects, createSpatialGuideSubject, createSpatialGuideSubjectFromBounds } from "./spatialGuideProjection";
import type { SceneEntityGroupSpatialGuideResult, SceneEntitySpatialGuideResult, SpatialGuideSubject } from "./spatialGuideTypes";
import { createSpatialAlignmentTargets } from "./alignment/spatialAlignmentTargets";
import { solveSpatialAlignment } from "./alignment/spatialAlignmentSolver";
import { createSpatialAlignmentGuides } from "./alignment/spatialAlignmentSegments";

export type { SceneEntityWallMeasurementGuide } from "./spatialGuideTypes";
export { buildSceneEntitySpatialMeasurementGuides, buildSceneEntitySpatialMeasurementGuidesFromFootprint } from "./measurement/spatialMeasurementSolver";

export function alignSceneEntityWithSpatialGuides(args: {
  movingSceneEntity: SceneEntity;
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds?: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
  movementFrame: SceneEntityMovementFrame;
}): SceneEntitySpatialGuideResult {
  const frame = createSpatialGuideFrame(args.movementFrame);
  const excludedIds = new Set([args.movingSceneEntity.id, ...(args.excludedSceneEntityIds ?? [])]);
  const movingSubject = createSpatialGuideSubjectFromBounds({
    bounds: createSceneEntityBounds(args.movingSceneEntity),
    frame,
  });
  const targetSubjects = createSpatialAlignmentTargets({
    sceneEntities: args.sceneEntities,
    excludedIds,
    placedWallGraphs: args.placedWallGraphs,
    frame,
  });
  const solvedAlignment = solveSpatialAlignment({
    movingSubject,
    targetSubjects,
    frame,
  });
  const sceneEntity = translateSceneEntityInSpatialFrame({
    sceneEntity: args.movingSceneEntity,
    movementFrame: args.movementFrame,
    deltaUInches: solvedAlignment.deltaUInches,
    deltaVInches: solvedAlignment.deltaVInches,
  });
  const alignedSubject = createSpatialGuideSubjectFromBounds({
    bounds: createSceneEntityBounds(sceneEntity),
    frame,
  });

  return {
    sceneEntity,
    alignmentGuides: createSpatialAlignmentGuides({
      candidates: [solvedAlignment.uCandidate, solvedAlignment.vCandidate],
      movingSubject: alignedSubject,
      frame,
    }),
  };
}

export function alignSceneEntityGroupWithSpatialGuides(args: {
  movingSceneEntities: readonly SceneEntity[];
  sceneEntities: readonly SceneEntity[];
  excludedSceneEntityIds: readonly string[];
  placedWallGraphs: readonly PlacedWallGraph[];
  movementFrame: SceneEntityMovementFrame;
}): SceneEntityGroupSpatialGuideResult {
  if (args.movingSceneEntities.length === 0) {
    return { sceneEntities: [], alignmentGuides: [] };
  }

  const frame = createSpatialGuideFrame(args.movementFrame);
  const movingSubject = createGroupSpatialGuideSubject(args.movingSceneEntities.map((sceneEntity) => (
    createSpatialGuideSubjectFromBounds({ bounds: createSceneEntityBounds(sceneEntity), frame })
  )));

  if (movingSubject === null) {
    return { sceneEntities: args.movingSceneEntities, alignmentGuides: [] };
  }

  const targetSubjects = createSpatialAlignmentTargets({
    sceneEntities: args.sceneEntities,
    excludedIds: new Set(args.excludedSceneEntityIds),
    placedWallGraphs: args.placedWallGraphs,
    frame,
  });
  const solvedAlignment = solveSpatialAlignment({
    movingSubject,
    targetSubjects,
    frame,
  });
  const sceneEntities = args.movingSceneEntities.map((sceneEntity) => translateSceneEntityInSpatialFrame({
    sceneEntity,
    movementFrame: args.movementFrame,
    deltaUInches: solvedAlignment.deltaUInches,
    deltaVInches: solvedAlignment.deltaVInches,
  }));
  const alignedSubject = createGroupSpatialGuideSubject(sceneEntities.map((sceneEntity) => (
    createSpatialGuideSubjectFromBounds({ bounds: createSceneEntityBounds(sceneEntity), frame })
  )));

  return {
    sceneEntities,
    alignmentGuides: alignedSubject === null ? [] : createSpatialAlignmentGuides({
      candidates: [solvedAlignment.uCandidate, solvedAlignment.vCandidate],
      movingSubject: alignedSubject,
      frame,
    }),
  };
}

function translateSceneEntityInSpatialFrame(args: {
  sceneEntity: SceneEntity;
  movementFrame: SceneEntityMovementFrame;
  deltaUInches: number;
  deltaVInches: number;
}): SceneEntity {
  return createSceneEntityWithWorldPosition(args.sceneEntity, translatePointInSpatialGuideFrame({
    pointInches: args.sceneEntity.worldPositionInches,
    frame: createSpatialGuideFrame(args.movementFrame),
    deltaUInches: args.deltaUInches,
    deltaVInches: args.deltaVInches,
  }));
}

function createGroupSpatialGuideSubject(subjects: readonly SpatialGuideSubject[]): SpatialGuideSubject | null {
  const bounds = createSpatialGuideBoundsFromSubjects(subjects);

  if (bounds === null) {
    return null;
  }

  return createSpatialGuideSubject({
    id: "scene-entity-group:moving",
    targetKind: "scene-entity",
    bounds,
  });
}

export function getSceneEntityIdFromRef(ref: SceneEntityRef): string {
  return ref.entityId;
}

export type SpatialGuideAlignmentPreview = Readonly<{
  alignmentGuides: readonly SceneEntityAlignmentGuide[];
}>;
