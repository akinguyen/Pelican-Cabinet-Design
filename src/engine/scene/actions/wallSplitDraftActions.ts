import { createId } from "@/core/ids/createId";
import {
  clickWallSplitDraftPoint as clickWallSplitDraftPointInEngine,
  updateWallSplitDraftHover as updateWallSplitDraftHoverInEngine,
} from "@/engine/walls/split-draft/wallSplitDraftEditing";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createWallSplitDraftActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "updateWallSplitDraftHover" | "clickWallSplitDraftPoint" | "exitWallSplitDraftTool"> {
  return {
    updateWallSplitDraftHover(pointInches) {
      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "wall-split-draft") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            kind: "wall-split-draft",
            wallSplitDraft: updateWallSplitDraftHoverInEngine({
              draft: activeSceneOperation.wallSplitDraft,
              pointInches,
              placedWalls: state.designScene.placedWalls,
            }),
          },
        },
      }));
    },

    clickWallSplitDraftPoint(pointInches) {
      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "wall-split-draft") {
        return;
      }

      const clickResult = clickWallSplitDraftPointInEngine({
        draft: activeSceneOperation.wallSplitDraft,
        pointInches,
        placedWalls: get().designScene.placedWalls,
        createId,
      });

      if (clickResult.kind === "updated-draft") {
        set((state) => ({
          designScene: {
            ...state.designScene,
            activeSceneOperation: {
              kind: "wall-split-draft",
              wallSplitDraft: clickResult.draft,
            },
          },
        }));
        return;
      }

      set((state) => ({
        activeWallElevationEdgeIndex: 0,
        designScene: {
          ...state.designScene,
          placedWalls: [
            ...state.designScene.placedWalls.filter(
              (placedWall) => placedWall.id !== clickResult.removedPlacedWallId,
            ),
            ...clickResult.createdPlacedWalls,
          ],
          activeSceneOperation: {
            kind: "wall-split-draft",
            wallSplitDraft: clickResult.draft,
          },
          activeSelection: {
            kind: "placed-wall",
            placedWallId: clickResult.selectedPlacedWallId,
          },
        },
      }));
    },

    exitWallSplitDraftTool() {
      set((state) => ({
        activeToolbarTool: null,
        designScene: {
          ...state.designScene,
          activeSceneOperation: state.designScene.activeSceneOperation?.kind === "wall-split-draft"
            ? null
            : state.designScene.activeSceneOperation,
        },
      }));
    },
  };
}
