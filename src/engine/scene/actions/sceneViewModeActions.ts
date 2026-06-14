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
  if (args.sceneViewMode !== "floor-plan" && args.activeToolbarTool === "draw-wall-segment") {
    return null;
  }

  return args.activeToolbarTool;
}

function getNextActiveSceneOperation(args: {
  sceneViewMode: SceneViewMode;
  activeSceneOperation: DesignSceneStore["designScene"]["activeSceneOperation"];
}): DesignSceneStore["designScene"]["activeSceneOperation"] {
  if (args.sceneViewMode !== "floor-plan" && args.activeSceneOperation?.kind === "wall-segment-draft") {
    return null;
  }

  return args.activeSceneOperation;
}
