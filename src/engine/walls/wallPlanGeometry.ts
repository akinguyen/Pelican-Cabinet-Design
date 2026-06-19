import type { Point3DInches } from "@/core/geometry/pointTypes";

export type WallPlanDirectionInches = Readonly<{
  xInches: number;
  yInches: number;
}>;

const DEFAULT_WALL_PLAN_POINT_EPSILON_INCHES = 0.000001;

export function projectWallPlanPointOntoDirection(args: {
  pointInches: Readonly<{ xInches: number; yInches: number }>;
  originInches: Readonly<{ xInches: number; yInches: number }>;
  directionInches: WallPlanDirectionInches;
}): number {
  return (
    (args.pointInches.xInches - args.originInches.xInches) * args.directionInches.xInches +
    (args.pointInches.yInches - args.originInches.yInches) * args.directionInches.yInches
  );
}

export function offsetWallPlanPoint(
  pointInches: Point3DInches,
  directionInches: WallPlanDirectionInches,
  distanceInches: number,
): Point3DInches {
  return {
    xInches: pointInches.xInches + directionInches.xInches * distanceInches,
    yInches: pointInches.yInches + directionInches.yInches * distanceInches,
    zInches: pointInches.zInches,
  };
}

export function getWallPlanCrossProduct(
  firstVectorInches: WallPlanDirectionInches,
  secondVectorInches: WallPlanDirectionInches,
): number {
  return firstVectorInches.xInches * secondVectorInches.yInches - firstVectorInches.yInches * secondVectorInches.xInches;
}

export function clampWallPlanNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function areWallPlanPointsEqual(
  firstPointInches: Readonly<{ xInches: number; yInches: number }>,
  secondPointInches: Readonly<{ xInches: number; yInches: number }>,
  epsilonInches = DEFAULT_WALL_PLAN_POINT_EPSILON_INCHES,
): boolean {
  return (
    Math.abs(firstPointInches.xInches - secondPointInches.xInches) <= epsilonInches &&
    Math.abs(firstPointInches.yInches - secondPointInches.yInches) <= epsilonInches
  );
}

export function addUniqueWallPlanPoint(
  pointsInches: Point3DInches[],
  pointInches: Point3DInches,
  epsilonInches = DEFAULT_WALL_PLAN_POINT_EPSILON_INCHES,
): void {
  if (pointsInches.some((existingPointInches) => areWallPlanPointsEqual(existingPointInches, pointInches, epsilonInches))) {
    return;
  }

  pointsInches.push({
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches: 0,
  });
}
