import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";

export type WallPlanMeasurementFrame = Readonly<{
  minXInches: number;
  maxXInches: number;
  minYInches: number;
  maxYInches: number;
  widthInches: number;
  depthInches: number;
  areaSquareFeet: number;
  centerPointInches: Point3DInches;
}>;

const SQUARE_INCHES_PER_SQUARE_FOOT = 144;
const MIN_WALL_PLAN_MEASUREMENT_LENGTH_INCHES = 0.5;

export function getWallPlanMeasurementFrame(
  placedWalls: readonly PlacedWall[],
): WallPlanMeasurementFrame | null {
  const boundaryPointsInches = placedWalls.flatMap(
    (placedWall) => placedWall.footprint.boundaryPointsInches,
  );

  if (boundaryPointsInches.length === 0) {
    return null;
  }

  const minXInches = Math.min(...boundaryPointsInches.map((point) => point.xInches));
  const maxXInches = Math.max(...boundaryPointsInches.map((point) => point.xInches));
  const minYInches = Math.min(...boundaryPointsInches.map((point) => point.yInches));
  const maxYInches = Math.max(...boundaryPointsInches.map((point) => point.yInches));
  const widthInches = maxXInches - minXInches;
  const depthInches = maxYInches - minYInches;

  if (
    widthInches < MIN_WALL_PLAN_MEASUREMENT_LENGTH_INCHES ||
    depthInches < MIN_WALL_PLAN_MEASUREMENT_LENGTH_INCHES
  ) {
    return null;
  }

  return {
    minXInches,
    maxXInches,
    minYInches,
    maxYInches,
    widthInches,
    depthInches,
    areaSquareFeet: (widthInches * depthInches) / SQUARE_INCHES_PER_SQUARE_FOOT,
    centerPointInches: {
      xInches: (minXInches + maxXInches) / 2,
      yInches: (minYInches + maxYInches) / 2,
      zInches: 0,
    },
  };
}
