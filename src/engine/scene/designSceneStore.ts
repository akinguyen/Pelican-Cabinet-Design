import { create } from "zustand";
import { createAssemblyEditingActions } from "./actions/assemblyEditingActions";
import { createDesignReservationZoneEditingActions } from "./actions/designReservationZoneEditingActions";
import { createDesignReservationZonePlacementActions } from "./actions/designReservationZonePlacementActions";
import { createSceneCameraStateActions } from "./actions/sceneCameraStateActions";
import { createSceneEntityEditingActions } from "./actions/sceneEntityEditingActions";
import { createSceneEntityMoveActions } from "./actions/sceneEntityMoveActions";
import { createSceneEntityPlacementActions } from "./actions/sceneEntityPlacementActions";
import { createSceneEntityRotationActions } from "./actions/sceneEntityRotationActions";
import { createSceneEntityTransformEditingActions } from "./actions/sceneEntityTransformEditingActions";
import { createSceneHistoryActions } from "./actions/sceneHistoryActions";
import { createSceneInteractionActions } from "./actions/sceneInteractionActions";
import { createSceneSelectionActions } from "./actions/sceneSelectionActions";
import { createSceneToolbarActions } from "./actions/sceneToolbarActions";
import { createSceneViewModeActions } from "./actions/sceneViewModeActions";
import { createWallEditingActions } from "./actions/wallEditingActions";
import { createWallElevationNavigationActions } from "./actions/wallElevationNavigationActions";
import { createWallSegmentDraftActions } from "./actions/wallSegmentDraftActions";
import { createInitialDesignSceneStoreState } from "./createInitialDesignSceneStoreState";
import type { DesignSceneStore } from "./designSceneStoreTypes";

export const useDesignSceneStore = create<DesignSceneStore>((set, get) => ({
  ...createInitialDesignSceneStoreState(),
  ...createSceneViewModeActions(get, set),
  ...createSceneCameraStateActions(get, set),
  ...createWallElevationNavigationActions(get, set),
  ...createSceneToolbarActions(get, set),
  ...createSceneEntityPlacementActions(get, set),
  ...createSceneSelectionActions(get, set),
  ...createSceneHistoryActions(get, set),
  ...createSceneEntityEditingActions(get, set),
  ...createSceneEntityMoveActions(get, set),
  ...createSceneEntityRotationActions(get, set),
  ...createSceneEntityTransformEditingActions(get, set),
  ...createAssemblyEditingActions(get, set),
  ...createDesignReservationZonePlacementActions(get, set),
  ...createDesignReservationZoneEditingActions(get, set),
  ...createWallSegmentDraftActions(get, set),
  ...createWallEditingActions(get, set),
  ...createSceneInteractionActions(get, set),
}));
