"use client";

import { memo, useMemo } from "react";
import { Line } from "@react-three/drei";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import { createWallSegmentBody3DEdges } from "@/engine/walls/wall3DGeometry";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const ACTIVE_WALL_SEGMENT_LINE_WIDTH_PIXELS = 2.5;
const ACTIVE_WALL_SEGMENT_RENDER_ORDER = 90;

export const WallSegmentActiveOverlay = memo(function WallSegmentActiveOverlay({
  segmentBody,
}: Readonly<{
  segmentBody: BuiltWallSegmentBody;
}>) {
  const wallBodyEdges = useMemo(
    () => createWallSegmentBody3DEdges(segmentBody).filter((edge) => edge.role === "bottom-footprint" || edge.role === "top-footprint" || edge.role === "vertical-corner"),
    [segmentBody],
  );

  return (
    <group renderOrder={ACTIVE_WALL_SEGMENT_RENDER_ORDER}>
      {wallBodyEdges.map((edge) => (
        <Line
          key={edge.id}
          points={[
            [edge.startPointInches.xInches, edge.startPointInches.yInches, edge.startPointInches.zInches],
            [edge.endPointInches.xInches, edge.endPointInches.yInches, edge.endPointInches.zInches],
          ]}
          color={wallSegmentRenderColors.activeStroke}
          lineWidth={ACTIVE_WALL_SEGMENT_LINE_WIDTH_PIXELS}
          depthTest={false}
          renderOrder={ACTIVE_WALL_SEGMENT_RENDER_ORDER}
        />
      ))}
    </group>
  );
});
