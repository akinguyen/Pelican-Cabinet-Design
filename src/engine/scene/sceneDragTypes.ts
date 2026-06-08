import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneViewMode } from "@/features/kitchen-editor/editors/shared/sceneViewModeTypes";

export type AssemblyDragState = Readonly<{
  assemblyId: string;
  dragStartPointerWorldInches: Point3DInches;
  dragStartWorldPositionInches: Point3DInches;
  sceneViewMode: SceneViewMode;
}>;
