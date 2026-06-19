"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
import { createSceneEntitySelectionKey } from "@/engine/scene/sceneSelectionTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneEntityMultiMoveDragState } from "@/engine/scene/sceneDragTypes";
import { createAssemblyDragPointerWorldPoint } from "../assemblies/assemblyDragPointer";
import { createElevationDragSurfaceMatrix } from "../elevation/createElevationDragSurfaceMatrix";

const SCENE_ENTITY_MULTI_DRAG_SURFACE_SIZE_INCHES = 3200;

export function SceneEntityMultiDragSurface() {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const moveDrag = activeDrag?.kind === "scene-entity-multi-move" ? activeDrag : null;

  useEffect(() => {
    if (moveDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      useDesignSceneStore.getState().finishSceneEntityMultiDrag();
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
      getDragSurfaceReferenceYInches(moveDrag),
      moveDrag.elevationMoveFrame,
    );

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().updateSceneEntityMultiDrag(pointerWorldInches);
  }, [moveDrag]);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useDesignSceneStore.getState().finishSceneEntityMultiDrag();
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
        <planeGeometry args={[SCENE_ENTITY_MULTI_DRAG_SURFACE_SIZE_INCHES, SCENE_ENTITY_MULTI_DRAG_SURFACE_SIZE_INCHES]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[SCENE_ENTITY_MULTI_DRAG_SURFACE_SIZE_INCHES, SCENE_ENTITY_MULTI_DRAG_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function getDragSurfaceReferenceYInches(moveDrag: SceneEntityMultiMoveDragState): number {
  return moveDrag.dragStartPositionsBySceneEntityKey[createSceneEntitySelectionKey(moveDrag.leaderSceneEntity)]?.yInches ?? 0;
}
