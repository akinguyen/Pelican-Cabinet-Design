import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallElevationViewZone } from "./wallElevationViewZone";
import {
  WALL_ELEVATION_FAR_PADDING_INCHES,
  WALL_ELEVATION_NEAR_PADDING_INCHES,
} from "./wallElevationViewZone";

const MIN_WALL_ELEVATION_DIMENSION_INCHES = 1;
const MIN_WALL_ELEVATION_VIEWPORT_DIMENSION_PIXELS = 1;
const WALL_ELEVATION_HORIZONTAL_FRAME_PADDING_RATIO = 0.12;
const WALL_ELEVATION_VERTICAL_TOP_FRAME_PADDING_RATIO = 0.16;
const WALL_ELEVATION_VERTICAL_BOTTOM_FRAME_PADDING_RATIO = 0.12;
const WALL_ELEVATION_MIN_HORIZONTAL_FRAME_PADDING_INCHES = 18;
const WALL_ELEVATION_MIN_TOP_FRAME_PADDING_INCHES = 18;
const WALL_ELEVATION_MIN_BOTTOM_FRAME_PADDING_INCHES = 12;

export type WallElevationCameraFrame = Readonly<{
  cameraPositionInches: Point3DInches;
  cameraTargetInches: Point3DInches;
  leftInches: number;
  rightInches: number;
  topInches: number;
  bottomInches: number;
  nearInches: number;
  farInches: number;
  zoom: number;
}>;

export function createWallElevationCameraFrame(args: {
  viewZone: WallElevationViewZone;
  viewportWidthPixels: number;
  viewportHeightPixels: number;
}): WallElevationCameraFrame {
  const centerZInches = args.viewZone.wallHeightInches / 2;
  const viewFrameWidthInches = Math.max(
    args.viewZone.viewFrameRightInches - args.viewZone.viewFrameLeftInches,
    MIN_WALL_ELEVATION_DIMENSION_INCHES,
  );
  const wallHeightInches = Math.max(
    args.viewZone.wallHeightInches,
    MIN_WALL_ELEVATION_DIMENSION_INCHES,
  );
  const horizontalPaddingInches = Math.max(
    viewFrameWidthInches * WALL_ELEVATION_HORIZONTAL_FRAME_PADDING_RATIO,
    WALL_ELEVATION_MIN_HORIZONTAL_FRAME_PADDING_INCHES,
  );
  const topPaddingInches = Math.max(
    wallHeightInches * WALL_ELEVATION_VERTICAL_TOP_FRAME_PADDING_RATIO,
    WALL_ELEVATION_MIN_TOP_FRAME_PADDING_INCHES,
  );
  const bottomPaddingInches = Math.max(
    wallHeightInches * WALL_ELEVATION_VERTICAL_BOTTOM_FRAME_PADDING_RATIO,
    WALL_ELEVATION_MIN_BOTTOM_FRAME_PADDING_INCHES,
  );

  const wallFaceFrameBoundsInches = fitWallElevationFrameToViewportAspect({
    leftInches: args.viewZone.viewFrameLeftInches - horizontalPaddingInches,
    rightInches: args.viewZone.viewFrameRightInches + horizontalPaddingInches,
    topInches: wallHeightInches / 2 + topPaddingInches,
    bottomInches: -wallHeightInches / 2 - bottomPaddingInches,
    viewportWidthPixels: args.viewportWidthPixels,
    viewportHeightPixels: args.viewportHeightPixels,
  });

  return {
    cameraPositionInches: {
      xInches:
        args.viewZone.faceCenterInches.xInches +
        args.viewZone.outwardDirectionInches.xInches *
          (args.viewZone.depthInches + WALL_ELEVATION_NEAR_PADDING_INCHES),
      yInches:
        args.viewZone.faceCenterInches.yInches +
        args.viewZone.outwardDirectionInches.yInches *
          (args.viewZone.depthInches + WALL_ELEVATION_NEAR_PADDING_INCHES),
      zInches: centerZInches,
    },
    cameraTargetInches: {
      xInches: args.viewZone.faceCenterInches.xInches,
      yInches: args.viewZone.faceCenterInches.yInches,
      zInches: centerZInches,
    },
    leftInches: wallFaceFrameBoundsInches.leftInches,
    rightInches: wallFaceFrameBoundsInches.rightInches,
    topInches: wallFaceFrameBoundsInches.topInches,
    bottomInches: wallFaceFrameBoundsInches.bottomInches,
    nearInches: WALL_ELEVATION_NEAR_PADDING_INCHES,
    farInches:
      WALL_ELEVATION_NEAR_PADDING_INCHES +
      args.viewZone.depthInches +
      args.viewZone.behindFaceDepthInches +
      WALL_ELEVATION_FAR_PADDING_INCHES,
    zoom: 1,
  };
}

type WallElevationFrameBoundsInches = Readonly<{
  leftInches: number;
  rightInches: number;
  topInches: number;
  bottomInches: number;
}>;

function fitWallElevationFrameToViewportAspect(args: WallElevationFrameBoundsInches & {
  viewportWidthPixels: number;
  viewportHeightPixels: number;
}): WallElevationFrameBoundsInches {
  const frameWidthInches = args.rightInches - args.leftInches;
  const frameHeightInches = args.topInches - args.bottomInches;

  if (frameWidthInches <= 0 || frameHeightInches <= 0) {
    return args;
  }

  const viewportWidthPixels = Math.max(
    args.viewportWidthPixels,
    MIN_WALL_ELEVATION_VIEWPORT_DIMENSION_PIXELS,
  );
  const viewportHeightPixels = Math.max(
    args.viewportHeightPixels,
    MIN_WALL_ELEVATION_VIEWPORT_DIMENSION_PIXELS,
  );
  const viewportAspectRatio = viewportWidthPixels / viewportHeightPixels;
  const frameAspectRatio = frameWidthInches / frameHeightInches;

  if (viewportAspectRatio > frameAspectRatio) {
    const fittedFrameWidthInches = frameHeightInches * viewportAspectRatio;
    const horizontalExpansionInches = (fittedFrameWidthInches - frameWidthInches) / 2;

    return {
      leftInches: args.leftInches - horizontalExpansionInches,
      rightInches: args.rightInches + horizontalExpansionInches,
      topInches: args.topInches,
      bottomInches: args.bottomInches,
    };
  }

  const fittedFrameHeightInches = frameWidthInches / viewportAspectRatio;
  const verticalExpansionInches = (fittedFrameHeightInches - frameHeightInches) / 2;

  return {
    leftInches: args.leftInches,
    rightInches: args.rightInches,
    topInches: args.topInches + verticalExpansionInches,
    bottomInches: args.bottomInches - verticalExpansionInches,
  };
}
