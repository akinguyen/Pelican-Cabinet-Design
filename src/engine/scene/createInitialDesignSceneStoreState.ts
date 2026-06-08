import { defaultWallSettings } from "@/engine/walls/wallTypes";
import { createDefaultSceneCameraStates } from "@/engine/scene/sceneCameraStateTypes";
import { createEmptyDesignScene } from "./designSceneTypes";
import type { DesignSceneStore } from "./designSceneStoreTypes";

export function createInitialDesignSceneStoreState(): Pick<
  DesignSceneStore,
  | "designScene"
  | "wallSettings"
  | "workspaceMode"
  | "activeSceneViewMode"
  | "activeWallElevationWallId"
  | "activeWallElevationEdgeIndex"
  | "activeToolbarTool"
  | "cameraCommand"
  | "sceneCameraStates"
  | "activeDrag"
> {
  return {
    designScene: createEmptyDesignScene(),
    wallSettings: defaultWallSettings,
    workspaceMode: "editor",
    activeSceneViewMode: "perspective",
    activeWallElevationWallId: null,
    activeWallElevationEdgeIndex: 0,
    activeToolbarTool: null,
    cameraCommand: null,
    sceneCameraStates: createDefaultSceneCameraStates(),
    activeDrag: null,
  };
}
