import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import type { SceneViewMode } from "../sceneViewModeTypes";

export function createSceneViewModeActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "setActiveSceneViewMode"> {
  return {
    setActiveSceneViewMode(sceneViewMode) {
      set((state) => ({
        activeSceneViewMode: sceneViewMode,
        activeToolbarTool: getNextActiveToolbarTool({
          sceneViewMode,
          activeToolbarTool: state.activeToolbarTool,
        }),
        cameraCommand: null,
        activeObjectAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          activeSceneOperation: getNextActiveSceneOperation({
            sceneViewMode,
            activeSceneOperation: state.designScene.activeSceneOperation,
          }),
        },
      }));
    },
  };
}

function getNextActiveToolbarTool(args: {
  sceneViewMode: SceneViewMode;
  activeToolbarTool: DesignSceneStore["activeToolbarTool"];
}): DesignSceneStore["activeToolbarTool"] {
  if (args.sceneViewMode !== "floor-plan" && isFloorPlanOnlyToolbarTool(args.activeToolbarTool)) {
    return null;
  }

  return args.activeToolbarTool;
}

function getNextActiveSceneOperation(args: {
  sceneViewMode: SceneViewMode;
  activeSceneOperation: DesignSceneStore["designScene"]["activeSceneOperation"];
}): DesignSceneStore["designScene"]["activeSceneOperation"] {
  if (args.sceneViewMode !== "floor-plan" && isFloorPlanOnlySceneOperation(args.activeSceneOperation)) {
    return null;
  }

  return args.activeSceneOperation;
}

function isFloorPlanOnlyToolbarTool(toolbarTool: DesignSceneStore["activeToolbarTool"]): boolean {
  return toolbarTool === "draw-wall-segment";
}

function isFloorPlanOnlySceneOperation(
  activeSceneOperation: DesignSceneStore["designScene"]["activeSceneOperation"],
): boolean {
  return activeSceneOperation?.kind === "wall-segment-draft";
}
