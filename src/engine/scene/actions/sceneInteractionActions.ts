import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneInteractionActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "clearActiveInteraction"> {
  return {
    clearActiveInteraction() {
      const { activeToolbarTool, designScene } = get();

      if (activeToolbarTool === "draw-wall-segment" || designScene.activeSceneOperation?.kind === "wall-segment-draft") {
        get().exitWallSegmentDraftTool();
        return;
      }

      if (designScene.activeSceneOperation?.kind === "wall-opening-draft") {
        get().cancelWallOpeningDraft();
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
