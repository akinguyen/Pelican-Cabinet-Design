import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import { getClosedPolygonEdges, projectPointToSegment } from "../footprint/wallFootprintGeometry";
import type { WallFootprintDraft, WallFootprintSnapTarget } from "./wallFootprintDraftTypes";
import { getActiveWallFootprintDraftPoint } from "./wallFootprintDraftSelectors";

const WALL_FOOTPRINT_DRAFT_POINT_SNAP_THRESHOLD_INCHES = 3;
const WALL_FOOTPRINT_DRAFT_EDGE_SNAP_THRESHOLD_INCHES = 5;
const MIN_CLOSE_LOOP_POINT_COUNT = 3;

export function findDraftPointSnapTarget(args: {
  pointInches: Point3DInches;
  draft: WallFootprintDraft;
}): Extract<WallFootprintSnapTarget, { kind: "draft-point" }> | null {
  const activePoint = getActiveWallFootprintDraftPoint(args.draft);

  if (activePoint === null) {
    return null;
  }

  let nearestTarget: Extract<WallFootprintSnapTarget, { kind: "draft-point" }> | null = null;
  let nearestDistanceInches = Number.POSITIVE_INFINITY;

  args.draft.points.forEach((draftPoint, pointIndex) => {
    if (draftPoint.id === activePoint.id) {
      return;
    }

    if (pointIndex === args.draft.points.length - 2) {
      return;
    }

    const distanceInches = getPoint3DDistanceInches(args.pointInches, draftPoint.pointInches);

    if (distanceInches > WALL_FOOTPRINT_DRAFT_POINT_SNAP_THRESHOLD_INCHES || distanceInches >= nearestDistanceInches) {
      return;
    }

    nearestDistanceInches = distanceInches;
    nearestTarget = {
      kind: "draft-point",
      pointId: draftPoint.id,
      pointInches: draftPoint.pointInches,
      canCloseLoop: args.draft.points.length >= MIN_CLOSE_LOOP_POINT_COUNT,
    };
  });

  return nearestTarget;
}

export function findPlacedWallPointSnapTarget(args: {
  pointInches: Point3DInches;
  placedWalls: readonly PlacedWall[];
}): Extract<WallFootprintSnapTarget, { kind: "placed-wall-point" }> | null {
  let nearestTarget: Extract<WallFootprintSnapTarget, { kind: "placed-wall-point" }> | null = null;
  let nearestDistanceInches = Number.POSITIVE_INFINITY;

  args.placedWalls.forEach((placedWall) => {
    placedWall.footprint.boundaryPointsInches.forEach((boundaryPointInches, pointIndex) => {
      const distanceInches = getPoint3DDistanceInches(args.pointInches, boundaryPointInches);

      if (distanceInches > WALL_FOOTPRINT_DRAFT_POINT_SNAP_THRESHOLD_INCHES || distanceInches >= nearestDistanceInches) {
        return;
      }

      nearestDistanceInches = distanceInches;
      nearestTarget = {
        kind: "placed-wall-point",
        placedWallId: placedWall.id,
        pointIndex,
        pointInches: boundaryPointInches,
      };
    });
  });

  return nearestTarget;
}

export function findPlacedWallEdgeSnapTarget(args: {
  pointInches: Point3DInches;
  placedWalls: readonly PlacedWall[];
}): Extract<WallFootprintSnapTarget, { kind: "placed-wall-edge" }> | null {
  let nearestTarget: Extract<WallFootprintSnapTarget, { kind: "placed-wall-edge" }> | null = null;
  let nearestDistanceInches = Number.POSITIVE_INFINITY;

  args.placedWalls.forEach((placedWall) => {
    getClosedPolygonEdges(placedWall.footprint.boundaryPointsInches).forEach((edge, edgeIndex) => {
      const projectedPoint = projectPointToSegment({
        pointInches: args.pointInches,
        segmentStartInches: edge.startPointInches,
        segmentEndInches: edge.endPointInches,
      });

      if (
        projectedPoint.t <= 0.02 ||
        projectedPoint.t >= 0.98 ||
        projectedPoint.distanceInches > WALL_FOOTPRINT_DRAFT_EDGE_SNAP_THRESHOLD_INCHES ||
        projectedPoint.distanceInches >= nearestDistanceInches
      ) {
        return;
      }

      nearestDistanceInches = projectedPoint.distanceInches;
      nearestTarget = {
        kind: "placed-wall-edge",
        placedWallId: placedWall.id,
        edgeStartIndex: edgeIndex,
        edgeEndIndex: (edgeIndex + 1) % placedWall.footprint.boundaryPointsInches.length,
        pointInches: projectedPoint.pointInches,
        edgeStartPointInches: edge.startPointInches,
        edgeEndPointInches: edge.endPointInches,
        splitStartLengthInches: getPoint3DDistanceInches(edge.startPointInches, projectedPoint.pointInches),
        splitEndLengthInches: getPoint3DDistanceInches(projectedPoint.pointInches, edge.endPointInches),
      };
    });
  });

  return nearestTarget;
}
