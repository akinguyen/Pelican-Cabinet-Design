import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneInteractionActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "setActiveCutoutDraftPointerTarget" | "clearActiveInteraction"> {
  return {
    setActiveCutoutDraftPointerTarget(pointerTarget) {
      set({ activeCutoutDraftPointerTarget: pointerTarget });
    },

    clearActiveInteraction() {
      const { activeToolbarTool, designScene } = get();

      if (activeToolbarTool === "draw-wall-segment" || designScene.activeSceneOperation?.kind === "wall-segment-draft") {
        get().exitWallSegmentDraftTool();
        return;
      }

      if (activeToolbarTool === "draw-rectangle-cutout") {
        get().setActiveToolbarTool(null);
        get().setActiveCutoutDraftPointerTarget(null);
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
