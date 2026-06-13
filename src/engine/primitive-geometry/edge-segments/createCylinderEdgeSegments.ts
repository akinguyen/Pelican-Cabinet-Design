import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveEdgeSegmentInches } from "./primitiveEdgeSegmentTypes";

const CYLINDER_RING_SEGMENT_COUNT = 32;
const CYLINDER_VERTICAL_EDGE_ANGLES_RADIANS = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2] as const;

export function createCylinderEdgeSegments(
  sizeInches: Size3DInches,
): readonly PrimitiveEdgeSegmentInches[] {
  const radiusInches = sizeInches.widthInches / 2;
  const halfDepthInches = sizeInches.depthInches / 2;
  const edgeSegments: PrimitiveEdgeSegmentInches[] = [];

  for (let index = 0; index < CYLINDER_RING_SEGMENT_COUNT; index += 1) {
    const startAngleRadians = (index / CYLINDER_RING_SEGMENT_COUNT) * Math.PI * 2;
    const endAngleRadians = ((index + 1) / CYLINDER_RING_SEGMENT_COUNT) * Math.PI * 2;

    edgeSegments.push(
      createRingSegment(radiusInches, halfDepthInches, startAngleRadians, endAngleRadians),
      createRingSegment(radiusInches, -halfDepthInches, startAngleRadians, endAngleRadians),
    );
  }

  CYLINDER_VERTICAL_EDGE_ANGLES_RADIANS.forEach((angleRadians) => {
    const xInches = Math.cos(angleRadians) * radiusInches;
    const zInches = Math.sin(angleRadians) * radiusInches;

    edgeSegments.push({
      startInches: { xInches, yInches: -halfDepthInches, zInches },
      endInches: { xInches, yInches: halfDepthInches, zInches },
    });
  });

  return edgeSegments;
}

function createRingSegment(
  radiusInches: number,
  yInches: number,
  startAngleRadians: number,
  endAngleRadians: number,
): PrimitiveEdgeSegmentInches {
  return {
    startInches: {
      xInches: Math.cos(startAngleRadians) * radiusInches,
      yInches,
      zInches: Math.sin(startAngleRadians) * radiusInches,
    },
    endInches: {
      xInches: Math.cos(endAngleRadians) * radiusInches,
      yInches,
      zInches: Math.sin(endAngleRadians) * radiusInches,
    },
  };
}
