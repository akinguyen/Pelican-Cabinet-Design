import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneViewActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "setActiveEditorView"> {
  return {
    setActiveEditorView(editorView) {
      set({
        activeEditorView: editorView,
        cameraCommand: null,
      });
    },
  };
}
