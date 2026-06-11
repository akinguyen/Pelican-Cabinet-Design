import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveRectangularFrustumGeometry } from "../primitiveGeometryTypes";
import type { PrimitiveEdgeSegmentInches } from "./primitiveEdgeSegmentTypes";

export function createRectangularFrustumEdgeSegments(args: {
  geometry: PrimitiveRectangularFrustumGeometry;
  sizeInches: Size3DInches;
}): readonly PrimitiveEdgeSegmentInches[] {
  const bottomHalfWidthInches = args.sizeInches.widthInches / 2;
  const bottomHalfDepthInches = args.sizeInches.depthInches / 2;
  const topHalfWidthInches = (args.sizeInches.widthInches * args.geometry.topWidthRatio) / 2;
  const topHalfDepthInches = (args.sizeInches.depthInches * args.geometry.topDepthRatio) / 2;
  const bottomZInches = -args.sizeInches.heightInches / 2;
  const topZInches = args.sizeInches.heightInches / 2;

  const bottomPoints = [
    { xInches: -bottomHalfWidthInches, yInches: -bottomHalfDepthInches, zInches: bottomZInches },
    { xInches: bottomHalfWidthInches, yInches: -bottomHalfDepthInches, zInches: bottomZInches },
    { xInches: bottomHalfWidthInches, yInches: bottomHalfDepthInches, zInches: bottomZInches },
    { xInches: -bottomHalfWidthInches, yInches: bottomHalfDepthInches, zInches: bottomZInches },
  ];
  const topPoints = [
    { xInches: -topHalfWidthInches, yInches: -topHalfDepthInches, zInches: topZInches },
    { xInches: topHalfWidthInches, yInches: -topHalfDepthInches, zInches: topZInches },
    { xInches: topHalfWidthInches, yInches: topHalfDepthInches, zInches: topZInches },
    { xInches: -topHalfWidthInches, yInches: topHalfDepthInches, zInches: topZInches },
  ];

  return [
    ...createLoopSegments(bottomPoints),
    ...createLoopSegments(topPoints),
    ...bottomPoints.map((bottomPointInches, pointIndex) => ({
      startInches: bottomPointInches,
      endInches: topPoints[pointIndex],
    })),
  ];
}

function createLoopSegments(
  loopInches: readonly Readonly<{ xInches: number; yInches: number; zInches: number }>[],
): readonly PrimitiveEdgeSegmentInches[] {
  return loopInches.map((startInches, pointIndex) => ({
    startInches,
    endInches: loopInches[(pointIndex + 1) % loopInches.length],
  }));
}
