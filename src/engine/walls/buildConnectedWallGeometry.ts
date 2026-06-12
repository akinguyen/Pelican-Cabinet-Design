import type { PlacedWallGraph } from "./placedWallGraphTypes";
import type { BuiltConnectedWallGeometry } from "./connectedWallGeometryTypes";
import { buildConnectedSegmentsByNodeId, buildWallSegmentBody, createWallSegmentFaces } from "./wallSegmentGeometry";

export function buildConnectedWallGeometry(
  wallGraph: PlacedWallGraph,
): BuiltConnectedWallGeometry {
  const connectedSegmentsByNodeId = buildConnectedSegmentsByNodeId(wallGraph.segments);
  const segmentBodies = wallGraph.segments
    .map((wallSegment) => buildWallSegmentBody({
      wallGraphId: wallGraph.id,
      wallSegment,
      placedWallNodes: wallGraph.nodes,
      connectedSegmentsByNodeId,
    }))
    .filter(isBuiltWallSegmentBody);
  const faces = segmentBodies.flatMap(createWallSegmentFaces);

  return {
    wallGraphId: wallGraph.id,
    segmentBodies,
    faces,
    footprintPolygonsInches: segmentBodies.map((segmentBody) => segmentBody.footprintPolygonInches),
  };
}

function isBuiltWallSegmentBody<T>(body: T | null): body is T {
  return body !== null;
}
