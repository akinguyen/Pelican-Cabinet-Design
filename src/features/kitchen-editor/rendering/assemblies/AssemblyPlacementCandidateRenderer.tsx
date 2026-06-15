"use client";

import { useMemo } from "react";
import { buildAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyRenderer } from "./AssemblyRenderer";

type AssemblyPlacementCandidateRendererProps = Readonly<{
  candidateAssembly: PlacedAssembly | null;
  showFrontOutlineLines: boolean;
}>;

export function AssemblyPlacementCandidateRenderer({
  candidateAssembly,
  showFrontOutlineLines,
}: AssemblyPlacementCandidateRendererProps) {
  const builtAssemblyTree = useMemo(() => candidateAssembly === null
    ? null
    : buildAssemblyTree(candidateAssembly, kitchenEditorCatalogRegistry), [candidateAssembly]);

  if (builtAssemblyTree === null) {
    return null;
  }

  return (
    <AssemblyRenderer
      builtAssemblyTree={builtAssemblyTree}
      renderState="candidate"
      showFrontOutlineLines={showFrontOutlineLines}
    />
  );
}
