import { createEmptyBounds3DInches, hasBounds3DInches, measureRotatedBoxBoundsInches, mergeBounds3DInches } from "@/core/geometry/boxBounds";
import type { Bounds3DInches } from "@/core/geometry/boxBounds";
import type { AssemblyDefinitionRegistry } from "./assemblyRegistry";
import { buildAssemblyTree, type BuiltAssemblyTree, type BuiltPrimitiveGeometry } from "./assemblyTreeBuilder";
import type { PlacedAssembly } from "./placedAssemblyTypes";

export function collectBuiltPrimitiveGeometries(
  builtAssemblyTree: BuiltAssemblyTree,
): readonly BuiltPrimitiveGeometry[] {
  return [
    ...builtAssemblyTree.primitiveGeometries,
    ...builtAssemblyTree.childAssemblies.flatMap((childAssembly) =>
      collectBuiltPrimitiveGeometries(childAssembly),
    ),
  ];
}

export function measureBuiltAssemblyBounds(
  builtAssemblyTree: BuiltAssemblyTree,
): Bounds3DInches {
  return collectBuiltPrimitiveGeometries(builtAssemblyTree).reduce(
    (boundsInches, primitiveGeometry) =>
      mergeBounds3DInches(
        boundsInches,
        measureRotatedBoxBoundsInches(
          primitiveGeometry.worldPositionInches,
          primitiveGeometry.sizeInches,
          primitiveGeometry.worldRotationDegrees.zDegrees,
        ),
      ),
    createEmptyBounds3DInches(),
  );
}

export function measurePlacedAssemblyBounds(
  placedAssembly: PlacedAssembly,
  registry: AssemblyDefinitionRegistry,
): Bounds3DInches {
  return measureBuiltAssemblyBounds(buildAssemblyTree(placedAssembly, registry));
}

export function measurePlacedAssembliesBounds(
  placedAssemblies: readonly PlacedAssembly[],
  registry: AssemblyDefinitionRegistry,
): Bounds3DInches | null {
  const boundsInches = placedAssemblies.reduce(
    (sceneBoundsInches, placedAssembly) =>
      mergeBounds3DInches(
        sceneBoundsInches,
        measurePlacedAssemblyBounds(placedAssembly, registry),
      ),
    createEmptyBounds3DInches(),
  );

  return hasBounds3DInches(boundsInches) ? boundsInches : null;
}

