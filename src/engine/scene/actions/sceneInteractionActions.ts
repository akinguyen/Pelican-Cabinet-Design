import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneInteractionActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "clearActiveInteraction"> {
  return {
    clearActiveInteraction() {
      const { designScene, activeToolbarTool, activeDrag } = get();

      if (activeToolbarTool === "draw-wall-footprint" || designScene.activeSceneOperation?.kind === "wall-footprint-draft") {
        get().exitWallFootprintDraftTool();
        return;
      }

      if (activeToolbarTool === "split-wall-footprint" || designScene.activeSceneOperation?.kind === "wall-split-draft") {
        get().exitWallSplitDraftTool();
        return;
      }

      if (designScene.activeSceneOperation !== null) {
        get().cancelActiveSceneOperation();
        return;
      }

      if (activeDrag !== null) {
        get().cancelAssemblyDrag();
        return;
      }

      if (activeToolbarTool !== null) {
        set({ activeToolbarTool: null });
        return;
      }

      if (designScene.activeSelection !== null) {
        get().clearSelection();
      }
    },
  };
}
