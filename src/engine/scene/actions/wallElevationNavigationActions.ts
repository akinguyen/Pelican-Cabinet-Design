import {
  createWallElevationTargetFromNavigationItem,
  getActiveWallElevationSegmentNavigationItem,
  getWallElevationSegmentNavigationItems,
  toggleWallElevationFaceSide,
} from "@/engine/walls/wallSegmentElevationNavigation";
import {
  getWallElevationFaceSideForSegment,
  rememberWallElevationFaceSide,
} from "@/engine/walls/wallElevationFaceSideMemory";
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
        activeWallElevationFaceSideBySegmentKey: rememberWallElevationFaceSide({
          faceSideBySegmentKey: state.activeWallElevationFaceSideBySegmentKey,
          wallGraphId: target.wallGraphId,
          wallSegmentId: target.wallSegmentId,
          faceSide: target.faceSide,
        }),
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
  const rememberedFaceSide = getWallElevationFaceSideForSegment({
    faceSideBySegmentKey: state.activeWallElevationFaceSideBySegmentKey,
    wallGraphId: nextItem.wallGraphId,
    wallSegmentId: nextItem.wallSegmentId,
  });
  const nextTarget = createWallElevationTargetFromNavigationItem({
    item: nextItem,
    faceSide: rememberedFaceSide,
  });

  set((currentState) => ({
    activeWallElevationTarget: nextTarget,
    designScene: {
      ...currentState.designScene,
      activeSelection: currentState.designScene.activeSelection?.kind === "placed-wall-segment"
        ? {
          kind: "placed-wall-segment",
          wallGraphId: nextTarget.wallGraphId,
          wallSegmentId: nextTarget.wallSegmentId,
        }
        : currentState.designScene.activeSelection,
    },
  }));
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

  const activeFaceSide = getWallElevationFaceSideForSegment({
    faceSideBySegmentKey: state.activeWallElevationFaceSideBySegmentKey,
    wallGraphId: activeItem.wallGraphId,
    wallSegmentId: activeItem.wallSegmentId,
  });
  const nextFaceSide = toggleWallElevationFaceSide(activeFaceSide);
  const nextTarget = createWallElevationTargetFromNavigationItem({
    item: activeItem,
    faceSide: nextFaceSide,
  });

  set((currentState) => ({
    activeWallElevationTarget: nextTarget,
    activeWallElevationFaceSideBySegmentKey: rememberWallElevationFaceSide({
      faceSideBySegmentKey: currentState.activeWallElevationFaceSideBySegmentKey,
      wallGraphId: nextTarget.wallGraphId,
      wallSegmentId: nextTarget.wallSegmentId,
      faceSide: nextTarget.faceSide,
    }),
  }));
}
