import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import { createSceneEntityBounds } from "@/engine/scene-entities/sceneEntityBounds";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { createWallGraphs3DEdges, type Wall3DEdge } from "@/engine/walls/wall3DGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SpatialGuideFrame } from "./spatialGuideFrame";
import { projectPointToSpatialGuideFrame } from "./spatialGuideFrame";
import {
  createElevationWallFaceBoundsInSpatialFrame,
  createSpatialGuideBounds,
  createSpatialGuideSubject,
  createSpatialGuideSubjectFromBounds,
} from "./spatialGuideProjection";
import type { SpatialGuideBounds, SpatialGuideSubject } from "./spatialGuideTypes";

export type SpatialSceneEntityRecord = Readonly<{
  sceneEntity: SceneEntity;
  bounds: SceneEntityBounds;
  subject: SpatialGuideSubject;
}>;

export type SpatialWallAlignmentRecord = Readonly<{
  wallEdge: Wall3DEdge;
  bounds: SpatialGuideBounds;
  subject: SpatialGuideSubject;
}>;

export type SpatialElevationWallFaceRecord = Readonly<{
  bounds: SpatialGuideBounds;
  subject: SpatialGuideSubject;
}>;

export type SpatialSceneSnapshot = Readonly<{
  frame: SpatialGuideFrame;
  sceneEntityRecords: readonly SpatialSceneEntityRecord[];
  planWallAlignmentRecords: readonly SpatialWallAlignmentRecord[];
  planWallMeasurementEdges: readonly Wall3DEdge[];
  elevationWallFace: SpatialElevationWallFaceRecord | null;
}>;

export function createSpatialSceneSnapshot(args: {
  sceneEntities: readonly SceneEntity[];
  placedWallGraphs: readonly PlacedWallGraph[];
  frame: SpatialGuideFrame;
}): SpatialSceneSnapshot {
  const allWallEdges = createWallGraphs3DEdges(args.placedWallGraphs);

  return {
    frame: args.frame,
    sceneEntityRecords: args.sceneEntities.map((sceneEntity) => createSpatialSceneEntityRecord({ sceneEntity, frame: args.frame })),
    planWallAlignmentRecords: args.frame.kind === "floor-plane"
      ? allWallEdges.filter(isPlanWallAlignmentEdge).map((wallEdge) => createSpatialWallAlignmentRecord({ wallEdge, frame: args.frame }))
      : [],
    planWallMeasurementEdges: allWallEdges.filter(isPlanWallMeasurementEdge),
    elevationWallFace: args.frame.kind === "wall-face-plane"
      ? createSpatialElevationWallFaceRecord(args.frame)
      : null,
  };
}

export function createPlanWallMeasurementEdges(placedWallGraphs: readonly PlacedWallGraph[]): readonly Wall3DEdge[] {
  return createWallGraphs3DEdges(placedWallGraphs).filter(isPlanWallMeasurementEdge);
}

function createSpatialSceneEntityRecord(args: {
  sceneEntity: SceneEntity;
  frame: SpatialGuideFrame;
}): SpatialSceneEntityRecord {
  const bounds = createSceneEntityBounds(args.sceneEntity);

  return {
    sceneEntity: args.sceneEntity,
    bounds,
    subject: createSpatialGuideSubjectFromBounds({ bounds, frame: args.frame }),
  };
}

function createSpatialWallAlignmentRecord(args: {
  wallEdge: Wall3DEdge;
  frame: SpatialGuideFrame;
}): SpatialWallAlignmentRecord {
  const startFramePoint = projectPointToSpatialGuideFrame({ pointInches: args.wallEdge.startPointInches, frame: args.frame });
  const endFramePoint = projectPointToSpatialGuideFrame({ pointInches: args.wallEdge.endPointInches, frame: args.frame });
  const bounds = createSpatialGuideBounds({
    minUInches: Math.min(startFramePoint.uInches, endFramePoint.uInches),
    maxUInches: Math.max(startFramePoint.uInches, endFramePoint.uInches),
    minVInches: Math.min(startFramePoint.vInches, endFramePoint.vInches),
    maxVInches: Math.max(startFramePoint.vInches, endFramePoint.vInches),
    minNInches: Math.min(startFramePoint.nInches, endFramePoint.nInches),
    maxNInches: Math.max(startFramePoint.nInches, endFramePoint.nInches),
  });

  return {
    wallEdge: args.wallEdge,
    bounds,
    subject: createSpatialGuideSubject({
      id: `${args.wallEdge.targetKind}:${args.wallEdge.id}`,
      targetKind: args.wallEdge.targetKind,
      bounds,
    }),
  };
}

function createSpatialElevationWallFaceRecord(frame: SpatialGuideFrame): SpatialElevationWallFaceRecord | null {
  const bounds = createElevationWallFaceBoundsInSpatialFrame(frame);

  if (bounds === null) {
    return null;
  }

  return {
    bounds,
    subject: createSpatialGuideSubject({
      id: "wall-face:elevation-active-wall-face",
      targetKind: "wall-face",
      bounds,
    }),
  };
}

function isPlanWallAlignmentEdge(wallEdge: Wall3DEdge): boolean {
  return wallEdge.role === "bottom-footprint" ||
    wallEdge.role === "centerline" ||
    wallEdge.role === "face-bottom";
}

function isPlanWallMeasurementEdge(wallEdge: Wall3DEdge): boolean {
  return wallEdge.role === "bottom-footprint";
}
