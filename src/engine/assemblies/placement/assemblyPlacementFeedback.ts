import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { createAssemblyPlacementFootprint } from "./assemblyPlacementGeometry";
import type { AssemblyPlacementFeedback, AssemblyPlacementResult } from "./assemblyPlacementTypes";
import { buildAssemblyWallAttachmentHighlights, buildAssemblyWallMeasurementGuides } from "./assemblyWallMeasurementGuides";
import { snapAssemblyPlacementToNearbyWalls } from "./assemblyWallPlacementSnapping";

export function createAssemblyPlacementFeedback(args: {
  placedAssembly: PlacedAssembly;
  placedWallGraphs?: readonly PlacedWallGraph[];
}): AssemblyPlacementFeedback {
  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);

  return {
    placedAssembly: args.placedAssembly,
    footprint,
    isValid: true,
    invalidReason: null,
    snapTarget: null,
    wallMeasurementGuides: buildAssemblyWallMeasurementGuides({
      footprint,
      placedWallGraphs: args.placedWallGraphs ?? [],
    }),
    wallAttachmentHighlights: buildAssemblyWallAttachmentHighlights({
      footprint,
      placedWallGraphs: args.placedWallGraphs ?? [],
    }),
  };
}

export function applyAssemblyWallPlacementRules(args: {
  placedAssembly: PlacedAssembly;
  placedWallGraphs: readonly PlacedWallGraph[];
}): AssemblyPlacementResult {
  const snappedPlacedAssembly = snapAssemblyPlacementToNearbyWalls({
    placedAssembly: args.placedAssembly,
    placedWallGraphs: args.placedWallGraphs,
  });

  return {
    placedAssembly: snappedPlacedAssembly,
    feedback: createAssemblyPlacementFeedback({
      placedAssembly: snappedPlacedAssembly,
      placedWallGraphs: args.placedWallGraphs,
    }),
  };
}
