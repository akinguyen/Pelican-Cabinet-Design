"use client";

import { memo, useCallback } from "react";
import type { PointerEvent } from "react";
import type { Rect2DPixels, Size2DPixels } from "./elevationViewPaddingMaskFrame";

const ELEVATION_PADDING_MASK_BACKGROUND = "#f8fafc";

const ELEVATION_PADDING_MASK_CLASS_NAME = "absolute";

type ElevationViewPaddingMaskOverlayProps = Readonly<{
  viewportSizePixels: Size2DPixels;
  wallFaceFramePixels: Rect2DPixels | null;
  onEmptyPointerDown?: () => void;
  opacity?: number;
  isInteractive?: boolean;
  transitionDurationMs?: number;
}>;

export const ElevationViewPaddingMaskOverlay = memo(function ElevationViewPaddingMaskOverlay({
  viewportSizePixels,
  wallFaceFramePixels,
  onEmptyPointerDown,
  opacity = 1,
  isInteractive = true,
  transitionDurationMs = 0,
}: ElevationViewPaddingMaskOverlayProps) {
  if (wallFaceFramePixels === null) {
    return null;
  }

  const rightPixels = wallFaceFramePixels.leftPixels + wallFaceFramePixels.widthPixels;
  const bottomPixels = wallFaceFramePixels.topPixels + wallFaceFramePixels.heightPixels;
  const maskPointerClassName = isInteractive ? "pointer-events-auto" : "pointer-events-none";

  const handleMaskPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!isInteractive || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    onEmptyPointerDown?.();
  }, [isInteractive, onEmptyPointerDown]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        opacity,
        transition: transitionDurationMs > 0 ? `opacity ${transitionDurationMs}ms ease-out` : undefined,
      }}
    >
      <div
        className={`${ELEVATION_PADDING_MASK_CLASS_NAME} ${maskPointerClassName}`}
        onPointerDown={handleMaskPointerDown}
        style={{
          backgroundColor: ELEVATION_PADDING_MASK_BACKGROUND,
          left: 0,
          top: 0,
          width: viewportSizePixels.widthPixels,
          height: wallFaceFramePixels.topPixels,
        }}
      />
      <div
        className={`${ELEVATION_PADDING_MASK_CLASS_NAME} ${maskPointerClassName}`}
        onPointerDown={handleMaskPointerDown}
        style={{
          backgroundColor: ELEVATION_PADDING_MASK_BACKGROUND,
          left: 0,
          top: bottomPixels,
          width: viewportSizePixels.widthPixels,
          height: Math.max(0, viewportSizePixels.heightPixels - bottomPixels),
        }}
      />
      <div
        className={`${ELEVATION_PADDING_MASK_CLASS_NAME} ${maskPointerClassName}`}
        onPointerDown={handleMaskPointerDown}
        style={{
          backgroundColor: ELEVATION_PADDING_MASK_BACKGROUND,
          left: 0,
          top: wallFaceFramePixels.topPixels,
          width: wallFaceFramePixels.leftPixels,
          height: wallFaceFramePixels.heightPixels,
        }}
      />
      <div
        className={`${ELEVATION_PADDING_MASK_CLASS_NAME} ${maskPointerClassName}`}
        onPointerDown={handleMaskPointerDown}
        style={{
          backgroundColor: ELEVATION_PADDING_MASK_BACKGROUND,
          left: rightPixels,
          top: wallFaceFramePixels.topPixels,
          width: Math.max(0, viewportSizePixels.widthPixels - rightPixels),
          height: wallFaceFramePixels.heightPixels,
        }}
      />
    </div>
  );
});
