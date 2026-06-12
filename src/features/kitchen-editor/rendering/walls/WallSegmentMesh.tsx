"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { DoubleSide } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import { createExtrudedWallGeometry } from "./wallRenderingGeometry";
import { WallSegmentActiveOverlay } from "./WallSegmentActiveOverlay";
import { WallSegmentVertexMarkers } from "./WallSegmentVertexMarkers";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const SHOW_WALL_DEBUG_VERTEX_MARKERS = false;

type WallSegmentRenderState = "committed" | "preview-existing" | "preview-draft" | "selected";

type WallSegmentMeshProps = Readonly<{
  segmentBody: BuiltWallSegmentBody;
  renderState: WallSegmentRenderState;
  sceneViewMode: SceneViewMode;
}>;

export function WallSegmentMesh({ segmentBody, renderState }: WallSegmentMeshProps) {
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const selectPlacedWallSegment = useDesignSceneStore((state) => state.selectPlacedWallSegment);
  const geometry = useMemo(
    () => createExtrudedWallGeometry(
      segmentBody.footprintPolygonInches,
      segmentBody.heightInches,
    ),
    [segmentBody.footprintPolygonInches, segmentBody.heightInches],
  );
  const isActiveWallSegment = renderState === "selected" || renderState === "preview-draft";
  const renderOrder = isActiveWallSegment ? 10 : 1;
  const color = getWallSegmentFillColor(renderState);
  const opacity = isActiveWallSegment ? 0.88 : 1;

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (event.button !== 0 || activeToolbarTool === "draw-wall-segment") {
      return;
    }

    event.stopPropagation();
    selectPlacedWallSegment(segmentBody.wallGraphId, segmentBody.wallSegmentId);
  }

  return (
    <group renderOrder={renderOrder}>
      <mesh
        geometry={geometry}
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
      {isActiveWallSegment ? <WallSegmentActiveOverlay segmentBody={segmentBody} /> : null}
      {SHOW_WALL_DEBUG_VERTEX_MARKERS && isActiveWallSegment ? (
        <WallSegmentVertexMarkers segmentBody={segmentBody} />
      ) : null}
    </group>
  );
}

function getWallSegmentFillColor(renderState: WallSegmentRenderState): string {
  if (renderState === "preview-draft" || renderState === "selected") {
    return wallSegmentRenderColors.activeFill;
  }

  if (renderState === "preview-existing") {
    return wallSegmentRenderColors.previewExistingFill;
  }

  return wallSegmentRenderColors.committedFill;
}
