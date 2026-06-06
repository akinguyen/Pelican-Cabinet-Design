"use client";

import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { DoubleSide } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { BuiltWall } from "@/engine/walls/footprint/wallFootprintTypes";
import {
  createExtrudedWallGeometry,
  createTopBoundaryEdgePoints,
} from "./wallRenderingGeometry";

type WallMeshProps = Readonly<{
  builtWall: BuiltWall;
  isSelected: boolean;
}>;

export function WallMesh({ builtWall, isSelected }: WallMeshProps) {
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const selectPlacedWall = useDesignSceneStore((state) => state.selectPlacedWall);
  const geometry = useMemo(
    () => createExtrudedWallGeometry(
      builtWall.footprint.boundaryPointsInches,
      builtWall.heightInches,
    ),
    [builtWall.footprint.boundaryPointsInches, builtWall.heightInches],
  );
  const boundaryEdgePoints = createTopBoundaryEdgePoints({
    polygonInches: builtWall.footprint.boundaryPointsInches,
    heightInches: builtWall.heightInches,
  });

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (activeToolbarTool === "draw-wall-footprint" || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    selectPlacedWall(builtWall.placedWallId);
  }

  return (
    <group renderOrder={isSelected ? 10 : 1}>
      <mesh geometry={geometry} onPointerDown={handlePointerDown} renderOrder={isSelected ? 10 : 1}>
        <meshStandardMaterial
          color={isSelected ? "#22d3ee" : "#9ca3af"}
          opacity={isSelected ? 0.88 : 0.82}
          transparent
          side={DoubleSide}
        />
      </mesh>
      {boundaryEdgePoints.map((boundaryLinePoints, boundaryEdgeIndex) => (
        <Line
          key={`wall-footprint-boundary-${builtWall.id}-${boundaryEdgeIndex}`}
          points={boundaryLinePoints}
          color="#020617"
          lineWidth={2}
          renderOrder={isSelected ? 11 : 2}
        />
      ))}
    </group>
  );
}
