import { defaultWallSettings } from "@/engine/walls/placedWallSegmentTypes";
import { createDefaultSceneCameraStates } from "@/engine/scene/sceneCameraStateTypes";
import { createEmptyDesignScene } from "./designSceneTypes";
import type { DesignSceneStore } from "./designSceneStoreTypes";

export function createInitialDesignSceneStoreState(): Pick<
  DesignSceneStore,
  | "designScene"
  | "wallSettings"
  | "workspaceMode"
  | "activeSceneViewMode"
  | "activeWallElevationTarget"
  | "activeWallElevationFaceSideBySegmentKey"
  | "activeToolbarTool"
  | "cameraCommand"
  | "sceneCameraStates"
  | "activeDrag"
  | "assemblyPlacementFeedback"
> {
  return {
    designScene: createEmptyDesignScene(),
    wallSettings: defaultWallSettings,
    workspaceMode: "editor",
    activeSceneViewMode: "perspective",
    activeWallElevationTarget: null,
    activeWallElevationFaceSideBySegmentKey: {},
    activeToolbarTool: null,
    cameraCommand: null,
    sceneCameraStates: createDefaultSceneCameraStates(),
    activeDrag: null,
    assemblyPlacementFeedback: null,
  };
}
