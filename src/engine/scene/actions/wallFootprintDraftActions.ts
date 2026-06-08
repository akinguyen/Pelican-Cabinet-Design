import { createId } from "@/core/ids/createId";
import {
  clickWallFootprintDraftPoint as clickWallFootprintDraftPointInEngine,
  updateWallFootprintDraftHover as updateWallFootprintDraftHoverInEngine,
} from "@/engine/walls/footprint-draft/wallFootprintDraftEditing";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createWallFootprintDraftActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "updateWallFootprintDraftHover" | "clickWallFootprintDraftPoint" | "exitWallFootprintDraftTool"
> {
  return {
    updateWallFootprintDraftHover(pointInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

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
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

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
          activeToolbarTool: null,
          activeWallElevationWallId: state.activeWallElevationWallId ?? clickResult.placedWall.id,
          activeWallElevationEdgeIndex: state.activeWallElevationWallId === null
            ? clickResult.placedWall.viewableEdgeIndices[0] ?? 0
            : state.activeWallElevationEdgeIndex,
          designScene: {
            ...state.designScene,
            placedWalls: [...state.designScene.placedWalls, clickResult.placedWall],
            activeSceneOperation: null,
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
