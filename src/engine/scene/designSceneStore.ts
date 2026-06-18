import { create } from "zustand";
import { createAssemblyDragActions } from "./actions/assemblyDragActions";
import { createAssemblyEditingActions } from "./actions/assemblyEditingActions";
import { createAssemblyPlacementActions } from "./actions/assemblyPlacementActions";
import { createAssemblyRotationActions } from "./actions/assemblyRotationActions";
import { createDesignSceneDocumentActions } from "./actions/designSceneDocumentActions";
import { createDesignReservationZonePlacementActions } from "./actions/designReservationZonePlacementActions";
import { createDesignReservationZoneDragActions } from "./actions/designReservationZoneDragActions";
import { createDesignReservationZoneEditingActions } from "./actions/designReservationZoneEditingActions";
import { createDesignReservationZoneRotationActions } from "./actions/designReservationZoneRotationActions";
import { createSceneCameraStateActions } from "./actions/sceneCameraStateActions";
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
  ...createAssemblyPlacementActions(get, set),
  ...createSceneSelectionActions(get, set),
  ...createAssemblyDragActions(get, set),
  ...createAssemblyRotationActions(get, set),
  ...createAssemblyEditingActions(get, set),
  ...createDesignReservationZonePlacementActions(get, set),
  ...createDesignReservationZoneDragActions(get, set),
  ...createDesignReservationZoneRotationActions(get, set),
  ...createDesignReservationZoneEditingActions(get, set),
  ...createWallSegmentDraftActions(get, set),
  ...createWallEditingActions(get, set),
  ...createSceneInteractionActions(get, set),
  ...createDesignSceneDocumentActions(get, set),
}));
