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

export function createWallElevationPaddingMaskFramePixels(args: {
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

  const viewFrameLeftInches = args.viewZone.viewFrameLeftInches;
  const viewFrameRightInches = args.viewZone.viewFrameRightInches;
  const viewFrameTopInches = args.viewZone.viewFrameTopInches;
  const viewFrameBottomInches = args.viewZone.viewFrameBottomInches;

  const leftPixels = ((viewFrameLeftInches - args.cameraFrame.leftInches) / cameraWidthInches) * args.viewportSizePixels.widthPixels;
  const rightPixels = ((viewFrameRightInches - args.cameraFrame.leftInches) / cameraWidthInches) * args.viewportSizePixels.widthPixels;
  const topPixels = ((args.cameraFrame.topInches - viewFrameTopInches) / cameraHeightInches) * args.viewportSizePixels.heightPixels;
  const bottomPixels = ((args.cameraFrame.topInches - viewFrameBottomInches) / cameraHeightInches) * args.viewportSizePixels.heightPixels;

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
