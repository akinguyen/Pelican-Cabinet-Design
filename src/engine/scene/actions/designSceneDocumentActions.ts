import { getWallElevationSegmentNavigationItems } from "@/engine/walls/wallSegmentElevationNavigation";
import { createDesignSceneFromDocument } from "../document/createDesignSceneFromDocument";
import type { DesignSceneDocument } from "../document/designSceneDocumentTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createDesignSceneDocumentActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "replaceDesignSceneFromDocument"> {
  return {
    replaceDesignSceneFromDocument(document) {
      const designScene = createDesignSceneFromDocument(document);
      const [firstWallElevationItem] = getWallElevationSegmentNavigationItems(designScene.placedWallGraphs);

      recordDesignSceneHistoryEntry({ get, set, label: "Import scene" });

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
        activeObjectAlignmentGuides: [],
        activeToolbarTool: null,
      });
    },
  };
}
