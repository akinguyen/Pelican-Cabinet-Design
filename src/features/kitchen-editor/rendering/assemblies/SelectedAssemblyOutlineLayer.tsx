"use client";

import { measurePlacedAssemblyPlacementBounds } from "@/engine/assemblies/assemblyBounds";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import { SelectedAssemblyOutlineMesh } from "./SelectedAssemblyOutlineMesh";

type SelectedAssemblyOutlineLayerProps = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  activeSelection: SceneSelection | null;
}>;

export function SelectedAssemblyOutlineLayer({
  placedAssemblies,
  activeSelection,
}: SelectedAssemblyOutlineLayerProps) {
  if (activeSelection?.kind !== "placed-assembly") {
    return null;
  }

  const selectedAssembly = placedAssemblies.find(
    (assembly) => assembly.id === activeSelection.placedAssemblyId,
  );

  if (selectedAssembly === undefined) {
    return null;
  }

  return (
    <SelectedAssemblyOutlineMesh
      boundsInches={measurePlacedAssemblyPlacementBounds(selectedAssembly)}
    />
  );
}
