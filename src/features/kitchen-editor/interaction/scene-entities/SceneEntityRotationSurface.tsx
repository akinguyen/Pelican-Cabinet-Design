"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

const SCENE_ENTITY_ROTATION_SURFACE_SIZE_INCHES = 3200;

type SceneEntityRotationDragKind = "assembly-rotation" | "design-reservation-zone-rotation";

export function SceneEntityRotationSurface() {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const rotationDragKind = getSceneEntityRotationDragKind(activeDrag?.kind ?? null);

  useEffect(() => {
    if (rotationDragKind === null) {
      return;
    }

    function handleWindowPointerUp() {
      finishSceneEntityRotationDrag(rotationDragKind);
    }

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [rotationDragKind]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (rotationDragKind === null) {
      return;
    }

    event.stopPropagation();
    updateSceneEntityRotationDrag(rotationDragKind, {
      xInches: event.point.x,
      yInches: event.point.y,
      zInches: 0,
    });
  }, [rotationDragKind]);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    if (rotationDragKind !== null) {
      finishSceneEntityRotationDrag(rotationDragKind);
    }
  }, [rotationDragKind]);

  if (rotationDragKind === null) {
    return null;
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[SCENE_ENTITY_ROTATION_SURFACE_SIZE_INCHES, SCENE_ENTITY_ROTATION_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function getSceneEntityRotationDragKind(kind: string | null): SceneEntityRotationDragKind | null {
  if (kind === "assembly-rotation" || kind === "design-reservation-zone-rotation") {
    return kind;
  }

  return null;
}

function updateSceneEntityRotationDrag(kind: SceneEntityRotationDragKind, pointerWorldInches: { xInches: number; yInches: number; zInches: number }) {
  const store = useDesignSceneStore.getState();

  if (kind === "assembly-rotation") {
    store.updateAssemblyRotationDrag(pointerWorldInches);
    return;
  }

  store.updateDesignReservationZoneRotationDrag(pointerWorldInches);
}

function finishSceneEntityRotationDrag(kind: SceneEntityRotationDragKind) {
  const store = useDesignSceneStore.getState();

  if (kind === "assembly-rotation") {
    store.finishAssemblyRotationDrag();
    return;
  }

  store.finishDesignReservationZoneRotationDrag();
}
