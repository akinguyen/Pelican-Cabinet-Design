import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SpatialGuideFrame } from "./spatialGuideFrame";
import { createPointInSpatialGuideFrame, FLOOR_PLANE_ALIGNMENT_OVERLAY_N_INCHES } from "./spatialGuideFrame";
import type { SpatialGuideBounds } from "./spatialGuideTypes";

export function getSpatialGuideOverlayNInches(args: {
  frame: SpatialGuideFrame;
  movingBounds: SpatialGuideBounds;
  targetBounds?: SpatialGuideBounds;
  fixedFloorNInches?: number;
}): number {
  if (args.frame.kind === "floor-plane") {
    return args.fixedFloorNInches ?? FLOOR_PLANE_ALIGNMENT_OVERLAY_N_INCHES;
  }

  return Math.max(
    args.movingBounds.maxNInches,
    args.targetBounds?.maxNInches ?? 0,
    0,
  ) + args.frame.overlayOffsetInches;
}

export function createSpatialGuideOverlayPoint(args: {
  frame: SpatialGuideFrame;
  uInches: number;
  vInches: number;
  movingBounds: SpatialGuideBounds;
  targetBounds?: SpatialGuideBounds;
  fixedFloorNInches?: number;
}): Point3DInches {
  return createPointInSpatialGuideFrame({
    frame: args.frame,
    uInches: args.uInches,
    vInches: args.vInches,
    nInches: getSpatialGuideOverlayNInches({
      frame: args.frame,
      movingBounds: args.movingBounds,
      targetBounds: args.targetBounds,
      fixedFloorNInches: args.fixedFloorNInches,
    }),
  });
}
