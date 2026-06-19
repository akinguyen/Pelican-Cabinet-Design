import { createId } from "@/core/ids/createId";
import {
  createWallElevationTargetFromNavigationItem,
  getWallElevationSegmentNavigationItems,
} from "@/engine/walls/wallSegmentElevationNavigation";
import {
  updateWallSegmentCabinetPlacementFacePolicyInGraphs,
  updateWallSegmentPreferredViewFaceSideInGraphs,
} from "@/engine/walls/wallSegmentFaceSideSettings";
import { splitDisconnectedWallGraph } from "@/engine/walls/wallSegmentGraphEditing";
import type { WallFaceSide } from "@/engine/walls/placedWallSegmentTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createWallEditingActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "updateSelectedWallSegmentHeight"
  | "updateSelectedWallSegmentThickness"
  | "updateWallSegmentPreferredViewFaceSide"
  | "updateSelectedWallSegmentPreferredViewFaceSide"
  | "updateSelectedWallSegmentCabinetPlacementFacePolicy"
  | "deleteSelectedWallSegment"
> {
  return {
    updateSelectedWallSegmentHeight(heightInches) {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall-segment") {
        return;
      }

      recordDesignSceneHistoryEntry({ get, set, label: "Update wall height" });

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
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall-segment") {
        return;
      }

      recordDesignSceneHistoryEntry({ get, set, label: "Update wall thickness" });

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

    updateWallSegmentPreferredViewFaceSide(args) {
      recordDesignSceneHistoryEntry({ get, set, label: "Update wall view side" });

      set((state) => ({
        activeWallElevationTarget: getUpdatedActiveWallElevationTarget({
          activeWallElevationTarget: state.activeWallElevationTarget,
          wallGraphId: args.wallGraphId,
          wallSegmentId: args.wallSegmentId,
          preferredViewFaceSide: args.preferredViewFaceSide,
        }),
        designScene: {
          ...state.designScene,
          placedWallGraphs: updateWallSegmentPreferredViewFaceSideInGraphs({
            placedWallGraphs: state.designScene.placedWallGraphs,
            ...args,
          }),
        },
      }));
    },

    updateSelectedWallSegmentPreferredViewFaceSide(preferredViewFaceSide) {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall-segment") {
        return;
      }

      get().updateWallSegmentPreferredViewFaceSide({
        wallGraphId: activeSelection.wallGraphId,
        wallSegmentId: activeSelection.wallSegmentId,
        preferredViewFaceSide,
      });
    },

    updateSelectedWallSegmentCabinetPlacementFacePolicy(faceSide, requirement) {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall-segment") {
        return;
      }

      recordDesignSceneHistoryEntry({ get, set, label: "Update wall face policy" });

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedWallGraphs: updateWallSegmentCabinetPlacementFacePolicyInGraphs({
            placedWallGraphs: state.designScene.placedWallGraphs,
            wallGraphId: activeSelection.wallGraphId,
            wallSegmentId: activeSelection.wallSegmentId,
            faceSide,
            requirement,
          }),
        },
      }));
    },

    deleteSelectedWallSegment() {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-wall-segment") {
        return;
      }

      recordDesignSceneHistoryEntry({ get, set, label: "Delete wall segment" });

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

        return {
          activeWallElevationTarget: getNextWallElevationTargetAfterDelete({
            wallGraphs: updatedWallGraphs,
            deletedWallGraphId: activeSelection.wallGraphId,
            deletedWallSegmentId: activeSelection.wallSegmentId,
            activeWallElevationTarget: state.activeWallElevationTarget,
          }),
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

function getUpdatedActiveWallElevationTarget(args: {
  activeWallElevationTarget: DesignSceneStore["activeWallElevationTarget"];
  wallGraphId: string;
  wallSegmentId: string;
  preferredViewFaceSide: WallFaceSide;
}): DesignSceneStore["activeWallElevationTarget"] {
  if (
    args.activeWallElevationTarget?.wallGraphId !== args.wallGraphId ||
    args.activeWallElevationTarget.wallSegmentId !== args.wallSegmentId
  ) {
    return args.activeWallElevationTarget;
  }

  return {
    ...args.activeWallElevationTarget,
    faceSide: args.preferredViewFaceSide,
  };
}

function getNextWallElevationTargetAfterDelete(args: {
  wallGraphs: DesignSceneStore["designScene"]["placedWallGraphs"];
  deletedWallGraphId: string;
  deletedWallSegmentId: string;
  activeWallElevationTarget: DesignSceneStore["activeWallElevationTarget"];
}): DesignSceneStore["activeWallElevationTarget"] {
  const activeTargetStillExists = args.activeWallElevationTarget !== null && !(
    args.activeWallElevationTarget.wallGraphId === args.deletedWallGraphId &&
    args.activeWallElevationTarget.wallSegmentId === args.deletedWallSegmentId
  );

  if (activeTargetStillExists) {
    return args.activeWallElevationTarget;
  }

  const [firstNavigationItem] = getWallElevationSegmentNavigationItems(args.wallGraphs);

  return firstNavigationItem === undefined
    ? null
    : createWallElevationTargetFromNavigationItem({
      item: firstNavigationItem,
      faceSide: firstNavigationItem.preferredViewFaceSide,
    });
}
