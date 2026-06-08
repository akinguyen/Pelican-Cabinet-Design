import { Maximize, Minus, PencilLine, Plus, Scissors } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SceneCameraCommandTool } from "@/engine/scene/sceneCameraCommandTypes";
import type {
  KitchenEditorActiveToolbarTool,
  KitchenEditorToolbarActionId,
} from "./kitchenEditorToolbarTypes";

export type KitchenEditorCameraToolbarAction = Readonly<{
  id: SceneCameraCommandTool;
  kind: "camera-command";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>;

export type KitchenEditorActiveToolbarAction = Readonly<{
  id: KitchenEditorActiveToolbarTool;
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
] satisfies readonly Readonly<{
  id: KitchenEditorToolbarActionId;
  kind: "camera-command" | "active-tool";
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
}>[];
