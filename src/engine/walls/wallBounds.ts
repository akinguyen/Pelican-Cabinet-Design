import type { Bounds3DInches } from "@/core/geometry/boxBounds";
import type { PlacedWall } from "./wallTypes";

export function measurePlacedWallsBounds(
  placedWalls: readonly PlacedWall[],
): Bounds3DInches | null {
  if (placedWalls.length === 0) {
    return null;
  }

  let minXInches = Number.POSITIVE_INFINITY;
  let minYInches = Number.POSITIVE_INFINITY;
  let maxXInches = Number.NEGATIVE_INFINITY;
  let maxYInches = Number.NEGATIVE_INFINITY;
  let maxZInches = Number.NEGATIVE_INFINITY;

  placedWalls.forEach((placedWall) => {
    placedWall.footprint.boundaryPointsInches.forEach((pointInches) => {
      minXInches = Math.min(minXInches, pointInches.xInches);
      minYInches = Math.min(minYInches, pointInches.yInches);
      maxXInches = Math.max(maxXInches, pointInches.xInches);
      maxYInches = Math.max(maxYInches, pointInches.yInches);
    });
    maxZInches = Math.max(maxZInches, placedWall.heightInches);
  });

  return {
    minInches: {
      xInches: minXInches,
      yInches: minYInches,
      zInches: 0,
    },
    maxInches: {
      xInches: maxXInches,
      yInches: maxYInches,
      zInches: Math.max(maxZInches, 0),
    },
  };
}
