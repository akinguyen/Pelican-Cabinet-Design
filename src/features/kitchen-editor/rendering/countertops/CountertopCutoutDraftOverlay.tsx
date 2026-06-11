"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { createRequestedCountertopOpeningFromDraft } from "@/engine/countertops/countertopOpeningFactory";
import { createCountertopOpeningRequestedPolygon } from "@/engine/countertops/countertopOpeningGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createCountertopWorldPointFromLocal } from "../../interaction/countertops/countertopPointerProjection";

const COUNTERTOP_DRAFT_OVERLAY_Z_OFFSET_INCHES = 0.06;

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
      color="#ef4444"
      lineWidth={2}
      dashed
      dashSize={2}
      gapSize={1.5}
    />
  );
}
