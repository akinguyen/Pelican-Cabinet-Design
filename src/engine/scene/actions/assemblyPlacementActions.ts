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
        activeToolbarTool: null,
      }));
    },

    updateAssemblyCandidateWorldPosition(worldPositionInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "assembly-placement") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            ...activeSceneOperation,
            placementState: "positioned",
            placedAssembly: {
              ...activeSceneOperation.placedAssembly,
              worldPositionInches,
            },
          },
        },
      }));
    },

    commitAssemblyPlacementCandidate() {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "assembly-placement" || activeSceneOperation.placementState !== "positioned") {
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
      }));
    },

    cancelActiveSceneOperation() {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: null,
        },
      }));
    },
  };
}
