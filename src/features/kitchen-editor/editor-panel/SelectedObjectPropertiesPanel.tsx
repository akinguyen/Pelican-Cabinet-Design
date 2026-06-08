"use client";

import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyPropertiesPanel } from "../properties-panel/assemblies/AssemblyPropertiesPanel";
import { WallPropertiesPanel } from "../properties-panel/walls/WallPropertiesPanel";

export function SelectedObjectPropertiesPanel() {
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
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

  return null;
}
