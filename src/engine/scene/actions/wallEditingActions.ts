import { createId } from "@/core/ids/createId";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { splitDisconnectedWallGraph } from "@/engine/walls/wallSegmentGraphEditing";
import { getActiveWallSegmentElevationFace } from "@/engine/walls/wallSegmentElevation";
import { getWallElevationFaceSideForSegment } from "@/engine/walls/wallElevationFaceSideMemory";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createWallEditingActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "updateSelectedWallSegmentHeight"
  | "updateSelectedWallSegmentThickness"
  | "deleteSelectedWallSegment"
> {
  return {
    updateSelectedWallSegmentHeight(heightInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall-segment") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedWallGraphs: state.designScene.placedWallGraphs.map((wallGraph) => (
            wallGraph.id === activeSelection.wallGraphId
              ? {
                  ...wallGraph,
                  segments: wallGraph.segments.map((wallSegment) => (
                    wallSegment.id === activeSelection.wallSegmentId
                      ? { ...wallSegment, heightInches: Math.max(1, heightInches) }
                      : wallSegment
                  )),
                }
              : wallGraph
          )),
        },
      }));
    },

    updateSelectedWallSegmentThickness(thicknessInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall-segment") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedWallGraphs: state.designScene.placedWallGraphs.map((wallGraph) => (
            wallGraph.id === activeSelection.wallGraphId
              ? {
                  ...wallGraph,
                  segments: wallGraph.segments.map((wallSegment) => (
                    wallSegment.id === activeSelection.wallSegmentId
                      ? { ...wallSegment, thicknessInches: Math.max(1, thicknessInches) }
                      : wallSegment
                  )),
                }
              : wallGraph
          )),
        },
      }));
    },

    deleteSelectedWallSegment() {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall-segment") {
        return;
      }

      set((state) => {
        const updatedWallGraphs = state.designScene.placedWallGraphs.flatMap((wallGraph) => {
          if (wallGraph.id !== activeSelection.wallGraphId) {
            return [wallGraph];
          }

          const graphWithoutSegment = {
            ...wallGraph,
            segments: wallGraph.segments.filter((wallSegment) => wallSegment.id !== activeSelection.wallSegmentId),
          };

          return splitDisconnectedWallGraph({
            graph: graphWithoutSegment,
            createGraphId: createId,
          });
        });
        const nextElevationFace = getNextElevationFace({
          wallGraphs: updatedWallGraphs,
          deletedWallGraphId: activeSelection.wallGraphId,
          deletedWallSegmentId: activeSelection.wallSegmentId,
          activeWallElevationTarget: state.activeWallElevationTarget,
        });

        const nextElevationFaceSide = nextElevationFace === null
          ? null
          : getWallElevationFaceSideForSegment({
            faceSideBySegmentKey: state.activeWallElevationFaceSideBySegmentKey,
            wallGraphId: nextElevationFace.wallGraphId,
            wallSegmentId: nextElevationFace.wallSegmentId,
          });

        return {
          activeWallElevationTarget: nextElevationFace === null || nextElevationFaceSide === null
            ? null
            : {
              wallGraphId: nextElevationFace.wallGraphId,
              wallSegmentId: nextElevationFace.wallSegmentId,
              faceSide: nextElevationFaceSide,
            },
          designScene: {
            ...state.designScene,
            placedWallGraphs: updatedWallGraphs,
            activeSelection: null,
          },
        };
      });
    },
  };
}

function getNextElevationFace(args: {
  wallGraphs: DesignSceneStore["designScene"]["placedWallGraphs"];
  deletedWallGraphId: string;
  deletedWallSegmentId: string;
  activeWallElevationTarget: DesignSceneStore["activeWallElevationTarget"];
}) {
  const activeTarget = args.activeWallElevationTarget;
  const nextTarget = activeTarget?.wallGraphId === args.deletedWallGraphId && activeTarget.wallSegmentId === args.deletedWallSegmentId
    ? null
    : activeTarget;

  for (const wallGraph of args.wallGraphs) {
    const activeElevationFace = getActiveWallSegmentElevationFace({
      topology: buildConnectedWallGeometry(wallGraph),
      activeWallElevationTarget: nextTarget,
    });

    if (activeElevationFace !== null) {
      return activeElevationFace;
    }
  }

  return null;
}
