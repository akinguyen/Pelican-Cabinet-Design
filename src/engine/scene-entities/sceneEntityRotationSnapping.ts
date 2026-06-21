export const SCENE_ENTITY_ROTATION_SNAP_STEP_DEGREES = 45;
export const SCENE_ENTITY_ROTATION_SNAP_THRESHOLD_DEGREES = 5;

export function snapSceneEntityRotationDegrees(rotationDegrees: number): { rotationDegrees: number; isSnappedToRotationStop: boolean } {
  const normalizedDegrees = normalizeSceneEntityRotationDegrees(rotationDegrees);
  const nearestStopDegrees = Math.round(normalizedDegrees / SCENE_ENTITY_ROTATION_SNAP_STEP_DEGREES) * SCENE_ENTITY_ROTATION_SNAP_STEP_DEGREES;
  const normalizedStopDegrees = normalizeSceneEntityRotationDegrees(nearestStopDegrees);
  const distanceToStopDegrees = getSmallestAngleDistanceDegrees(normalizedDegrees, normalizedStopDegrees);
  return distanceToStopDegrees <= SCENE_ENTITY_ROTATION_SNAP_THRESHOLD_DEGREES
    ? { rotationDegrees: normalizedStopDegrees, isSnappedToRotationStop: true }
    : { rotationDegrees: normalizedDegrees, isSnappedToRotationStop: false };
}

export function normalizeSceneEntityRotationDegrees(rotationDegrees: number): number {
  return ((rotationDegrees % 360) + 360) % 360;
}

export function getShortestSceneEntityRotationDeltaDegrees(startDegrees: number, endDegrees: number): number {
  return ((endDegrees - startDegrees + 540) % 360) - 180;
}

function getSmallestAngleDistanceDegrees(firstDegrees: number, secondDegrees: number): number {
  const differenceDegrees = Math.abs(normalizeSceneEntityRotationDegrees(firstDegrees - secondDegrees));
  return Math.min(differenceDegrees, 360 - differenceDegrees);
}
