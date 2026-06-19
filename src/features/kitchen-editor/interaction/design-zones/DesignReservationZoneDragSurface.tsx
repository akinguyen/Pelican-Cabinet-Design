"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createAssemblyDragPointerWorldPoint } from "../assemblies/assemblyDragPointer";
import { createElevationDragSurfaceMatrix } from "../elevation/createElevationDragSurfaceMatrix";

const DESIGN_RESERVATION_ZONE_DRAG_SURFACE_SIZE_INCHES = 3200;

export function DesignReservationZoneDragSurface() {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const moveDrag = activeDrag?.kind === "design-reservation-zone-move" ? activeDrag : null;

  useEffect(() => {
    if (moveDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      useDesignSceneStore.getState().finishDesignReservationZoneDrag();
    }

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [moveDrag]);

  const elevationDragSurfaceMatrix = useMemo(
    () => moveDrag?.sceneViewMode === "elevation" && moveDrag.elevationMoveFrame !== undefined
      ? createElevationDragSurfaceMatrix(moveDrag.elevationMoveFrame)
      : null,
    [moveDrag],
  );

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (moveDrag === null) {
      return;
    }

    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      moveDrag.sceneViewMode,
      event.ray,
      moveDrag.dragStartBaseCenterPointInches.yInches,
      moveDrag.elevationMoveFrame,
    );

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().updateDesignReservationZoneDrag(pointerWorldInches);
  }, [moveDrag]);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useDesignSceneStore.getState().finishDesignReservationZoneDrag();
  }, []);

  if (moveDrag === null) {
    return null;
  }

  if (moveDrag.sceneViewMode === "elevation" && elevationDragSurfaceMatrix !== null) {
    return (
      <mesh
        matrix={elevationDragSurfaceMatrix}
        matrixAutoUpdate={false}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[DESIGN_RESERVATION_ZONE_DRAG_SURFACE_SIZE_INCHES, DESIGN_RESERVATION_ZONE_DRAG_SURFACE_SIZE_INCHES]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[DESIGN_RESERVATION_ZONE_DRAG_SURFACE_SIZE_INCHES, DESIGN_RESERVATION_ZONE_DRAG_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
