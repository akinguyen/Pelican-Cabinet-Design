import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneCameraCommandActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "runCameraCommand" | "clearCameraCommand"> {
  return {
    runCameraCommand(cameraCommandTool) {
      set((state) => ({
        cameraCommand: {
          id: (state.cameraCommand?.id ?? 0) + 1,
          sceneViewMode: state.activeSceneViewMode,
          tool: cameraCommandTool,
        },
        activeToolbarTool: null,
      }));
    },

    clearCameraCommand(cameraCommandId) {
      set((state) => {
        if (state.cameraCommand?.id !== cameraCommandId) {
          return {};
        }

        return { cameraCommand: null };
      });
    },
  };
}
