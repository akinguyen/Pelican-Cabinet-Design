import { createId } from "@/core/ids/createId";
import {
  clickWallFootprintDraftPoint as clickWallFootprintDraftPointInEngine,
  updateWallFootprintDraftHover as updateWallFootprintDraftHoverInEngine,
} from "@/engine/walls/footprint-draft/wallFootprintDraftEditing";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createWallFootprintDraftActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "updateWallFootprintDraftHover" | "clickWallFootprintDraftPoint" | "exitWallFootprintDraftTool"
> {
  return {
    updateWallFootprintDraftHover(pointInches) {
      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "wall-footprint-draft") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            kind: "wall-footprint-draft",
            wallFootprintDraft: updateWallFootprintDraftHoverInEngine({
              draft: activeSceneOperation.wallFootprintDraft,
              pointInches,
              placedWalls: state.designScene.placedWalls,
            }),
          },
        },
      }));
    },

    clickWallFootprintDraftPoint(pointInches) {
      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "wall-footprint-draft") {
        return;
      }

      const clickResult = clickWallFootprintDraftPointInEngine({
        draft: activeSceneOperation.wallFootprintDraft,
        pointInches,
        placedWalls: get().designScene.placedWalls,
        createId,
      });

      if (clickResult.kind === "updated-draft") {
        set((state) => ({
          designScene: {
            ...state.designScene,
            activeSceneOperation: {
              kind: "wall-footprint-draft",
              wallFootprintDraft: clickResult.draft,
            },
            activeSelection: null,
          },
        }));
        return;
      }

      if (clickResult.kind === "created-placed-wall") {
        set((state) => ({
          designScene: {
            ...state.designScene,
            placedWalls: [...state.designScene.placedWalls, clickResult.placedWall],
            activeSceneOperation: {
              kind: "wall-footprint-draft",
              wallFootprintDraft: clickResult.draft,
            },
            activeSelection: null,
          },
        }));
      }
    },

    exitWallFootprintDraftTool() {
      set((state) => ({
        activeToolbarTool: null,
        designScene: {
          ...state.designScene,
          activeSceneOperation: state.designScene.activeSceneOperation?.kind === "wall-footprint-draft"
            ? null
            : state.designScene.activeSceneOperation,
        },
      }));
    },
  };
}
