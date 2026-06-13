import type { SceneViewMode } from "./sceneViewModeTypes";

export type SceneCameraCommandTool = "zoom-out" | "zoom-in" | "fit-view";

export type SceneCameraCommand = Readonly<{
  id: number;
  sceneViewMode: SceneViewMode;
  tool: SceneCameraCommandTool;
}>;
