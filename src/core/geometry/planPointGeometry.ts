import type { Point3DInches } from "./pointTypes";

export function getPlanDistanceInches(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
): number {
  return Math.hypot(
    secondPointInches.xInches - firstPointInches.xInches,
    secondPointInches.yInches - firstPointInches.yInches,
  );
}

export function getPlanPointerAngleDegrees(
  centerPointInches: Point3DInches,
  pointerWorldInches: Point3DInches,
): number {
  return (
    Math.atan2(
      pointerWorldInches.yInches - centerPointInches.yInches,
      pointerWorldInches.xInches - centerPointInches.xInches,
    ) *
    180
  ) / Math.PI;
}
