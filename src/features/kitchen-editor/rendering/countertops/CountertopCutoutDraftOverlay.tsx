"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { createRequestedCountertopOpeningFromDraft } from "@/engine/countertops/countertopOpeningFactory";
import { createCountertopOpeningRequestedPolygon } from "@/engine/countertops/countertopOpeningGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createCountertopWorldPointFromLocal } from "../../interaction/countertops/countertopPointerProjection";

const COUNTERTOP_DRAFT_OVERLAY_Z_OFFSET_INCHES = 0.06;
const CUTOUT_DRAFT_STROKE_COLOR = "#ef4444";
const CUTOUT_DRAFT_LINE_WIDTH = 2.5;
const CUTOUT_DRAFT_DASH_SIZE_INCHES = 2;
const CUTOUT_DRAFT_GAP_SIZE_INCHES = 1.5;
const CUTOUT_DRAFT_RENDER_ORDER = 160;

export function CountertopCutoutDraftOverlay() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const countertopCutoutDraft =
    activeSceneOperation?.kind === "countertop-cutout-draft"
      ? activeSceneOperation.countertopCutoutDraft
      : null;
  const hostCountertop = countertopCutoutDraft === null
    ? undefined
    : placedAssemblies.find((assembly) => assembly.id === countertopCutoutDraft.hostCountertopId);
  const draftOpening = useMemo(
    () =>
      countertopCutoutDraft === null
        ? null
        : createRequestedCountertopOpeningFromDraft({
            hostCountertopId: countertopCutoutDraft.hostCountertopId,
            shapeKind: countertopCutoutDraft.shapeKind,
            startLocalInches: countertopCutoutDraft.startLocalInches,
            currentLocalInches: countertopCutoutDraft.currentLocalInches,
          }),
    [countertopCutoutDraft],
  );
  const linePoints = useMemo(() => {
    if (draftOpening === null || hostCountertop === undefined) {
      return [];
    }

    return createCountertopOpeningRequestedPolygon(draftOpening)
      .map((pointInches) =>
        createCountertopWorldPointFromLocal(
          hostCountertop,
          pointInches,
          COUNTERTOP_DRAFT_OVERLAY_Z_OFFSET_INCHES,
        ),
      )
      .map((pointInches) => [
        pointInches.xInches,
        pointInches.yInches,
        pointInches.zInches,
      ] as [number, number, number]);
  }, [draftOpening, hostCountertop]);

  if (activeSceneViewMode === "elevation" || linePoints.length < 3) {
    return null;
  }

  return (
    <Line
      points={[...linePoints, linePoints[0]]}
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
