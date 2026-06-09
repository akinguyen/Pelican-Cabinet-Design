"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { DoubleSide } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { BuiltWall } from "@/engine/walls/footprint/wallFootprintTypes";
import { createExtrudedWallGeometry } from "./wallRenderingGeometry";
import { WallBoundaryEdges } from "./WallBoundaryEdges";

type WallMeshProps = Readonly<{
  builtWall: BuiltWall;
  isSelected: boolean;
  sceneViewMode: SceneViewMode;
}>;

export function WallMesh({ builtWall, isSelected, sceneViewMode }: WallMeshProps) {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const selectPlacedWall = useDesignSceneStore((state) => state.selectPlacedWall);
  const updateWallSplitDraftHover = useDesignSceneStore((state) => state.updateWallSplitDraftHover);
  const clickWallSplitDraftPoint = useDesignSceneStore((state) => state.clickWallSplitDraftPoint);
  const shouldShowBoundaryEdges = sceneViewMode === "floor-plan";
  const geometry = useMemo(
    () => createExtrudedWallGeometry(
      builtWall.footprint.boundaryPointsInches,
      builtWall.heightInches,
    ),
    [builtWall.footprint.boundaryPointsInches, builtWall.heightInches],
  );

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!canManuallyEditScene(workspaceMode) || activeToolbarTool !== "split-wall-footprint" || !isSelected) {
      return;
    }

    event.stopPropagation();
    updateWallSplitDraftHover({
      xInches: event.point.x,
      yInches: event.point.y,
      zInches: 0,
    });
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (event.button !== 0 || activeToolbarTool === "draw-wall-footprint") {
      return;
    }

    if (!canManuallyEditScene(workspaceMode)) {
      event.stopPropagation();
      selectPlacedWall(builtWall.placedWallId);
      return;
    }

    if (activeToolbarTool === "split-wall-footprint") {
      event.stopPropagation();

      if (!isSelected) {
        selectPlacedWall(builtWall.placedWallId);
        return;
      }

      clickWallSplitDraftPoint({
        xInches: event.point.x,
        yInches: event.point.y,
        zInches: 0,
      });
      return;
    }

    event.stopPropagation();
    selectPlacedWall(builtWall.placedWallId);
  }

  return (
    <group renderOrder={isSelected ? 10 : 1}>
      <mesh
        geometry={geometry}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        renderOrder={isSelected ? 10 : 1}
      >
        <meshStandardMaterial color={isSelected ? "#22d3ee" : "#cbd5e1"} side={DoubleSide} />
      </mesh>
      {shouldShowBoundaryEdges ? (
        <WallBoundaryEdges builtWall={builtWall} isSelected={isSelected} />
      ) : null}
    </group>
  );
}
