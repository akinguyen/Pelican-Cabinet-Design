import type { PlacedWallGraph } from "./placedWallGraphTypes";
import {
  type CabinetPlacementRequirement,
  type WallFaceSide,
} from "./placedWallSegmentTypes";






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

export function updateWallSegmentCabinetPlacementFacePolicyInGraphs(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
  requirement: CabinetPlacementRequirement;
}): readonly PlacedWallGraph[] {
  return args.placedWallGraphs.map((wallGraph) => (
    wallGraph.id === args.wallGraphId
      ? {
          ...wallGraph,
          segments: wallGraph.segments.map((wallSegment) => (
            wallSegment.id === args.wallSegmentId
              ? {
                  ...wallSegment,
                  cabinetPlacementFacePolicies: {
                    ...wallSegment.cabinetPlacementFacePolicies,
                    [args.faceSide]: args.requirement,
                  },
                }
              : wallSegment
          )),
        }
      : wallGraph
  ));
}
