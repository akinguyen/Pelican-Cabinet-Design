"use client";

import { useMemo } from "react";
import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import {
  getSelectedDesignReservationZoneFromScene,
  getSelectedPlacedAssemblyFromScene,
  getSelectedWallGraphNodesFromScene,
  getSelectedWallSegmentFromScene,
} from "../selection/sceneSelectionLookups";
import { AiChatPanel } from "./AiChatPanel";
import { SelectedAssemblySummary } from "./SelectedAssemblySummary";
import { SelectedWallSummary } from "./SelectedWallSummary";
import { SelectedDesignReservationZoneSummary } from "./SelectedDesignReservationZoneSummary";

export function KitchenAiPanel() {
  const selectedAssembly = useDesignSceneStore((state) => getSelectedPlacedAssemblyFromScene(state.designScene));
  const selectedWallSegment = useDesignSceneStore((state) => getSelectedWallSegmentFromScene(state.designScene));
  const selectedDesignReservationZone = useDesignSceneStore((state) => getSelectedDesignReservationZoneFromScene(state.designScene));
  const selectedWallGraphNodes = useDesignSceneStore((state) => getSelectedWallGraphNodesFromScene(state.designScene));
  const selectedDefinition = useMemo(
    () => selectedAssembly === null
      ? null
      : getAssemblyDefinition(kitchenEditorCatalogRegistry, selectedAssembly.definitionId),
    [selectedAssembly],
  );

  const contextSummary = selectedDesignReservationZone !== null ? (
    <SelectedDesignReservationZoneSummary zone={selectedDesignReservationZone} />
  ) : selectedAssembly !== null && selectedDefinition !== null ? (
    <SelectedAssemblySummary placedAssembly={selectedAssembly} definition={selectedDefinition} />
  ) : selectedWallSegment !== null && selectedWallGraphNodes !== null ? (
    <SelectedWallSummary wallSegment={selectedWallSegment} wallGraphNodes={selectedWallGraphNodes} />
  ) : (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Context</p>
      <h2 className="mt-1 text-sm font-semibold text-slate-950">No assembly or wall selected</h2>
      <p className="mt-1 text-xs text-slate-500">
        Click an assembly, wall segment, or reservation zone in the scene to include its current data as chat context.
      </p>
    </section>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50 p-3">
      <AiChatPanel contextSummary={contextSummary} />
    </div>
  );
}
