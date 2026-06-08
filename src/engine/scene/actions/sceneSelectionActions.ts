import { createWallSplitDraftForTarget } from "@/engine/walls/split-draft/wallSplitDraftFactory";
import type { SceneSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createSceneSelectionActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "selectPlacedAssembly" | "selectPlacedWall" | "clearSelection"> {
  return {
    selectPlacedAssembly(placedAssemblyId) {
      const selection: SceneSelection = {
        kind: "placed-assembly",
        placedAssemblyId,
      };

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: selection,
        },
      }));
    },

    selectPlacedWall(placedWallId) {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: {
            kind: "placed-wall",
            placedWallId,
          },
          activeSceneOperation:
            canManuallyEditScene(state.workspaceMode) && state.activeToolbarTool === "split-wall-footprint"
              ? {
                  kind: "wall-split-draft",
                  wallSplitDraft: createWallSplitDraftForTarget(placedWallId),
                }
              : state.designScene.activeSceneOperation,
        },
      }));
    },

    clearSelection() {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: null,
        },
      }));
    },
  };
}
