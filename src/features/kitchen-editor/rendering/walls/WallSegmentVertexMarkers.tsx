"use client";

import { memo, useMemo } from "react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const WALL_VERTEX_MARKER_RADIUS_INCHES = 1.4;
const WALL_VERTEX_MARKER_Z_OFFSET_INCHES = 0.9;
const WALL_VERTEX_MARKER_RENDER_ORDER = 120;

type WallSegmentVertexMarkersProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  radiusInches?: number;
}>;

export const WallSegmentVertexMarkers = memo(function WallSegmentVertexMarkers({
  segmentBody,
  radiusInches = WALL_VERTEX_MARKER_RADIUS_INCHES,
}: WallSegmentVertexMarkersProps) {
  const vertexPointsInches = useMemo(() => getWallSegmentVertexPoints(segmentBody), [segmentBody]);

  return (
    <group renderOrder={WALL_VERTEX_MARKER_RENDER_ORDER}>
      {vertexPointsInches.map((pointInches, vertexIndex) => (
        <mesh
          key={`wall-segment-vertex-${segmentBody.wallSegmentId}-${vertexIndex}`}
          position={[
            pointInches.xInches,
            pointInches.yInches,
            pointInches.zInches + WALL_VERTEX_MARKER_Z_OFFSET_INCHES,
          ]}
          renderOrder={WALL_VERTEX_MARKER_RENDER_ORDER}
        >
          <sphereGeometry args={[radiusInches, 12, 8]} />
          <meshBasicMaterial
            color={wallSegmentRenderColors.debugVertexFill}
            transparent
            opacity={0.78}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  );
});

function getWallSegmentVertexPoints(
  segmentBody: BuiltWallSegmentBody,
): readonly Point3DInches[] {
  return [
    segmentBody.start.sideAPointInches,
    segmentBody.start.centerPointInches,
    segmentBody.start.sideBPointInches,
    segmentBody.end.sideAPointInches,
    segmentBody.end.centerPointInches,
    segmentBody.end.sideBPointInches,
  ];
}
