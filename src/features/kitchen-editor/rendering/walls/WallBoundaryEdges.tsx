"use client";

import { Line } from "@react-three/drei";
import type { BuiltWall } from "@/engine/walls/footprint/wallFootprintTypes";
import {
  createTopBoundaryEdgePoints,
  createVerticalBoundaryEdgePoints,
  WALL_TOP_BOUNDARY_RENDER_OFFSET_INCHES,
} from "./wallRenderingGeometry";

const WALL_BOUNDARY_LINE_COLOR_HEX = "#020617";
const WALL_BOUNDARY_LINE_WIDTH_PIXELS = 2;
const WALL_BOUNDARY_RENDER_ORDER_OFFSET = 40;

type WallBoundaryEdgesProps = Readonly<{
  builtWall: BuiltWall;
  isSelected: boolean;
}>;

export function WallBoundaryEdges({ builtWall, isSelected }: WallBoundaryEdgesProps) {
  const topBoundaryEdgePoints = createTopBoundaryEdgePoints({
    polygonInches: builtWall.footprint.boundaryPointsInches,
    heightInches: builtWall.heightInches,
  });
  const verticalBoundaryEdgePoints = createVerticalBoundaryEdgePoints({
    polygonInches: builtWall.footprint.boundaryPointsInches,
    bottomZInches: 0,
    topZInches: builtWall.heightInches + WALL_TOP_BOUNDARY_RENDER_OFFSET_INCHES,
  });
  const renderOrder = (isSelected ? 11 : 2) + WALL_BOUNDARY_RENDER_ORDER_OFFSET;

  return (
    <group renderOrder={renderOrder}>
      {[...topBoundaryEdgePoints, ...verticalBoundaryEdgePoints].map(
        (boundaryLinePoints, boundaryEdgeIndex) => (
          <Line
            key={`wall-boundary-edge-${builtWall.id}-${boundaryEdgeIndex}`}
            points={boundaryLinePoints}
            color={WALL_BOUNDARY_LINE_COLOR_HEX}
            lineWidth={WALL_BOUNDARY_LINE_WIDTH_PIXELS}
            depthTest={false}
            renderOrder={renderOrder}
          />
        ),
      )}
    </group>
  );
}
