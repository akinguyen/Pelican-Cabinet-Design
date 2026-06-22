"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneEntityMoveDragState } from "@/engine/scene/sceneDragTypes";
import { createAssemblyDragPointerWorldPoint } from "../assemblies/assemblyDragPointer";
import { createElevationDragSurfaceMatrix } from "../elevation/createElevationDragSurfaceMatrix";

const DRAG_SURFACE_SIZE_INCHES = 3200;

export function SceneEntityMoveDragSurface() {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const moveDrag = activeDrag?.kind === "scene-entity-move" ? activeDrag : null;

  useEffect(() => {
    if (moveDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      useDesignSceneStore.getState().finishSceneEntityMoveDrag();
    }

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [moveDrag]);

  const elevationDragSurfaceMatrix = useMemo(
    () => moveDrag?.movementFrame.kind === "wall-face-plane" && moveDrag.movementFrame.elevationFrame !== undefined
      ? createElevationDragSurfaceMatrix(moveDrag.movementFrame.elevationFrame)
      : null,
    [moveDrag],
  );

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const drag = useDesignSceneStore.getState().activeDrag;

    if (drag?.kind !== "scene-entity-move") {
      return;
    }

    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      drag.movementFrame.kind === "wall-face-plane" ? "elevation" : "floor-plan",
      event.ray,
      getDragSurfaceReferenceYInches(drag),
      drag.movementFrame.elevationFrame,
    );

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().updateSceneEntityMoveDrag(pointerWorldInches);
  }, []);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useDesignSceneStore.getState().finishSceneEntityMoveDrag();
  }, []);

  if (moveDrag === null) {
    return null;
  }

  if (moveDrag.movementFrame.kind === "wall-face-plane" && elevationDragSurfaceMatrix !== null) {
    return (
      <mesh
        matrix={elevationDragSurfaceMatrix}
        matrixAutoUpdate={false}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[DRAG_SURFACE_SIZE_INCHES, DRAG_SURFACE_SIZE_INCHES]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[DRAG_SURFACE_SIZE_INCHES, DRAG_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function getDragSurfaceReferenceYInches(moveDrag: SceneEntityMoveDragState): number {
  const firstPosition = Object.values(moveDrag.dragStartWorldPositionsBySceneEntityKey)[0];
  return firstPosition?.yInches ?? moveDrag.dragStartPointerWorldInches.yInches;
}
