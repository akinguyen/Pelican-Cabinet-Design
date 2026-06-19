import {
  areSceneEntitySelectionsEqual,
  createSceneSelectionFromSceneEntities,
  getSceneEntityRefsFromSelection,
} from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneSelectionActions(
  _get: () => DesignSceneStore,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "selectSceneEntity"
  | "toggleSceneEntitySelection"
  | "selectPlacedWallSegment"
  | "clearSelection"
> {
  return {
    selectSceneEntity(sceneEntity) {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: createSceneSelectionFromSceneEntities([sceneEntity]),
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      }));
    },

    toggleSceneEntitySelection(sceneEntity) {
      set((state) => {
        const currentSceneEntities = getSceneEntityRefsFromSelection(state.designScene.activeSelection);
        const isSelected = currentSceneEntities.some((candidate) => areSceneEntitySelectionsEqual(candidate, sceneEntity));
        const nextSceneEntities = isSelected
          ? currentSceneEntities.filter((candidate) => !areSceneEntitySelectionsEqual(candidate, sceneEntity))
          : [...currentSceneEntities, sceneEntity];

        return {
          designScene: {
            ...state.designScene,
            activeSelection: createSceneSelectionFromSceneEntities(nextSceneEntities),
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
