"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
import { Matrix4, Vector3 } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { AssemblyElevationMoveFrame } from "@/engine/scene/sceneDragTypes";
import { createAssemblyDragPointerWorldPoint } from "./assemblyDragPointer";

const DRAG_SURFACE_SIZE_INCHES = 3200;

export function AssemblyDragSurface() {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const moveDrag = activeDrag?.kind === "assembly-move" ? activeDrag : null;

  useEffect(() => {
    if (moveDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      useDesignSceneStore.getState().finishAssemblyDrag();
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

    event.stopPropagation();
    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      moveDrag.sceneViewMode,
      event.ray,
      moveDrag.dragStartWorldPositionInches.yInches,
      moveDrag.elevationMoveFrame,
    );

    if (pointerWorldInches !== null) {
      useDesignSceneStore.getState().updateAssemblyDrag(pointerWorldInches);
    }
  }, [moveDrag]);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useDesignSceneStore.getState().finishAssemblyDrag();
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

function createElevationDragSurfaceMatrix(
  elevationMoveFrame: AssemblyElevationMoveFrame,
): Matrix4 {
  const xAxis = new Vector3(
    elevationMoveFrame.faceDirectionInches.xInches,
    elevationMoveFrame.faceDirectionInches.yInches,
    elevationMoveFrame.faceDirectionInches.zInches,
  ).normalize();
  const yAxis = new Vector3(0, 0, 1);
  const zAxis = new Vector3(
    elevationMoveFrame.outwardDirectionInches.xInches,
    elevationMoveFrame.outwardDirectionInches.yInches,
    elevationMoveFrame.outwardDirectionInches.zInches,
  ).normalize();
  const origin = new Vector3(
    elevationMoveFrame.planeOriginInches.xInches,
    elevationMoveFrame.planeOriginInches.yInches,
    elevationMoveFrame.planeOriginInches.zInches,
  );

  return new Matrix4().makeBasis(xAxis, yAxis, zAxis).setPosition(origin);
}
