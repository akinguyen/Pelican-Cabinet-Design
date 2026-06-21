import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { SceneEntityElevationFrame } from "./sceneEntityPlanGeometryTypes";

export function createDraggedSceneEntityWorldPosition(args: {
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: SceneEntityElevationFrame;
  dragStartPointerWorldInches: Point3DInches;
  pointerWorldInches: Point3DInches;
  dragStartWorldPositionInches: Point3DInches;
  minWorldZInches: number;
}): Point3DInches {
  const pointerDeltaInches = {
    xInches: args.pointerWorldInches.xInches - args.dragStartPointerWorldInches.xInches,
    yInches: args.pointerWorldInches.yInches - args.dragStartPointerWorldInches.yInches,
    zInches: args.pointerWorldInches.zInches - args.dragStartPointerWorldInches.zInches,
  };

  if (args.sceneViewMode === "elevation" && args.elevationMoveFrame !== undefined) {
    const deltaAlongFaceInches =
      pointerDeltaInches.xInches * args.elevationMoveFrame.faceDirectionInches.xInches +
      pointerDeltaInches.yInches * args.elevationMoveFrame.faceDirectionInches.yInches +
      pointerDeltaInches.zInches * args.elevationMoveFrame.faceDirectionInches.zInches;

    return {
      xInches: args.dragStartWorldPositionInches.xInches + args.elevationMoveFrame.faceDirectionInches.xInches * deltaAlongFaceInches,
      yInches: args.dragStartWorldPositionInches.yInches + args.elevationMoveFrame.faceDirectionInches.yInches * deltaAlongFaceInches,
      zInches: Math.max(args.minWorldZInches, args.dragStartWorldPositionInches.zInches + pointerDeltaInches.zInches),
    };
  }

  if (args.sceneViewMode === "elevation") {
    return {
      xInches: args.dragStartWorldPositionInches.xInches + pointerDeltaInches.xInches,
      yInches: args.dragStartWorldPositionInches.yInches,
      zInches: Math.max(args.minWorldZInches, args.dragStartWorldPositionInches.zInches + pointerDeltaInches.zInches),
    };
  }

  return {
    xInches: args.dragStartWorldPositionInches.xInches + pointerDeltaInches.xInches,
    yInches: args.dragStartWorldPositionInches.yInches + pointerDeltaInches.yInches,
    zInches: args.dragStartWorldPositionInches.zInches,
  };
}
