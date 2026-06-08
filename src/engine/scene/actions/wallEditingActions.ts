import { getActivePlacedWallElevationView, getPlacedWallElevationWallViews } from "@/engine/walls/elevation/wallElevationGeometry";
import { deletePlacedWall, updatePlacedWallHeight, updatePlacedWallViewableEdge } from "@/engine/walls/wallEditing";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createWallEditingActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "updateSelectedPlacedWallHeight" | "updateSelectedPlacedWallViewableEdge" | "deleteSelectedPlacedWall"
> {
  return {
    updateSelectedPlacedWallHeight(heightInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

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
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

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
        const activeElevationView = getActivePlacedWallElevationView({
          placedWalls,
          activeWallElevationWallId: state.activeWallElevationWallId,
          activeWallElevationEdgeIndex: state.activeWallElevationEdgeIndex,
        });

        return {
          activeWallElevationWallId: activeElevationView?.wallView.placedWallId ?? null,
          activeWallElevationEdgeIndex: activeElevationView?.side.edgeIndex ?? 0,
          designScene: {
            ...state.designScene,
            placedWalls,
          },
        };
      });
    },

    deleteSelectedPlacedWall() {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall") {
        return;
      }

      set((state) => {
        const placedWalls = deletePlacedWall({
          placedWalls: state.designScene.placedWalls,
          placedWallId: activeSelection.placedWallId,
        });
        const wallViews = getPlacedWallElevationWallViews(placedWalls);
        const activeElevationView = getActivePlacedWallElevationView({
          placedWalls,
          activeWallElevationWallId: state.activeWallElevationWallId,
          activeWallElevationEdgeIndex: state.activeWallElevationEdgeIndex,
        });

        return {
          activeWallElevationWallId: activeElevationView?.wallView.placedWallId ?? wallViews[0]?.placedWallId ?? null,
          activeWallElevationEdgeIndex: activeElevationView?.side.edgeIndex ?? wallViews[0]?.viewableSides[0]?.edgeIndex ?? 0,
          designScene: {
            ...state.designScene,
            placedWalls,
            activeSelection: null,
          },
        };
      });
    },
  };
}
