import type { Point2DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import {
  createCountertopOpeningFromDraft,
  sanitizeCountertopOpeningShape,
} from "@/engine/countertops/countertopOpeningFactory";
import {
  clampCountertopOpeningCenterForShape,
  clampCountertopOpeningToHost,
  clampRectangleSizeToHostFromCenter,
} from "@/engine/countertops/countertopOpeningValidation";
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
  | "createManualCountertopOpening"
  | "updateCountertopOpeningLocalCenter"
  | "updateCountertopOpeningLocalCenterX"
  | "updateCountertopOpeningLocalCenterY"
  | "updateCountertopOpeningRectangleSize"
  | "updateCountertopOpeningRotation"
  | "deleteCountertopOpening"
  | "startCountertopCutoutDraft"
  | "updateCountertopCutoutDraft"
  | "commitCountertopCutoutDraft"
  | "cancelCountertopCutoutDraft"
  | "startCountertopOpeningDrag"
  | "updateCountertopOpeningDrag"
  | "finishCountertopOpeningDrag"
> {
  return {
    createManualCountertopOpening(opening) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const fittedOpening = fitCountertopOpeningToCurrentHost(opening, get);
      const hostCountertop = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === fittedOpening.hostCountertopId,
      );

      if (hostCountertop === undefined) {
        return;
      }

      set((state) => ({
        activeToolbarTool: null,
        designScene: {
          ...state.designScene,
          activeSceneOperation: null,
          countertopOpenings: [...state.designScene.countertopOpenings, fittedOpening],
          activeSelection: {
            kind: "countertop-opening",
            countertopOpeningId: fittedOpening.id,
          },
        },
      }));
    },

    updateCountertopOpeningLocalCenter(openingId, localCenterInches) {
      updateCountertopOpening(
        openingId,
        (opening, hostSizeInches) => ({
          ...opening,
          localCenterInches:
            hostSizeInches === null
              ? localCenterInches
              : clampCountertopOpeningCenterForShape(
                  localCenterInches,
                  opening.shape,
                  hostSizeInches,
                ),
        }),
        get,
        set,
      );
    },

    updateCountertopOpeningLocalCenterX(openingId, xInches) {
      updateCountertopOpening(
        openingId,
        (opening, hostSizeInches) => {
          const nextCenterInches = {
            ...opening.localCenterInches,
            xInches,
          };

          return {
            ...opening,
            localCenterInches:
              hostSizeInches === null
                ? nextCenterInches
                : clampCountertopOpeningCenterForShape(
                    nextCenterInches,
                    opening.shape,
                    hostSizeInches,
                  ),
          };
        },
        get,
        set,
      );
    },

    updateCountertopOpeningLocalCenterY(openingId, yInches) {
      updateCountertopOpening(
        openingId,
        (opening, hostSizeInches) => {
          const nextCenterInches = {
            ...opening.localCenterInches,
            yInches,
          };

          return {
            ...opening,
            localCenterInches:
              hostSizeInches === null
                ? nextCenterInches
                : clampCountertopOpeningCenterForShape(
                    nextCenterInches,
                    opening.shape,
                    hostSizeInches,
                  ),
          };
        },
        get,
        set,
      );
    },

    updateCountertopOpeningRectangleSize(openingId, widthInches, depthInches) {
      updateCountertopOpening(
        openingId,
        (opening, hostSizeInches) => {
          const nextSizeInches = hostSizeInches === null
            ? { widthInches, depthInches }
            : clampRectangleSizeToHostFromCenter({
                centerInches: opening.localCenterInches,
                widthInches,
                depthInches,
                countertopSizeInches: hostSizeInches,
              });

          return {
            ...opening,
            shape: sanitizeCountertopOpeningShape({
              kind: "rectangle",
              widthInches: nextSizeInches.widthInches,
              depthInches: nextSizeInches.depthInches,
            }),
          };
        },
        get,
        set,
      );
    },

    updateCountertopOpeningRotation(openingId, localRotationDegrees) {
      updateCountertopOpening(
        openingId,
        (opening, hostSizeInches) => {
          const rotatedOpening = {
            ...opening,
            localRotationDegrees,
          };

          return hostSizeInches === null
            ? rotatedOpening
            : clampCountertopOpeningToHost(rotatedOpening, hostSizeInches);
        },
        get,
        set,
      );
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
          activeSelection:
            state.designScene.activeSelection?.kind === "countertop-opening" &&
            state.designScene.activeSelection.countertopOpeningId === openingId
              ? null
              : state.designScene.activeSelection,
          activeSceneOperation:
            state.designScene.activeSceneOperation?.kind === "countertop-opening-drag" &&
            state.designScene.activeSceneOperation.countertopOpeningDrag.countertopOpeningId === openingId
              ? null
              : state.designScene.activeSceneOperation,
        },
      }));
    },

    startCountertopCutoutDraft(args) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const hostCountertop = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === args.hostCountertopId,
      );

      if (hostCountertop === undefined) {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            kind: "countertop-cutout-draft",
            countertopCutoutDraft: {
              kind: "countertop-cutout-draft",
              hostCountertopId: args.hostCountertopId,
              shapeKind: args.shapeKind,
              startLocalInches: args.startLocalInches,
              currentLocalInches: args.startLocalInches,
            },
          },
        },
      }));
    },

    updateCountertopCutoutDraft(currentLocalInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      set((state) => {
        if (state.designScene.activeSceneOperation?.kind !== "countertop-cutout-draft") {
          return {};
        }

        const draft = state.designScene.activeSceneOperation.countertopCutoutDraft;

        return {
          designScene: {
            ...state.designScene,
            activeSceneOperation: {
              kind: "countertop-cutout-draft",
              countertopCutoutDraft: {
                ...draft,
                currentLocalInches,
              },
            },
          },
        };
      });
    },

    commitCountertopCutoutDraft() {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "countertop-cutout-draft") {
        return;
      }

      const draft = activeSceneOperation.countertopCutoutDraft;
      const hostCountertop = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === draft.hostCountertopId,
      );

      const opening = hostCountertop === undefined
        ? null
        : createCountertopOpeningFromDraft({
            hostCountertopId: draft.hostCountertopId,
            shapeKind: draft.shapeKind,
            startLocalInches: draft.startLocalInches,
            currentLocalInches: draft.currentLocalInches,
            hostSizeInches: hostCountertop.configuration.sizeInches,
          });

      set((state) => ({
        activeCutoutDraftPointerTarget: null,
        designScene: {
          ...state.designScene,
          activeSceneOperation: null,
        },
      }));

      if (opening !== null) {
        get().createManualCountertopOpening(opening);
      }
    },

    cancelCountertopCutoutDraft() {
      set((state) => ({
        activeCutoutDraftPointerTarget:
          state.designScene.activeSceneOperation?.kind === "countertop-cutout-draft"
            ? null
            : state.activeCutoutDraftPointerTarget,
        designScene: {
          ...state.designScene,
          activeSceneOperation:
            state.designScene.activeSceneOperation?.kind === "countertop-cutout-draft"
              ? null
              : state.designScene.activeSceneOperation,
        },
      }));
    },

    startCountertopOpeningDrag(args) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const opening = get().designScene.countertopOpenings.find(
        (countertopOpening) => countertopOpening.id === args.countertopOpeningId,
      );

      if (opening === undefined) {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: {
            kind: "countertop-opening",
            countertopOpeningId: opening.id,
          },
          activeSceneOperation: {
            kind: "countertop-opening-drag",
            countertopOpeningDrag: {
              kind: "countertop-opening-drag",
              countertopOpeningId: opening.id,
              grabOffsetInches: {
                xInches: args.grabLocalInches.xInches - opening.localCenterInches.xInches,
                yInches: args.grabLocalInches.yInches - opening.localCenterInches.yInches,
              },
            },
          },
        },
      }));
    },

    updateCountertopOpeningDrag(grabLocalInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "countertop-opening-drag") {
        return;
      }

      const { countertopOpeningId, grabOffsetInches } = activeSceneOperation.countertopOpeningDrag;
      const nextCenterInches = {
        xInches: grabLocalInches.xInches - grabOffsetInches.xInches,
        yInches: grabLocalInches.yInches - grabOffsetInches.yInches,
      };

      set((state) => {
        const opening = state.designScene.countertopOpenings.find(
          (countertopOpening) => countertopOpening.id === countertopOpeningId,
        );
        const hostCountertop = opening === undefined
          ? undefined
          : state.designScene.placedAssemblies.find(
              (assembly) => assembly.id === opening.hostCountertopId,
            );

        if (opening === undefined || hostCountertop === undefined) {
          return {};
        }

        const updatedOpening = clampCountertopOpeningCenterForShape(
          nextCenterInches,
          opening.shape,
          hostCountertop.configuration.sizeInches,
        );

        return {
          designScene: {
            ...state.designScene,
            countertopOpenings: state.designScene.countertopOpenings.map((countertopOpening) => (
              countertopOpening.id === countertopOpeningId
                ? {
                    ...opening,
                    localCenterInches: updatedOpening,
                  }
                : countertopOpening
            )),
          },
        };
      });
    },

    finishCountertopOpeningDrag() {
      set((state) => ({
        activeCutoutDraftPointerTarget:
          state.designScene.activeSceneOperation?.kind === "countertop-opening-drag"
            ? null
            : state.activeCutoutDraftPointerTarget,
        designScene: {
          ...state.designScene,
          activeSceneOperation:
            state.designScene.activeSceneOperation?.kind === "countertop-opening-drag"
              ? null
              : state.designScene.activeSceneOperation,
        },
      }));
    },
  };
}

function updateCountertopOpening(
  openingId: string,
  updateOpening: (
    opening: CountertopOpening,
    hostSizeInches: CountertopHostSizeInches,
  ) => CountertopOpening,
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
        const updatedOpening = updateOpening(
          opening,
          hostCountertop?.configuration.sizeInches ?? null,
        );

        return hostCountertop === undefined
          ? updatedOpening
          : clampCountertopOpeningToHost(
              updatedOpening,
              hostCountertop.configuration.sizeInches,
            );
      }),
    },
  }));
}

type CountertopHostSizeInches = Size3DInches | null;

function fitCountertopOpeningToCurrentHost(
  opening: CountertopOpening,
  get: DesignSceneStoreGetter,
): CountertopOpening {
  const hostCountertop = get().designScene.placedAssemblies.find(
    (assembly) => assembly.id === opening.hostCountertopId,
  );

  return hostCountertop === undefined
    ? opening
    : clampCountertopOpeningToHost(opening, hostCountertop.configuration.sizeInches);
}
