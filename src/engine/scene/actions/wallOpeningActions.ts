import { createWallOpeningFromDraft } from "@/engine/walls/openings/wallOpeningFactory";
import {
  clampWallOpeningDraftPoint,
  clampWallOpeningPlacement,
  clampWallOpeningRectangleSize,
  clampWallOpeningToFace,
} from "@/engine/walls/openings/wallOpeningGeometry";
import type { WallOpeningDraftPointInches } from "@/engine/walls/openings/wallOpeningDraftTypes";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { PlacedWallSegment, WallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createWallOpeningActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "startWallOpeningDraft"
  | "updateWallOpeningDraft"
  | "commitWallOpeningDraft"
  | "cancelWallOpeningDraft"
  | "updateWallOpeningLeft"
  | "updateWallOpeningBottom"
  | "updateWallOpeningRectangleSize"
  | "deleteWallOpening"
  | "deleteSelectedWallOpening"
  | "startWallOpeningDrag"
  | "updateWallOpeningDrag"
  | "finishWallOpeningDrag"
> {
  return {
    startWallOpeningDraft(args) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const viewZone = getWallElevationViewZoneForTarget({
        placedWallGraphs: get().designScene.placedWallGraphs,
        activeWallElevationTarget: {
          wallGraphId: args.wallGraphId,
          wallSegmentId: args.wallSegmentId,
          faceSide: args.faceSide,
        },
      });

      if (viewZone === null) {
        return;
      }

      const startFacePointInches = clampWallOpeningDraftPoint({
        facePointInches: args.startFacePointInches,
        faceLengthInches: viewZone.faceLengthInches,
        wallHeightInches: viewZone.wallHeightInches,
      });

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            kind: "wall-opening-draft",
            wallOpeningDraft: {
              kind: "wall-opening-draft",
              wallGraphId: args.wallGraphId,
              wallSegmentId: args.wallSegmentId,
              faceSide: args.faceSide,
              startFacePointInches,
              currentFacePointInches: startFacePointInches,
            },
          },
        },
      }));
    },

    updateWallOpeningDraft(currentFacePointInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      set((state) => {
        if (state.designScene.activeSceneOperation?.kind !== "wall-opening-draft") {
          return {};
        }

        const draft = state.designScene.activeSceneOperation.wallOpeningDraft;
        const viewZone = getWallElevationViewZoneForTarget({
          placedWallGraphs: state.designScene.placedWallGraphs,
          activeWallElevationTarget: {
            wallGraphId: draft.wallGraphId,
            wallSegmentId: draft.wallSegmentId,
            faceSide: draft.faceSide,
          },
        });

        if (viewZone === null) {
          return {};
        }

        return {
          designScene: {
            ...state.designScene,
            activeSceneOperation: {
              kind: "wall-opening-draft",
              wallOpeningDraft: {
                ...draft,
                currentFacePointInches: clampWallOpeningDraftPoint({
                  facePointInches: currentFacePointInches,
                  faceLengthInches: viewZone.faceLengthInches,
                  wallHeightInches: viewZone.wallHeightInches,
                }),
              },
            },
          },
        };
      });
    },

    commitWallOpeningDraft() {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "wall-opening-draft") {
        return;
      }

      const draft = activeSceneOperation.wallOpeningDraft;
      const viewZone = getWallElevationViewZoneForTarget({
        placedWallGraphs: get().designScene.placedWallGraphs,
        activeWallElevationTarget: {
          wallGraphId: draft.wallGraphId,
          wallSegmentId: draft.wallSegmentId,
          faceSide: draft.faceSide,
        },
      });
      const opening = viewZone === null
        ? null
        : createWallOpeningFromDraft({
            draft,
            faceLengthInches: viewZone.faceLengthInches,
            wallHeightInches: viewZone.wallHeightInches,
          });

      set((state) => ({
        activeToolbarTool: opening === null ? state.activeToolbarTool : null,
        activeCutoutDraftPointerTarget: null,
        designScene: {
          ...state.designScene,
          activeSceneOperation: null,
          placedWallGraphs: opening === null
            ? state.designScene.placedWallGraphs
            : addWallOpeningToGraphs({
                wallGraphs: state.designScene.placedWallGraphs,
                wallGraphId: draft.wallGraphId,
                wallSegmentId: draft.wallSegmentId,
                opening,
              }),
          activeSelection: opening === null
            ? state.designScene.activeSelection
            : {
                kind: "wall-opening",
                wallGraphId: draft.wallGraphId,
                wallSegmentId: draft.wallSegmentId,
                wallOpeningId: opening.id,
              },
        },
      }));
    },

    cancelWallOpeningDraft() {
      set((state) => ({
        activeCutoutDraftPointerTarget:
          state.designScene.activeSceneOperation?.kind === "wall-opening-draft"
            ? null
            : state.activeCutoutDraftPointerTarget,
        designScene: {
          ...state.designScene,
          activeSceneOperation:
            state.designScene.activeSceneOperation?.kind === "wall-opening-draft"
              ? null
              : state.designScene.activeSceneOperation,
        },
      }));
    },

    updateWallOpeningLeft(wallGraphId, wallSegmentId, wallOpeningId, leftInchesAlongFace) {
      updateWallOpening(
        {
          wallGraphId,
          wallSegmentId,
          wallOpeningId,
        },
        (opening, faceBoundsInches) => clampWallOpeningPlacement({
          opening,
          leftInchesAlongFace,
          bottomInchesFromFloor: opening.bottomInchesFromFloor,
          ...faceBoundsInches,
        }),
        get,
        set,
      );
    },

    updateWallOpeningBottom(wallGraphId, wallSegmentId, wallOpeningId, bottomInchesFromFloor) {
      updateWallOpening(
        {
          wallGraphId,
          wallSegmentId,
          wallOpeningId,
        },
        (opening, faceBoundsInches) => clampWallOpeningPlacement({
          opening,
          leftInchesAlongFace: opening.leftInchesAlongFace,
          bottomInchesFromFloor,
          ...faceBoundsInches,
        }),
        get,
        set,
      );
    },

    updateWallOpeningRectangleSize(wallGraphId, wallSegmentId, wallOpeningId, widthInches, heightInches) {
      updateWallOpening(
        {
          wallGraphId,
          wallSegmentId,
          wallOpeningId,
        },
        (opening, faceBoundsInches) => clampWallOpeningRectangleSize({
          opening,
          widthInches,
          heightInches,
          ...faceBoundsInches,
        }),
        get,
        set,
      );
    },

    deleteWallOpening(wallGraphId, wallSegmentId, wallOpeningId) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedWallGraphs: removeWallOpeningFromGraphs({
            wallGraphs: state.designScene.placedWallGraphs,
            wallGraphId,
            wallSegmentId,
            wallOpeningId,
          }),
          activeSelection:
            state.designScene.activeSelection?.kind === "wall-opening" &&
            state.designScene.activeSelection.wallOpeningId === wallOpeningId
              ? null
              : state.designScene.activeSelection,
          activeSceneOperation:
            state.designScene.activeSceneOperation?.kind === "wall-opening-drag" &&
            state.designScene.activeSceneOperation.wallOpeningDrag.wallOpeningId === wallOpeningId
              ? null
              : state.designScene.activeSceneOperation,
        },
      }));
    },

    deleteSelectedWallOpening() {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "wall-opening") {
        return;
      }

      get().deleteWallOpening(
        activeSelection.wallGraphId,
        activeSelection.wallSegmentId,
        activeSelection.wallOpeningId,
      );
    },

    startWallOpeningDrag(args) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const opening = findWallOpening({
        wallGraphs: get().designScene.placedWallGraphs,
        wallGraphId: args.wallGraphId,
        wallSegmentId: args.wallSegmentId,
        wallOpeningId: args.wallOpeningId,
      });

      if (opening === null) {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: {
            kind: "wall-opening",
            wallGraphId: args.wallGraphId,
            wallSegmentId: args.wallSegmentId,
            wallOpeningId: args.wallOpeningId,
          },
          activeSceneOperation: {
            kind: "wall-opening-drag",
            wallOpeningDrag: {
              kind: "wall-opening-drag",
              wallGraphId: args.wallGraphId,
              wallSegmentId: args.wallSegmentId,
              wallOpeningId: args.wallOpeningId,
              grabOffsetInchesAlongFace:
                args.grabFacePointInches.xInchesAlongFace - opening.leftInchesAlongFace,
              grabOffsetInchesFromFloor:
                args.grabFacePointInches.zInchesFromFloor - opening.bottomInchesFromFloor,
            },
          },
        },
      }));
    },

    updateWallOpeningDrag(grabFacePointInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "wall-opening-drag") {
        return;
      }

      const wallOpeningDrag = activeSceneOperation.wallOpeningDrag;
      const nextLeftInchesAlongFace =
        grabFacePointInches.xInchesAlongFace - wallOpeningDrag.grabOffsetInchesAlongFace;
      const nextBottomInchesFromFloor =
        grabFacePointInches.zInchesFromFloor - wallOpeningDrag.grabOffsetInchesFromFloor;

      set((state) => {
        const wallSegment = findWallSegment({
          wallGraphs: state.designScene.placedWallGraphs,
          wallGraphId: wallOpeningDrag.wallGraphId,
          wallSegmentId: wallOpeningDrag.wallSegmentId,
        });
        const opening = wallSegment?.openings.find(
          (wallOpening) => wallOpening.id === wallOpeningDrag.wallOpeningId,
        );

        if (wallSegment === null || wallSegment === undefined || opening === undefined) {
          return {};
        }

        const viewZone = getWallElevationViewZoneForTarget({
          placedWallGraphs: state.designScene.placedWallGraphs,
          activeWallElevationTarget: {
            wallGraphId: wallOpeningDrag.wallGraphId,
            wallSegmentId: wallOpeningDrag.wallSegmentId,
            faceSide: opening.faceSide,
          },
        });

        if (viewZone === null) {
          return {};
        }

        const updatedOpening = clampWallOpeningPlacement({
          opening,
          leftInchesAlongFace: nextLeftInchesAlongFace,
          bottomInchesFromFloor: nextBottomInchesFromFloor,
          faceLengthInches: viewZone.faceLengthInches,
          wallHeightInches: viewZone.wallHeightInches,
        });

        return {
          designScene: {
            ...state.designScene,
            placedWallGraphs: state.designScene.placedWallGraphs.map((wallGraph) => {
              if (wallGraph.id !== wallOpeningDrag.wallGraphId) {
                return wallGraph;
              }

              return {
                ...wallGraph,
                segments: wallGraph.segments.map((segment) => segment.id === wallOpeningDrag.wallSegmentId
                  ? {
                      ...segment,
                      openings: segment.openings.map((wallOpening) => wallOpening.id === wallOpeningDrag.wallOpeningId
                        ? updatedOpening
                        : wallOpening),
                    }
                  : segment),
              };
            }),
          },
        };
      });
    },

    finishWallOpeningDrag() {
      set((state) => ({
        activeCutoutDraftPointerTarget:
          state.designScene.activeSceneOperation?.kind === "wall-opening-drag"
            ? null
            : state.activeCutoutDraftPointerTarget,
        designScene: {
          ...state.designScene,
          activeSceneOperation:
            state.designScene.activeSceneOperation?.kind === "wall-opening-drag"
              ? null
              : state.designScene.activeSceneOperation,
        },
      }));
    },
  };
}

function updateWallOpening(
  target: {
    wallGraphId: string;
    wallSegmentId: string;
    wallOpeningId: string;
  },
  updateOpening: (
    opening: WallOpening,
    faceBoundsInches: { faceLengthInches: number; wallHeightInches: number },
  ) => WallOpening,
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): void {
  if (!canManuallyEditScene(get().workspaceMode)) {
    return;
  }

  set((state) => ({
    designScene: {
      ...state.designScene,
      placedWallGraphs: state.designScene.placedWallGraphs.map((wallGraph) => {
        if (wallGraph.id !== target.wallGraphId) {
          return wallGraph;
        }

        return {
          ...wallGraph,
          segments: wallGraph.segments.map((wallSegment) => {
            if (wallSegment.id !== target.wallSegmentId) {
              return wallSegment;
            }

            return {
              ...wallSegment,
              openings: wallSegment.openings.map((opening) => {
                if (opening.id !== target.wallOpeningId) {
                  return opening;
                }

                const viewZone = getWallElevationViewZoneForTarget({
                  placedWallGraphs: state.designScene.placedWallGraphs,
                  activeWallElevationTarget: {
                    wallGraphId: target.wallGraphId,
                    wallSegmentId: target.wallSegmentId,
                    faceSide: opening.faceSide,
                  },
                });

                if (viewZone === null) {
                  return opening;
                }

                return clampWallOpeningToFace({
                  opening: updateOpening(opening, {
                    faceLengthInches: viewZone.faceLengthInches,
                    wallHeightInches: viewZone.wallHeightInches,
                  }),
                  faceLengthInches: viewZone.faceLengthInches,
                  wallHeightInches: viewZone.wallHeightInches,
                });
              }),
            };
          }),
        };
      }),
    },
  }));
}

function addWallOpeningToGraphs(args: {
  wallGraphs: readonly PlacedWallGraph[];
  wallGraphId: string;
  wallSegmentId: string;
  opening: WallOpening;
}): readonly PlacedWallGraph[] {
  return args.wallGraphs.map((wallGraph) => {
    if (wallGraph.id !== args.wallGraphId) {
      return wallGraph;
    }

    return {
      ...wallGraph,
      segments: wallGraph.segments.map((wallSegment) => wallSegment.id === args.wallSegmentId
        ? {
            ...wallSegment,
            openings: [...wallSegment.openings, args.opening],
          }
        : wallSegment),
    };
  });
}

function removeWallOpeningFromGraphs(args: {
  wallGraphs: readonly PlacedWallGraph[];
  wallGraphId: string;
  wallSegmentId: string;
  wallOpeningId: string;
}): readonly PlacedWallGraph[] {
  return args.wallGraphs.map((wallGraph) => {
    if (wallGraph.id !== args.wallGraphId) {
      return wallGraph;
    }

    return {
      ...wallGraph,
      segments: wallGraph.segments.map((wallSegment) => wallSegment.id === args.wallSegmentId
        ? {
            ...wallSegment,
            openings: wallSegment.openings.filter((opening) => opening.id !== args.wallOpeningId),
          }
        : wallSegment),
    };
  });
}

function findWallOpening(args: {
  wallGraphs: readonly PlacedWallGraph[];
  wallGraphId: string;
  wallSegmentId: string;
  wallOpeningId: string;
}): WallOpening | null {
  const segment = findWallSegment(args);
  return segment?.openings.find((opening) => opening.id === args.wallOpeningId) ?? null;
}

function findWallSegment(args: {
  wallGraphs: readonly PlacedWallGraph[];
  wallGraphId: string;
  wallSegmentId: string;
}): PlacedWallSegment | null {
  const wallGraph = args.wallGraphs.find((graph) => graph.id === args.wallGraphId);
  return wallGraph?.segments.find((segment) => segment.id === args.wallSegmentId) ?? null;
}
