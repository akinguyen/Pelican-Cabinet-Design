import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { SpatialGuideFrame } from "../spatialGuideFrame";
import { projectPointToSpatialGuideFrame } from "../spatialGuideFrame";
import { createSpatialGuideBounds } from "../spatialGuideProjection";
import type { SpatialGuideBounds } from "../spatialGuideTypes";

export function createSpatialGuideBoundsFromSceneEntityBounds(args: {
  bounds: SceneEntityBounds;
  frame: SpatialGuideFrame;
}): SpatialGuideBounds {
  const uValues = args.bounds.footprintCornersInches.map((pointInches) => projectPointToSpatialGuideFrame({ pointInches, frame: args.frame }).uInches);
  const nValues = args.bounds.footprintCornersInches.map((pointInches) => projectPointToSpatialGuideFrame({ pointInches, frame: args.frame }).nInches);
  const vValues = args.frame.kind === "wall-face-plane"
    ? [args.bounds.heightRangeInches.minZInches, args.bounds.heightRangeInches.maxZInches]
    : args.bounds.footprintCornersInches.map((pointInches) => projectPointToSpatialGuideFrame({ pointInches, frame: args.frame }).vInches);

  return createSpatialGuideBounds({
    minUInches: Math.min(...uValues),
    maxUInches: Math.max(...uValues),
    minVInches: Math.min(...vValues),
    maxVInches: Math.max(...vValues),
    minNInches: Math.min(...nValues),
    maxNInches: Math.max(...nValues),
  });
}
