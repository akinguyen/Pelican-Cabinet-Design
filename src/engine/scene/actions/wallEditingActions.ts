import { deletePlacedWall, updatePlacedWallHeight, updatePlacedWallViewableEdge } from "@/engine/walls/wallEditing";
import { getPlacedWallViewableEdgeIndices } from "@/engine/walls/elevation/wallViewableEdges";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createWallEditingActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "updateSelectedPlacedWallHeight" | "updateSelectedPlacedWallViewableEdge" | "deleteSelectedPlacedWall"
> {
  return {
    updateSelectedPlacedWallHeight(heightInches) {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedWalls: updatePlacedWallHeight({
            placedWalls: state.designScene.placedWalls,
            placedWallId: activeSelection.placedWallId,
            heightInches,
          }),
        },
      }));
    },

    updateSelectedPlacedWallViewableEdge(edgeIndex, isViewable) {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall") {
        return;
      }

      set((state) => {
        const placedWalls = updatePlacedWallViewableEdge({
          placedWalls: state.designScene.placedWalls,
          placedWallId: activeSelection.placedWallId,
          edgeIndex,
          isViewable,
        });
        const selectedPlacedWall = placedWalls.find(
          (placedWall) => placedWall.id === activeSelection.placedWallId,
        );
        const viewableEdgeIndices = selectedPlacedWall === undefined
          ? []
          : getPlacedWallViewableEdgeIndices(selectedPlacedWall);
        const nextActiveWallElevationEdgeIndex = viewableEdgeIndices.includes(
          state.activeWallElevationEdgeIndex,
        )
          ? state.activeWallElevationEdgeIndex
          : viewableEdgeIndices[0] ?? 0;

        return {
          activeWallElevationEdgeIndex: nextActiveWallElevationEdgeIndex,
          designScene: {
            ...state.designScene,
            placedWalls,
          },
        };
      });
    },

    deleteSelectedPlacedWall() {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall") {
        return;
      }

      set((state) => ({
        activeWallElevationEdgeIndex: 0,
        designScene: {
          ...state.designScene,
          placedWalls: deletePlacedWall({
            placedWalls: state.designScene.placedWalls,
            placedWallId: activeSelection.placedWallId,
          }),
          activeSelection: null,
        },
      }));
    },
  };
}
