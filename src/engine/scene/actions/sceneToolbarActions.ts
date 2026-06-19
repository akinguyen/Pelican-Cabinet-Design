import { createEmptyWallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { isFloorPlanOnlySceneEditingTool } from "../sceneEditingToolTypes";

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
        activeObjectAlignmentGuides: [],
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

      if (isFloorPlanOnlySceneEditingTool(toolbarTool) && stateBeforeUpdate.activeSceneViewMode !== "floor-plan") {
        return;
      }

      if (toolbarTool === "draw-design-reservation-zone") {
        get().startDesignReservationZonePlacementCandidate();
        return;
      }

      set((state) => {
        if (toolbarTool === "draw-wall-segment") {
          return {
            activeToolbarTool: toolbarTool,
            activeObjectAlignmentGuides: [],
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


        return {
          activeToolbarTool: null,
          activeObjectAlignmentGuides: [],
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
  return activeSceneOperation?.kind === "wall-segment-draft" ||
    activeSceneOperation?.kind === "design-reservation-zone-placement";
}
