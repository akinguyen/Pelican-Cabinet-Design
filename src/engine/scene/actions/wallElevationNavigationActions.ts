import { getPlacedWallViewableEdgeIndices } from "@/engine/walls/elevation/wallViewableEdges";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createWallElevationNavigationActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "showPreviousWallElevationSide" | "showNextWallElevationSide"> {
  return {
    showPreviousWallElevationSide() {
      updateWallElevationEdgeIndex(-1, get, set);
    },

    showNextWallElevationSide() {
      updateWallElevationEdgeIndex(1, get, set);
    },
  };
}

function updateWallElevationEdgeIndex(
  delta: number,
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): void {
  const state = get();
  const activeSelection = state.designScene.activeSelection;

  if (activeSelection?.kind !== "placed-wall") {
    return;
  }

  const selectedPlacedWall = state.designScene.placedWalls.find(
    (placedWall) => placedWall.id === activeSelection.placedWallId,
  );

  if (selectedPlacedWall === undefined) {
    return;
  }

  const viewableEdgeIndices = getPlacedWallViewableEdgeIndices(selectedPlacedWall);

  if (viewableEdgeIndices.length <= 0) {
    return;
  }

  const currentViewableIndex = viewableEdgeIndices.indexOf(state.activeWallElevationEdgeIndex);
  const activeViewableIndex = currentViewableIndex >= 0 ? currentViewableIndex : 0;
  const nextViewableIndex =
    ((activeViewableIndex + delta) % viewableEdgeIndices.length + viewableEdgeIndices.length) %
    viewableEdgeIndices.length;

  set({ activeWallElevationEdgeIndex: viewableEdgeIndices[nextViewableIndex] });
}
