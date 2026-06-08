import { Bot, Maximize, Minus, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SceneCameraCommandTool } from "../editors/shared/sceneCameraCommandTypes";
import type { KitchenDesignerToolbarActionId } from "./kitchenDesignerToolbarTypes";

export type KitchenDesignerCameraToolbarAction = Readonly<{
  id: SceneCameraCommandTool;
  kind: "camera-command";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>;

export type KitchenDesignerPanelToolbarAction = Readonly<{
  id: "ask-ai-about-scene";
  kind: "designer-panel-action";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>;

export type KitchenDesignerToolbarAction =
  | KitchenDesignerCameraToolbarAction
  | KitchenDesignerPanelToolbarAction;

export const kitchenDesignerToolbarActions: readonly KitchenDesignerToolbarAction[] = [
  { id: "zoom-out", kind: "camera-command", label: "Zoom out", icon: Minus },
  { id: "zoom-in", kind: "camera-command", label: "Zoom in", icon: Plus },
  { id: "fit-view", kind: "camera-command", label: "Fit view", icon: Maximize },
  {
    id: "ask-ai-about-scene",
    kind: "designer-panel-action",
    label: "Ask AI about scene",
    icon: Bot,
    isDisabled: true,
  },
] satisfies readonly Readonly<{
  id: KitchenDesignerToolbarActionId;
  kind: "camera-command" | "designer-panel-action";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>[];
