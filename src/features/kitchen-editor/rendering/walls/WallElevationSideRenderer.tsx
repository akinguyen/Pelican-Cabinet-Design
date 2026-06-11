"use client";

import { useMemo } from "react";
import { DoubleSide } from "three";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import { createBoxEdgeSegments } from "@/engine/primitive-geometry/edge-segments/createBoxEdgeSegments";
import type { PlacedWallElevationSide } from "@/engine/walls/elevation/wallElevationGeometry";
import { EdgeSegmentLines } from "../shared/EdgeSegmentLines";

const WALL_ELEVATION_SIDE_DEPTH_INCHES = 1;
const WALL_ELEVATION_SIDE_NORMAL_OFFSET_INCHES = 0.35;

export function WallElevationSideRenderer({
  activeElevationSide,
}: Readonly<{
  activeElevationSide: PlacedWallElevationSide;
}>) {
  const edgeAngleRadians = Math.atan2(
    activeElevationSide.endPointInches.yInches - activeElevationSide.startPointInches.yInches,
    activeElevationSide.endPointInches.xInches - activeElevationSide.startPointInches.xInches,
  );
  const wallElevationSideSizeInches: Size3DInches = {
    widthInches: activeElevationSide.lengthInches,
    depthInches: WALL_ELEVATION_SIDE_DEPTH_INCHES,
    heightInches: activeElevationSide.wallHeightInches,
  };
  const edgeSegmentsInches = useMemo(
    () => createBoxEdgeSegments(wallElevationSideSizeInches),
    [
      wallElevationSideSizeInches.widthInches,
      wallElevationSideSizeInches.depthInches,
      wallElevationSideSizeInches.heightInches,
    ],
  );

  return (
    <mesh
      position={[
        activeElevationSide.midpointInches.xInches +
          activeElevationSide.outwardNormalInches.xInches * WALL_ELEVATION_SIDE_NORMAL_OFFSET_INCHES,
        activeElevationSide.midpointInches.yInches +
          activeElevationSide.outwardNormalInches.yInches * WALL_ELEVATION_SIDE_NORMAL_OFFSET_INCHES,
        activeElevationSide.wallHeightInches / 2,
      ]}
      rotation={[0, 0, edgeAngleRadians]}
      renderOrder={4}
    >
      <boxGeometry
        args={[
          activeElevationSide.lengthInches,
          WALL_ELEVATION_SIDE_DEPTH_INCHES,
          activeElevationSide.wallHeightInches,
        ]}
      />
      <meshStandardMaterial color="#9ca3af" side={DoubleSide} />
      <EdgeSegmentLines edgeSegmentsInches={edgeSegmentsInches} />
    </mesh>
  );
}
