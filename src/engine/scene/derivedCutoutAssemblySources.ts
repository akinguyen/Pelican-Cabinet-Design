import { COUNTERTOP_DEFINITION_ID } from "@/engine/countertops/countertopDefinitionIds";
import { getAssemblyDefinition, type AssemblyDefinitionRegistry } from "../assemblies/assemblyRegistry";
import type { PlacedAssembly } from "../assemblies/placedAssemblyTypes";

export type DerivedCutoutAssemblySources = Readonly<{
  countertopOpeningAssemblies: readonly PlacedAssembly[];
  wallOpeningAssemblies: readonly PlacedAssembly[];
}>;

export function getPlacedAssembliesWithPositionedCandidate(args: {
  placedAssemblies: readonly PlacedAssembly[];
  positionedPlacementCandidate: PlacedAssembly | null;
}): readonly PlacedAssembly[] {
  if (args.positionedPlacementCandidate === null) {
    return args.placedAssemblies;
  }

  return [...args.placedAssemblies, args.positionedPlacementCandidate];
}

export function getDerivedCutoutAssemblySources(args: {
  placedAssemblies: readonly PlacedAssembly[];
  positionedPlacementCandidate: PlacedAssembly | null;
  registry: AssemblyDefinitionRegistry;
}): DerivedCutoutAssemblySources {
  const placedAssembliesWithCandidate = getPlacedAssembliesWithPositionedCandidate({
    placedAssemblies: args.placedAssemblies,
    positionedPlacementCandidate: args.positionedPlacementCandidate,
  });
  const countertopOpeningAssemblies: PlacedAssembly[] = [];
  const wallOpeningAssemblies: PlacedAssembly[] = [];

  for (const placedAssembly of placedAssembliesWithCandidate) {
    const definition = getAssemblyDefinition(args.registry, placedAssembly.definitionId);

    if (
      placedAssembly.definitionId === COUNTERTOP_DEFINITION_ID ||
      definition.cutoutBehavior?.countertop !== undefined
    ) {
      countertopOpeningAssemblies.push(placedAssembly);
    }

    if (definition.cutoutBehavior?.wall?.source === "elevation-projection") {
      wallOpeningAssemblies.push(placedAssembly);
    }
  }

  return {
    countertopOpeningAssemblies,
    wallOpeningAssemblies,
  };
}
