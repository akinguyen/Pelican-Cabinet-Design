import { defaultWallSettings } from "@/engine/walls/wallTypes";
import { createDefaultEditorCameraStates } from "@/features/kitchen-editor/editors/shared/editorCameraStateTypes";
import { createEmptyDesignScene } from "./designSceneTypes";
import type { DesignSceneStore } from "./designSceneStoreTypes";

export function createInitialDesignSceneStoreState(): Pick<
  DesignSceneStore,
  | "designScene"
  | "wallSettings"
  | "activeEditorView"
  | "activeWallElevationEdgeIndex"
  | "activeToolbarTool"
  | "cameraCommand"
  | "editorCameraStates"
  | "activeDrag"
> {
  return {
    designScene: createEmptyDesignScene(),
    wallSettings: defaultWallSettings,
    activeEditorView: "perspective",
    activeWallElevationEdgeIndex: 0,
    activeToolbarTool: null,
    cameraCommand: null,
    editorCameraStates: createDefaultEditorCameraStates(),
    activeDrag: null,
  };
}
