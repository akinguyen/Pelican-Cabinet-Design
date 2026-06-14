"use client";

import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { DoubleSide } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { WallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import {
  createWallOpeningFacePointFromRay,
  createWallOpeningHitGeometry,
  createWallOpeningSelectedLinePoints,
} from "./wallOpeningRenderGeometry";

const WALL_OPENING_SELECTED_OUTLINE_OFFSET_INCHES = 0.75;
const WALL_OPENING_HIT_PADDING_INCHES = 1;
const WALL_OPENING_HIT_DEPTH_PADDING_INCHES = 0.5;
const WALL_OPENING_HIT_ORDER_STEP_INCHES = 0.04;

const WALL_OPENING_SELECTED_OUTLINE_WIDTH_PIXELS = 3;
const WALL_OPENING_SELECTED_OUTLINE_RENDER_ORDER = 120;

const WALL_OPENING_SELECTED_COLOR = "#2563eb";

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
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const selectWallOpening = useDesignSceneStore((state) => state.selectWallOpening);
  const startWallOpeningDrag = useDesignSceneStore((state) => state.startWallOpeningDrag);
  const updateWallOpeningDrag = useDesignSceneStore((state) => state.updateWallOpeningDrag);
  const finishWallOpeningDrag = useDesignSceneStore((state) => state.finishWallOpeningDrag);
  const canDragOpenings = canManuallyEditScene(workspaceMode) && activeToolbarTool === null;
  const activeWallOpeningDrag = activeSceneOperation?.kind === "wall-opening-drag"
    ? activeSceneOperation.wallOpeningDrag
    : null;

  if (sceneViewMode === "floor-plan" || openings.length === 0) {
    return null;
  }

  return (
    <group>
      {openings.map((opening) => {
        const isSelected = isWallOpeningSelected({
          activeSelection,
          segmentBody,
          opening,
        });

        return (
          <WallOpeningFaceOverlay
            key={`face-${opening.id}`}
            segmentBody={segmentBody}
            opening={opening}
            isSelected={isSelected}
          />
        );
      })}
      {[...openings].reverse().map((opening, reversedIndex) => {
        const openingIndex = openings.length - 1 - reversedIndex;

        function handlePointerDown(event: ThreeEvent<PointerEvent>) {
          if (event.button !== 0) {
            return;
          }

          event.stopPropagation();
          selectWallOpening(segmentBody.wallGraphId, segmentBody.wallSegmentId, opening.id);

          if (!canDragOpenings) {
            return;
          }

          const grabFacePointInches = createWallOpeningFacePointFromRay({
            segmentBody,
            faceSide: opening.faceSide,
            ray: event.ray,
          });

          if (grabFacePointInches === null) {
            return;
          }

          event.target.setPointerCapture(event.pointerId);
          startWallOpeningDrag({
            wallGraphId: segmentBody.wallGraphId,
            wallSegmentId: segmentBody.wallSegmentId,
            wallOpeningId: opening.id,
            grabFacePointInches,
          });
        }

        function handlePointerMove(event: ThreeEvent<PointerEvent>) {
          if (
            activeWallOpeningDrag?.wallOpeningId !== opening.id ||
            !canDragOpenings
          ) {
            return;
          }

          const grabFacePointInches = createWallOpeningFacePointFromRay({
            segmentBody,
            faceSide: opening.faceSide,
            ray: event.ray,
          });

          if (grabFacePointInches === null) {
            return;
          }

          event.stopPropagation();
          updateWallOpeningDrag(grabFacePointInches);
        }

        function handlePointerUp(event: ThreeEvent<PointerEvent>) {
          if (activeWallOpeningDrag?.wallOpeningId !== opening.id) {
            return;
          }

          event.stopPropagation();
          event.target.releasePointerCapture(event.pointerId);
          finishWallOpeningDrag();
        }

        return (
          <WallOpeningHitMesh
            key={`hit-${opening.id}`}
            segmentBody={segmentBody}
            opening={opening}
            openingIndex={openingIndex}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        );
      })}
    </group>
  );
}

type WallOpeningFaceOverlayProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  isSelected: boolean;
}>;

function WallOpeningFaceOverlay({
  segmentBody,
  opening,
  isSelected,
}: WallOpeningFaceOverlayProps) {
  const selectedLinePoints = useMemo(
    () => isSelected
      ? createWallOpeningSelectedLinePoints({
          segmentBody,
          opening,
          outwardOffsetInches: WALL_OPENING_SELECTED_OUTLINE_OFFSET_INCHES,
        })
      : [],
    [isSelected, opening, segmentBody],
  );

  if (!isSelected || selectedLinePoints.length < 4) {
    return null;
  }

  return (
    <Line
      points={[...selectedLinePoints, selectedLinePoints[0]]}
      color={WALL_OPENING_SELECTED_COLOR}
      lineWidth={WALL_OPENING_SELECTED_OUTLINE_WIDTH_PIXELS}
      depthTest={false}
      renderOrder={WALL_OPENING_SELECTED_OUTLINE_RENDER_ORDER}
    />
  );
}

type WallOpeningHitMeshProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  openingIndex: number;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
}>;

function WallOpeningHitMesh({
  segmentBody,
  opening,
  openingIndex,
  onPointerDown,
  onPointerMove,
  onPointerUp,
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
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(event) => event.stopPropagation()}
      renderOrder={43 + openingIndex}
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

function isWallOpeningSelected(args: {
  activeSelection: SceneSelection | null;
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
}): boolean {
  return (
    args.activeSelection?.kind === "wall-opening" &&
    args.activeSelection.wallGraphId === args.segmentBody.wallGraphId &&
    args.activeSelection.wallSegmentId === args.segmentBody.wallSegmentId &&
    args.activeSelection.wallOpeningId === args.opening.id
  );
}
