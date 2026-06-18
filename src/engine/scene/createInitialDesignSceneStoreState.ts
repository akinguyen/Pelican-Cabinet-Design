import { defaultWallSettings } from "@/engine/walls/placedWallSegmentTypes";
import { createDefaultSceneCameraStates } from "@/engine/scene/sceneCameraStateTypes";
import { createEmptyDesignScene } from "./designSceneTypes";
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
  | "assemblyPlacementFeedback"
  | "activeObjectAlignmentGuides"
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
    assemblyPlacementFeedback: null,
    activeObjectAlignmentGuides: [],
  };
}
