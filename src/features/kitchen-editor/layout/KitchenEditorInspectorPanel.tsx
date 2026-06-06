"use client";

import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneOperation } from "@/engine/scene/sceneOperationTypes";
import { AssemblyCatalogPanel } from "../catalog-panel/AssemblyCatalogPanel";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyPropertiesPanel } from "../properties-panel/assemblies/AssemblyPropertiesPanel";
import { WallPropertiesPanel } from "../properties-panel/walls/WallPropertiesPanel";

export function KitchenEditorInspectorPanel() {
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
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

  const isPropertiesMode = selectedAssembly !== undefined || selectedPlacedWall !== undefined;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold">
          {isPropertiesMode ? "Properties" : "Catalog"}
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {isPropertiesMode
            ? "Edit the selected assembly or wall. Changes update every editor view immediately."
            : "Select an assembly, move its placement candidate in any editor, then click to place it."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {selectedAssembly !== undefined && selectedDefinition !== null ? (
          <AssemblyPropertiesPanel
            placedAssembly={selectedAssembly}
            definition={selectedDefinition}
            onDelete={deleteSelectedAssembly}
          />
        ) : selectedPlacedWall !== undefined ? (
          <WallPropertiesPanel placedWall={selectedPlacedWall} />
        ) : (
          <AssemblyCatalogPanel />
        )}
      </div>

      <div className="space-y-2 border-t border-slate-200 p-4 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Placed assemblies</span>
          <span className="font-semibold text-slate-900">{placedAssemblies.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Placed walls</span>
          <span className="font-semibold text-slate-900">{placedWalls.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Active operation</span>
          <span className="font-semibold text-slate-900">{getSceneOperationLabel(activeSceneOperation)}</span>
        </div>
      </div>
    </aside>
  );
}

function getSceneOperationLabel(activeSceneOperation: SceneOperation | null): string {
  if (activeSceneOperation === null) {
    return "None";
  }

  if (activeSceneOperation.kind === "assembly-placement") {
    return activeSceneOperation.placementState;
  }

  if (activeSceneOperation.kind === "wall-footprint-draft") {
    return "Wall footprint draft";
  }

  return "Wall split draft";
}
