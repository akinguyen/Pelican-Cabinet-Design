import type { PlacedWallGraph } from "./placedWallGraphTypes";
import {
  type CabinetPlacementFacePolicies,
  type CabinetPlacementRequirement,
  type WallFaceSide,
} from "./placedWallSegmentTypes";

export function isWallFaceSide(value: unknown): value is WallFaceSide {
  return value === "side-a" || value === "side-b";
}

export function isCabinetPlacementRequirement(value: unknown): value is CabinetPlacementRequirement {
  return value === "none" || value === "optional" || value === "required";
}

export function normalizeCabinetPlacementFacePolicies(
  policies: CabinetPlacementFacePolicies,
): CabinetPlacementFacePolicies {
  return {
    "side-a": policies["side-a"],
    "side-b": policies["side-b"],
  };
}

export function getCabinetPlacementRequirementForFace(
  policies: CabinetPlacementFacePolicies,
  faceSide: WallFaceSide,
): CabinetPlacementRequirement {
  return policies[faceSide];
}

export function canPlaceCabinetOnFace(
  policies: CabinetPlacementFacePolicies,
  faceSide: WallFaceSide,
): boolean {
  return getCabinetPlacementRequirementForFace(policies, faceSide) !== "none";
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
