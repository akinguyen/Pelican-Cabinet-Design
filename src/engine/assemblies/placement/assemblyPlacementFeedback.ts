import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { createAssemblyPlacementFootprint } from "./assemblyPlacementGeometry";
import type { AssemblyPlacementFeedback, AssemblyPlacementResult } from "./assemblyPlacementTypes";

export function createAssemblyPlacementFeedback(args: {
  placedAssembly: PlacedAssembly;
}): AssemblyPlacementFeedback {
  return {
    placedAssembly: args.placedAssembly,
    footprint: createAssemblyPlacementFootprint(args.placedAssembly),
    isValid: true,
    invalidReason: null,
    snapTarget: null,
    wallMeasurementGuides: [],
  };
}

export function applyAssemblyWallPlacementRules(args: {
  placedAssembly: PlacedAssembly;
}): AssemblyPlacementResult {
  return {
    placedAssembly: args.placedAssembly,
    feedback: createAssemblyPlacementFeedback({ placedAssembly: args.placedAssembly }),
  };
}
