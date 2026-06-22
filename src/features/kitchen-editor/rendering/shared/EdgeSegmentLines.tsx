"use client";

import { memo, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import type { PrimitiveEdgeSegmentInches } from "@/engine/primitive-geometry/edge-segments/primitiveEdgeSegmentTypes";
import { useDisposableGeometry } from "./useDisposableGeometry";

const DEFAULT_EDGE_LINE_COLOR_HEX = "#111827";
const DEFAULT_EDGE_LINE_WIDTH_PIXELS = 2;

type EdgeSegmentLinesProps = Readonly<{
  edgeSegmentsInches: readonly PrimitiveEdgeSegmentInches[];
  colorHex?: string;
  lineWidthPixels?: number;
  depthTest?: boolean;
  depthWrite?: boolean;
  renderOrder?: number;
}>;

export const EdgeSegmentLines = memo(function EdgeSegmentLines({
  edgeSegmentsInches,
  colorHex = DEFAULT_EDGE_LINE_COLOR_HEX,
  lineWidthPixels = DEFAULT_EDGE_LINE_WIDTH_PIXELS,
  depthTest = true,
  depthWrite = true,
  renderOrder,
}: EdgeSegmentLinesProps) {
  const edgeGeometry = useMemo(() => {
    const coordinates = new Float32Array(edgeSegmentsInches.length * 6);

    edgeSegmentsInches.forEach((edgeSegmentInches, edgeSegmentIndex) => {
      const coordinateIndex = edgeSegmentIndex * 6;
      coordinates[coordinateIndex] = edgeSegmentInches.startInches.xInches;
      coordinates[coordinateIndex + 1] = edgeSegmentInches.startInches.yInches;
      coordinates[coordinateIndex + 2] = edgeSegmentInches.startInches.zInches;
      coordinates[coordinateIndex + 3] = edgeSegmentInches.endInches.xInches;
      coordinates[coordinateIndex + 4] = edgeSegmentInches.endInches.yInches;
      coordinates[coordinateIndex + 5] = edgeSegmentInches.endInches.zInches;
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(coordinates, 3));
    geometry.computeBoundingSphere();

    return geometry;
  }, [edgeSegmentsInches]);

  useDisposableGeometry(edgeGeometry);

  if (edgeSegmentsInches.length === 0) {
    return null;
  }

  return (
    <lineSegments geometry={edgeGeometry} renderOrder={renderOrder} raycast={() => undefined}>
      <lineBasicMaterial
        color={colorHex}
        linewidth={lineWidthPixels}
        depthTest={depthTest}
        depthWrite={depthWrite}
        toneMapped={false}
      />
    </lineSegments>
  );
});
