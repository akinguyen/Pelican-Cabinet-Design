"use client";

import { useMemo } from "react";
import { buildAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyRenderer } from "./AssemblyRenderer";

type AssemblyPlacementCandidateRendererProps = Readonly<{
  candidateAssembly: PlacedAssembly | null;
  showFrontOutlineLines: boolean;
  sceneViewMode: SceneViewMode;
}>;

export function AssemblyPlacementCandidateRenderer({
  candidateAssembly,
  showFrontOutlineLines,
  sceneViewMode,
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
      sceneViewMode={sceneViewMode}
    />
  );
}
