import type { Point3DInches } from "@/core/geometry/pointTypes";

export type PlanDirection = Readonly<{
  xInches: number;
  yInches: number;
}>;

export const DEFAULT_PLAN_DIRECTION: PlanDirection = {
  xInches: 1,
  yInches: 0,
};

const NORMALIZED_DIRECTION_EPSILON_INCHES = 0.000001;

export function getPlanDistanceInches(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
): number {
  return Math.hypot(
    secondPointInches.xInches - firstPointInches.xInches,
    secondPointInches.yInches - firstPointInches.yInches,
  );
}

export function getNormalizedPlanDirection(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): PlanDirection | null {
  const deltaXInches = endPointInches.xInches - startPointInches.xInches;
  const deltaYInches = endPointInches.yInches - startPointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);

  if (lengthInches <= NORMALIZED_DIRECTION_EPSILON_INCHES) {
    return null;
  }

  return {
    xInches: deltaXInches / lengthInches,
    yInches: deltaYInches / lengthInches,
  };
}

export function getPlanMidpoint(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
): Point3DInches {
  return {
    xInches: (firstPointInches.xInches + secondPointInches.xInches) / 2,
    yInches: (firstPointInches.yInches + secondPointInches.yInches) / 2,
    zInches: (firstPointInches.zInches + secondPointInches.zInches) / 2,
  };
}

export function offsetPlanPoint(
  pointInches: Point3DInches,
  direction: PlanDirection,
  offsetInches: number,
  zInches = pointInches.zInches,
): Point3DInches {
  return {
    xInches: pointInches.xInches + direction.xInches * offsetInches,
    yInches: pointInches.yInches + direction.yInches * offsetInches,
    zInches,
  };
}

export function getPlanAngleDegrees(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): number {
  return (Math.atan2(
    endPointInches.yInches - startPointInches.yInches,
    endPointInches.xInches - startPointInches.xInches,
  ) * 180) / Math.PI;
}

export function getPlanDirectionAngleDegrees(direction: PlanDirection): number {
  return (Math.atan2(direction.yInches, direction.xInches) * 180) / Math.PI;
}

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function getReadablePlanLabelRotationDegrees(rotationDegrees: number): number {
  let normalizedDegrees = normalizeDegrees(rotationDegrees);

  if (normalizedDegrees > 90 && normalizedDegrees <= 270) {
    normalizedDegrees += 180;
  }

  normalizedDegrees = normalizeDegrees(normalizedDegrees);

  return normalizedDegrees > 180 ? normalizedDegrees - 360 : normalizedDegrees;
}

export function convertDegreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
