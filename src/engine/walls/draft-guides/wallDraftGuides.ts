import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallAngleGuide, WallReferenceGuides } from "./wallDraftGuideTypes";

export function createEmptyWallReferenceGuides(): WallReferenceGuides {
  return {
    horizontalGuide: null,
    verticalGuide: null,
  };
}

export function createWallAngleGuide(args: {
  activePointInches: Point3DInches;
  pointInches: Point3DInches;
  referenceDirectionDegrees: number;
}): WallAngleGuide | null {
  const directionDegrees = getDirectionDegrees(args.activePointInches, args.pointInches);

  if (directionDegrees === null) {
    return null;
  }

  const angleDegrees = Math.abs(normalizeAngleDegrees(directionDegrees - args.referenceDirectionDegrees));

  return {
    centerPointInches: args.activePointInches,
    angleDegrees,
    referenceDirectionDegrees: args.referenceDirectionDegrees,
    directionDegrees,
  };
}

export function getDirectionDegrees(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): number | null {
  const deltaXInches = endPointInches.xInches - startPointInches.xInches;
  const deltaYInches = endPointInches.yInches - startPointInches.yInches;

  if (Math.hypot(deltaXInches, deltaYInches) <= 0) {
    return null;
  }

  return (Math.atan2(deltaYInches, deltaXInches) * 180) / Math.PI;
}

export function normalizeAngleDegrees(angleDegrees: number): number {
  let normalizedAngleDegrees = angleDegrees;

  while (normalizedAngleDegrees > 180) {
    normalizedAngleDegrees -= 360;
  }

  while (normalizedAngleDegrees < -180) {
    normalizedAngleDegrees += 360;
  }

  return normalizedAngleDegrees;
}
