import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import {
  doWallFootprintSegmentsIntersect,
  getClosedPolygonEdges,
  getPolygonAreaSquareInches,
  removeDuplicateAdjacentPoints,
} from "./wallFootprintGeometry";

const MIN_WALL_FOOTPRINT_EDGE_LENGTH_INCHES = 0.5;
const MIN_WALL_FOOTPRINT_AREA_SQUARE_INCHES = 1;

export function validateWallFootprintPoints(
  boundaryPointsInches: readonly Point3DInches[],
): boolean {
  const normalizedPointsInches = removeDuplicateAdjacentPoints(boundaryPointsInches);

  if (normalizedPointsInches.length < 3) {
    return false;
  }

  if (hasTinyEdges(normalizedPointsInches)) {
    return false;
  }

  if (
    Math.abs(getPolygonAreaSquareInches(normalizedPointsInches)) <
    MIN_WALL_FOOTPRINT_AREA_SQUARE_INCHES
  ) {
    return false;
  }

  return !isSelfIntersectingPolygon(normalizedPointsInches);
}

function hasTinyEdges(pointsInches: readonly Point3DInches[]): boolean {
  return getClosedPolygonEdges(pointsInches).some(
    (edge) =>
      getPoint3DDistanceInches(edge.startPointInches, edge.endPointInches) <
      MIN_WALL_FOOTPRINT_EDGE_LENGTH_INCHES,
  );
}

function isSelfIntersectingPolygon(pointsInches: readonly Point3DInches[]): boolean {
  const edges = getClosedPolygonEdges(pointsInches);

  for (let firstEdgeIndex = 0; firstEdgeIndex < edges.length; firstEdgeIndex += 1) {
    for (
      let secondEdgeIndex = firstEdgeIndex + 1;
      secondEdgeIndex < edges.length;
      secondEdgeIndex += 1
    ) {
      if (areAdjacentPolygonEdges(firstEdgeIndex, secondEdgeIndex, edges.length)) {
        continue;
      }

      if (doWallFootprintSegmentsIntersect(edges[firstEdgeIndex], edges[secondEdgeIndex])) {
        return true;
      }
    }
  }

  return false;
}

function areAdjacentPolygonEdges(
  firstEdgeIndex: number,
  secondEdgeIndex: number,
  edgeCount: number,
): boolean {
  return (
    Math.abs(firstEdgeIndex - secondEdgeIndex) === 1 ||
    (firstEdgeIndex === 0 && secondEdgeIndex === edgeCount - 1)
  );
}
