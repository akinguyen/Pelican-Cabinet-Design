"use client";

import { buildAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyRenderer } from "./AssemblyRenderer";

type AssemblyLayerProps = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
}>;

export function AssemblyLayer({ placedAssemblies }: AssemblyLayerProps) {
  return (
    <group>
      {placedAssemblies.map((placedAssembly) => (
        <AssemblyRenderer
          key={placedAssembly.id}
          builtAssemblyTree={buildAssemblyTree(placedAssembly, kitchenEditorCatalogRegistry)}
          renderState="default"
        />
      ))}
    </group>
  );
}
