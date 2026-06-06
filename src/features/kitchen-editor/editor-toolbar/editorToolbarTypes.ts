import type { KitchenEditorView } from "../editors/shared/editorViewTypes";

export type EditorCameraCommandTool = "zoom-out" | "zoom-in" | "fit-view";

export type EditorActiveToolbarTool = "draw-wall-footprint" | "split-wall-footprint";

export type EditorToolbarActionId = EditorCameraCommandTool | EditorActiveToolbarTool;

export type EditorCameraCommand = Readonly<{
  id: number;
  editorView: KitchenEditorView;
  tool: EditorCameraCommandTool;
}>;
