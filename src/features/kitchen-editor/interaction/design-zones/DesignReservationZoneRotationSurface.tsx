"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

const DESIGN_RESERVATION_ZONE_ROTATION_SURFACE_SIZE_INCHES = 3200;

export function DesignReservationZoneRotationSurface() {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const rotationDrag = activeDrag?.kind === "design-reservation-zone-rotation" ? activeDrag : null;

  useEffect(() => {
    if (rotationDrag === null) {
      return;
    }

    function handleWindowPointerUp() {
      useDesignSceneStore.getState().finishDesignReservationZoneRotationDrag();
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
    useDesignSceneStore.getState().updateDesignReservationZoneRotationDrag({
      xInches: event.point.x,
      yInches: event.point.y,
      zInches: 0,
    });
  }, [rotationDrag]);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useDesignSceneStore.getState().finishDesignReservationZoneRotationDrag();
  }, []);

  if (rotationDrag === null) {
    return null;
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <planeGeometry args={[DESIGN_RESERVATION_ZONE_ROTATION_SURFACE_SIZE_INCHES, DESIGN_RESERVATION_ZONE_ROTATION_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
