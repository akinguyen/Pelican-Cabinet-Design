import type { SceneSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneSelectionActions(
  _get: () => DesignSceneStore,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "selectPlacedAssembly" | "selectPlacedAssemblies" | "togglePlacedAssemblySelection" | "selectPlacedWallSegment" | "selectDesignReservationZone" | "clearSelection"> {
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

    selectPlacedAssemblies(placedAssemblyIds) {
      const uniqueIds = Array.from(new Set(placedAssemblyIds));

      if (uniqueIds.length === 0) {
        set((state) => ({
          designScene: {
            ...state.designScene,
            activeSelection: null,
          },
          assemblyPlacementFeedback: null,
          activeObjectAlignmentGuides: [],
        }));
        return;
      }

      if (uniqueIds.length === 1) {
        set((state) => ({
          designScene: {
            ...state.designScene,
            activeSelection: {
              kind: "placed-assembly",
              placedAssemblyId: uniqueIds[0],
            },
          },
          assemblyPlacementFeedback: null,
          activeObjectAlignmentGuides: [],
        }));
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: {
            kind: "placed-assemblies",
            placedAssemblyIds: uniqueIds,
          },
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      }));
    },

    togglePlacedAssemblySelection(placedAssemblyId) {
      set((state) => {
        const activeSelection = state.designScene.activeSelection;
        const currentIds = activeSelection?.kind === "placed-assemblies"
          ? activeSelection.placedAssemblyIds
          : activeSelection?.kind === "placed-assembly"
            ? [activeSelection.placedAssemblyId]
            : [];
        const nextIds = currentIds.includes(placedAssemblyId)
          ? currentIds.filter((id) => id !== placedAssemblyId)
          : [...currentIds, placedAssemblyId];
        const activeSelectionNext: SceneSelection | null = nextIds.length === 0
          ? null
          : nextIds.length === 1
            ? { kind: "placed-assembly", placedAssemblyId: nextIds[0] }
            : { kind: "placed-assemblies", placedAssemblyIds: nextIds };

        return {
          designScene: {
            ...state.designScene,
            activeSelection: activeSelectionNext,
          },
          assemblyPlacementFeedback: null,
          activeObjectAlignmentGuides: [],
        };
      });
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
