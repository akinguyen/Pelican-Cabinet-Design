import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import type { SceneViewMode } from "../sceneViewModeTypes";
import { isFloorPlanOnlySceneEditingTool } from "../sceneEditingToolTypes";

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
        activeSceneEntityAlignmentGuides: [],
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
  if (args.sceneViewMode !== "floor-plan" && isFloorPlanOnlySceneEditingTool(args.activeToolbarTool)) {
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


function isFloorPlanOnlySceneOperation(
  activeSceneOperation: DesignSceneStore["designScene"]["activeSceneOperation"],
): boolean {
  return activeSceneOperation?.kind === "wall-segment-draft";
}
