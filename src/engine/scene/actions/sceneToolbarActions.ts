import { createWallSplitDraftForTarget } from "@/engine/walls/split-draft/wallSplitDraftFactory";
import { createEmptyWallFootprintDraft } from "@/engine/walls/footprint-draft/wallFootprintDraftFactory";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createSceneToolbarActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "runCameraCommand" | "clearCameraCommand" | "setActiveToolbarTool"> {
  return {
    runCameraCommand(cameraCommandTool) {
      set((state) => ({
        cameraCommand: {
          id: (state.cameraCommand?.id ?? 0) + 1,
          sceneViewMode: state.activeSceneViewMode,
          tool: cameraCommandTool,
        },
        activeToolbarTool: null,
        designScene: {
          ...state.designScene,
          activeSceneOperation: isToolbarSceneOperation(state.designScene.activeSceneOperation)
            ? null
            : state.designScene.activeSceneOperation,
        },
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
      if (!canManuallyEditScene(get().workspaceMode) && toolbarTool !== null) {
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
            activeSceneOperation: isToolbarSceneOperation(state.designScene.activeSceneOperation)
              ? null
              : state.designScene.activeSceneOperation,
          },
        };
      });
    },
  };
}

function isToolbarSceneOperation(
  activeSceneOperation: DesignSceneStore["designScene"]["activeSceneOperation"],
): boolean {
  return (
    activeSceneOperation?.kind === "wall-footprint-draft" ||
    activeSceneOperation?.kind === "wall-split-draft"
  );
}
