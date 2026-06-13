"use client";

import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { DoubleSide } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { WallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import {
  createWallOpeningHitGeometry,
  createWallOpeningSelectedLinePoints,
} from "./wallOpeningRenderGeometry";

const WALL_OPENING_SELECTED_OUTLINE_OFFSET_INCHES = 0.16;
const WALL_OPENING_HIT_PADDING_INCHES = 1;
const WALL_OPENING_HIT_DEPTH_PADDING_INCHES = 0.5;
const WALL_OPENING_HIT_ORDER_STEP_INCHES = 0.04;

type WallOpeningOverlayProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  openings: readonly WallOpening[];
  sceneViewMode: SceneViewMode;
}>;

export function WallOpeningOverlay({
  segmentBody,
  openings,
  sceneViewMode,
}: WallOpeningOverlayProps) {
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const selectWallOpening = useDesignSceneStore((state) => state.selectWallOpening);

  if (sceneViewMode === "floor-plan" || openings.length === 0) {
    return null;
  }

  return (
    <group>
      {openings.map((opening) => {
        const isSelected =
          activeSelection?.kind === "wall-opening" &&
          activeSelection.wallGraphId === segmentBody.wallGraphId &&
          activeSelection.wallSegmentId === segmentBody.wallSegmentId &&
          activeSelection.wallOpeningId === opening.id;

        return isSelected ? (
          <WallOpeningSelectedOutline
            key={`selected-${opening.id}`}
            segmentBody={segmentBody}
            opening={opening}
          />
        ) : null;
      })}
      {[...openings].reverse().map((opening, reversedIndex) => {
        const openingIndex = openings.length - 1 - reversedIndex;

        function handlePointerDown(event: ThreeEvent<PointerEvent>) {
          if (event.button !== 0 || activeToolbarTool !== null) {
            return;
          }

          event.stopPropagation();
          selectWallOpening(segmentBody.wallGraphId, segmentBody.wallSegmentId, opening.id);
        }

        return (
          <WallOpeningHitMesh
            key={`hit-${opening.id}`}
            segmentBody={segmentBody}
            opening={opening}
            openingIndex={openingIndex}
            onPointerDown={handlePointerDown}
          />
        );
      })}
    </group>
  );
}

type WallOpeningSelectedOutlineProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
}>;

function WallOpeningSelectedOutline({
  segmentBody,
  opening,
}: WallOpeningSelectedOutlineProps) {
  const linePoints = useMemo(
    () => createWallOpeningSelectedLinePoints({
      segmentBody,
      opening,
      outwardOffsetInches: WALL_OPENING_SELECTED_OUTLINE_OFFSET_INCHES,
    }),
    [opening, segmentBody],
  );

  if (linePoints.length < 4) {
    return null;
  }

  return (
    <Line
      points={[...linePoints, linePoints[0]]}
      color="#2563eb"
      lineWidth={2}
      depthTest={false}
      renderOrder={41}
    />
  );
}

type WallOpeningHitMeshProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  openingIndex: number;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}>;

function WallOpeningHitMesh({
  segmentBody,
  opening,
  openingIndex,
  onPointerDown,
}: WallOpeningHitMeshProps) {
  const geometry = useMemo(
    () => createWallOpeningHitGeometry({
      segmentBody,
      opening,
      paddingInches: WALL_OPENING_HIT_PADDING_INCHES,
      depthPaddingInches:
        WALL_OPENING_HIT_DEPTH_PADDING_INCHES + openingIndex * WALL_OPENING_HIT_ORDER_STEP_INCHES,
    }),
    [opening, openingIndex, segmentBody],
  );

  if (geometry === null) {
    return null;
  }

  return (
    <mesh
      geometry={geometry}
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
      renderOrder={42 + openingIndex}
    >
      <meshBasicMaterial
        transparent
        opacity={0}
        side={DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
