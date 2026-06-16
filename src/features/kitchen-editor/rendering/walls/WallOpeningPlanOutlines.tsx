"use client";

import { memo, useMemo } from "react";
import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import type { DerivedWallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import {
  createDerivedWallOpeningPlanOutline,
  isDerivedWallOpeningPlanOutline,
  type DerivedWallOpeningPlanOutlineInches,
} from "@/engine/walls/openings/wallOpeningPlanGeometry";
import { createAssemblyDragPointerWorldPoint } from "../../interaction/assemblies/assemblyDragPointer";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const WALL_OPENING_OUTLINE_Z_INCHES = 7;
const WALL_OPENING_INTERACTION_Z_INCHES = 140;
const WALL_OPENING_OUTLINE_RENDER_ORDER = 118;

export const WallOpeningPlanOutlines = memo(function WallOpeningPlanOutlines({
  derivedWallOpenings,
  segmentBodies,
  wallOpeningAssemblies,
}: Readonly<{
  derivedWallOpenings: readonly DerivedWallOpening[];
  segmentBodies: readonly BuiltWallSegmentBody[];
  wallOpeningAssemblies: readonly PlacedAssembly[];
}>) {
  const wallOpeningAssemblyById = useMemo(
    () => new Map(wallOpeningAssemblies.map((assembly) => [assembly.id, assembly])),
    [wallOpeningAssemblies],
  );
  const outlines = useMemo(() => createPlanOutlines({
    derivedWallOpenings,
    segmentBodies,
  }), [derivedWallOpenings, segmentBodies]);

  if (outlines.length === 0) {
    return null;
  }

  return (
    <group>
      {outlines.map((outline) => {
        const sourceAssembly = wallOpeningAssemblyById.get(outline.sourceAssemblyId);

        return sourceAssembly === undefined ? null : (
          <WallOpeningPlanOutline
            key={outline.id}
            outline={outline}
            sourceAssembly={sourceAssembly}
          />
        );
      })}
    </group>
  );
});

function WallOpeningPlanOutline({
  outline,
  sourceAssembly,
}: Readonly<{
  outline: DerivedWallOpeningPlanOutlineInches;
  sourceAssembly: PlacedAssembly;
}>) {
  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    const designSceneStore = useDesignSceneStore.getState();
    const {
      activeDrag,
      activeSceneViewMode,
      activeToolbarTool,
      designScene,
      workspaceMode,
    } = designSceneStore;

    if (
      activeSceneViewMode !== "floor-plan" ||
      designScene.activeSceneOperation !== null ||
      activeDrag !== null ||
      activeToolbarTool !== null ||
      event.button !== 0 ||
      event.ctrlKey
    ) {
      return;
    }

    event.stopPropagation();
    designSceneStore.selectPlacedAssembly(sourceAssembly.id);

    if (!canManuallyEditScene(workspaceMode)) {
      return;
    }

    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      activeSceneViewMode,
      event.ray,
      sourceAssembly.worldPositionInches.yInches,
    );

    if (pointerWorldInches === null) {
      return;
    }

    designSceneStore.startAssemblyDrag({
      assemblyId: sourceAssembly.id,
      pointerWorldInches,
      sceneViewMode: activeSceneViewMode,
    });
  }

  return (
    <group renderOrder={WALL_OPENING_OUTLINE_RENDER_ORDER}>
      <Line
        points={outline.outlinePointsInches.map((pointInches) => [
          pointInches.xInches,
          pointInches.yInches,
          WALL_OPENING_OUTLINE_Z_INCHES,
        ])}
        color={wallSegmentRenderColors.openingOutlineStroke}
        lineWidth={2}
        depthTest={false}
        renderOrder={WALL_OPENING_OUTLINE_RENDER_ORDER}
      />
      <mesh
        position={[
          outline.interactionCenterInches.xInches,
          outline.interactionCenterInches.yInches,
          WALL_OPENING_INTERACTION_Z_INCHES,
        ]}
        rotation={[0, 0, outline.interactionRotationZRadians]}
        onPointerDown={handlePointerDown}
        renderOrder={WALL_OPENING_OUTLINE_RENDER_ORDER}
      >
        <boxGeometry
          args={[
            outline.interactionWidthInches,
            outline.interactionDepthInches,
            0.1,
          ]}
        />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

function createPlanOutlines(args: {
  derivedWallOpenings: readonly DerivedWallOpening[];
  segmentBodies: readonly BuiltWallSegmentBody[];
}): readonly DerivedWallOpeningPlanOutlineInches[] {
  return args.derivedWallOpenings
    .map((opening) => {
      const segmentBody = args.segmentBodies.find((body) => body.wallSegmentId === opening.wallSegmentId);

      return segmentBody === undefined
        ? null
        : createDerivedWallOpeningPlanOutline({ segmentBody, opening });
    })
    .filter(isDerivedWallOpeningPlanOutline);
}
