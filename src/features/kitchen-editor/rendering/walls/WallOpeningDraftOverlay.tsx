"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { createWallOpeningFaceRectangleFromDraft, createWallOpeningFaceRectanglePoints } from "@/engine/walls/openings/wallOpeningGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";
import type { WallOpeningDraftPointInches } from "@/engine/walls/openings/wallOpeningDraftTypes";
import { createWallOpeningWorldPointFromFacePoint } from "../../interaction/walls/wallOpeningPointerProjection";

const WALL_OPENING_DRAFT_OFFSET_INCHES = 0.35;
const CUTOUT_DRAFT_STROKE_COLOR = "#ef4444";
const CUTOUT_DRAFT_LINE_WIDTH = 2.5;
const CUTOUT_DRAFT_DASH_SIZE_INCHES = 2;
const CUTOUT_DRAFT_GAP_SIZE_INCHES = 1.5;
const CUTOUT_DRAFT_RENDER_ORDER = 160;

export function WallOpeningDraftOverlay() {
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const draft = activeSceneOperation?.kind === "wall-opening-draft"
    ? activeSceneOperation.wallOpeningDraft
    : null;
  const viewZone = useMemo(
    () => draft === null
      ? null
      : getWallElevationViewZoneForTarget({
          placedWallGraphs,
          activeWallElevationTarget: {
            wallGraphId: draft.wallGraphId,
            wallSegmentId: draft.wallSegmentId,
            faceSide: draft.faceSide,
          },
        }),
    [draft, placedWallGraphs],
  );
  const faceRectanglePoints = useMemo(() => {
    if (draft === null || viewZone === null) {
      return [];
    }

    const rectangleInches = createWallOpeningFaceRectangleFromDraft({
      draft,
      faceLengthInches: viewZone.faceLengthInches,
      wallHeightInches: viewZone.wallHeightInches,
    });

    return createWallOpeningFaceRectanglePoints(rectangleInches);
  }, [draft, viewZone]);
  const worldLinePoints = useMemo(
    () => viewZone === null
      ? []
      : faceRectanglePoints.map((pointInches) => createWallOpeningWorldLinePoint(viewZone, pointInches)),
    [faceRectanglePoints, viewZone],
  );
  if (viewZone === null || worldLinePoints.length < 4) {
    return null;
  }

  return (
    <Line
      points={[...worldLinePoints, worldLinePoints[0]]}
      color={CUTOUT_DRAFT_STROKE_COLOR}
      lineWidth={CUTOUT_DRAFT_LINE_WIDTH}
      dashed
      dashSize={CUTOUT_DRAFT_DASH_SIZE_INCHES}
      gapSize={CUTOUT_DRAFT_GAP_SIZE_INCHES}
      depthTest={false}
      renderOrder={CUTOUT_DRAFT_RENDER_ORDER}
    />
  );
}

function createWallOpeningWorldLinePoint(
  viewZone: WallElevationViewZone,
  facePointInches: WallOpeningDraftPointInches,
): [number, number, number] {
  const worldPointInches = createWallOpeningWorldPointFromFacePoint({
    viewZone,
    facePointInches,
    outwardOffsetInches: WALL_OPENING_DRAFT_OFFSET_INCHES,
  });

  return [
    worldPointInches.xInches,
    worldPointInches.yInches,
    worldPointInches.zInches,
  ];
}
