"use client";

import { memo, useCallback } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { BuiltAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { AssemblyElevationMoveFrame } from "@/engine/scene/sceneDragTypes";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";
import { createAssemblyDragPointerWorldPoint } from "../../interaction/assemblies/assemblyDragPointer";
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
      event.button !== 0 ||
      event.ctrlKey
    ) {
      return;
    }

    event.stopPropagation();
    designSceneStore.selectPlacedAssembly(placedAssembly.id);


    const elevationMoveFrame = activeSceneViewMode === "elevation"
      ? createAssemblyElevationMoveFrame({
          placedAssemblyWorldPositionInches: placedAssembly.worldPositionInches,
          placedWallGraphs: designScene.placedWallGraphs,
          activeWallElevationTarget,
        })
      : undefined;
    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      activeSceneViewMode,
      event.ray,
      placedAssembly.worldPositionInches.yInches,
      elevationMoveFrame,
    );

    if (pointerWorldInches === null) {
      return;
    }

    designSceneStore.startAssemblyDrag({
      assemblyId: placedAssembly.id,
      pointerWorldInches,
      sceneViewMode: activeSceneViewMode,
      elevationMoveFrame,
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

function createAssemblyElevationMoveFrame(args: {
  placedAssemblyWorldPositionInches: Point3DInches;
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
}): AssemblyElevationMoveFrame | undefined {
  const viewZone = getWallElevationViewZoneForTarget({
    placedWallGraphs: args.placedWallGraphs,
    activeWallElevationTarget: args.activeWallElevationTarget,
  });

  if (viewZone === null) {
    return undefined;
  }

  const faceLengthInches = Math.max(viewZone.faceLengthInches, 0.000001);

  return {
    faceDirectionInches: {
      xInches: (viewZone.faceEndInches.xInches - viewZone.faceStartInches.xInches) / faceLengthInches,
      yInches: (viewZone.faceEndInches.yInches - viewZone.faceStartInches.yInches) / faceLengthInches,
      zInches: 0,
    },
    outwardDirectionInches: {
      xInches: viewZone.outwardDirectionInches.xInches,
      yInches: viewZone.outwardDirectionInches.yInches,
      zInches: 0,
    },
    planeOriginInches: args.placedAssemblyWorldPositionInches,
    viewZoneInches: {
      originInches: viewZone.faceCenterInches,
      leftInches: viewZone.viewFrameLeftInches,
      rightInches: viewZone.viewFrameRightInches,
      nearDepthInches: -viewZone.behindFaceDepthInches,
      farDepthInches: viewZone.depthInches,
      bottomInches: 0,
      topInches: viewZone.wallHeightInches,
    },
  };
}
