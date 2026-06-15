"use client";

import { useMemo } from "react";
import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import {
  getSelectedPlacedAssemblyFromScene,
  getSelectedWallGraphNodesFromScene,
  getSelectedWallSegmentFromScene,
} from "../selection/sceneSelectionLookups";
import { AssemblyPropertiesPanel } from "../properties-panel/assemblies/AssemblyPropertiesPanel";
import { WallSegmentPropertiesPanel } from "../properties-panel/walls/WallSegmentPropertiesPanel";

export function SelectedObjectPropertiesPanel() {
  const selectedAssembly = useDesignSceneStore((state) => getSelectedPlacedAssemblyFromScene(state.designScene));
  const selectedWallSegment = useDesignSceneStore((state) => getSelectedWallSegmentFromScene(state.designScene));
  const selectedWallGraphNodes = useDesignSceneStore((state) => getSelectedWallGraphNodesFromScene(state.designScene));
  const selectedDefinition = useMemo(
    () => selectedAssembly === null
      ? null
      : getAssemblyDefinition(kitchenEditorCatalogRegistry, selectedAssembly.definitionId),
    [selectedAssembly],
  );

  if (selectedAssembly !== null && selectedDefinition !== null) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <AssemblyPropertiesPanel
          placedAssembly={selectedAssembly}
          definition={selectedDefinition}
        />
      </div>
    );
  }

  if (selectedWallSegment !== null && selectedWallGraphNodes !== null) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <WallSegmentPropertiesPanel wallSegment={selectedWallSegment} wallGraphNodes={selectedWallGraphNodes} />
      </div>
    );
  }

  return null;
}
