import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { KitchenEditorView } from "@/features/kitchen-editor/editors/shared/editorViewTypes";

export type AssemblyDragState = Readonly<{
  assemblyId: string;
  dragStartPointerWorldInches: Point3DInches;
  dragStartWorldPositionInches: Point3DInches;
  editorView: KitchenEditorView;
}>;
