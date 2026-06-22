import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityMovementFrame } from "./sceneEntityMovementFrame";
import { createSceneEntityMovementFramePointFromPointerDelta } from "./sceneEntityMovementFrame";

export function createDraggedSceneEntityWorldPosition(args: {
  movementFrame: SceneEntityMovementFrame;
  dragStartPointerWorldInches: Point3DInches;
  pointerWorldInches: Point3DInches;
  dragStartWorldPositionInches: Point3DInches;
  minWorldZInches: number;
}): Point3DInches {
  return createSceneEntityMovementFramePointFromPointerDelta(args);
}
