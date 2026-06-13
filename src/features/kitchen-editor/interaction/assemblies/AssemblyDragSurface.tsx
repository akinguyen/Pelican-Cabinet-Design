"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Matrix4, Vector3 } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { AssemblyElevationMoveFrame } from "@/engine/scene/sceneDragTypes";
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

  const elevationDragSurfaceMatrix = useMemo(
    () => moveDrag?.sceneViewMode === "elevation" && moveDrag.elevationMoveFrame !== undefined
      ? createElevationDragSurfaceMatrix(moveDrag.elevationMoveFrame)
      : null,
    [moveDrag],
  );

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
      moveDrag.elevationMoveFrame,
    );

    if (pointerWorldInches !== null) {
      updateAssemblyDrag(pointerWorldInches);
    }
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    finishAssemblyDrag();
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
