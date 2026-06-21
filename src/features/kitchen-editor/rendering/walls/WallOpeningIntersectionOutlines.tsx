"use client";

import { memo, useMemo } from "react";
import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { DerivedWallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import {
  createDerivedWallOpeningIntersectionOutline,
  isDerivedWallOpeningIntersectionOutline,
  type DerivedWallOpeningIntersectionOutlineInches,
} from "@/engine/walls/openings/wallOpeningIntersectionOutlineGeometry";
import { createAssemblyDragPointerWorldPoint } from "../../interaction/assemblies/assemblyDragPointer";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const WALL_OPENING_OUTLINE_Z_INCHES = 7;
const WALL_OPENING_INTERACTION_Z_INCHES = 140;
const WALL_OPENING_OUTLINE_RENDER_ORDER = 122;

export const WallOpeningIntersectionOutlines = memo(function WallOpeningIntersectionOutlines({
  derivedWallOpenings,
  segmentBodies,
  wallOpeningAssemblies,
  sceneViewMode,
}: Readonly<{
  derivedWallOpenings: readonly DerivedWallOpening[];
  segmentBodies: readonly BuiltWallSegmentBody[];
  wallOpeningAssemblies: readonly PlacedAssembly[];
  sceneViewMode: SceneViewMode;
}>) {
  const wallOpeningAssemblyById = useMemo(
    () => new Map(wallOpeningAssemblies.map((assembly) => [assembly.id, assembly])),
    [wallOpeningAssemblies],
  );
  const outlines = useMemo(() => createIntersectionOutlines({
    derivedWallOpenings,
    segmentBodies,
    wallOpeningAssemblyById,
  }), [derivedWallOpenings, segmentBodies, wallOpeningAssemblyById]);

  if (outlines.length === 0) {
    return null;
  }

  return (
    <group>
      {outlines.map((outline) => {
        const sourceAssembly = wallOpeningAssemblyById.get(outline.sourceAssemblyId);

        return sourceAssembly === undefined ? null : (
          <WallOpeningIntersectionOutline
            key={outline.id}
            outline={outline}
            sourceAssembly={sourceAssembly}
            sceneViewMode={sceneViewMode}
          />
        );
      })}
    </group>
  );
});

function WallOpeningIntersectionOutline({
  outline,
  sourceAssembly,
  sceneViewMode,
}: Readonly<{
  outline: DerivedWallOpeningIntersectionOutlineInches;
  sourceAssembly: PlacedAssembly;
  sceneViewMode: SceneViewMode;
}>) {
  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    const designSceneStore = useDesignSceneStore.getState();
    const {
      activeDrag,
      activeSceneViewMode,
      activeToolbarTool,
      designScene,
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
    designSceneStore.selectSceneEntity({ entityKind: "placed-assembly", entityId: sourceAssembly.id });


    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      activeSceneViewMode,
      event.ray,
      sourceAssembly.worldPositionInches.yInches,
    );

    if (pointerWorldInches === null) {
      return;
    }

    designSceneStore.startSceneEntityMoveDrag({
      sceneEntity: { entityKind: "placed-assembly", entityId: sourceAssembly.id },
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
      {sceneViewMode === "floor-plan" ? (
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
      ) : null}
    </group>
  );
}

function createIntersectionOutlines(args: {
  derivedWallOpenings: readonly DerivedWallOpening[];
  segmentBodies: readonly BuiltWallSegmentBody[];
  wallOpeningAssemblyById: ReadonlyMap<string, PlacedAssembly>;
}): readonly DerivedWallOpeningIntersectionOutlineInches[] {
  return args.derivedWallOpenings
    .map((opening) => {
      const segmentBody = args.segmentBodies.find((body) => body.wallSegmentId === opening.wallSegmentId);
      const sourceAssembly = args.wallOpeningAssemblyById.get(opening.sourceAssemblyId);

      return segmentBody === undefined || sourceAssembly === undefined
        ? null
        : createDerivedWallOpeningIntersectionOutline({ segmentBody, opening, sourceAssembly });
    })
    .filter(isDerivedWallOpeningIntersectionOutline);
}
