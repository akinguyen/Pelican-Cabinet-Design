import type { Point3DInches } from "@/core/geometry/pointTypes";

export type PerspectiveEditorCameraState = Readonly<{
  cameraPositionInches: Point3DInches;
  cameraTargetInches: Point3DInches;
}>;

export type OrthographicEditorCameraState = Readonly<{
  cameraPositionInches: Point3DInches;
  cameraTargetInches: Point3DInches;
  zoom: number;
}>;

export type ElevationEditorCameraState = OrthographicEditorCameraState & Readonly<{
  elevationViewKey: string | null;
}>;

export type EditorCameraStates = Readonly<{
  perspective: PerspectiveEditorCameraState;
  floorPlan: OrthographicEditorCameraState;
  elevationDefault: ElevationEditorCameraState;
  elevationByViewKey: Readonly<Record<string, ElevationEditorCameraState>>;
}>;

export function createDefaultElevationEditorCameraState(): ElevationEditorCameraState {
  return {
    cameraPositionInches: { xInches: 0, yInches: 360, zInches: 36 },
    cameraTargetInches: { xInches: 0, yInches: 0, zInches: 36 },
    zoom: 2,
    elevationViewKey: null,
  };
}

export function getStoredElevationEditorCameraState(
  editorCameraStates: EditorCameraStates,
  elevationViewKey: string | null,
): ElevationEditorCameraState {
  if (elevationViewKey === null) {
    return editorCameraStates.elevationDefault;
  }

  return editorCameraStates.elevationByViewKey[elevationViewKey] ?? editorCameraStates.elevationDefault;
}

export function createDefaultEditorCameraStates(): EditorCameraStates {
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
    elevationDefault: createDefaultElevationEditorCameraState(),
    elevationByViewKey: {},
  };
}
