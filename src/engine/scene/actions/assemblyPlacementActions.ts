import { applyAssemblyPlacementRules, createAssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementFeedback";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createAssemblyPlacementActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "startAssemblyPlacementCandidate"
  | "updateAssemblyCandidateWorldPosition"
  | "commitAssemblyPlacementCandidate"
  | "cancelActiveSceneOperation"
> {
  return {
    startAssemblyPlacementCandidate(placedAssembly) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            kind: "assembly-placement",
            placedAssembly,
            placementState: "waiting-for-pointer",
          },
          activeSelection: null,
        },
        assemblyPlacementFeedback: null,
        activeToolbarTool: null,
      }));
    },

    updateAssemblyCandidateWorldPosition(worldPositionInches, sceneViewMode, elevationMoveFrame) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const { designScene } = get();
      const activeSceneOperation = designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "assembly-placement") {
        return;
      }

      const proposedPlacedAssembly = {
        ...activeSceneOperation.placedAssembly,
        worldPositionInches,
      };
      const placementResult = applyAssemblyPlacementRules({
        placedAssembly: proposedPlacedAssembly,
        placedWallGraphs: designScene.placedWallGraphs,
        placedAssemblies: designScene.placedAssemblies,
        countertopOpenings: designScene.countertopOpenings,
        movingAssemblyId: proposedPlacedAssembly.id,
        snapContext: { movementSource: sceneViewMode, elevationMoveFrame },
      });

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            ...activeSceneOperation,
            placementState: "positioned",
            placedAssembly: placementResult.placedAssembly,
          },
        },
        assemblyPlacementFeedback: placementResult.feedback,
      }));
    },

    commitAssemblyPlacementCandidate() {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const { designScene, assemblyPlacementFeedback } = get();
      const activeSceneOperation = designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "assembly-placement" || activeSceneOperation.placementState !== "positioned") {
        return;
      }

      const placementFeedback = assemblyPlacementFeedback ?? createAssemblyPlacementFeedback({
        placedAssembly: activeSceneOperation.placedAssembly,
      });

      if (!placementFeedback.isValid) {
        set({ assemblyPlacementFeedback: placementFeedback });
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: [...state.designScene.placedAssemblies, activeSceneOperation.placedAssembly],
          activeSelection: {
            kind: "placed-assembly",
            placedAssemblyId: activeSceneOperation.placedAssembly.id,
          },
          activeSceneOperation: null,
        },
        assemblyPlacementFeedback: null,
      }));
    },

    cancelActiveSceneOperation() {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: null,
        },
        assemblyPlacementFeedback: null,
      }));
    },
  };
}
