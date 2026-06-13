import type { WallElevationCameraFrame } from "@/engine/walls/wallElevationCameraFrame";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";

export type Size2DPixels = Readonly<{
  widthPixels: number;
  heightPixels: number;
}>;

export type Rect2DPixels = Readonly<{
  leftPixels: number;
  topPixels: number;
  widthPixels: number;
  heightPixels: number;
}>;

export function createWallElevationViewMaskFramePixels(args: {
  cameraFrame: WallElevationCameraFrame;
  viewZone: WallElevationViewZone;
  viewportSizePixels: Size2DPixels;
}): Rect2DPixels | null {
  const cameraWidthInches = args.cameraFrame.rightInches - args.cameraFrame.leftInches;
  const cameraHeightInches = args.cameraFrame.topInches - args.cameraFrame.bottomInches;

  if (
    cameraWidthInches <= 0 ||
    cameraHeightInches <= 0 ||
    args.viewportSizePixels.widthPixels <= 0 ||
    args.viewportSizePixels.heightPixels <= 0
  ) {
    return null;
  }

  const strictLeftInches = -args.viewZone.faceLengthInches / 2;
  const strictRightInches = args.viewZone.faceLengthInches / 2;
  const strictTopInches = args.viewZone.wallHeightInches / 2;
  const strictBottomInches = -args.viewZone.wallHeightInches / 2;

  const leftPixels = ((strictLeftInches - args.cameraFrame.leftInches) / cameraWidthInches) * args.viewportSizePixels.widthPixels;
  const rightPixels = ((strictRightInches - args.cameraFrame.leftInches) / cameraWidthInches) * args.viewportSizePixels.widthPixels;
  const topPixels = ((args.cameraFrame.topInches - strictTopInches) / cameraHeightInches) * args.viewportSizePixels.heightPixels;
  const bottomPixels = ((args.cameraFrame.topInches - strictBottomInches) / cameraHeightInches) * args.viewportSizePixels.heightPixels;

  const clampedLeftPixels = clamp(leftPixels, 0, args.viewportSizePixels.widthPixels);
  const clampedRightPixels = clamp(rightPixels, 0, args.viewportSizePixels.widthPixels);
  const clampedTopPixels = clamp(topPixels, 0, args.viewportSizePixels.heightPixels);
  const clampedBottomPixels = clamp(bottomPixels, 0, args.viewportSizePixels.heightPixels);

  if (clampedRightPixels <= clampedLeftPixels || clampedBottomPixels <= clampedTopPixels) {
    return null;
  }

  return {
    leftPixels: clampedLeftPixels,
    topPixels: clampedTopPixels,
    widthPixels: clampedRightPixels - clampedLeftPixels,
    heightPixels: clampedBottomPixels - clampedTopPixels,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
