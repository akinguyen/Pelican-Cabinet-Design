import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneInteractionActions(get: DesignSceneStoreGetter, _set: DesignSceneStoreSetter): Pick<DesignSceneStore, "clearActiveInteraction"> {
  return {
    clearActiveInteraction() {
      const { activeToolbarTool, designScene } = get();
      if (activeToolbarTool === "draw-wall-segment" || designScene.activeSceneOperation?.kind === "wall-segment-draft") { get().exitWallSegmentDraftTool(); return; }
      if (activeToolbarTool === "draw-design-reservation-zone" || designScene.activeSceneOperation?.kind === "scene-entity-placement") { get().cancelActiveSceneOperation(); return; }
      const activeDrag = get().activeDrag;
      if (activeDrag?.kind === "scene-entity-move") { get().cancelSceneEntityMoveDrag(); return; }
      if (activeDrag?.kind === "scene-entity-rotation") { get().cancelSceneEntityRotationDrag(); return; }
      if (designScene.activeSelection !== null) get().clearSelection();
    },
  };
}
