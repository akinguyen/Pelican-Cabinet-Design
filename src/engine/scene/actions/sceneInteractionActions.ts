import type { DesignSceneStore, DesignSceneStoreGetter } from "../designSceneStoreTypes";

export function createSceneInteractionActions(
  get: DesignSceneStoreGetter,
  _set: (partial: Partial<DesignSceneStore> | ((state: DesignSceneStore) => Partial<DesignSceneStore>)) => void,
): Pick<DesignSceneStore, "clearActiveInteraction"> {
  return {
    clearActiveInteraction() {
      const { activeToolbarTool, designScene } = get();

      if (activeToolbarTool === "draw-wall-segment" || designScene.activeSceneOperation?.kind === "wall-segment-draft") {
        get().exitWallSegmentDraftTool();
        return;
      }

      if (designScene.activeSceneOperation !== null) {
        get().cancelActiveSceneOperation();
        return;
      }

      if (get().activeDrag !== null) {
        get().cancelAssemblyDrag();
        return;
      }

      if (designScene.activeSelection !== null) {
        get().clearSelection();
      }
    },
  };
}
