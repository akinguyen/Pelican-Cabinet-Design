"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createWallGroundPlanePointerWorldPoint } from "./wallGroundPlanePointer";

const WALL_SPLIT_SURFACE_SIZE_INCHES = 3200;

export function WallSplitDraftSurface() {
  const activeEditorView = useDesignSceneStore((state) => state.activeEditorView);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const updateWallSplitDraftHover = useDesignSceneStore(
    (state) => state.updateWallSplitDraftHover,
  );
  const clickWallSplitDraftPoint = useDesignSceneStore(
    (state) => state.clickWallSplitDraftPoint,
  );
  const isWallSplitActive = activeToolbarTool === "split-wall-footprint";
  const hasSelectedWall = activeSelection?.kind === "placed-wall";

  if (!isWallSplitActive || !hasSelectedWall || activeEditorView === "elevation") {
    return null;
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    const pointerWorldInches = createWallGroundPlanePointerWorldPoint(event.ray);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    updateWallSplitDraftHover(pointerWorldInches);
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    const pointerWorldInches = createWallGroundPlanePointerWorldPoint(event.ray);

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    clickWallSplitDraftPoint(pointerWorldInches);
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onClick={handleClick}>
      <planeGeometry args={[WALL_SPLIT_SURFACE_SIZE_INCHES, WALL_SPLIT_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
