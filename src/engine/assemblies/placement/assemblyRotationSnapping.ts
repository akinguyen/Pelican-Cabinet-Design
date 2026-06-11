export const ASSEMBLY_ROTATION_SNAP_STEP_DEGREES = 45;
export const ASSEMBLY_ROTATION_SNAP_THRESHOLD_DEGREES = 5;

export type AssemblyRotationSnapResult = Readonly<{
  rotationDegrees: number;
  isSnappedToRotationStop: boolean;
}>;

export function snapAssemblyRotationDegrees(rotationDegrees: number): AssemblyRotationSnapResult {
  const normalizedDegrees = normalizeAssemblyRotationDegrees(rotationDegrees);
  const nearestStopDegrees =
    Math.round(normalizedDegrees / ASSEMBLY_ROTATION_SNAP_STEP_DEGREES) * ASSEMBLY_ROTATION_SNAP_STEP_DEGREES;
  const normalizedStopDegrees = normalizeAssemblyRotationDegrees(nearestStopDegrees);
  const distanceToStopDegrees = getSmallestAngleDistanceDegrees(normalizedDegrees, normalizedStopDegrees);

  if (distanceToStopDegrees <= ASSEMBLY_ROTATION_SNAP_THRESHOLD_DEGREES) {
    return {
      rotationDegrees: normalizedStopDegrees,
      isSnappedToRotationStop: true,
    };
  }

  return {
    rotationDegrees: normalizedDegrees,
    isSnappedToRotationStop: false,
  };
}

export function normalizeAssemblyRotationDegrees(rotationDegrees: number): number {
  return ((rotationDegrees % 360) + 360) % 360;
}

function getSmallestAngleDistanceDegrees(firstDegrees: number, secondDegrees: number): number {
  const differenceDegrees = Math.abs(normalizeAssemblyRotationDegrees(firstDegrees - secondDegrees));
  return Math.min(differenceDegrees, 360 - differenceDegrees);
}
