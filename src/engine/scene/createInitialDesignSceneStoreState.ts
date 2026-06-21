import { defaultWallSettings } from "@/engine/walls/placedWallSegmentTypes";
import { createDefaultSceneCameraStates } from "@/engine/scene/sceneCameraStateTypes";
import { createEmptyDesignScene } from "./designSceneTypes";
import { createEmptyDesignSceneHistoryState } from "./sceneHistoryTypes";
import type { DesignSceneStore } from "./designSceneStoreTypes";

export function createInitialDesignSceneStoreState(): Pick<
  DesignSceneStore,
  | "designScene"
  | "wallSettings"
  | "activeSceneViewMode"
  | "activeWallElevationTarget"
  | "activeToolbarTool"
  | "cameraCommand"
  | "sceneCameraStates"
  | "activeDrag"
  | "activeSceneEntityAlignmentGuides"
  | "sceneHistory"
> {
  return {
    designScene: createEmptyDesignScene(),
    wallSettings: defaultWallSettings,
    activeSceneViewMode: "perspective",
    activeWallElevationTarget: null,
    activeToolbarTool: null,
    cameraCommand: null,
    sceneCameraStates: createDefaultSceneCameraStates(),
    activeDrag: null,
    activeSceneEntityAlignmentGuides: [],
    sceneHistory: createEmptyDesignSceneHistoryState(),
  };
}
