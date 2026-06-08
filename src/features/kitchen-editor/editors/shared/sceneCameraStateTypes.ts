import type { Point3DInches } from "@/core/geometry/pointTypes";

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
      cameraPositionInches: { xInches: 96, yInches: -144, zInches: 96 },
      cameraTargetInches: { xInches: 0, yInches: 0, zInches: 24 },
    },
    floorPlan: {
      cameraPositionInches: { xInches: 0, yInches: 0, zInches: 600 },
      cameraTargetInches: { xInches: 0, yInches: 0, zInches: 0 },
      zoom: 2,
    },
    elevationDefault: createDefaultElevationCameraState(),
    elevationByViewKey: {},
  };
}
