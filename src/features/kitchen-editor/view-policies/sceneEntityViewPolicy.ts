import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { SceneEntityMeasurementPolicy } from "@/engine/scene-entities/spatial-guides/spatialGuideTypes";

export type SceneEntityViewPolicy = Readonly<{
  sceneViewMode: SceneViewMode;
  measurementPolicy: SceneEntityMeasurementPolicy;
  showRotationHandle: boolean;
  enableRotationHandleInteraction: boolean;
}>;

export function createSceneEntityViewPolicy(sceneViewMode: SceneViewMode): SceneEntityViewPolicy {
  if (sceneViewMode === "elevation") {
    return {
      sceneViewMode,
      measurementPolicy: "elevation-wall-face",
      showRotationHandle: false,
      enableRotationHandleInteraction: false,
    };
  }

  if (sceneViewMode === "floor-plan") {
    return {
      sceneViewMode,
      measurementPolicy: "floor-xy",
      showRotationHandle: true,
      enableRotationHandleInteraction: true,
    };
  }

  return {
    sceneViewMode,
    measurementPolicy: "perspective-xy-plus-floor",
    showRotationHandle: false,
    enableRotationHandleInteraction: false,
  };
}
