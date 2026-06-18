"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useMemo } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createAssemblyDragPointerWorldPoint } from "../assemblies/assemblyDragPointer";
import { createDesignReservationZoneElevationDragSurfaceMatrix } from "./designReservationZoneDragPlane";
import { createDesignReservationZoneElevationMoveFrame } from "./designReservationZoneElevationFrame";

const DESIGN_RESERVATION_ZONE_PLACEMENT_SURFACE_SIZE_INCHES = 3200;

export function DesignReservationZonePlacementSurface() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeSceneOperationKind = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind ?? null);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const isPlacementToolActive = activeToolbarTool === "draw-design-reservation-zone" && activeSceneOperationKind === "design-reservation-zone-placement";
  const elevationMoveFrame = useMemo(() => activeSceneViewMode === "elevation"
    ? createDesignReservationZoneElevationMoveFrame({
        placedWallGraphs,
        activeWallElevationTarget,
      })
    : undefined, [activeSceneViewMode, activeWallElevationTarget, placedWallGraphs]);
  const elevationPlacementSurfaceMatrix = useMemo(
    () => activeSceneViewMode === "elevation" && elevationMoveFrame !== undefined
      ? createDesignReservationZoneElevationDragSurfaceMatrix(elevationMoveFrame)
      : null,
    [activeSceneViewMode, elevationMoveFrame],
  );

  const createPointerWorldPoint = useCallback((event: ThreeEvent<PointerEvent>) => (
    createAssemblyDragPointerWorldPoint(
      activeSceneViewMode,
      event.ray,
      0,
      elevationMoveFrame,
    )
  ), [activeSceneViewMode, elevationMoveFrame]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!isPlacementToolActive) {
      return;
    }

    const pointerWorldInches = createPointerWorldPoint(event);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().updateDesignReservationZonePlacementCandidate(
      pointerWorldInches,
      activeSceneViewMode,
      elevationMoveFrame,
    );
  }, [activeSceneViewMode, createPointerWorldPoint, elevationMoveFrame, isPlacementToolActive]);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!isPlacementToolActive) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().commitDesignReservationZonePlacementCandidate();
  }, [isPlacementToolActive]);

  if (!isPlacementToolActive || (activeSceneViewMode === "elevation" && elevationPlacementSurfaceMatrix === null)) {
    return null;
  }

  if (activeSceneViewMode === "elevation" && elevationPlacementSurfaceMatrix !== null) {
    return (
      <mesh
        matrix={elevationPlacementSurfaceMatrix}
        matrixAutoUpdate={false}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[DESIGN_RESERVATION_ZONE_PLACEMENT_SURFACE_SIZE_INCHES, DESIGN_RESERVATION_ZONE_PLACEMENT_SURFACE_SIZE_INCHES]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onClick={handleClick}>
      <planeGeometry args={[DESIGN_RESERVATION_ZONE_PLACEMENT_SURFACE_SIZE_INCHES, DESIGN_RESERVATION_ZONE_PLACEMENT_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
