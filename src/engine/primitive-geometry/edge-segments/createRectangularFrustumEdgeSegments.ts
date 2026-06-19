import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveRectangularFrustumGeometry } from "../primitiveGeometryTypes";
import { createPrimitiveEdgeLoopSegments, type PrimitiveEdgeSegmentInches } from "./primitiveEdgeSegmentTypes";

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

  const bottomPoints: readonly Point3DInches[] = [
    { xInches: -bottomHalfWidthInches, yInches: -bottomHalfDepthInches, zInches: bottomZInches },
    { xInches: bottomHalfWidthInches, yInches: -bottomHalfDepthInches, zInches: bottomZInches },
    { xInches: bottomHalfWidthInches, yInches: bottomHalfDepthInches, zInches: bottomZInches },
    { xInches: -bottomHalfWidthInches, yInches: bottomHalfDepthInches, zInches: bottomZInches },
  ];
  const topPoints: readonly Point3DInches[] = [
    { xInches: -topHalfWidthInches, yInches: -topHalfDepthInches, zInches: topZInches },
    { xInches: topHalfWidthInches, yInches: -topHalfDepthInches, zInches: topZInches },
    { xInches: topHalfWidthInches, yInches: topHalfDepthInches, zInches: topZInches },
    { xInches: -topHalfWidthInches, yInches: topHalfDepthInches, zInches: topZInches },
  ];

  return [
    ...createPrimitiveEdgeLoopSegments(bottomPoints),
    ...createPrimitiveEdgeLoopSegments(topPoints),
    ...bottomPoints.map((bottomPointInches, pointIndex) => ({
      startInches: bottomPointInches,
      endInches: topPoints[pointIndex],
    })),
  ];
}
