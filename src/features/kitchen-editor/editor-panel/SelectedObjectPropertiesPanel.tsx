"use client";

import { useMemo } from "react";
import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import {
  getDesignReservationZonesFromSceneEntities,
  getPlacedAssembliesFromSceneEntities,
} from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import {
  buildDesignReservationZoneById,
  buildPlacedAssemblyById,
  getSelectedDesignReservationZone,
  getSelectedPlacedAssembly,
  getSelectedSceneEntityRefs,
  getSelectedWallSegment,
} from "../selection/sceneSelectionLookups";
import { AssemblyPropertiesPanel } from "../properties-panel/assemblies/AssemblyPropertiesPanel";
import { WallSegmentPropertiesPanel } from "../properties-panel/walls/WallSegmentPropertiesPanel";
import { DesignReservationZonePropertiesPanel } from "../properties-panel/design-zones/DesignReservationZonePropertiesPanel";
import { SceneEntityMultiSelectionPanel } from "../properties-panel/scene-entities/SceneEntityMultiSelectionPanel";

export function SelectedObjectPropertiesPanel() {
  const sceneEntities = useDesignSceneStore((state) => state.designScene.sceneEntities);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);

  const placedAssemblies = useMemo(
    () => getPlacedAssembliesFromSceneEntities(sceneEntities),
    [sceneEntities],
  );
  const placedAssemblyById = useMemo(
    () => buildPlacedAssemblyById(placedAssemblies),
    [placedAssemblies],
  );
  const selectedAssembly = useMemo(
    () => getSelectedPlacedAssembly({ activeSelection, placedAssemblyById }),
    [activeSelection, placedAssemblyById],
  );

  const designReservationZones = useMemo(
    () => getDesignReservationZonesFromSceneEntities(sceneEntities),
    [sceneEntities],
  );
  const designReservationZoneById = useMemo(
    () => buildDesignReservationZoneById(designReservationZones),
    [designReservationZones],
  );
  const selectedDesignReservationZone = useMemo(
    () => getSelectedDesignReservationZone({ activeSelection, designReservationZoneById }),
    [activeSelection, designReservationZoneById],
  );

  const selectedWallSegment = useMemo(
    () => getSelectedWallSegment({ activeSelection, placedWallGraphs }),
    [activeSelection, placedWallGraphs],
  );
  const selectedWallGraphNodes = selectedWallSegment?.wallGraph.nodes ?? null;

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
        <WallSegmentPropertiesPanel wallSegment={selectedWallSegment.wallSegment} wallGraphNodes={selectedWallGraphNodes} />
      </div>
    );
  }

  return null;
}
