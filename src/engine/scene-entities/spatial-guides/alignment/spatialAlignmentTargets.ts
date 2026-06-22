import { createWallGraphs3DEdges, type Wall3DEdge } from "@/engine/walls/wall3DGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { createSceneEntityBounds } from "@/engine/scene-entities/sceneEntityBounds";
import type { SpatialGuideFrame } from "../spatialGuideFrame";
import { projectPointToSpatialGuideFrame } from "../spatialGuideFrame";
import { createSpatialGuideBounds, createSpatialGuideSubject, createSpatialGuideSubjectFromBounds } from "../spatialGuideProjection";
import type { SpatialGuideSubject } from "../spatialGuideTypes";

export function createSpatialAlignmentTargets(args: {
  sceneEntities: readonly SceneEntity[];
  excludedIds: ReadonlySet<string>;
  placedWallGraphs: readonly PlacedWallGraph[];
  frame: SpatialGuideFrame;
}): readonly SpatialGuideSubject[] {
  return [
    ...createSpatialWallAlignmentTargets({ placedWallGraphs: args.placedWallGraphs, frame: args.frame }),
    ...args.sceneEntities
      .filter((sceneEntity) => !args.excludedIds.has(sceneEntity.id))
      .map((sceneEntity) => createSpatialGuideSubjectFromBounds({ bounds: createSceneEntityBounds(sceneEntity), frame: args.frame })),
  ];
}

function createSpatialWallAlignmentTargets(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  frame: SpatialGuideFrame;
}): readonly SpatialGuideSubject[] {
  if (args.frame.kind === "wall-face-plane") {
    return createElevationWallFaceAlignmentTarget(args.frame);
  }

  return createWallGraphs3DEdges(args.placedWallGraphs)
    .filter(isPlanWallAlignmentEdge)
    .map((wallEdge) => createLineSpatialAlignmentTarget({ wallEdge, frame: args.frame }));
}

function createElevationWallFaceAlignmentTarget(frame: SpatialGuideFrame): readonly SpatialGuideSubject[] {
  const wallFace = frame.movementFrame.elevationFrame?.wallFaceInches;

  if (wallFace === undefined) {
    return [];
  }

  const framePoints = [
    { ...wallFace.faceStartInches, zInches: 0 },
    { ...wallFace.faceEndInches, zInches: 0 },
    { ...wallFace.faceStartInches, zInches: wallFace.wallHeightInches },
    { ...wallFace.faceEndInches, zInches: wallFace.wallHeightInches },
  ].map((pointInches) => projectPointToSpatialGuideFrame({ pointInches, frame }));
  const uValues = framePoints.map((point) => point.uInches);
  const nValues = framePoints.map((point) => point.nInches);

  return [
    createSpatialGuideSubject({
      id: "wall-face:elevation-active-wall-face",
      targetKind: "wall-face",
      bounds: createSpatialGuideBounds({
        minUInches: Math.min(...uValues),
        maxUInches: Math.max(...uValues),
        minVInches: 0,
        maxVInches: wallFace.wallHeightInches,
        minNInches: Math.min(...nValues),
        maxNInches: Math.max(...nValues),
      }),
    }),
  ];
}

function createLineSpatialAlignmentTarget(args: {
  wallEdge: Wall3DEdge;
  frame: SpatialGuideFrame;
}): SpatialGuideSubject {
  const startFramePoint = projectPointToSpatialGuideFrame({ pointInches: args.wallEdge.startPointInches, frame: args.frame });
  const endFramePoint = projectPointToSpatialGuideFrame({ pointInches: args.wallEdge.endPointInches, frame: args.frame });

  return createSpatialGuideSubject({
    id: `${args.wallEdge.targetKind}:${args.wallEdge.id}`,
    targetKind: args.wallEdge.targetKind,
    bounds: createSpatialGuideBounds({
      minUInches: Math.min(startFramePoint.uInches, endFramePoint.uInches),
      maxUInches: Math.max(startFramePoint.uInches, endFramePoint.uInches),
      minVInches: Math.min(startFramePoint.vInches, endFramePoint.vInches),
      maxVInches: Math.max(startFramePoint.vInches, endFramePoint.vInches),
      minNInches: Math.min(startFramePoint.nInches, endFramePoint.nInches),
      maxNInches: Math.max(startFramePoint.nInches, endFramePoint.nInches),
    }),
  });
}

function isPlanWallAlignmentEdge(wallEdge: Wall3DEdge): boolean {
  return wallEdge.role === "bottom-footprint" ||
    wallEdge.role === "centerline" ||
    wallEdge.role === "face-bottom";
}
