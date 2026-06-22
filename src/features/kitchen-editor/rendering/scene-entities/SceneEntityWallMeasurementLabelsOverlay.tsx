"use client";

import { memo } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneEntityWallMeasurementLabelScreenItem } from "@/engine/scene/designSceneStoreTypes";
import type { Rect2DPixels, Size2DPixels } from "../../editors/elevation/elevationViewPaddingMaskFrame";
import { formatFeetInchesLabel } from "../../formatting/kitchenEditorLabelFormatting";

const MEASUREMENT_LABEL_OVERLAY_PADDING_PIXELS = 32;
const MEASUREMENT_LABEL_OVERLAY_Z_INDEX = 15;

export const SceneEntityWallMeasurementLabelsOverlay = memo(function SceneEntityWallMeasurementLabelsOverlay({
  viewportSizePixels,
  wallFaceFramePixels,
}: Readonly<{
  viewportSizePixels: Size2DPixels;
  wallFaceFramePixels: Rect2DPixels | null;
}>) {
  const screenItems = useDesignSceneStore((state) => state.activeSceneEntityWallMeasurementLabelScreenItems);

  if (wallFaceFramePixels === null || screenItems.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: MEASUREMENT_LABEL_OVERLAY_Z_INDEX }}
    >
      {screenItems.map((screenItem) => (
        <SceneEntityWallMeasurementLabel
          key={screenItem.id}
          screenItem={screenItem}
          viewportSizePixels={viewportSizePixels}
          wallFaceFramePixels={wallFaceFramePixels}
        />
      ))}
    </div>
  );
});

function SceneEntityWallMeasurementLabel({
  screenItem,
  viewportSizePixels,
  wallFaceFramePixels,
}: Readonly<{
  screenItem: SceneEntityWallMeasurementLabelScreenItem;
  viewportSizePixels: Size2DPixels;
  wallFaceFramePixels: Rect2DPixels;
}>) {
  const xPixels = clamp(
    screenItem.xPixels,
    wallFaceFramePixels.leftPixels + MEASUREMENT_LABEL_OVERLAY_PADDING_PIXELS,
    Math.min(
      viewportSizePixels.widthPixels - MEASUREMENT_LABEL_OVERLAY_PADDING_PIXELS,
      wallFaceFramePixels.leftPixels + wallFaceFramePixels.widthPixels - MEASUREMENT_LABEL_OVERLAY_PADDING_PIXELS,
    ),
  );
  const yPixels = clamp(
    screenItem.yPixels,
    wallFaceFramePixels.topPixels + MEASUREMENT_LABEL_OVERLAY_PADDING_PIXELS,
    Math.min(
      viewportSizePixels.heightPixels - MEASUREMENT_LABEL_OVERLAY_PADDING_PIXELS,
      wallFaceFramePixels.topPixels + wallFaceFramePixels.heightPixels - MEASUREMENT_LABEL_OVERLAY_PADDING_PIXELS,
    ),
  );

  return (
    <div
      className="absolute inline-flex whitespace-nowrap text-[12px] font-bold leading-none text-slate-800"
      style={{
        left: xPixels,
        top: yPixels,
        transform: `translate(-50%, -50%) rotate(${-screenItem.labelRotationDegrees}deg)`,
        transformOrigin: "center",
        textShadow: "0 1px 2px rgba(255,255,255,0.98), 0 -1px 2px rgba(255,255,255,0.98), 1px 0 2px rgba(255,255,255,0.98), -1px 0 2px rgba(255,255,255,0.98)",
        willChange: "transform",
      }}
    >
      {formatFeetInchesLabel(screenItem.lengthInches)}
    </div>
  );
}

function clamp(value: number, minValue: number, maxValue: number): number {
  if (maxValue < minValue) {
    return (minValue + maxValue) / 2;
  }

  return Math.min(maxValue, Math.max(minValue, value));
}
