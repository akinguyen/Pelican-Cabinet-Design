import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallEdgeMeasurement, WallFootprint } from "./wallFootprintTypes";
import { getClosedPolygonEdges } from "./wallFootprintGeometry";

export function getWallFootprintEdgeMeasurements(
  footprint: WallFootprint,
): readonly WallEdgeMeasurement[] {
  return getClosedPolygonEdges(footprint.boundaryPointsInches).map((edge, edgeIndex) => ({
    id: `wall-edge-measurement-${edgeIndex}`,
    edgeIndex,
    startPointInches: edge.startPointInches,
    endPointInches: edge.endPointInches,
    lengthInches: getPoint3DDistanceInches(edge.startPointInches, edge.endPointInches),
  }));
}

export function getOpenPolylineEdgeMeasurements(
  pointsInches: readonly Point3DInches[],
): readonly WallEdgeMeasurement[] {
  return pointsInches.slice(0, -1).map((pointInches, pointIndex) => {
    const endPointInches = pointsInches[pointIndex + 1];

    return {
      id: `wall-footprint-draft-edge-measurement-${pointIndex}`,
      edgeIndex: pointIndex,
      startPointInches: pointInches,
      endPointInches,
      lengthInches: getPoint3DDistanceInches(pointInches, endPointInches),
    };
  });
}
