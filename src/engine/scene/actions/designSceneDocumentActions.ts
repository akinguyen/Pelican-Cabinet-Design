import { createDesignSceneFromDocument } from "../document/createDesignSceneFromDocument";
import type { DesignSceneDocument } from "../document/designSceneDocumentTypes";
import type { DesignSceneStore, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createDesignSceneDocumentActions(
  _get: () => DesignSceneStore,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "replaceDesignSceneFromDocument"> {
  return {
    replaceDesignSceneFromDocument(document) {
      set({
        designScene: createDesignSceneFromDocument(document),
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeToolbarTool: null,
      });
    },
  };
}
