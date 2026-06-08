import type { Point3DInches } from "@/core/geometry/pointTypes";

export const DEFAULT_PERSPECTIVE_CAMERA_POSITION_INCHES: Point3DInches = {
  xInches: 0,
  yInches: 240,
  zInches: 145,
};

export const DEFAULT_PERSPECTIVE_CAMERA_TARGET_INCHES: Point3DInches = {
  xInches: 0,
  yInches: 0,
  zInches: 24,
};

export const DEFAULT_FLOOR_PLAN_CAMERA_POSITION_INCHES: Point3DInches = {
  xInches: 0,
  yInches: 0,
  zInches: 600,
};

export const DEFAULT_FLOOR_PLAN_CAMERA_TARGET_INCHES: Point3DInches = {
  xInches: 0,
  yInches: 0,
  zInches: 0,
};

export const DEFAULT_FLOOR_PLAN_ZOOM = 2.7;

export type PerspectiveCameraState = Readonly<{
  cameraPositionInches: Point3DInches;
  cameraTargetInches: Point3DInches;
}>;

export type OrthographicCameraState = Readonly<{
  cameraPositionInches: Point3DInches;
  cameraTargetInches: Point3DInches;
  zoom: number;
}>;

export type ElevationCameraState = OrthographicCameraState & Readonly<{
  elevationViewKey: string | null;
}>;

export type SceneCameraStates = Readonly<{
  perspective: PerspectiveCameraState;
  floorPlan: OrthographicCameraState;
  elevationDefault: ElevationCameraState;
  elevationByViewKey: Readonly<Record<string, ElevationCameraState>>;
}>;

export function createDefaultElevationCameraState(): ElevationCameraState {
  return {
    cameraPositionInches: { xInches: 0, yInches: 360, zInches: 36 },
    cameraTargetInches: { xInches: 0, yInches: 0, zInches: 36 },
    zoom: 2,
    elevationViewKey: null,
  };
}

export function getStoredElevationCameraState(
  sceneCameraStates: SceneCameraStates,
  elevationViewKey: string | null,
): ElevationCameraState {
  if (elevationViewKey === null) {
    return sceneCameraStates.elevationDefault;
  }

  return sceneCameraStates.elevationByViewKey[elevationViewKey] ?? sceneCameraStates.elevationDefault;
}

export function createDefaultSceneCameraStates(): SceneCameraStates {
  return {
    perspective: {
      cameraPositionInches: DEFAULT_PERSPECTIVE_CAMERA_POSITION_INCHES,
      cameraTargetInches: DEFAULT_PERSPECTIVE_CAMERA_TARGET_INCHES,
    },
    floorPlan: {
      cameraPositionInches: DEFAULT_FLOOR_PLAN_CAMERA_POSITION_INCHES,
      cameraTargetInches: DEFAULT_FLOOR_PLAN_CAMERA_TARGET_INCHES,
      zoom: DEFAULT_FLOOR_PLAN_ZOOM,
    },
    elevationDefault: createDefaultElevationCameraState(),
    elevationByViewKey: {},
  };
}
