"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createWallGroundPlanePointerWorldPoint } from "./wallGroundPlanePointer";

const WALL_FOOTPRINT_DRAFT_DRAWING_SURFACE_SIZE_INCHES = 3200;

export function WallFootprintDraftSurface() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const updateWallFootprintDraftHover = useDesignSceneStore(
    (state) => state.updateWallFootprintDraftHover,
  );
  const clickWallFootprintDraftPoint = useDesignSceneStore(
    (state) => state.clickWallFootprintDraftPoint,
  );
  const isWallFootprintDraftDrawingActive = activeToolbarTool === "draw-wall-footprint";

  if (workspaceMode !== "editor" || !isWallFootprintDraftDrawingActive || activeSceneViewMode === "elevation") {
    return null;
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    const pointerWorldInches = createWallGroundPlanePointerWorldPoint(event.ray);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    updateWallFootprintDraftHover(pointerWorldInches);
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    const pointerWorldInches = createWallGroundPlanePointerWorldPoint(event.ray);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    clickWallFootprintDraftPoint(pointerWorldInches);
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onClick={handleClick}>
      <planeGeometry args={[WALL_FOOTPRINT_DRAFT_DRAWING_SURFACE_SIZE_INCHES, WALL_FOOTPRINT_DRAFT_DRAWING_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
