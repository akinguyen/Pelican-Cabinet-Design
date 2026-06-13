import type { SceneSelection } from "../sceneSelectionTypes";
import { getWallElevationFaceSideForSegment, rememberWallElevationFaceSide } from "@/engine/walls/wallElevationFaceSideMemory";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneSelectionActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "selectPlacedAssembly" | "selectPlacedWallSegment" | "selectCountertopOpening" | "selectWallOpening" | "clearSelection"> {
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
      const faceSide = getWallElevationFaceSideForSegment({
        faceSideBySegmentKey: get().activeWallElevationFaceSideBySegmentKey,
        wallGraphId,
        wallSegmentId,
      });

      set((state) => ({
        activeWallElevationTarget: {
          wallGraphId,
          wallSegmentId,
          faceSide,
        },
        activeWallElevationFaceSideBySegmentKey: rememberWallElevationFaceSide({
          faceSideBySegmentKey: state.activeWallElevationFaceSideBySegmentKey,
          wallGraphId,
          wallSegmentId,
          faceSide,
        }),
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

    selectWallOpening(wallGraphId, wallSegmentId, wallOpeningId) {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: {
            kind: "wall-opening",
            wallGraphId,
            wallSegmentId,
            wallOpeningId,
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
