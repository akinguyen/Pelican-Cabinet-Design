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
import { DesignerChatPanel } from "./DesignerChatPanel";
import { SelectedAssemblySummary } from "./SelectedAssemblySummary";
import { SelectedWallSummary } from "./SelectedWallSummary";

export function AIDesignerPanel() {
  const selectedAssembly = useDesignSceneStore((state) => getSelectedPlacedAssemblyFromScene(state.designScene));
  const selectedWallSegment = useDesignSceneStore((state) => getSelectedWallSegmentFromScene(state.designScene));
  const selectedWallGraphNodes = useDesignSceneStore((state) => getSelectedWallGraphNodesFromScene(state.designScene));
  const selectedDefinition = useMemo(
    () => selectedAssembly === null
      ? null
      : getAssemblyDefinition(kitchenEditorCatalogRegistry, selectedAssembly.definitionId),
    [selectedAssembly],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-slate-50 p-3">
      {selectedAssembly !== null && selectedDefinition !== null ? (
        <SelectedAssemblySummary placedAssembly={selectedAssembly} definition={selectedDefinition} />
      ) : selectedWallSegment !== null && selectedWallGraphNodes !== null ? (
        <SelectedWallSummary wallSegment={selectedWallSegment} wallGraphNodes={selectedWallGraphNodes} />
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
