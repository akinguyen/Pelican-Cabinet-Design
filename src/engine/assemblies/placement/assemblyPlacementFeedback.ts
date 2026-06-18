import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { DerivedCountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { createAssemblyPlacementFootprint } from "./assemblyPlacementGeometry";
import type {
  AssemblyObjectAlignmentGuide,
  AssemblyPlacementFeedback,
  AssemblyPlacementResult,
  AssemblyPlacementSnapContext,
  AssemblyPlacementSnapTarget,
} from "./assemblyPlacementTypes";
import { alignAssemblyPlacementWithNearbyObjects } from "./assemblyObjectAlignmentGuides";
import { buildAssemblyWallMeasurementGuides } from "./assemblyWallMeasurementGuides";

export function createAssemblyPlacementFeedback(args: {
  placedAssembly: PlacedAssembly;
  placedWallGraphs?: readonly PlacedWallGraph[];
  snapContext?: AssemblyPlacementSnapContext;
  snapTarget?: AssemblyPlacementSnapTarget | null;
  objectAlignmentGuides?: readonly AssemblyObjectAlignmentGuide[];
}): AssemblyPlacementFeedback {
  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);
  const shouldBuildWallMeasurementGuides = args.snapContext?.movementSource === "floor-plan";

  return {
    placedAssembly: args.placedAssembly,
    footprint,
    isValid: true,
    invalidReason: null,
    snapTarget: args.snapTarget ?? null,
    wallMeasurementGuides: shouldBuildWallMeasurementGuides
      ? buildAssemblyWallMeasurementGuides({
        footprint,
        placedWallGraphs: args.placedWallGraphs ?? [],
      })
      : [],
    wallAttachmentHighlights: [],
    objectAlignmentGuides: args.objectAlignmentGuides ?? [],
  };
}

export function applyAssemblyPlacementRules(args: {
  placedAssembly: PlacedAssembly;
  placedWallGraphs: readonly PlacedWallGraph[];
  placedAssemblies: readonly PlacedAssembly[];
  designReservationZones?: readonly DesignReservationZone[];
  countertopOpenings?: readonly DerivedCountertopOpening[];
  movingAssemblyId?: string;
  snapContext?: AssemblyPlacementSnapContext;
}): AssemblyPlacementResult {
  const alignmentResult = alignAssemblyPlacementWithNearbyObjects({
    placedAssembly: args.placedAssembly,
    placedAssemblies: args.placedAssemblies,
    designReservationZones: args.designReservationZones ?? [],
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
      placedWallGraphs: args.placedWallGraphs,
      snapContext: args.snapContext,
      objectAlignmentGuides: alignmentResult.objectAlignmentGuides,
    }),
  };
}
