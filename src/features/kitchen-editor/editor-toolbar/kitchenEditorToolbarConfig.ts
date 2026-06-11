import { Maximize, Minus, PencilLine, Plus, Scissors, Square } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SceneCameraCommandTool } from "@/engine/scene/sceneCameraCommandTypes";
import type { SceneEditingTool } from "@/engine/scene/sceneEditingToolTypes";
import type { KitchenEditorToolbarActionId } from "./kitchenEditorToolbarTypes";

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
  { id: "draw-wall-footprint", kind: "active-tool", label: "Draw wall footprint", icon: PencilLine },
  { id: "split-wall-footprint", kind: "active-tool", label: "Split wall footprint", icon: Scissors },
  { id: "draw-countertop-cutout-rectangle", kind: "active-tool", label: "Rectangle cutout", icon: Square },
] satisfies readonly Readonly<{
  id: KitchenEditorToolbarActionId;
  kind: "camera-command" | "active-tool";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>[];
