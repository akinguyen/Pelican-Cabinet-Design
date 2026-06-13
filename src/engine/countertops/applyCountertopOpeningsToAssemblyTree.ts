import type {
  BuiltAssemblyTree,
  BuiltPrimitiveGeometry,
} from "@/engine/assemblies/assemblyTreeBuilder";
import { createCountertopOpeningClippedPolygon } from "./countertopOpeningGeometry";
import type { CountertopOpening } from "./countertopOpeningTypes";

const COUNTERTOP_SLAB_PRIMITIVE_ROLE = "countertop-slab";

export function applyCountertopOpeningsToAssemblyTree(
  builtAssemblyTree: BuiltAssemblyTree,
  countertopOpenings: readonly CountertopOpening[],
): BuiltAssemblyTree {
  const matchingOpenings = countertopOpenings.filter(
    (opening) => opening.hostCountertopId === builtAssemblyTree.rootAssemblyId,
  );

  return {
    ...builtAssemblyTree,
    primitiveGeometries: builtAssemblyTree.primitiveGeometries.map((primitiveGeometry) =>
      applyOpeningsToCountertopSlabPrimitive(primitiveGeometry, matchingOpenings),
    ),
    childAssemblies: builtAssemblyTree.childAssemblies.map((childAssembly) =>
      applyCountertopOpeningsToAssemblyTree(childAssembly, countertopOpenings),
    ),
  };
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
