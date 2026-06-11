"use client";

import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyPropertiesPanel } from "../properties-panel/assemblies/AssemblyPropertiesPanel";
import { CountertopOpeningPropertiesPanel } from "../properties-panel/countertops/CountertopOpeningPropertiesPanel";
import { WallPropertiesPanel } from "../properties-panel/walls/WallPropertiesPanel";

export function SelectedObjectPropertiesPanel() {
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
  const countertopOpenings = useDesignSceneStore((state) => state.designScene.countertopOpenings);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const deleteSelectedAssembly = useDesignSceneStore((state) => state.deleteSelectedAssembly);

  const selectedAssembly =
    activeSelection?.kind === "placed-assembly"
      ? placedAssemblies.find((assembly) => assembly.id === activeSelection.placedAssemblyId)
      : undefined;

  const selectedDefinition =
    selectedAssembly === undefined
      ? null
      : getAssemblyDefinition(kitchenEditorCatalogRegistry, selectedAssembly.definitionId);

  const selectedPlacedWall =
    activeSelection?.kind === "placed-wall"
      ? placedWalls.find((placedWall) => placedWall.id === activeSelection.placedWallId)
      : undefined;

  const selectedCountertopOpening =
    activeSelection?.kind === "countertop-opening"
      ? countertopOpenings.find(
          (opening) => opening.id === activeSelection.countertopOpeningId,
        )
      : undefined;

  if (selectedAssembly !== undefined && selectedDefinition !== null) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <AssemblyPropertiesPanel
          placedAssembly={selectedAssembly}
          definition={selectedDefinition}
          onDelete={deleteSelectedAssembly}
        />
      </div>
    );
  }

  if (selectedPlacedWall !== undefined) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <WallPropertiesPanel placedWall={selectedPlacedWall} />
      </div>
    );
  }

  if (selectedCountertopOpening !== undefined) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <CountertopOpeningPropertiesPanel opening={selectedCountertopOpening} />
      </div>
    );
  }

  return null;
}
