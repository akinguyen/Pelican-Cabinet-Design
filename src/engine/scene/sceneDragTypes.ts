import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";

export type AssemblyElevationViewZoneFrame = Readonly<{
  originInches: Point3DInches;
  leftInches: number;
  rightInches: number;
  nearDepthInches: number;
  farDepthInches: number;
  bottomInches: number;
  topInches: number;
}>;

export type AssemblyElevationMoveFrame = Readonly<{
  faceDirectionInches: Point3DInches;
  outwardDirectionInches: Point3DInches;
  planeOriginInches: Point3DInches;
  viewZoneInches?: AssemblyElevationViewZoneFrame;
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

export type AssemblyMultiMoveDragState = Readonly<{
  kind: "assembly-multi-move";
  leaderAssemblyId: string;
  assemblyIds: readonly string[];
  dragStartPointerWorldInches: Point3DInches;
  dragStartWorldPositionsByAssemblyId: Readonly<Record<string, Point3DInches>>;
  latestValidWorldPositionsByAssemblyId: Readonly<Record<string, Point3DInches>>;
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
  startWorldPositionInches: Point3DInches;
  latestRotationDegrees: number;
  latestValidRotationDegrees: number;
  isSnappedToRotationStop: boolean;
}>;

export type DesignReservationZoneMoveDragState = Readonly<{
  kind: "design-reservation-zone-move";
  designReservationZoneId: string;
  dragStartPointerWorldInches: Point3DInches;
  dragStartBaseCenterPointInches: Point3DInches;
  latestBaseCenterPointInches: Point3DInches;
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: AssemblyElevationMoveFrame;
}>;

export type DesignReservationZoneRotationDragState = Readonly<{
  kind: "design-reservation-zone-rotation";
  designReservationZoneId: string;
  centerPointInches: Point3DInches;
  startPointerAngleDegrees: number;
  startRotationDegrees: number;
  latestRotationDegrees: number;
}>;

export type SceneDragState =
  | AssemblyMoveDragState
  | AssemblyMultiMoveDragState
  | AssemblyRotationDragState
  | DesignReservationZoneMoveDragState
  | DesignReservationZoneRotationDragState;

