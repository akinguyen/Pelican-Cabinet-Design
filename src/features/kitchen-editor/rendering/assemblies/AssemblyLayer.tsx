"use client";

import { buildAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyRenderer } from "./AssemblyRenderer";

type AssemblyLayerProps = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  showFrontOutlineLines: boolean;
}>;

export function AssemblyLayer({ placedAssemblies, showFrontOutlineLines }: AssemblyLayerProps) {
  return (
    <group>
      {placedAssemblies.map((placedAssembly) => (
        <AssemblyRenderer
          key={placedAssembly.id}
          builtAssemblyTree={buildAssemblyTree(placedAssembly, kitchenEditorCatalogRegistry)}
          renderState="default"
          showFrontOutlineLines={showFrontOutlineLines}
        />
      ))}
    </group>
  );
}
