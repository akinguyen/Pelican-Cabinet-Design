"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

const ROTATION_SURFACE_SIZE_INCHES = 3200;

export function AssemblyRotationSurface() {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const rotationDrag = activeDrag?.kind === "assembly-rotation" ? activeDrag : null;

  useEffect(() => {
    if (rotationDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      useDesignSceneStore.getState().finishAssemblyRotationDrag();
    }

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [rotationDrag]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (rotationDrag === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().updateAssemblyRotationDrag({
      xInches: event.point.x,
      yInches: event.point.y,
      zInches: 0,
    });
  }, [rotationDrag]);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useDesignSceneStore.getState().finishAssemblyRotationDrag();
  }, []);

  if (rotationDrag === null) {
    return null;
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[ROTATION_SURFACE_SIZE_INCHES, ROTATION_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
