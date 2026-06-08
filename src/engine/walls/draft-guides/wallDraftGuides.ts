import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
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
  referencePointInches: Point3DInches | null;
}): WallAngleGuide | null {
  if (args.referencePointInches === null) {
    return null;
  }

  const referenceDirectionDegrees = getDirectionDegrees(args.activePointInches, args.referencePointInches);
  const previewDirectionDegrees = getDirectionDegrees(args.activePointInches, args.pointInches);

  if (referenceDirectionDegrees === null || previewDirectionDegrees === null) {
    return null;
  }

  const angleDegrees = Math.abs(normalizeAngleDegrees(previewDirectionDegrees - referenceDirectionDegrees));

  return {
    centerPointInches: args.activePointInches,
    referencePointInches: args.referencePointInches,
    previewPointInches: args.pointInches,
    angleDegrees,
    referenceDirectionDegrees,
    previewDirectionDegrees,
    referenceLengthInches: getPoint3DDistanceInches(args.activePointInches, args.referencePointInches),
    previewLengthInches: getPoint3DDistanceInches(args.activePointInches, args.pointInches),
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
