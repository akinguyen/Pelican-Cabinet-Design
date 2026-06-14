import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { createAssemblyPlacementFootprint } from "./assemblyPlacementGeometry";
import type {
  AssemblyObjectAlignmentGuide,
  AssemblyPlacementFeedback,
  AssemblyPlacementResult,
  AssemblyPlacementSnapContext,
  AssemblyPlacementSnapTarget,
} from "./assemblyPlacementTypes";
import { alignAssemblyPlacementWithNearbyObjects } from "./assemblyObjectAlignmentGuides";

export function createAssemblyPlacementFeedback(args: {
  placedAssembly: PlacedAssembly;
  snapTarget?: AssemblyPlacementSnapTarget | null;
  objectAlignmentGuides?: readonly AssemblyObjectAlignmentGuide[];
}): AssemblyPlacementFeedback {
  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);

  return {
    placedAssembly: args.placedAssembly,
    footprint,
    isValid: true,
    invalidReason: null,
    snapTarget: args.snapTarget ?? null,
    wallMeasurementGuides: [],
    wallAttachmentHighlights: [],
    objectAlignmentGuides: args.objectAlignmentGuides ?? [],
  };
}

export function applyAssemblyPlacementRules(args: {
  placedAssembly: PlacedAssembly;
  placedWallGraphs: readonly PlacedWallGraph[];
  placedAssemblies: readonly PlacedAssembly[];
  countertopOpenings?: readonly CountertopOpening[];
  movingAssemblyId?: string;
  snapContext?: AssemblyPlacementSnapContext;
}): AssemblyPlacementResult {
  const alignmentResult = alignAssemblyPlacementWithNearbyObjects({
    placedAssembly: args.placedAssembly,
    placedAssemblies: args.placedAssemblies,
    placedWallGraphs: args.placedWallGraphs,
    countertopOpenings: args.countertopOpenings ?? [],
    movingAssemblyId: args.movingAssemblyId,
    snapContext: args.snapContext,
  });

  return {
    placedAssembly: alignmentResult.placedAssembly,
    feedback: createAssemblyPlacementFeedback({
      placedAssembly: alignmentResult.placedAssembly,
      snapTarget: alignmentResult.snapTarget,
      objectAlignmentGuides: alignmentResult.objectAlignmentGuides,
    }),
  };
}
