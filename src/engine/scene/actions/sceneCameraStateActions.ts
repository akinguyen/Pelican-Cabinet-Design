import type {
  ElevationCameraState,
  OrthographicCameraState,
  PerspectiveCameraState,
} from "@/engine/scene/sceneCameraStateTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createSceneCameraStateActions(
  _get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "updatePerspectiveCameraState"
  | "updateFloorPlanCameraState"
  | "updateElevationCameraState"
> {
  return {
    updatePerspectiveCameraState(cameraState: PerspectiveCameraState) {
      set((state) => ({
        sceneCameraStates: {
          ...state.sceneCameraStates,
          perspective: cameraState,
        },
      }));
    },

    updateFloorPlanCameraState(cameraState: OrthographicCameraState) {
      set((state) => ({
        sceneCameraStates: {
          ...state.sceneCameraStates,
          floorPlan: cameraState,
        },
      }));
    },

    updateElevationCameraState(cameraState: ElevationCameraState) {
      set((state) => {
        if (cameraState.elevationViewKey === null) {
          return {
            sceneCameraStates: {
              ...state.sceneCameraStates,
              elevationDefault: cameraState,
            },
          };
        }

        return {
          sceneCameraStates: {
            ...state.sceneCameraStates,
            elevationByViewKey: {
              ...state.sceneCameraStates.elevationByViewKey,
              [cameraState.elevationViewKey]: cameraState,
            },
          },
        };
      });
    },
  };
}
