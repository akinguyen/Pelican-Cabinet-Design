import type {
  ElevationEditorCameraState,
  OrthographicEditorCameraState,
  PerspectiveEditorCameraState,
} from "@/features/kitchen-editor/editors/shared/editorCameraStateTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createEditorCameraStateActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "updatePerspectiveCameraState"
  | "updateFloorPlanCameraState"
  | "updateElevationCameraState"
> {
  return {
    updatePerspectiveCameraState(cameraState: PerspectiveEditorCameraState) {
      set((state) => ({
        editorCameraStates: {
          ...state.editorCameraStates,
          perspective: cameraState,
        },
      }));
    },

    updateFloorPlanCameraState(cameraState: OrthographicEditorCameraState) {
      set((state) => ({
        editorCameraStates: {
          ...state.editorCameraStates,
          floorPlan: cameraState,
        },
      }));
    },

    updateElevationCameraState(cameraState: ElevationEditorCameraState) {
      set((state) => ({
        editorCameraStates: {
          ...state.editorCameraStates,
          elevation: cameraState,
        },
      }));
    },
  };
}
