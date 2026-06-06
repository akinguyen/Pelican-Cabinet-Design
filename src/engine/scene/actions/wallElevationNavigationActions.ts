import { getActivePlacedWallElevationView, getPlacedWallElevationWallViews } from "@/engine/walls/elevation/wallElevationGeometry";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createWallElevationNavigationActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "setActiveWallElevationWall" | "showPreviousWallElevationSide" | "showNextWallElevationSide"
> {
  return {
    setActiveWallElevationWall(placedWallId) {
      const wallView = getPlacedWallElevationWallViews(get().designScene.placedWalls).find(
        (candidateWallView) => candidateWallView.placedWallId === placedWallId,
      );

      if (wallView === undefined) {
        return;
      }

      set({
        activeWallElevationWallId: wallView.placedWallId,
        activeWallElevationEdgeIndex: wallView.viewableSides[0].edgeIndex,
      });
    },

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
  const activeElevationView = getActivePlacedWallElevationView({
    placedWalls: state.designScene.placedWalls,
    activeWallElevationWallId: state.activeWallElevationWallId,
    activeWallElevationEdgeIndex: state.activeWallElevationEdgeIndex,
  });

  if (activeElevationView === null) {
    return;
  }

  const viewableSideCount = activeElevationView.wallView.viewableSides.length;
  const nextSideIndex =
    ((activeElevationView.sideIndex + delta) % viewableSideCount + viewableSideCount) %
    viewableSideCount;
  const nextSide = activeElevationView.wallView.viewableSides[nextSideIndex];

  set({
    activeWallElevationWallId: activeElevationView.wallView.placedWallId,
    activeWallElevationEdgeIndex: nextSide.edgeIndex,
  });
}
