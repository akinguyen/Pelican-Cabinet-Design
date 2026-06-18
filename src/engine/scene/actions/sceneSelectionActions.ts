import type { SceneSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneSelectionActions(
  _get: () => DesignSceneStore,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "selectPlacedAssembly" | "selectPlacedWallSegment" | "selectDesignReservationZone" | "clearSelection"> {
  return {
    selectPlacedAssembly(placedAssemblyId) {
      const selection: SceneSelection = {
        kind: "placed-assembly",
        placedAssemblyId,
      };

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: selection,
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      }));
    },

    selectPlacedWallSegment(wallGraphId, wallSegmentId) {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: {
            kind: "placed-wall-segment",
            wallGraphId,
            wallSegmentId,
          },
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      }));
    },

    selectDesignReservationZone(designReservationZoneId) {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: {
            kind: "design-reservation-zone",
            designReservationZoneId,
          },
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      }));
    },

    clearSelection() {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: null,
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      }));
    },
  };
}
