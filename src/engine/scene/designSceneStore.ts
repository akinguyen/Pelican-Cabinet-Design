import { create } from "zustand";
import { createAssemblyDragActions } from "./actions/assemblyDragActions";
import { createAssemblyEditingActions } from "./actions/assemblyEditingActions";
import { createAssemblyPlacementActions } from "./actions/assemblyPlacementActions";
import { createCountertopOpeningActions } from "./actions/countertopOpeningActions";
import { createSceneCameraStateActions } from "./actions/sceneCameraStateActions";
import { createSceneInteractionActions } from "./actions/sceneInteractionActions";
import { createSceneSelectionActions } from "./actions/sceneSelectionActions";
import { createSceneToolbarActions } from "./actions/sceneToolbarActions";
import { createSceneViewModeActions } from "./actions/sceneViewModeActions";
import { createWallEditingActions } from "./actions/wallEditingActions";
import { createWorkspaceModeActions } from "./actions/workspaceModeActions";
import { createWallElevationNavigationActions } from "./actions/wallElevationNavigationActions";
import { createWallFootprintDraftActions } from "./actions/wallFootprintDraftActions";
import { createWallSplitDraftActions } from "./actions/wallSplitDraftActions";
import { createInitialDesignSceneStoreState } from "./createInitialDesignSceneStoreState";
import type { DesignSceneStore } from "./designSceneStoreTypes";

export const useDesignSceneStore = create<DesignSceneStore>((set, get) => ({
  ...createInitialDesignSceneStoreState(),
  ...createWorkspaceModeActions(get, set),
  ...createSceneViewModeActions(get, set),
  ...createSceneCameraStateActions(get, set),
  ...createWallElevationNavigationActions(get, set),
  ...createSceneToolbarActions(get, set),
  ...createAssemblyPlacementActions(get, set),
  ...createSceneSelectionActions(get, set),
  ...createAssemblyDragActions(get, set),
  ...createAssemblyEditingActions(get, set),
  ...createCountertopOpeningActions(get, set),
  ...createWallFootprintDraftActions(get, set),
  ...createWallSplitDraftActions(get, set),
  ...createWallEditingActions(get, set),
  ...createSceneInteractionActions(get, set),
}));
