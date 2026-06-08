import { createWallSplitDraftForTarget } from "@/engine/walls/split-draft/wallSplitDraftFactory";
import { createEmptyWallFootprintDraft } from "@/engine/walls/footprint-draft/wallFootprintDraftFactory";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneEditingToolActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "setActiveToolbarTool"> {
  return {
    setActiveToolbarTool(toolbarTool) {
      if (get().workspaceMode !== "editor" && toolbarTool !== null) {
        return;
      }

      set((state) => {
        const selectedPlacedWallId = state.designScene.activeSelection?.kind === "placed-wall"
          ? state.designScene.activeSelection.placedWallId
          : null;

        if (toolbarTool === "draw-wall-footprint") {
          return {
            activeToolbarTool: toolbarTool,
            designScene: {
              ...state.designScene,
              activeSceneOperation: {
                kind: "wall-footprint-draft",
                wallFootprintDraft: createEmptyWallFootprintDraft(
                  state.wallSettings.defaultHeightInches,
                ),
              },
              activeSelection: null,
            },
          };
        }

        if (toolbarTool === "split-wall-footprint") {
          return {
            activeToolbarTool: toolbarTool,
            designScene: {
              ...state.designScene,
              activeSceneOperation: {
                kind: "wall-split-draft",
                wallSplitDraft: createWallSplitDraftForTarget(selectedPlacedWallId),
              },
            },
          };
        }

        return {
          activeToolbarTool: null,
          designScene: {
            ...state.designScene,
            activeSceneOperation:
              state.designScene.activeSceneOperation?.kind === "wall-footprint-draft" ||
              state.designScene.activeSceneOperation?.kind === "wall-split-draft"
                ? null
                : state.designScene.activeSceneOperation,
          },
        };
      });
    },
  };
}
