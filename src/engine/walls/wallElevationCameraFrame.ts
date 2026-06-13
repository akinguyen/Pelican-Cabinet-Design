import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallElevationViewZone } from "./wallElevationViewZone";
import {
  WALL_ELEVATION_FAR_PADDING_INCHES,
  WALL_ELEVATION_NEAR_PADDING_INCHES,
} from "./wallElevationViewZone";

const MIN_WALL_ELEVATION_DIMENSION_INCHES = 1;
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
}): WallElevationCameraFrame {
  const centerZInches = args.viewZone.wallHeightInches / 2;
  const faceLengthInches = Math.max(
    args.viewZone.faceLengthInches,
    MIN_WALL_ELEVATION_DIMENSION_INCHES,
  );
  const wallHeightInches = Math.max(
    args.viewZone.wallHeightInches,
    MIN_WALL_ELEVATION_DIMENSION_INCHES,
  );
  const horizontalPaddingInches = Math.max(
    faceLengthInches * WALL_ELEVATION_HORIZONTAL_FRAME_PADDING_RATIO,
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
    leftInches: -faceLengthInches / 2 - horizontalPaddingInches,
    rightInches: faceLengthInches / 2 + horizontalPaddingInches,
    topInches: wallHeightInches / 2 + topPaddingInches,
    bottomInches: -wallHeightInches / 2 - bottomPaddingInches,
    nearInches: WALL_ELEVATION_NEAR_PADDING_INCHES,
    farInches:
      WALL_ELEVATION_NEAR_PADDING_INCHES +
      args.viewZone.depthInches +
      WALL_ELEVATION_FAR_PADDING_INCHES,
    zoom: 1,
  };
}
