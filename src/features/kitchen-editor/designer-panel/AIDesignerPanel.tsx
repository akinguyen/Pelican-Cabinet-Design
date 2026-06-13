"use client";

import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import { DesignerChatPanel } from "./DesignerChatPanel";
import { SelectedAssemblySummary } from "./SelectedAssemblySummary";
import { SelectedWallSummary } from "./SelectedWallSummary";

export function AIDesignerPanel() {
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-slate-50 p-3">
      {selectedAssembly !== undefined && selectedDefinition !== null ? (
        <SelectedAssemblySummary placedAssembly={selectedAssembly} definition={selectedDefinition} />
      ) : selectedWallSegment !== undefined && selectedWallGraph !== undefined ? (
        <SelectedWallSummary wallSegment={selectedWallSegment} wallGraphNodes={selectedWallGraph.nodes} />
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selection</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-950">No assembly or wall selected</h2>
          <p className="mt-1 text-xs text-slate-500">
            Click an assembly or wall segment in the scene to read its current data.
          </p>
        </section>
      )}
      <DesignerChatPanel />
    </div>
  );
}
