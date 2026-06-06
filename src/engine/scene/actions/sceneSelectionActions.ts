import { getPlacedWallFirstViewableEdgeIndex } from "@/engine/walls/elevation/wallViewableEdges";
import { createWallSplitDraftForTarget } from "@/engine/walls/split-draft/wallSplitDraftFactory";
import type { SceneSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

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
      set((state) => {
        const selectedPlacedWall = state.designScene.placedWalls.find(
          (placedWall) => placedWall.id === placedWallId,
        );
        const firstViewableEdgeIndex = selectedPlacedWall === undefined
          ? 0
          : getPlacedWallFirstViewableEdgeIndex(selectedPlacedWall) ?? 0;

        return {
          activeWallElevationEdgeIndex: firstViewableEdgeIndex,
          designScene: {
            ...state.designScene,
            activeSelection: {
              kind: "placed-wall",
              placedWallId,
            },
            activeSceneOperation:
              state.activeToolbarTool === "split-wall-footprint"
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
