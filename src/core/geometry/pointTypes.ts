import { degreesToUserFacingZRadians } from "./rotationTypes";

export type Point3DInches = Readonly<{
  xInches: number;
  yInches: number;
  zInches: number;
}>;

export function addPoint3DInches(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
): Point3DInches {
  return {
    xInches: firstPointInches.xInches + secondPointInches.xInches,
    yInches: firstPointInches.yInches + secondPointInches.yInches,
    zInches: firstPointInches.zInches + secondPointInches.zInches,
  };
}

export function rotatePointAroundZInches(
  pointInches: Point3DInches,
  zDegrees: number,
): Point3DInches {
  const radians = degreesToUserFacingZRadians(zDegrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xInches: pointInches.xInches * cos - pointInches.yInches * sin,
    yInches: pointInches.xInches * sin + pointInches.yInches * cos,
    zInches: pointInches.zInches,
  };
}

export function getPoint3DDistanceInches(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
): number {
  return Math.hypot(
    firstPointInches.xInches - secondPointInches.xInches,
    firstPointInches.yInches - secondPointInches.yInches,
    firstPointInches.zInches - secondPointInches.zInches,
  );
}
