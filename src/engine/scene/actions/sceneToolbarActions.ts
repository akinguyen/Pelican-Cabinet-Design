import { createWallSplitDraftForTarget } from "@/engine/walls/split-draft/wallSplitDraftFactory";
import { createEmptyWallFootprintDraft } from "@/engine/walls/footprint-draft/wallFootprintDraftFactory";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneToolbarActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "runCameraCommand" | "clearCameraCommand" | "setActiveToolbarTool"> {
  return {
    runCameraCommand(toolbarTool) {
      set((state) => ({
        cameraCommand: {
          id: (state.cameraCommand?.id ?? 0) + 1,
          editorView: state.activeEditorView,
          tool: toolbarTool,
        },
        activeToolbarTool: null,
      }));
    },

    clearCameraCommand(cameraCommandId) {
      set((state) => {
        if (state.cameraCommand?.id !== cameraCommandId) {
          return {};
        }

        return { cameraCommand: null };
      });
    },

    setActiveToolbarTool(toolbarTool) {
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
