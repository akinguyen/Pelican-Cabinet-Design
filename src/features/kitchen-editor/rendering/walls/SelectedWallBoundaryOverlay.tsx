"use client";

import { Line } from "@react-three/drei";
import type { BuiltWall } from "@/engine/walls/footprint/wallFootprintTypes";
import { createFlatBoundaryEdgePoints } from "./wallRenderingGeometry";

const SELECTED_WALL_BOUNDARY_OVERLAY_Z_INCHES = 2.2;

export function SelectedWallBoundaryOverlay({ builtWall }: Readonly<{ builtWall: BuiltWall }>) {
  const boundaryEdgePoints = createFlatBoundaryEdgePoints({
    polygonInches: builtWall.footprint.boundaryPointsInches,
    zInches: SELECTED_WALL_BOUNDARY_OVERLAY_Z_INCHES,
  });
  const viewableEdgeIndexSet = new Set(builtWall.viewableEdgeIndices);

  return (
    <group renderOrder={50}>
      {boundaryEdgePoints.map((boundaryLinePoints, boundaryEdgeIndex) => (
        <Line
          key={`selected-wall-footprint-boundary-${builtWall.id}-${boundaryEdgeIndex}`}
          points={boundaryLinePoints}
          color={viewableEdgeIndexSet.has(boundaryEdgeIndex) ? "#dc2626" : "#020617"}
          lineWidth={4}
          depthTest={false}
          renderOrder={50}
        />
      ))}
    </group>
  );
}
