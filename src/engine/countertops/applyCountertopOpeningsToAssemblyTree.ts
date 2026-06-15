import type {
  BuiltAssemblyTree,
  BuiltPrimitiveGeometry,
} from "@/engine/assemblies/assemblyTreeBuilder";
import { createCountertopOpeningClippedPolygon } from "./countertopOpeningGeometry";
import type { DerivedCountertopOpening } from "./countertopOpeningTypes";

const COUNTERTOP_SLAB_PRIMITIVE_ROLE = "countertop-slab";
const EMPTY_COUNTERTOP_OPENINGS: readonly DerivedCountertopOpening[] = [];

export function applyCountertopOpeningsToAssemblyTree(
  builtAssemblyTree: BuiltAssemblyTree,
  countertopOpenings: readonly DerivedCountertopOpening[],
): BuiltAssemblyTree {
  return applyCountertopOpeningMapToAssemblyTree(
    builtAssemblyTree,
    buildCountertopOpeningsByHostCountertopId(countertopOpenings),
  );
}

export function applyCountertopOpeningMapToAssemblyTree(
  builtAssemblyTree: BuiltAssemblyTree,
  countertopOpeningsByHostCountertopId: ReadonlyMap<string, readonly DerivedCountertopOpening[]>,
): BuiltAssemblyTree {
  return applyHostCountertopOpeningsToAssemblyTree(
    builtAssemblyTree,
    countertopOpeningsByHostCountertopId.get(builtAssemblyTree.rootAssemblyId) ?? EMPTY_COUNTERTOP_OPENINGS,
  );
}

export function applyHostCountertopOpeningsToAssemblyTree(
  builtAssemblyTree: BuiltAssemblyTree,
  hostCountertopOpenings: readonly DerivedCountertopOpening[],
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
  countertopOpenings: readonly DerivedCountertopOpening[],
): ReadonlyMap<string, readonly DerivedCountertopOpening[]> {
  const countertopOpeningsByHostCountertopId = new Map<string, DerivedCountertopOpening[]>();

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
  countertopOpenings: readonly DerivedCountertopOpening[],
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
