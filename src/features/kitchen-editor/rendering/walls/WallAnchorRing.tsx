"use client";

import { memo } from "react";
import { DoubleSide } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

export const WALL_ANCHOR_RING_INNER_RADIUS_INCHES = 4.2;
export const WALL_ANCHOR_RING_OUTER_RADIUS_INCHES = 5.1;

const WALL_ANCHOR_RING_Z_OFFSET_INCHES = 1.35;
const WALL_ANCHOR_RING_RENDER_ORDER = 140;

export const WallAnchorRing = memo(function WallAnchorRing({
  pointInches,
}: Readonly<{
  pointInches: Point3DInches;
}>) {
  return (
    <mesh
      position={[
        pointInches.xInches,
        pointInches.yInches,
        pointInches.zInches + WALL_ANCHOR_RING_Z_OFFSET_INCHES,
      ]}
      renderOrder={WALL_ANCHOR_RING_RENDER_ORDER}
    >
      <ringGeometry
        args={[
          WALL_ANCHOR_RING_INNER_RADIUS_INCHES,
          WALL_ANCHOR_RING_OUTER_RADIUS_INCHES,
          32,
        ]}
      />
      <meshBasicMaterial
        color={wallSegmentRenderColors.activeEndpointRingStroke}
        transparent
        opacity={0.95}
        depthTest={false}
        side={DoubleSide}
      />
    </mesh>
  );
});
