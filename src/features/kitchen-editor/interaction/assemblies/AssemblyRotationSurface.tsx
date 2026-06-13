"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";

const ROTATION_SURFACE_SIZE_INCHES = 3200;

export function AssemblyRotationSurface() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const updateAssemblyRotationDrag = useDesignSceneStore((state) => state.updateAssemblyRotationDrag);
  const finishAssemblyRotationDrag = useDesignSceneStore((state) => state.finishAssemblyRotationDrag);
  const rotationDrag = activeDrag?.kind === "assembly-rotation" ? activeDrag : null;

  useEffect(() => {
    if (!canManuallyEditScene(workspaceMode) || rotationDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      finishAssemblyRotationDrag();
    }

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [finishAssemblyRotationDrag, rotationDrag, workspaceMode]);

  if (!canManuallyEditScene(workspaceMode) || rotationDrag === null) {
    return null;
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    updateAssemblyRotationDrag({
      xInches: event.point.x,
      yInches: event.point.y,
      zInches: 0,
    });
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    finishAssemblyRotationDrag();
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[ROTATION_SURFACE_SIZE_INCHES, ROTATION_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
