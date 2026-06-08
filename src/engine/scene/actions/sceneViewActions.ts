import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneViewActions(
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
