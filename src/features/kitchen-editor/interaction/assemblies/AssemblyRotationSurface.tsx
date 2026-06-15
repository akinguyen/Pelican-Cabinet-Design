"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";

const ROTATION_SURFACE_SIZE_INCHES = 3200;

export function AssemblyRotationSurface() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const rotationDrag = activeDrag?.kind === "assembly-rotation" ? activeDrag : null;

  useEffect(() => {
    if (!canManuallyEditScene(workspaceMode) || rotationDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      useDesignSceneStore.getState().finishAssemblyRotationDrag();
    }

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [rotationDrag, workspaceMode]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!canManuallyEditScene(workspaceMode) || rotationDrag === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().updateAssemblyRotationDrag({
      xInches: event.point.x,
      yInches: event.point.y,
      zInches: 0,
    });
  }, [rotationDrag, workspaceMode]);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useDesignSceneStore.getState().finishAssemblyRotationDrag();
  }, []);

  if (!canManuallyEditScene(workspaceMode) || rotationDrag === null) {
    return null;
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[ROTATION_SURFACE_SIZE_INCHES, ROTATION_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
