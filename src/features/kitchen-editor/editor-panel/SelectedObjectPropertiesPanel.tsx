"use client";

import { useMemo } from "react";
import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import {
  getSelectedDesignReservationZoneFromScene,
  getSelectedPlacedAssemblyFromScene,
  getSelectedSceneEntityRefs,
  getSelectedWallGraphNodesFromScene,
  getSelectedWallSegmentFromScene,
} from "../selection/sceneSelectionLookups";
import { AssemblyPropertiesPanel } from "../properties-panel/assemblies/AssemblyPropertiesPanel";
import { WallSegmentPropertiesPanel } from "../properties-panel/walls/WallSegmentPropertiesPanel";
import { DesignReservationZonePropertiesPanel } from "../properties-panel/design-zones/DesignReservationZonePropertiesPanel";
import { SceneEntityMultiSelectionPanel } from "../properties-panel/scene-entities/SceneEntityMultiSelectionPanel";

export function SelectedObjectPropertiesPanel() {
  const selectedAssembly = useDesignSceneStore((state) => getSelectedPlacedAssemblyFromScene(state.designScene));
  const selectedWallSegment = useDesignSceneStore((state) => getSelectedWallSegmentFromScene(state.designScene));
  const selectedDesignReservationZone = useDesignSceneStore((state) => getSelectedDesignReservationZoneFromScene(state.designScene));
  const selectedWallGraphNodes = useDesignSceneStore((state) => getSelectedWallGraphNodesFromScene(state.designScene));
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const selectedSceneEntities = useMemo(
    () => getSelectedSceneEntityRefs(activeSelection),
    [activeSelection],
  );
  const selectedDefinition = useMemo(
    () => selectedAssembly === null
      ? null
      : getAssemblyDefinition(kitchenEditorCatalogRegistry, selectedAssembly.definitionId),
    [selectedAssembly],
  );

  if (selectedSceneEntities.length > 1) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <SceneEntityMultiSelectionPanel selectedSceneEntities={selectedSceneEntities} />
      </div>
    );
  }

  if (selectedDesignReservationZone !== null) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <DesignReservationZonePropertiesPanel zone={selectedDesignReservationZone} />
      </div>
    );
  }

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
