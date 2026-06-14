"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import { clampWallOpeningDraftPoint } from "@/engine/walls/openings/wallOpeningGeometry";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";
import { createWallOpeningFacePointFromRay } from "./wallOpeningPointerProjection";

const WALL_OPENING_SURFACE_OFFSET_INCHES = 0.2;

export function WallOpeningDraftSurface() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const startWallOpeningDraft = useDesignSceneStore((state) => state.startWallOpeningDraft);
  const updateWallOpeningDraft = useDesignSceneStore((state) => state.updateWallOpeningDraft);
  const commitWallOpeningDraft = useDesignSceneStore((state) => state.commitWallOpeningDraft);
  const setActiveCutoutDraftPointerTarget = useDesignSceneStore((state) => state.setActiveCutoutDraftPointerTarget);
  const selectedWallElevationTarget =
    activeSelection?.kind === "placed-wall-segment" &&
    activeWallElevationTarget !== null &&
    activeSelection.wallGraphId === activeWallElevationTarget.wallGraphId &&
    activeSelection.wallSegmentId === activeWallElevationTarget.wallSegmentId
      ? activeWallElevationTarget
      : null;
  const viewZone = useMemo(
    () => getWallElevationViewZoneForTarget({
      placedWallGraphs,
      activeWallElevationTarget: selectedWallElevationTarget,
    }),
    [selectedWallElevationTarget, placedWallGraphs],
  );
  const geometry = useMemo(
    () => viewZone === null ? null : createWallOpeningDraftSurfaceGeometry(viewZone),
    [viewZone],
  );

  if (
    !canManuallyEditScene(workspaceMode) ||
    activeSceneViewMode !== "elevation" ||
    activeToolbarTool !== "draw-rectangle-cutout" ||
    selectedWallElevationTarget === null ||
    viewZone === null ||
    geometry === null
  ) {
    return null;
  }

  function getFacePointInches(event: ThreeEvent<PointerEvent>) {
    if (viewZone === null) {
      return null;
    }

    const facePointInches = createWallOpeningFacePointFromRay(viewZone, event.ray);

    return facePointInches === null
      ? null
      : clampWallOpeningDraftPoint({
          facePointInches,
          faceLengthInches: viewZone.faceLengthInches,
          wallHeightInches: viewZone.wallHeightInches,
        });
  }

  function handlePointerOver() {
    setActiveCutoutDraftPointerTarget("wall-opening");
  }

  function handlePointerOut() {
    setActiveCutoutDraftPointerTarget(null);
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (event.button !== 0 || viewZone === null) {
      return;
    }

    const facePointInches = getFacePointInches(event);

    if (facePointInches === null) {
      return;
    }

    event.stopPropagation();
    setActiveCutoutDraftPointerTarget("wall-opening");
    event.target.setPointerCapture(event.pointerId);
    startWallOpeningDraft({
      wallGraphId: viewZone.wallGraphId,
      wallSegmentId: viewZone.wallSegmentId,
      faceSide: viewZone.faceSide,
      startFacePointInches: facePointInches,
    });
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (activeSceneOperation?.kind !== "wall-opening-draft") {
      return;
    }

    const facePointInches = getFacePointInches(event);

    if (facePointInches === null) {
      return;
    }

    event.stopPropagation();
    updateWallOpeningDraft(facePointInches);
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    if (activeSceneOperation?.kind !== "wall-opening-draft") {
      return;
    }

    event.stopPropagation();
    setActiveCutoutDraftPointerTarget(null);
    event.target.releasePointerCapture(event.pointerId);
    commitWallOpeningDraft();
  }

  return (
    <mesh
      geometry={geometry}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      renderOrder={70}
    >
      <meshBasicMaterial
        transparent
        opacity={0}
        side={DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function createWallOpeningDraftSurfaceGeometry(
  viewZone: WallElevationViewZone,
): BufferGeometry {
  const bottomStartPointInches = offsetFacePoint(viewZone, viewZone.faceStartInches, 0);
  const bottomEndPointInches = offsetFacePoint(viewZone, viewZone.faceEndInches, 0);
  const topEndPointInches = offsetFacePoint(viewZone, viewZone.faceEndInches, viewZone.wallHeightInches);
  const topStartPointInches = offsetFacePoint(viewZone, viewZone.faceStartInches, viewZone.wallHeightInches);
  const positions = new Float32Array([
    bottomStartPointInches.xInches,
    bottomStartPointInches.yInches,
    bottomStartPointInches.zInches,
    bottomEndPointInches.xInches,
    bottomEndPointInches.yInches,
    bottomEndPointInches.zInches,
    topEndPointInches.xInches,
    topEndPointInches.yInches,
    topEndPointInches.zInches,
    bottomStartPointInches.xInches,
    bottomStartPointInches.yInches,
    bottomStartPointInches.zInches,
    topEndPointInches.xInches,
    topEndPointInches.yInches,
    topEndPointInches.zInches,
    topStartPointInches.xInches,
    topStartPointInches.yInches,
    topStartPointInches.zInches,
  ]);
  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();

  return geometry;
}

function offsetFacePoint(
  viewZone: WallElevationViewZone,
  pointInches: WallElevationViewZone["faceStartInches"],
  zInches: number,
) {
  return {
    xInches:
      pointInches.xInches +
      viewZone.outwardDirectionInches.xInches * WALL_OPENING_SURFACE_OFFSET_INCHES,
    yInches:
      pointInches.yInches +
      viewZone.outwardDirectionInches.yInches * WALL_OPENING_SURFACE_OFFSET_INCHES,
    zInches,
  };
}
