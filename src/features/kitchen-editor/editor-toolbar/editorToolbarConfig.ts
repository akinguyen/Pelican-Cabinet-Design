import { Maximize, Minus, PencilLine, Plus, Scissors } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  EditorActiveToolbarTool,
  EditorCameraCommandTool,
  EditorToolbarActionId,
} from "./editorToolbarTypes";

export type EditorCameraToolbarAction = Readonly<{
  id: EditorCameraCommandTool;
  kind: "camera-command";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>;

export type EditorActiveToolbarAction = Readonly<{
  id: EditorActiveToolbarTool;
  kind: "active-tool";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>;

export type EditorToolbarAction = EditorCameraToolbarAction | EditorActiveToolbarAction;

export const editorToolbarActions: readonly EditorToolbarAction[] = [
  { id: "zoom-out", kind: "camera-command", label: "Zoom out", icon: Minus },
  { id: "zoom-in", kind: "camera-command", label: "Zoom in", icon: Plus },
  { id: "fit-view", kind: "camera-command", label: "Fit view", icon: Maximize },
  { id: "draw-wall-footprint", kind: "active-tool", label: "Draw wall footprint", icon: PencilLine },
  { id: "split-wall-footprint", kind: "active-tool", label: "Split wall footprint", icon: Scissors },
] satisfies readonly Readonly<{
  id: EditorToolbarActionId;
  kind: "camera-command" | "active-tool";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>[];
