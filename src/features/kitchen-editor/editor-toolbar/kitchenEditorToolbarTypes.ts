import type { SceneCameraCommandTool } from "@/engine/scene/sceneCameraCommandTypes";
import type { KitchenEditorActiveToolbarTool } from "@/engine/scene/sceneEditingToolTypes";

export type { KitchenEditorActiveToolbarTool };

export type KitchenEditorToolbarActionId = SceneCameraCommandTool | KitchenEditorActiveToolbarTool;
