"use client";

import { memo, useCallback } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { BuiltAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { shouldKeepSceneEntitySelectionForDrag } from "@/engine/scene/sceneSelectionTypes";
import { createSceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";
import { createAssemblyDragPointerWorldPoint } from "../../interaction/assemblies/assemblyDragPointer";
import { createSceneEntityElevationFrame } from "../../interaction/scene-entities/sceneEntityElevationFrame";
import { AssemblyRenderer } from "./AssemblyRenderer";

type PlacedAssemblyRendererProps = Readonly<{
  placedAssembly: PlacedAssembly;
  builtAssemblyTree: BuiltAssemblyTree;
  showFrontOutlineLines: boolean;
  sceneViewMode: SceneViewMode;
}>;

export const PlacedAssemblyRenderer = memo(function PlacedAssemblyRenderer({
  placedAssembly,
  builtAssemblyTree,
  showFrontOutlineLines,
  sceneViewMode,
}: PlacedAssemblyRendererProps) {
  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    const designSceneStore = useDesignSceneStore.getState();
    const {
      activeDrag,
      activeSceneViewMode,
      activeToolbarTool,
      activeWallElevationTarget,
      designScene,
    } = designSceneStore;

    if (
      designScene.activeSceneOperation !== null ||
      activeDrag !== null ||
      activeToolbarTool !== null ||
      event.button !== 0
    ) {
      return;
    }

    event.stopPropagation();

    const sceneEntity = { entityKind: "placed-assembly", entityId: placedAssembly.id } as const;

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      designSceneStore.toggleSceneEntitySelection(sceneEntity);
      return;
    }

    if (!shouldKeepSceneEntitySelectionForDrag(designScene.activeSelection, sceneEntity)) {
      designSceneStore.selectSceneEntity(sceneEntity);
    }

    const elevationMoveFrame = activeSceneViewMode === "elevation"
      ? createSceneEntityElevationFrame({
          planeOriginInches: placedAssembly.worldPositionInches,
          placedWallGraphs: designScene.placedWallGraphs,
          activeWallElevationTarget,
        })
      : undefined;
    const movementFrame = createSceneEntityMovementFrame({ sceneViewMode: activeSceneViewMode, elevationMoveFrame });
    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      activeSceneViewMode,
      event.ray,
      placedAssembly.worldPositionInches.yInches,
      elevationMoveFrame,
    );

    if (pointerWorldInches === null) {
      return;
    }

    designSceneStore.startSceneEntityMoveDrag({
      sceneEntity: { entityKind: "placed-assembly", entityId: placedAssembly.id },
      pointerWorldInches,
      sceneViewMode: activeSceneViewMode,
      elevationMoveFrame,
      movementFrame,
    });
  }, [placedAssembly]);

  return (
    <AssemblyRenderer
      builtAssemblyTree={builtAssemblyTree}
      renderState="default"
      showFrontOutlineLines={showFrontOutlineLines}
      sceneViewMode={sceneViewMode}
      onPointerDown={handlePointerDown}
    />
  );
});
