"use client";

import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { AssemblyCatalogPanel } from "../catalog-panel/AssemblyCatalogPanel";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyPropertiesPanel } from "../properties-panel/assemblies/AssemblyPropertiesPanel";
import { WallPropertiesPanel } from "../properties-panel/walls/WallPropertiesPanel";

export function KitchenEditorInspectorPanel() {
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

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="min-h-0 flex-1">
        {selectedAssembly !== undefined && selectedDefinition !== null ? (
          <div className="h-full overflow-y-auto p-4">
            <AssemblyPropertiesPanel
              placedAssembly={selectedAssembly}
              definition={selectedDefinition}
              onDelete={deleteSelectedAssembly}
            />
          </div>
        ) : selectedPlacedWall !== undefined ? (
          <div className="h-full overflow-y-auto p-4">
            <WallPropertiesPanel placedWall={selectedPlacedWall} />
          </div>
        ) : (
          <AssemblyCatalogPanel />
        )}
      </div>
    </aside>
  );
}
