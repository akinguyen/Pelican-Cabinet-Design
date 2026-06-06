import type { PlacedWall } from "./wallTypes";
import { getWallFootprintEdgeCount } from "./footprint/wallFootprintGeometry";
import { sanitizeWallViewableEdgeIndices } from "./elevation/wallViewableEdges";

export function updatePlacedWallHeight(args: {
  placedWalls: readonly PlacedWall[];
  placedWallId: string;
  heightInches: number;
}): readonly PlacedWall[] {
  return args.placedWalls.map((placedWall) =>
    placedWall.id === args.placedWallId
      ? {
          ...placedWall,
          heightInches: Math.max(1, args.heightInches),
        }
      : placedWall,
  );
}

export function deletePlacedWall(args: {
  placedWalls: readonly PlacedWall[];
  placedWallId: string;
}): readonly PlacedWall[] {
  return args.placedWalls.filter((placedWall) => placedWall.id !== args.placedWallId);
}

export function updatePlacedWallViewableEdge(args: {
  placedWalls: readonly PlacedWall[];
  placedWallId: string;
  edgeIndex: number;
  isViewable: boolean;
}): readonly PlacedWall[] {
  return args.placedWalls.map((placedWall) => {
    if (placedWall.id !== args.placedWallId) {
      return placedWall;
    }

    const edgeCount = getWallFootprintEdgeCount(placedWall.footprint);
    const currentViewableEdgeIndices = sanitizeWallViewableEdgeIndices({
      edgeCount,
      viewableEdgeIndices: placedWall.viewableEdgeIndices,
    });
    const nextViewableEdgeIndices = args.isViewable
      ? [...currentViewableEdgeIndices, args.edgeIndex]
      : currentViewableEdgeIndices.filter((viewableEdgeIndex) => viewableEdgeIndex !== args.edgeIndex);

    return {
      ...placedWall,
      viewableEdgeIndices: sanitizeWallViewableEdgeIndices({
        edgeCount,
        viewableEdgeIndices: nextViewableEdgeIndices,
      }),
    };
  });
}
