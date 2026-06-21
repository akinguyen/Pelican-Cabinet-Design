import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { SceneEntityRef } from "@/engine/scene-entities/sceneEntityTypes";
export type { SceneEntityElevationFrame, SceneEntityElevationViewZoneFrame } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import type { SceneEntityElevationFrame } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";

export type SceneEntityMoveDragState = Readonly<{
  kind: "scene-entity-move";
  sceneEntities: readonly SceneEntityRef[];
  dragStartPointerWorldInches: Point3DInches;
  dragStartWorldPositionsBySceneEntityKey: Readonly<Record<string, Point3DInches>>;
  latestWorldPositionsBySceneEntityKey: Readonly<Record<string, Point3DInches>>;
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: SceneEntityElevationFrame;
}>;

export type SceneEntityRotationDragState = Readonly<{
  kind: "scene-entity-rotation";
  sceneEntity: SceneEntityRef;
  centerPointInches: Point3DInches;
  startPointerAngleDegrees: number;
  startRotationDegrees: number;
  startWorldPositionInches: Point3DInches;
  latestValidRotationDegrees: number;
  startHandleCenterAngleDegrees: number;
  latestHandleCenterAngleDegrees: number;
}>;

export type SceneDragState = SceneEntityMoveDragState | SceneEntityRotationDragState;
