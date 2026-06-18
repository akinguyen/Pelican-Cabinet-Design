import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DerivedCountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { AssemblyPlacementSnapContext } from "./assemblyPlacementTypes";
import { alignAssemblyPlacementWithElevationObjects } from "./alignment/assemblyElevationObjectAlignment";
import { alignAssemblyPlacementWithPlanObjects } from "./alignment/assemblyPlanObjectAlignment";
import type {
  AssemblyObjectAlignmentConstraint,
  AssemblyObjectAlignmentResult,
} from "./alignment/assemblyObjectAlignmentTypes";

export type {
  AssemblyObjectAlignmentConstraint,
  AssemblyObjectAlignmentResult,
} from "./alignment/assemblyObjectAlignmentTypes";

export function alignAssemblyPlacementWithNearbyObjects(args: {
  placedAssembly: PlacedAssembly;
  placedAssemblies: readonly PlacedAssembly[];
  designReservationZones?: readonly DesignReservationZone[];
  placedWallGraphs?: readonly PlacedWallGraph[];
  countertopOpenings?: readonly DerivedCountertopOpening[];
  movingAssemblyId?: string;
  snapContext?: AssemblyPlacementSnapContext;
  constraint?: AssemblyObjectAlignmentConstraint;
}): AssemblyObjectAlignmentResult {
  const targetAssemblies = args.placedAssemblies.filter((placedAssembly) => (
    placedAssembly.id !== args.movingAssemblyId && placedAssembly.id !== args.placedAssembly.id
  ));

  if (args.snapContext?.movementSource === "elevation" && args.snapContext.elevationMoveFrame !== undefined) {
    return alignAssemblyPlacementWithElevationObjects({
      placedAssembly: args.placedAssembly,
      targetAssemblies,
      targetDesignReservationZones: args.designReservationZones ?? [],
      placedWallGraphs: args.placedWallGraphs ?? [],
      countertopOpenings: args.countertopOpenings ?? [],
      allPlacedAssemblies: args.placedAssemblies,
      elevationFrame: args.snapContext.elevationMoveFrame,
    });
  }

  return alignAssemblyPlacementWithPlanObjects({
    placedAssembly: args.placedAssembly,
    targetAssemblies,
    targetDesignReservationZones: args.designReservationZones ?? [],
    allPlacedAssemblies: args.placedAssemblies,
    placedWallGraphs: args.placedWallGraphs ?? [],
    countertopOpenings: args.countertopOpenings ?? [],
    constraint: args.constraint,
  });
}
