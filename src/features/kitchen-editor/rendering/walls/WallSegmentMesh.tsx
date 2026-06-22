"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useMemo } from "react";
import { DoubleSide } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import type { DerivedWallOpening } from "@/engine/walls/placedWallSegmentTypes";
import { createWallSegmentGeometry } from "./wallRenderingGeometry";
import { EdgeSegmentLines } from "../shared/EdgeSegmentLines";
import { WallSegmentActiveOverlay } from "./WallSegmentActiveOverlay";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";
import { useDisposableGeometry } from "../shared/useDisposableGeometry";


type WallSegmentRenderState = "committed" | "preview-existing" | "preview-draft" | "selected";

type WallSegmentMeshProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  derivedOpenings: readonly DerivedWallOpening[];
  renderState: WallSegmentRenderState;
  sceneViewMode: SceneViewMode;
}>;

export const WallSegmentMesh = memo(function WallSegmentMesh({
  segmentBody,
  derivedOpenings,
  renderState,
  sceneViewMode,
}: WallSegmentMeshProps) {
  const geometryResult = useMemo(
    () => createWallSegmentGeometry({
      segmentBody,
      openings: derivedOpenings,
      edgeSegmentOpenings: [],
    }),
    [derivedOpenings, segmentBody],
  );
  useDisposableGeometry(geometryResult.geometry);

  const isSelectedWallSegment = renderState === "selected";
  const isDraftPreviewWallSegment = renderState === "preview-draft";
  const shouldRenderActiveOverlay = isSelectedWallSegment || isDraftPreviewWallSegment;
  const renderOrder = shouldRenderActiveOverlay ? 10 : 1;
  const color = getWallSegmentFillColor(renderState);
  const opacity = isDraftPreviewWallSegment ? 0.88 : 1;

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    const designSceneStore = useDesignSceneStore.getState();

    if (event.button !== 0 || designSceneStore.activeToolbarTool === "draw-wall-segment") {
      return;
    }

    event.stopPropagation();
    designSceneStore.selectPlacedWallSegment(segmentBody.wallGraphId, segmentBody.wallSegmentId);
  }, [segmentBody.wallGraphId, segmentBody.wallSegmentId]);

  return (
    <group renderOrder={renderOrder}>
      <mesh
        geometry={geometryResult.geometry}
        onPointerDown={handlePointerDown}
        renderOrder={renderOrder}
      >
        {isDraftPreviewWallSegment ? (
          <meshBasicMaterial
            color={color}
            side={DoubleSide}
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        ) : (
          <meshStandardMaterial
            color={color}
            side={DoubleSide}
          />
        )}
      </mesh>
      {geometryResult.openingEdgeSegmentsInches.length > 0 ? (
        <EdgeSegmentLines
          edgeSegmentsInches={geometryResult.openingEdgeSegmentsInches}
          lineWidthPixels={1}
          depthTest={sceneViewMode !== "floor-plan"}
          depthWrite={false}
          renderOrder={sceneViewMode === "floor-plan" ? 117 : renderOrder + 1}
        />
      ) : null}
      {shouldRenderActiveOverlay ? <WallSegmentActiveOverlay segmentBody={segmentBody} /> : null}
    </group>
  );
});

function getWallSegmentFillColor(renderState: WallSegmentRenderState): string {
  if (renderState === "preview-draft") {
    return wallSegmentRenderColors.activeFill;
  }

  if (renderState === "preview-existing") {
    return wallSegmentRenderColors.previewExistingFill;
  }

  return wallSegmentRenderColors.committedFill;
}
