import type { PlacedWall } from "../wallTypes";
import { getWallFootprintEdgeCount } from "../footprint/wallFootprintGeometry";

export function sanitizeWallViewableEdgeIndices(args: {
  edgeCount: number;
  viewableEdgeIndices: readonly number[] | undefined;
}): readonly number[] {
  if (args.edgeCount <= 0) {
    return [];
  }

  if (args.viewableEdgeIndices === undefined) {
    return Array.from({ length: args.edgeCount }, (_, edgeIndex) => edgeIndex);
  }

  const validIndices = new Set<number>();

  args.viewableEdgeIndices.forEach((edgeIndex) => {
    if (Number.isInteger(edgeIndex) && edgeIndex >= 0 && edgeIndex < args.edgeCount) {
      validIndices.add(edgeIndex);
    }
  });

  return Array.from(validIndices).sort(
    (firstEdgeIndex, secondEdgeIndex) => firstEdgeIndex - secondEdgeIndex,
  );
}

export function getPlacedWallViewableEdgeIndices(placedWall: PlacedWall): readonly number[] {
  return sanitizeWallViewableEdgeIndices({
    edgeCount: getWallFootprintEdgeCount(placedWall.footprint),
    viewableEdgeIndices: placedWall.viewableEdgeIndices,
  });
}

export function getPlacedWallFirstViewableEdgeIndex(placedWall: PlacedWall): number | null {
  const viewableEdgeIndices = getPlacedWallViewableEdgeIndices(placedWall);
  return viewableEdgeIndices[0] ?? null;
}

export function getPlacedWallElevationEdgeCount(placedWall: PlacedWall): number {
  return getPlacedWallViewableEdgeIndices(placedWall).length;
}
