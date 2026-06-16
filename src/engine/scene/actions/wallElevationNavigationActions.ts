import {
  createWallElevationTargetFromNavigationItem,
  getActiveWallElevationSegmentNavigationItem,
  getWallElevationSegmentNavigationItems,
  toggleWallElevationFaceSide,
} from "@/engine/walls/wallSegmentElevationNavigation";
import { updateWallSegmentPreferredViewFaceSideInGraphs } from "@/engine/walls/wallSegmentFaceSideSettings";
import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createWallElevationNavigationActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "setActiveWallElevationTarget"
  | "showPreviousWallElevationSegment"
  | "showNextWallElevationSegment"
  | "showPreviousWallElevationSide"
  | "showNextWallElevationSide"
> {
  return {
    setActiveWallElevationTarget(target: WallElevationTarget) {
      set((state) => ({
        activeWallElevationTarget: target,
        designScene: {
          ...state.designScene,
          placedWallGraphs: updateWallSegmentPreferredViewFaceSideInGraphs({
            placedWallGraphs: state.designScene.placedWallGraphs,
            wallGraphId: target.wallGraphId,
            wallSegmentId: target.wallSegmentId,
            preferredViewFaceSide: target.faceSide,
          }),
        },
      }));
    },

    showPreviousWallElevationSegment() {
      updateWallElevationSegmentIndex(-1, get, set);
    },

    showNextWallElevationSegment() {
      updateWallElevationSegmentIndex(1, get, set);
    },

    showPreviousWallElevationSide() {
      toggleActiveWallElevationSide(get, set);
    },

    showNextWallElevationSide() {
      toggleActiveWallElevationSide(get, set);
    },
  };
}

function updateWallElevationSegmentIndex(
  delta: number,
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): void {
  const state = get();
  const items = getWallElevationSegmentNavigationItems(state.designScene.placedWallGraphs);

  if (items.length === 0) {
    set({ activeWallElevationTarget: null });
    return;
  }

  const activeItem = getActiveWallElevationSegmentNavigationItem({
    items,
    activeWallElevationTarget: state.activeWallElevationTarget,
  });
  const activeSegmentIndex = activeItem?.segmentIndex ?? 0;
  const nextSegmentIndex = ((activeSegmentIndex + delta) % items.length + items.length) % items.length;
  const nextItem = items[nextSegmentIndex];

  set({
    activeWallElevationTarget: createWallElevationTargetFromNavigationItem({
      item: nextItem,
      faceSide: nextItem.preferredViewFaceSide,
    }),
  });
}

function toggleActiveWallElevationSide(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): void {
  const state = get();
  const items = getWallElevationSegmentNavigationItems(state.designScene.placedWallGraphs);
  const activeItem = getActiveWallElevationSegmentNavigationItem({
    items,
    activeWallElevationTarget: state.activeWallElevationTarget,
  });

  if (activeItem === null) {
    set({ activeWallElevationTarget: null });
    return;
  }

  const activeFaceSide = state.activeWallElevationTarget?.faceSide ?? activeItem.preferredViewFaceSide;
  const nextFaceSide = toggleWallElevationFaceSide(activeFaceSide);
  const nextTarget = createWallElevationTargetFromNavigationItem({
    item: activeItem,
    faceSide: nextFaceSide,
  });

  set((currentState) => ({
    activeWallElevationTarget: nextTarget,
    designScene: {
      ...currentState.designScene,
      placedWallGraphs: updateWallSegmentPreferredViewFaceSideInGraphs({
        placedWallGraphs: currentState.designScene.placedWallGraphs,
        wallGraphId: nextTarget.wallGraphId,
        wallSegmentId: nextTarget.wallSegmentId,
        preferredViewFaceSide: nextTarget.faceSide,
      }),
    },
  }));
}
