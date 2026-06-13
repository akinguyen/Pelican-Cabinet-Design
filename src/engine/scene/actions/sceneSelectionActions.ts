import type { SceneSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneSelectionActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "selectPlacedAssembly" | "selectPlacedWallSegment" | "selectCountertopOpening" | "clearSelection"> {
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
      }));
    },

    selectCountertopOpening(countertopOpeningId) {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: {
            kind: "countertop-opening",
            countertopOpeningId,
          },
        },
        assemblyPlacementFeedback: null,
      }));
    },

    clearSelection() {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: null,
        },
        assemblyPlacementFeedback: null,
      }));
    },
  };
}
