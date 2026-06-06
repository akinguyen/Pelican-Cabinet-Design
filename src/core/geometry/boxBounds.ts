import type { Point3DInches } from "./pointTypes";
import { rotatePointAroundZInches } from "./pointTypes";
import type { Size3DInches } from "./sizeTypes";

export type Bounds3DInches = Readonly<{
  minInches: Point3DInches;
  maxInches: Point3DInches;
}>;

export function createEmptyBounds3DInches(): Bounds3DInches {
  return {
    minInches: {
      xInches: Number.POSITIVE_INFINITY,
      yInches: Number.POSITIVE_INFINITY,
      zInches: Number.POSITIVE_INFINITY,
    },
    maxInches: {
      xInches: Number.NEGATIVE_INFINITY,
      yInches: Number.NEGATIVE_INFINITY,
      zInches: Number.NEGATIVE_INFINITY,
    },
  };
}

export function hasBounds3DInches(boundsInches: Bounds3DInches): boolean {
  return (
    Number.isFinite(boundsInches.minInches.xInches) &&
    Number.isFinite(boundsInches.minInches.yInches) &&
    Number.isFinite(boundsInches.minInches.zInches) &&
    Number.isFinite(boundsInches.maxInches.xInches) &&
    Number.isFinite(boundsInches.maxInches.yInches) &&
    Number.isFinite(boundsInches.maxInches.zInches)
  );
}

export function expandBoundsToIncludePoint(
  boundsInches: Bounds3DInches,
  pointInches: Point3DInches,
): Bounds3DInches {
  return {
    minInches: {
      xInches: Math.min(boundsInches.minInches.xInches, pointInches.xInches),
      yInches: Math.min(boundsInches.minInches.yInches, pointInches.yInches),
      zInches: Math.min(boundsInches.minInches.zInches, pointInches.zInches),
    },
    maxInches: {
      xInches: Math.max(boundsInches.maxInches.xInches, pointInches.xInches),
      yInches: Math.max(boundsInches.maxInches.yInches, pointInches.yInches),
      zInches: Math.max(boundsInches.maxInches.zInches, pointInches.zInches),
    },
  };
}

export function mergeBounds3DInches(
  firstBoundsInches: Bounds3DInches,
  secondBoundsInches: Bounds3DInches,
): Bounds3DInches {
  if (!hasBounds3DInches(firstBoundsInches)) {
    return secondBoundsInches;
  }

  if (!hasBounds3DInches(secondBoundsInches)) {
    return firstBoundsInches;
  }

  return {
    minInches: {
      xInches: Math.min(firstBoundsInches.minInches.xInches, secondBoundsInches.minInches.xInches),
      yInches: Math.min(firstBoundsInches.minInches.yInches, secondBoundsInches.minInches.yInches),
      zInches: Math.min(firstBoundsInches.minInches.zInches, secondBoundsInches.minInches.zInches),
    },
    maxInches: {
      xInches: Math.max(firstBoundsInches.maxInches.xInches, secondBoundsInches.maxInches.xInches),
      yInches: Math.max(firstBoundsInches.maxInches.yInches, secondBoundsInches.maxInches.yInches),
      zInches: Math.max(firstBoundsInches.maxInches.zInches, secondBoundsInches.maxInches.zInches),
    },
  };
}

export function measureRotatedBoxBoundsInches(
  centerInches: Point3DInches,
  sizeInches: Size3DInches,
  zDegrees: number,
): Bounds3DInches {
  const halfWidthInches = sizeInches.widthInches / 2;
  const halfDepthInches = sizeInches.depthInches / 2;
  const halfHeightInches = sizeInches.heightInches / 2;

  const localCornersInches: Point3DInches[] = [
    { xInches: -halfWidthInches, yInches: -halfDepthInches, zInches: -halfHeightInches },
    { xInches: halfWidthInches, yInches: -halfDepthInches, zInches: -halfHeightInches },
    { xInches: halfWidthInches, yInches: halfDepthInches, zInches: -halfHeightInches },
    { xInches: -halfWidthInches, yInches: halfDepthInches, zInches: -halfHeightInches },
    { xInches: -halfWidthInches, yInches: -halfDepthInches, zInches: halfHeightInches },
    { xInches: halfWidthInches, yInches: -halfDepthInches, zInches: halfHeightInches },
    { xInches: halfWidthInches, yInches: halfDepthInches, zInches: halfHeightInches },
    { xInches: -halfWidthInches, yInches: halfDepthInches, zInches: halfHeightInches },
  ];

  return localCornersInches.reduce((boundsInches, localCornerInches) => {
    const rotatedCornerInches = rotatePointAroundZInches(localCornerInches, zDegrees);
    return expandBoundsToIncludePoint(boundsInches, {
      xInches: centerInches.xInches + rotatedCornerInches.xInches,
      yInches: centerInches.yInches + rotatedCornerInches.yInches,
      zInches: centerInches.zInches + rotatedCornerInches.zInches,
    });
  }, createEmptyBounds3DInches());
}

export function combineBounds3DInches(
  firstBoundsInches: Bounds3DInches | null,
  secondBoundsInches: Bounds3DInches | null,
): Bounds3DInches | null {
  if (firstBoundsInches === null) {
    return secondBoundsInches;
  }

  if (secondBoundsInches === null) {
    return firstBoundsInches;
  }

  return mergeBounds3DInches(firstBoundsInches, secondBoundsInches);
}
