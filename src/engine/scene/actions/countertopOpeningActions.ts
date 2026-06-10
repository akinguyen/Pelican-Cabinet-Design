import type { CountertopOpening, CountertopOpeningShape } from "@/engine/countertops/countertopOpeningTypes";
import { createCountertopOpening } from "@/engine/countertops/countertopOpeningFactory";
import { fitCountertopOpeningToHost } from "@/engine/countertops/countertopOpeningValidation";
import type {
  DesignSceneStore,
  DesignSceneStoreGetter,
  DesignSceneStoreSetter,
} from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createCountertopOpeningActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "addCountertopOpening"
  | "updateCountertopOpeningShape"
  | "updateCountertopOpeningLocalCenterX"
  | "updateCountertopOpeningLocalCenterY"
  | "updateCountertopOpeningWidth"
  | "updateCountertopOpeningDepth"
  | "updateCountertopOpeningCornerRadius"
  | "updateCountertopOpeningEdgeClearance"
  | "deleteCountertopOpening"
> {
  return {
    addCountertopOpening(hostCountertopId) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const hostCountertop = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === hostCountertopId,
      );

      if (hostCountertop === undefined) {
        return;
      }

      const hostOpeningCount = get().designScene.countertopOpenings.filter(
        (opening) => opening.hostCountertopId === hostCountertopId,
      ).length;
      const opening = createCountertopOpening(hostCountertopId);
      const offsetOpening = {
        ...opening,
        localCenterInches: {
          xInches: hostOpeningCount * 6,
          yInches: 0,
        },
      };

      set((state) => ({
        designScene: {
          ...state.designScene,
          countertopOpenings: [
            ...state.designScene.countertopOpenings,
            fitCountertopOpeningToHost(
              offsetOpening,
              hostCountertop.configuration.sizeInches,
            ),
          ],
        },
      }));
    },

    updateCountertopOpeningShape(openingId, shape) {
      updateCountertopOpening(openingId, (opening) => ({
        ...opening,
        shape,
        cornerRadiusInches: shape === "rectangle" ? 0 : opening.cornerRadiusInches,
      }), get, set);
    },

    updateCountertopOpeningLocalCenterX(openingId, xInches) {
      updateCountertopOpening(openingId, (opening) => ({
        ...opening,
        localCenterInches: {
          ...opening.localCenterInches,
          xInches,
        },
      }), get, set);
    },

    updateCountertopOpeningLocalCenterY(openingId, yInches) {
      updateCountertopOpening(openingId, (opening) => ({
        ...opening,
        localCenterInches: {
          ...opening.localCenterInches,
          yInches,
        },
      }), get, set);
    },

    updateCountertopOpeningWidth(openingId, widthInches) {
      updateCountertopOpening(openingId, (opening) => ({
        ...opening,
        widthInches,
      }), get, set);
    },

    updateCountertopOpeningDepth(openingId, depthInches) {
      updateCountertopOpening(openingId, (opening) => ({
        ...opening,
        depthInches,
      }), get, set);
    },

    updateCountertopOpeningCornerRadius(openingId, cornerRadiusInches) {
      updateCountertopOpening(openingId, (opening) => ({
        ...opening,
        cornerRadiusInches,
      }), get, set);
    },

    updateCountertopOpeningEdgeClearance(openingId, edgeClearanceInches) {
      updateCountertopOpening(openingId, (opening) => ({
        ...opening,
        edgeClearanceInches,
      }), get, set);
    },

    deleteCountertopOpening(openingId) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          countertopOpenings: state.designScene.countertopOpenings.filter(
            (opening) => opening.id !== openingId,
          ),
        },
      }));
    },
  };
}

function updateCountertopOpening(
  openingId: string,
  updateOpening: (opening: CountertopOpening) => CountertopOpening,
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): void {
  if (!canManuallyEditScene(get().workspaceMode)) {
    return;
  }

  set((state) => ({
    designScene: {
      ...state.designScene,
      countertopOpenings: state.designScene.countertopOpenings.map((opening) => {
        if (opening.id !== openingId) {
          return opening;
        }

        const hostCountertop = state.designScene.placedAssemblies.find(
          (assembly) => assembly.id === opening.hostCountertopId,
        );
        const updatedOpening = updateOpening(opening);

        return hostCountertop === undefined
          ? updatedOpening
          : fitCountertopOpeningToHost(
              updatedOpening,
              hostCountertop.configuration.sizeInches,
            );
      }),
    },
  }));
}
