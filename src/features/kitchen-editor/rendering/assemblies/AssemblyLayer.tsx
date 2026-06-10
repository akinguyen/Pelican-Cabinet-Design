"use client";

import { buildAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { applyCountertopOpeningsToAssemblyTree } from "@/engine/countertops/applyCountertopOpeningsToAssemblyTree";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyRenderer } from "./AssemblyRenderer";

type AssemblyLayerProps = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  showFrontOutlineLines: boolean;
}>;

export function AssemblyLayer({ placedAssemblies, showFrontOutlineLines }: AssemblyLayerProps) {
  const countertopOpenings = useDesignSceneStore((state) => state.designScene.countertopOpenings);

  return (
    <group>
      {placedAssemblies.map((placedAssembly) => (
        <AssemblyRenderer
          key={placedAssembly.id}
          builtAssemblyTree={applyCountertopOpeningsToAssemblyTree(
            buildAssemblyTree(placedAssembly, kitchenEditorCatalogRegistry),
            countertopOpenings,
          )}
          renderState="default"
          showFrontOutlineLines={showFrontOutlineLines}
        />
      ))}
    </group>
  );
}
