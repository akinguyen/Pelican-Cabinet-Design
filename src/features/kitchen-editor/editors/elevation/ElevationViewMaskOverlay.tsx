"use client";

import type { Rect2DPixels, Size2DPixels } from "./elevationViewMaskFrame";

const ELEVATION_MASK_CLASS_NAME = "absolute bg-slate-50";

type ElevationViewMaskOverlayProps = Readonly<{
  viewportSizePixels: Size2DPixels;
  viewFramePixels: Rect2DPixels | null;
}>;

export function ElevationViewMaskOverlay({
  viewportSizePixels,
  viewFramePixels,
}: ElevationViewMaskOverlayProps) {
  if (viewFramePixels === null) {
    return null;
  }

  const rightPixels = viewFramePixels.leftPixels + viewFramePixels.widthPixels;
  const bottomPixels = viewFramePixels.topPixels + viewFramePixels.heightPixels;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className={`${ELEVATION_MASK_CLASS_NAME} pointer-events-auto`}
        style={{
          left: 0,
          top: 0,
          width: viewportSizePixels.widthPixels,
          height: viewFramePixels.topPixels,
        }}
      />
      <div
        className={`${ELEVATION_MASK_CLASS_NAME} pointer-events-auto`}
        style={{
          left: 0,
          top: bottomPixels,
          width: viewportSizePixels.widthPixels,
          height: Math.max(0, viewportSizePixels.heightPixels - bottomPixels),
        }}
      />
      <div
        className={`${ELEVATION_MASK_CLASS_NAME} pointer-events-auto`}
        style={{
          left: 0,
          top: viewFramePixels.topPixels,
          width: viewFramePixels.leftPixels,
          height: viewFramePixels.heightPixels,
        }}
      />
      <div
        className={`${ELEVATION_MASK_CLASS_NAME} pointer-events-auto`}
        style={{
          left: rightPixels,
          top: viewFramePixels.topPixels,
          width: Math.max(0, viewportSizePixels.widthPixels - rightPixels),
          height: viewFramePixels.heightPixels,
        }}
      />
    </div>
  );
}
