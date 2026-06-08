import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneViewModeActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "setActiveSceneViewMode"> {
  return {
    setActiveSceneViewMode(sceneViewMode) {
      set({
        activeSceneViewMode: sceneViewMode,
        cameraCommand: null,
      });
    },
  };
}
