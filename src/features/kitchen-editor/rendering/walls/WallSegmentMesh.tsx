"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useMemo } from "react";
import { DoubleSide } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import type { PlacedWallSegment } from "@/engine/walls/placedWallSegmentTypes";
import { createWallSegmentGeometry } from "./wallRenderingGeometry";
import { EdgeSegmentLines } from "../shared/EdgeSegmentLines";
import { WallSegmentActiveOverlay } from "./WallSegmentActiveOverlay";
import { WallSegmentVertexMarkers } from "./WallSegmentVertexMarkers";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";
import { useDisposableGeometry } from "../shared/useDisposableGeometry";

const SHOW_WALL_DEBUG_VERTEX_MARKERS = false;

type WallSegmentRenderState = "committed" | "preview-existing" | "preview-draft" | "selected";

type WallSegmentMeshProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  wallSegment: PlacedWallSegment;
  derivedOpenings: readonly PlacedWallSegment["openings"][number][];
  renderState: WallSegmentRenderState;
  sceneViewMode: SceneViewMode;
}>;

export const WallSegmentMesh = memo(function WallSegmentMesh({
  segmentBody,
  wallSegment,
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

  const isActiveWallSegment = renderState === "selected" || renderState === "preview-draft";
  const renderOrder = isActiveWallSegment ? 10 : 1;
  const color = getWallSegmentFillColor(renderState);
  const opacity = isActiveWallSegment ? 0.88 : 1;

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
        {isActiveWallSegment ? (
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
      {sceneViewMode !== "floor-plan" && geometryResult.openingEdgeSegmentsInches.length > 0 ? (
        <EdgeSegmentLines
          edgeSegmentsInches={geometryResult.openingEdgeSegmentsInches}
          lineWidthPixels={1}
          renderOrder={renderOrder + 1}
        />
      ) : null}
      {isActiveWallSegment ? <WallSegmentActiveOverlay segmentBody={segmentBody} /> : null}
      {SHOW_WALL_DEBUG_VERTEX_MARKERS && isActiveWallSegment ? (
        <WallSegmentVertexMarkers segmentBody={segmentBody} />
      ) : null}
    </group>
  );
});

function getWallSegmentFillColor(renderState: WallSegmentRenderState): string {
  if (renderState === "preview-draft" || renderState === "selected") {
    return wallSegmentRenderColors.activeFill;
  }

  if (renderState === "preview-existing") {
    return wallSegmentRenderColors.previewExistingFill;
  }

  return wallSegmentRenderColors.committedFill;
}
