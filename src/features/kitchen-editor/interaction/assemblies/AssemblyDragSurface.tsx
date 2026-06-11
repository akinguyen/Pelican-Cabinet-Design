"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import { createAssemblyDragPointerWorldPoint } from "./assemblyDragPointer";

const DRAG_SURFACE_SIZE_INCHES = 3200;

export function AssemblyDragSurface() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const updateAssemblyDrag = useDesignSceneStore((state) => state.updateAssemblyDrag);
  const finishAssemblyDrag = useDesignSceneStore((state) => state.finishAssemblyDrag);
  const moveDrag = activeDrag?.kind === "assembly-move" ? activeDrag : null;

  useEffect(() => {
    if (!canManuallyEditScene(workspaceMode) || moveDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      finishAssemblyDrag();
    }

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [finishAssemblyDrag, moveDrag, workspaceMode]);

  if (!canManuallyEditScene(workspaceMode) || moveDrag === null) {
    return null;
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!canManuallyEditScene(workspaceMode) || moveDrag === null) {
      return;
    }

    event.stopPropagation();
    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      moveDrag.sceneViewMode,
      event.ray,
      moveDrag.dragStartWorldPositionInches.yInches,
    );

    if (pointerWorldInches !== null) {
      updateAssemblyDrag(pointerWorldInches);
    }
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    finishAssemblyDrag();
  }

  if (moveDrag.sceneViewMode === "elevation") {
    return (
      <mesh
        position={[0, moveDrag.dragStartWorldPositionInches.yInches, 120]}
        rotation={[Math.PI / 2, 0, 0]}
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
