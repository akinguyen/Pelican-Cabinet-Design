import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";

export type AssemblyElevationMoveFrame = Readonly<{
  faceDirectionInches: Point3DInches;
  outwardDirectionInches: Point3DInches;
  planeOriginInches: Point3DInches;
}>;

export type AssemblyMoveDragState = Readonly<{
  kind: "assembly-move";
  assemblyId: string;
  dragStartPointerWorldInches: Point3DInches;
  dragStartWorldPositionInches: Point3DInches;
  latestValidWorldPositionInches: Point3DInches;
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: AssemblyElevationMoveFrame;
}>;

export type AssemblyRotationDragState = Readonly<{
  kind: "assembly-rotation";
  assemblyId: string;
  centerPointInches: Point3DInches;
  pointerAngleDegrees: number;
  startPointerAngleDegrees: number;
  startRotationDegrees: number;
  latestRotationDegrees: number;
  latestValidRotationDegrees: number;
  isSnappedToRotationStop: boolean;
}>;

export type AssemblyDragState = AssemblyMoveDragState | AssemblyRotationDragState;
