"use client";

import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyPropertiesPanel } from "../properties-panel/assemblies/AssemblyPropertiesPanel";
import { CountertopOpeningPropertiesPanel } from "../properties-panel/countertops/CountertopOpeningPropertiesPanel";
import { WallOpeningPropertiesPanel } from "../properties-panel/walls/WallOpeningPropertiesPanel";
import { WallSegmentPropertiesPanel } from "../properties-panel/walls/WallSegmentPropertiesPanel";

export function SelectedObjectPropertiesPanel() {
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
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

  const selectedWallGraph = activeSelection?.kind === "placed-wall-segment"
    ? placedWallGraphs.find((wallGraph) => wallGraph.id === activeSelection.wallGraphId)
    : undefined;
  const selectedWallSegment = activeSelection?.kind === "placed-wall-segment"
    ? selectedWallGraph?.segments.find((wallSegment) => wallSegment.id === activeSelection.wallSegmentId)
    : undefined;

  const selectedCountertopOpening =
    activeSelection?.kind === "countertop-opening"
      ? countertopOpenings.find(
          (opening) => opening.id === activeSelection.countertopOpeningId,
        )
      : undefined;

  const selectedWallOpeningGraph = activeSelection?.kind === "wall-opening"
    ? placedWallGraphs.find((wallGraph) => wallGraph.id === activeSelection.wallGraphId)
    : undefined;
  const selectedWallOpeningSegment = activeSelection?.kind === "wall-opening"
    ? selectedWallOpeningGraph?.segments.find((wallSegment) => wallSegment.id === activeSelection.wallSegmentId)
    : undefined;
  const selectedWallOpening = activeSelection?.kind === "wall-opening"
    ? selectedWallOpeningSegment?.openings.find((opening) => opening.id === activeSelection.wallOpeningId)
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

  if (
    activeSelection?.kind === "wall-opening" &&
    selectedWallOpening !== undefined
  ) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <WallOpeningPropertiesPanel
          wallGraphId={activeSelection.wallGraphId}
          wallSegmentId={activeSelection.wallSegmentId}
          opening={selectedWallOpening}
        />
      </div>
    );
  }

  if (selectedWallSegment !== undefined && selectedWallGraph !== undefined) {
    return (
      <div className="absolute inset-0 z-10 h-full min-h-0 overflow-y-auto bg-white p-4">
        <WallSegmentPropertiesPanel wallSegment={selectedWallSegment} wallGraphNodes={selectedWallGraph.nodes} />
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
