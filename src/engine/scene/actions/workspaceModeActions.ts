import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createWorkspaceModeActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "setWorkspaceMode"> {
  return {
    setWorkspaceMode(workspaceMode) {
      set((state) => {
        if (state.workspaceMode === workspaceMode) {
          return {};
        }

        if (workspaceMode === "designer") {
          return {
            workspaceMode,
            activeToolbarTool: null,
            cameraCommand: null,
            activeDrag: null,
            designScene: {
              ...state.designScene,
              activeSceneOperation: null,
            },
          };
        }

        return {
          workspaceMode,
          cameraCommand: null,
        };
      });
    },
  };
}
