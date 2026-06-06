import type { PlacedWall } from "./wallTypes";
import type { BuiltWall } from "./footprint/wallFootprintTypes";
import { getWallFootprintEdgeCount } from "./footprint/wallFootprintGeometry";
import { getWallFootprintEdgeMeasurements } from "./footprint/wallFootprintMeasurements";
import { sanitizeWallViewableEdgeIndices } from "./elevation/wallViewableEdges";

export function buildWall(placedWall: PlacedWall): BuiltWall {
  return {
    id: `built-${placedWall.id}`,
    placedWallId: placedWall.id,
    footprint: placedWall.footprint,
    heightInches: placedWall.heightInches,
    viewableEdgeIndices: sanitizeWallViewableEdgeIndices({
      edgeCount: getWallFootprintEdgeCount(placedWall.footprint),
      viewableEdgeIndices: placedWall.viewableEdgeIndices,
    }),
    edgeMeasurements: getWallFootprintEdgeMeasurements(placedWall.footprint),
  };
}
