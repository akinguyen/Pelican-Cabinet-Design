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

      if (
        activeToolbarTool === "draw-design-reservation-zone" ||
        designScene.activeSceneOperation?.kind === "design-reservation-zone-placement"
      ) {
        get().cancelDesignReservationZonePlacementCandidate();
        return;
      }

      const activeDrag = get().activeDrag;

      if (activeDrag?.kind === "scene-entity-multi-move") {
        get().cancelSceneEntityMultiDrag();
        return;
      }

      if (activeDrag?.kind === "design-reservation-zone-move") {
        get().cancelDesignReservationZoneDrag();
        return;
      }

      if (activeDrag?.kind === "design-reservation-zone-rotation") {
        get().cancelDesignReservationZoneRotationDrag();
        return;
      }

      if (activeDrag?.kind === "assembly-rotation") {
        get().cancelAssemblyRotationDrag();
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

      if (designScene.activeSelection !== null) {
        get().clearSelection();
      }
    },
  };
}
