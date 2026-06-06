import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import { getClosedPolygonEdges, projectPointToSegment } from "../footprint/wallFootprintGeometry";
import type { WallSplitAnchor } from "./wallSplitDraftTypes";

const WALL_SPLIT_POINT_SNAP_THRESHOLD_INCHES = 6;
const WALL_SPLIT_EDGE_SNAP_THRESHOLD_INCHES = 5;

export function findWallSplitAnchor(args: {
  pointInches: Point3DInches;
  placedWall: PlacedWall;
}): WallSplitAnchor | null {
  const pointAnchor = findWallSplitPointAnchor(args);

  if (pointAnchor !== null) {
    return pointAnchor;
  }

  return findWallSplitEdgeAnchor(args);
}

function findWallSplitPointAnchor(args: {
  pointInches: Point3DInches;
  placedWall: PlacedWall;
}): WallSplitAnchor | null {
  let nearestAnchor: WallSplitAnchor | null = null;
  let nearestDistanceInches = Number.POSITIVE_INFINITY;
  const pointsInches = args.placedWall.footprint.boundaryPointsInches;

  pointsInches.forEach((boundaryPointInches, pointIndex) => {
    const distanceInches = getPoint3DDistanceInches(args.pointInches, boundaryPointInches);

    if (
      distanceInches > WALL_SPLIT_POINT_SNAP_THRESHOLD_INCHES ||
      distanceInches >= nearestDistanceInches
    ) {
      return;
    }

    const previousPointIndex = (pointIndex - 1 + pointsInches.length) % pointsInches.length;
    nearestDistanceInches = distanceInches;
    nearestAnchor = {
      placedWallId: args.placedWall.id,
      pointInches: boundaryPointInches,
      edgeStartIndex: previousPointIndex,
      edgeEndIndex: pointIndex,
      pointKind: "vertex",
      edgeStartPointInches: pointsInches[previousPointIndex],
      edgeEndPointInches: boundaryPointInches,
      splitStartLengthInches: 0,
      splitEndLengthInches: 0,
    };
  });

  return nearestAnchor;
}

function findWallSplitEdgeAnchor(args: {
  pointInches: Point3DInches;
  placedWall: PlacedWall;
}): WallSplitAnchor | null {
  let nearestAnchor: WallSplitAnchor | null = null;
  let nearestDistanceInches = Number.POSITIVE_INFINITY;
  const boundaryPointsInches = args.placedWall.footprint.boundaryPointsInches;

  getClosedPolygonEdges(boundaryPointsInches).forEach((edge, edgeIndex) => {
    const projectedPoint = projectPointToSegment({
      pointInches: args.pointInches,
      segmentStartInches: edge.startPointInches,
      segmentEndInches: edge.endPointInches,
    });

    if (
      projectedPoint.t <= 0.02 ||
      projectedPoint.t >= 0.98 ||
      projectedPoint.distanceInches > WALL_SPLIT_EDGE_SNAP_THRESHOLD_INCHES ||
      projectedPoint.distanceInches >= nearestDistanceInches
    ) {
      return;
    }

    nearestDistanceInches = projectedPoint.distanceInches;
    nearestAnchor = {
      placedWallId: args.placedWall.id,
      pointInches: projectedPoint.pointInches,
      edgeStartIndex: edgeIndex,
      edgeEndIndex: (edgeIndex + 1) % boundaryPointsInches.length,
      pointKind: "edge-body",
      edgeStartPointInches: edge.startPointInches,
      edgeEndPointInches: edge.endPointInches,
      splitStartLengthInches: getPoint3DDistanceInches(edge.startPointInches, projectedPoint.pointInches),
      splitEndLengthInches: getPoint3DDistanceInches(projectedPoint.pointInches, edge.endPointInches),
    };
  });

  return nearestAnchor;
}
