import { createWallOpeningFromDraft } from "@/engine/walls/openings/wallOpeningFactory";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { WallOpening } from "@/engine/walls/placedWallSegmentTypes";
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
  | "deleteSelectedWallOpening"
> {
  return {
    startWallOpeningDraft(args) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

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
              startFacePointInches: args.startFacePointInches,
              currentFacePointInches: args.startFacePointInches,
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

        return {
          designScene: {
            ...state.designScene,
            activeSceneOperation: {
              kind: "wall-opening-draft",
              wallOpeningDraft: {
                ...state.designScene.activeSceneOperation.wallOpeningDraft,
                currentFacePointInches,
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
        designScene: {
          ...state.designScene,
          activeSceneOperation:
            state.designScene.activeSceneOperation?.kind === "wall-opening-draft"
              ? null
              : state.designScene.activeSceneOperation,
        },
      }));
    },

    deleteSelectedWallOpening() {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "wall-opening") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedWallGraphs: removeWallOpeningFromGraphs({
            wallGraphs: state.designScene.placedWallGraphs,
            wallGraphId: activeSelection.wallGraphId,
            wallSegmentId: activeSelection.wallSegmentId,
            wallOpeningId: activeSelection.wallOpeningId,
          }),
          activeSelection: null,
        },
      }));
    },
  };
}

function addWallOpeningToGraphs(args: {
  wallGraphs: DesignSceneStore["designScene"]["placedWallGraphs"];
  wallGraphId: string;
  wallSegmentId: string;
  opening: WallOpening;
}): DesignSceneStore["designScene"]["placedWallGraphs"] {
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
  wallGraphs: DesignSceneStore["designScene"]["placedWallGraphs"];
  wallGraphId: string;
  wallSegmentId: string;
  wallOpeningId: string;
}): DesignSceneStore["designScene"]["placedWallGraphs"] {
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
