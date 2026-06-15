import type {
  BuiltAssemblyTree,
  BuiltPrimitiveGeometry,
} from "@/engine/assemblies/assemblyTreeBuilder";
import { createCountertopOpeningClippedPolygon } from "./countertopOpeningGeometry";
import type { CountertopOpening } from "./countertopOpeningTypes";

const COUNTERTOP_SLAB_PRIMITIVE_ROLE = "countertop-slab";
const EMPTY_COUNTERTOP_OPENINGS: readonly CountertopOpening[] = [];

export function applyCountertopOpeningsToAssemblyTree(
  builtAssemblyTree: BuiltAssemblyTree,
  countertopOpenings: readonly CountertopOpening[],
): BuiltAssemblyTree {
  return applyCountertopOpeningMapToAssemblyTree(
    builtAssemblyTree,
    buildCountertopOpeningsByHostCountertopId(countertopOpenings),
  );
}

export function applyCountertopOpeningMapToAssemblyTree(
  builtAssemblyTree: BuiltAssemblyTree,
  countertopOpeningsByHostCountertopId: ReadonlyMap<string, readonly CountertopOpening[]>,
): BuiltAssemblyTree {
  return applyHostCountertopOpeningsToAssemblyTree(
    builtAssemblyTree,
    countertopOpeningsByHostCountertopId.get(builtAssemblyTree.rootAssemblyId) ?? EMPTY_COUNTERTOP_OPENINGS,
  );
}

export function applyHostCountertopOpeningsToAssemblyTree(
  builtAssemblyTree: BuiltAssemblyTree,
  hostCountertopOpenings: readonly CountertopOpening[],
): BuiltAssemblyTree {
  return {
    ...builtAssemblyTree,
    primitiveGeometries: builtAssemblyTree.primitiveGeometries.map((primitiveGeometry) =>
      applyOpeningsToCountertopSlabPrimitive(primitiveGeometry, hostCountertopOpenings),
    ),
    childAssemblies: builtAssemblyTree.childAssemblies.map((childAssembly) =>
      applyHostCountertopOpeningsToAssemblyTree(childAssembly, hostCountertopOpenings),
    ),
  };
}

export function buildCountertopOpeningsByHostCountertopId(
  countertopOpenings: readonly CountertopOpening[],
): ReadonlyMap<string, readonly CountertopOpening[]> {
  const countertopOpeningsByHostCountertopId = new Map<string, CountertopOpening[]>();

  for (const countertopOpening of countertopOpenings) {
    const existingOpenings = countertopOpeningsByHostCountertopId.get(countertopOpening.hostCountertopId);

    if (existingOpenings === undefined) {
      countertopOpeningsByHostCountertopId.set(countertopOpening.hostCountertopId, [countertopOpening]);
      continue;
    }

    existingOpenings.push(countertopOpening);
  }

  return countertopOpeningsByHostCountertopId;
}

function applyOpeningsToCountertopSlabPrimitive(
  primitiveGeometry: BuiltPrimitiveGeometry,
  countertopOpenings: readonly CountertopOpening[],
): BuiltPrimitiveGeometry {
  if (primitiveGeometry.role !== COUNTERTOP_SLAB_PRIMITIVE_ROLE) {
    return primitiveGeometry;
  }

  return {
    ...primitiveGeometry,
    geometry: {
      kind: "custom-mesh",
      meshId: "countertop-slab",
      openingsInches: countertopOpenings
        .map((opening) => ({
          clippedPolygonInches: createCountertopOpeningClippedPolygon(
            opening,
            primitiveGeometry.sizeInches,
          ),
        }))
        .filter((opening) => opening.clippedPolygonInches.length >= 3),
    },
  };
}
