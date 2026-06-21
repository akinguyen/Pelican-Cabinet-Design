"use client";

import { useCallback, useEffect } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

const ROTATION_SURFACE_SIZE_INCHES = 3200;

export function SceneEntityRotationSurface() {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const isRotationDragActive = activeDrag?.kind === "scene-entity-rotation";

  useEffect(() => {
    if (!isRotationDragActive) return;

    function handleWindowPointerUp() {
      useDesignSceneStore.getState().finishSceneEntityRotationDrag();
    }

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [isRotationDragActive]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const drag = useDesignSceneStore.getState().activeDrag;
    if (drag?.kind !== "scene-entity-rotation") return;

    event.stopPropagation();
    useDesignSceneStore.getState().updateSceneEntityRotationDrag({
      xInches: event.point.x,
      yInches: event.point.y,
      zInches: 0,
    });
  }, []);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useDesignSceneStore.getState().finishSceneEntityRotationDrag();
  }, []);

  if (!isRotationDragActive) return null;

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[ROTATION_SURFACE_SIZE_INCHES, ROTATION_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
