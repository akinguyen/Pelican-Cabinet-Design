"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { DoubleSide } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { BuiltWall } from "@/engine/walls/footprint/wallFootprintTypes";
import { createExtrudedWallGeometry } from "./wallRenderingGeometry";
import { WallBoundaryEdges } from "./WallBoundaryEdges";

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
        <meshStandardMaterial color={isSelected ? "#22d3ee" : "#9ca3af"} side={DoubleSide} />
      </mesh>
      <WallBoundaryEdges builtWall={builtWall} isSelected={isSelected} />
    </group>
  );
}
