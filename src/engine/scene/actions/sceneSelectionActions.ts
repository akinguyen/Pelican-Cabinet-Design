import { createWallSplitDraftForTarget } from "@/engine/walls/split-draft/wallSplitDraftFactory";
import type { SceneSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneSelectionActions(
  get: DesignSceneStoreGetter,
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
      set((state) => {
        const canStartWallSplitDraft =
          get().workspaceMode === "editor" && state.activeToolbarTool === "split-wall-footprint";

        return {
          designScene: {
            ...state.designScene,
            activeSelection: {
              kind: "placed-wall",
              placedWallId,
            },
            activeSceneOperation: canStartWallSplitDraft
              ? {
                  kind: "wall-split-draft",
                  wallSplitDraft: createWallSplitDraftForTarget(placedWallId),
                }
              : state.designScene.activeSceneOperation,
          },
        };
      });
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
