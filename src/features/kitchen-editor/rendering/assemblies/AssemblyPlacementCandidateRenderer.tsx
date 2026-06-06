"use client";

import { buildAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { SceneOperation } from "@/engine/scene/sceneOperationTypes";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyRenderer } from "./AssemblyRenderer";

type AssemblyPlacementCandidateRendererProps = Readonly<{
  activeSceneOperation: SceneOperation | null;
  showFrontOutlineLines: boolean;
}>;

export function AssemblyPlacementCandidateRenderer({
  activeSceneOperation,
  showFrontOutlineLines,
}: AssemblyPlacementCandidateRendererProps) {
  if (activeSceneOperation?.kind !== "assembly-placement" || activeSceneOperation.placementState !== "positioned") {
    return null;
  }

  return (
    <AssemblyRenderer
      builtAssemblyTree={buildAssemblyTree(activeSceneOperation.placedAssembly, kitchenEditorCatalogRegistry)}
      renderState="candidate"
      showFrontOutlineLines={showFrontOutlineLines}
    />
  );
}
