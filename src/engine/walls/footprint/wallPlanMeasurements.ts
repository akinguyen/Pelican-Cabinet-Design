import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import { getClosedPolygonEdges } from "./wallFootprintGeometry";

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

export type WallPlanEdgeMeasurement = Readonly<{
  id: string;
  placedWallId: string;
  edgeIndex: number;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
  midpointInches: Point3DInches;
  labelRotationDegrees: number;
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

export function getWallPlanEdgeMeasurements(
  placedWalls: readonly PlacedWall[],
): readonly WallPlanEdgeMeasurement[] {
  return placedWalls.flatMap((placedWall) => (
    getClosedPolygonEdges(placedWall.footprint.boundaryPointsInches).flatMap((edge, edgeIndex) => {
      const lengthInches = getPoint3DDistanceInches(edge.startPointInches, edge.endPointInches);

      if (lengthInches < MIN_WALL_PLAN_MEASUREMENT_LENGTH_INCHES) {
        return [];
      }

      return [{
        id: `${placedWall.id}-wall-plan-edge-${edgeIndex}`,
        placedWallId: placedWall.id,
        edgeIndex,
        startPointInches: edge.startPointInches,
        endPointInches: edge.endPointInches,
        lengthInches,
        midpointInches: {
          xInches: (edge.startPointInches.xInches + edge.endPointInches.xInches) / 2,
          yInches: (edge.startPointInches.yInches + edge.endPointInches.yInches) / 2,
          zInches: 0,
        },
        labelRotationDegrees: getReadableEdgeLabelRotationDegrees(edge.startPointInches, edge.endPointInches),
      }];
    })
  ));
}

function getReadableEdgeLabelRotationDegrees(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): number {
  const deltaXInches = endPointInches.xInches - startPointInches.xInches;
  const deltaYInches = endPointInches.yInches - startPointInches.yInches;
  let rotationDegrees = (Math.atan2(deltaYInches, deltaXInches) * 180) / Math.PI;

  while (rotationDegrees > 90) {
    rotationDegrees -= 180;
  }

  while (rotationDegrees < -90) {
    rotationDegrees += 180;
  }

  return rotationDegrees;
}
