import { createEmptyWallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftFactory";
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
        activeCutoutDraftPointerTarget: null,
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
      const stateBeforeUpdate = get();

      if (!canManuallyEditScene(stateBeforeUpdate.workspaceMode) && toolbarTool !== null) {
        return;
      }

      if (toolbarTool === "draw-wall-segment" && stateBeforeUpdate.activeSceneViewMode !== "floor-plan") {
        return;
      }

      set((state) => {
        if (toolbarTool === "draw-wall-segment") {
          return {
            activeToolbarTool: toolbarTool,
            activeCutoutDraftPointerTarget: null,
            designScene: {
              ...state.designScene,
              activeSceneOperation: {
                kind: "wall-segment-draft",
                wallSegmentDraft: createEmptyWallSegmentDraft({
                  heightInches: state.wallSettings.defaultHeightInches,
                  thicknessInches: state.wallSettings.defaultThicknessInches,
                }),
              },
              activeSelection: null,
            },
          };
        }

        if (isRectangleCutoutTool(toolbarTool)) {
          return {
            activeToolbarTool: toolbarTool,
            activeCutoutDraftPointerTarget: null,
            designScene: {
              ...state.designScene,
              activeSceneOperation: null,
            },
          };
        }

        return {
          activeToolbarTool: null,
          activeCutoutDraftPointerTarget: null,
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
    activeSceneOperation?.kind === "wall-segment-draft" ||
    activeSceneOperation?.kind === "countertop-cutout-draft" ||
    activeSceneOperation?.kind === "countertop-opening-drag" ||
    activeSceneOperation?.kind === "wall-opening-draft" ||
    activeSceneOperation?.kind === "wall-opening-drag"
  );
}

function isRectangleCutoutTool(toolbarTool: DesignSceneStore["activeToolbarTool"]): boolean {
  return toolbarTool === "draw-rectangle-cutout";
}
