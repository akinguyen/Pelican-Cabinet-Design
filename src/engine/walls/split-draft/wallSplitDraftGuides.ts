import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import type { WallReferenceGuides } from "../draft-guides/wallDraftGuideTypes";

const WALL_SPLIT_REFERENCE_SNAP_THRESHOLD_INCHES = 2.5;

export function createWallSplitReferenceGuides(args: {
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  targetWall: PlacedWall;
}): WallReferenceGuides {
  let horizontalGuide: number | null = null;
  let verticalGuide: number | null = null;
  let bestDistanceInches = Number.POSITIVE_INFINITY;

  [args.startPointInches, ...args.targetWall.footprint.boundaryPointsInches].forEach((pointInches) => {
    const deltaXInches = Math.abs(args.endPointInches.xInches - pointInches.xInches);
    const deltaYInches = Math.abs(args.endPointInches.yInches - pointInches.yInches);

    if (
      deltaXInches <= WALL_SPLIT_REFERENCE_SNAP_THRESHOLD_INCHES &&
      deltaXInches < bestDistanceInches
    ) {
      bestDistanceInches = deltaXInches;
      verticalGuide = pointInches.xInches;
      horizontalGuide = null;
    }

    if (
      deltaYInches <= WALL_SPLIT_REFERENCE_SNAP_THRESHOLD_INCHES &&
      deltaYInches < bestDistanceInches
    ) {
      bestDistanceInches = deltaYInches;
      horizontalGuide = pointInches.yInches;
      verticalGuide = null;
    }
  });

  return {
    horizontalGuide,
    verticalGuide,
  };
}
