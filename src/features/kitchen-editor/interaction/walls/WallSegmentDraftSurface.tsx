"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createWallGroundPlanePointerWorldPoint } from "./wallGroundPlanePointer";

const WALL_SEGMENT_DRAFT_DRAWING_SURFACE_SIZE_INCHES = 3200;

export function WallSegmentDraftSurface() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const isWallSegmentDraftDrawingActive = activeToolbarTool === "draw-wall-segment";

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!isWallSegmentDraftDrawingActive || activeSceneViewMode !== "floor-plan") {
      return;
    }

    const pointerWorldInches = createWallGroundPlanePointerWorldPoint(event.ray);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().updateWallSegmentDraftHover(pointerWorldInches);
  }, [activeSceneViewMode, isWallSegmentDraftDrawingActive]);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!isWallSegmentDraftDrawingActive || activeSceneViewMode !== "floor-plan") {
      return;
    }

    const pointerWorldInches = createWallGroundPlanePointerWorldPoint(event.ray);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().clickWallSegmentDraftPoint(pointerWorldInches);
  }, [activeSceneViewMode, isWallSegmentDraftDrawingActive]);

  if (!isWallSegmentDraftDrawingActive || activeSceneViewMode !== "floor-plan") {
    return null;
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onClick={handleClick}>
      <planeGeometry args={[WALL_SEGMENT_DRAFT_DRAWING_SURFACE_SIZE_INCHES, WALL_SEGMENT_DRAFT_DRAWING_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
