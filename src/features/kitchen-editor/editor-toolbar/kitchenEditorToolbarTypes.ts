import type { SceneCameraCommandTool } from "../editors/shared/sceneCameraCommandTypes";

export type KitchenEditorActiveToolbarTool = "draw-wall-footprint" | "split-wall-footprint";

export type KitchenEditorToolbarActionId = SceneCameraCommandTool | KitchenEditorActiveToolbarTool;
