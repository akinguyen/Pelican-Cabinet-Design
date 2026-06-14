"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import { createWallGroundPlanePointerWorldPoint } from "./wallGroundPlanePointer";

const WALL_SEGMENT_DRAFT_DRAWING_SURFACE_SIZE_INCHES = 3200;

export function WallSegmentDraftSurface() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const updateWallSegmentDraftHover = useDesignSceneStore(
    (state) => state.updateWallSegmentDraftHover,
  );
  const clickWallSegmentDraftPoint = useDesignSceneStore(
    (state) => state.clickWallSegmentDraftPoint,
  );
  const isWallSegmentDraftDrawingActive = activeToolbarTool === "draw-wall-segment";

  if (!canManuallyEditScene(workspaceMode) || !isWallSegmentDraftDrawingActive || activeSceneViewMode !== "floor-plan") {
    return null;
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    const pointerWorldInches = createWallGroundPlanePointerWorldPoint(event.ray);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    updateWallSegmentDraftHover(pointerWorldInches);
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    const pointerWorldInches = createWallGroundPlanePointerWorldPoint(event.ray);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    clickWallSegmentDraftPoint(pointerWorldInches);
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onClick={handleClick}>
      <planeGeometry args={[WALL_SEGMENT_DRAFT_DRAWING_SURFACE_SIZE_INCHES, WALL_SEGMENT_DRAFT_DRAWING_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
