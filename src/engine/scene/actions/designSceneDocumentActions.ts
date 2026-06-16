import { getWallElevationSegmentNavigationItems } from "@/engine/walls/wallSegmentElevationNavigation";
import { createDesignSceneFromDocument } from "../document/createDesignSceneFromDocument";
import type { DesignSceneDocument } from "../document/designSceneDocumentTypes";
import type { DesignSceneStore, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createDesignSceneDocumentActions(
  _get: () => DesignSceneStore,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "replaceDesignSceneFromDocument"> {
  return {
    replaceDesignSceneFromDocument(document) {
      const designScene = createDesignSceneFromDocument(document);
      const [firstWallElevationItem] = getWallElevationSegmentNavigationItems(designScene.placedWallGraphs);

      set({
        designScene,
        activeWallElevationTarget: firstWallElevationItem === undefined
          ? null
          : {
              wallGraphId: firstWallElevationItem.wallGraphId,
              wallSegmentId: firstWallElevationItem.wallSegmentId,
              faceSide: firstWallElevationItem.preferredViewFaceSide,
            },
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeToolbarTool: null,
      });
    },
  };
}
