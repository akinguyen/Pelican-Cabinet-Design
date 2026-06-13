import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveEdgeSegmentInches } from "./primitiveEdgeSegmentTypes";

export function createBoxEdgeSegments(
  sizeInches: Size3DInches,
): readonly PrimitiveEdgeSegmentInches[] {
  const halfWidthInches = sizeInches.widthInches / 2;
  const halfDepthInches = sizeInches.depthInches / 2;
  const halfHeightInches = sizeInches.heightInches / 2;

  const leftInches = -halfWidthInches;
  const rightInches = halfWidthInches;
  const backInches = -halfDepthInches;
  const frontInches = halfDepthInches;
  const bottomInches = -halfHeightInches;
  const topInches = halfHeightInches;

  return [
    createSegment(leftInches, backInches, topInches, rightInches, backInches, topInches),
    createSegment(rightInches, backInches, topInches, rightInches, frontInches, topInches),
    createSegment(rightInches, frontInches, topInches, leftInches, frontInches, topInches),
    createSegment(leftInches, frontInches, topInches, leftInches, backInches, topInches),

    createSegment(leftInches, backInches, bottomInches, rightInches, backInches, bottomInches),
    createSegment(rightInches, backInches, bottomInches, rightInches, frontInches, bottomInches),
    createSegment(rightInches, frontInches, bottomInches, leftInches, frontInches, bottomInches),
    createSegment(leftInches, frontInches, bottomInches, leftInches, backInches, bottomInches),

    createSegment(leftInches, backInches, bottomInches, leftInches, backInches, topInches),
    createSegment(rightInches, backInches, bottomInches, rightInches, backInches, topInches),
    createSegment(rightInches, frontInches, bottomInches, rightInches, frontInches, topInches),
    createSegment(leftInches, frontInches, bottomInches, leftInches, frontInches, topInches),
  ];
}

function createSegment(
  startXInches: number,
  startYInches: number,
  startZInches: number,
  endXInches: number,
  endYInches: number,
  endZInches: number,
): PrimitiveEdgeSegmentInches {
  return {
    startInches: {
      xInches: startXInches,
      yInches: startYInches,
      zInches: startZInches,
    },
    endInches: {
      xInches: endXInches,
      yInches: endYInches,
      zInches: endZInches,
    },
  };
}
