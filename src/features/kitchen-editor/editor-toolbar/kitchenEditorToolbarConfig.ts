import { Box, Maximize, Minus, PencilLine, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SceneCameraCommandTool } from "@/engine/scene/sceneCameraCommandTypes";
import type { SceneEditingTool } from "@/engine/scene/sceneEditingToolTypes";

export type KitchenEditorToolbarActionId = SceneCameraCommandTool | SceneEditingTool;

export type KitchenEditorCameraToolbarAction = Readonly<{
  id: SceneCameraCommandTool;
  kind: "camera-command";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>;

export type KitchenEditorActiveToolbarAction = Readonly<{
  id: SceneEditingTool;
  kind: "active-tool";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>;

export type KitchenEditorToolbarAction =
  | KitchenEditorCameraToolbarAction
  | KitchenEditorActiveToolbarAction;

export const kitchenEditorToolbarActions: readonly KitchenEditorToolbarAction[] = [
  { id: "zoom-out", kind: "camera-command", label: "Zoom out", icon: Minus },
  { id: "zoom-in", kind: "camera-command", label: "Zoom in", icon: Plus },
  { id: "fit-view", kind: "camera-command", label: "Fit view", icon: Maximize },
  { id: "draw-wall-segment", kind: "active-tool", label: "Draw wall segment", icon: PencilLine },
  { id: "draw-design-reservation-zone", kind: "active-tool", label: "Draw reservation zone", icon: Box },
] satisfies readonly Readonly<{
  id: KitchenEditorToolbarActionId;
  kind: "camera-command" | "active-tool";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>[];
