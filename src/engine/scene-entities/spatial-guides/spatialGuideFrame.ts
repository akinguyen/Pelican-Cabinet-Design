import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";
import {
  createPointInSceneEntityMovementFrame,
  projectPointToSceneEntityMovementFrame,
  translatePointInSceneEntityMovementFrame,
} from "@/engine/scene-entities/sceneEntityMovementFrame";
import type { SpatialGuideFrameKind } from "./spatialGuideTypes";

export type SpatialGuideFrame = Readonly<{
  kind: SpatialGuideFrameKind;
  movementFrame: SceneEntityMovementFrame;
  overlayOffsetInches: number;
}>;

export type SpatialGuideFrameCoordinates = Readonly<{
  uInches: number;
  vInches: number;
  nInches: number;
}>;

export const FLOOR_PLANE_ALIGNMENT_OVERLAY_N_INCHES = 7.4;
export const FLOOR_PLANE_MEASUREMENT_Z_INCHES = 8.5;
export const SPATIAL_GUIDE_ELEVATION_OVERLAY_OFFSET_INCHES = 4;

export function createSpatialGuideFrame(movementFrame: SceneEntityMovementFrame): SpatialGuideFrame {
  return {
    kind: movementFrame.kind,
    movementFrame,
    overlayOffsetInches: movementFrame.kind === "wall-face-plane"
      ? SPATIAL_GUIDE_ELEVATION_OVERLAY_OFFSET_INCHES
      : 0.35,
  };
}

export function projectPointToSpatialGuideFrame(args: {
  pointInches: Point3DInches;
  frame: SpatialGuideFrame;
}): SpatialGuideFrameCoordinates {
  const framePoint = projectPointToSceneEntityMovementFrame({
    pointInches: args.pointInches,
    movementFrame: args.frame.movementFrame,
  });
  return {
    uInches: framePoint.horizontalInches,
    vInches: framePoint.verticalInches,
    nInches: framePoint.normalInches,
  };
}

export function createPointInSpatialGuideFrame(args: {
  frame: SpatialGuideFrame;
  uInches: number;
  vInches: number;
  nInches: number;
}): Point3DInches {
  return createPointInSceneEntityMovementFrame({
    movementFrame: args.frame.movementFrame,
    horizontalInches: args.uInches,
    verticalInches: args.vInches,
    normalInches: args.nInches,
  });
}

export function translatePointInSpatialGuideFrame(args: {
  pointInches: Point3DInches;
  frame: SpatialGuideFrame;
  deltaUInches: number;
  deltaVInches: number;
}): Point3DInches {
  return translatePointInSceneEntityMovementFrame({
    pointInches: args.pointInches,
    movementFrame: args.frame.movementFrame,
    deltaHorizontalInches: args.deltaUInches,
    deltaVerticalInches: args.deltaVInches,
  });
}
