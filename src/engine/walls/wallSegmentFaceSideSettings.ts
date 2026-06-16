import type { PlacedWallGraph } from "./placedWallGraphTypes";
import {
  WALL_FACE_SIDES,
  type WallFaceSide,
} from "./placedWallSegmentTypes";

export function isWallFaceSide(value: unknown): value is WallFaceSide {
  return value === "side-a" || value === "side-b";
}

export function normalizeCabinetPlacementFaceSides(
  faceSides: readonly WallFaceSide[],
): readonly WallFaceSide[] {
  const faceSideSet = new Set(faceSides);

  return WALL_FACE_SIDES.filter((faceSide) => faceSideSet.has(faceSide));
}

export function updateWallSegmentPreferredViewFaceSideInGraphs(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  wallGraphId: string;
  wallSegmentId: string;
  preferredViewFaceSide: WallFaceSide;
}): readonly PlacedWallGraph[] {
  return args.placedWallGraphs.map((wallGraph) => (
    wallGraph.id === args.wallGraphId
      ? {
          ...wallGraph,
          segments: wallGraph.segments.map((wallSegment) => (
            wallSegment.id === args.wallSegmentId
              ? { ...wallSegment, preferredViewFaceSide: args.preferredViewFaceSide }
              : wallSegment
          )),
        }
      : wallGraph
  ));
}

export function updateWallSegmentCabinetPlacementFaceSidesInGraphs(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  wallGraphId: string;
  wallSegmentId: string;
  cabinetPlacementFaceSides: readonly WallFaceSide[];
}): readonly PlacedWallGraph[] {
  const cabinetPlacementFaceSides = normalizeCabinetPlacementFaceSides(args.cabinetPlacementFaceSides);

  return args.placedWallGraphs.map((wallGraph) => (
    wallGraph.id === args.wallGraphId
      ? {
          ...wallGraph,
          segments: wallGraph.segments.map((wallSegment) => (
            wallSegment.id === args.wallSegmentId
              ? { ...wallSegment, cabinetPlacementFaceSides }
              : wallSegment
          )),
        }
      : wallGraph
  ));
}
