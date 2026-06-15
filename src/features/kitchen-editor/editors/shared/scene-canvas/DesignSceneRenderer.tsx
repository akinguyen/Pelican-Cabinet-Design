"use client";

import { useMemo } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { AssemblyDragSurface } from "../../../interaction/assemblies/AssemblyDragSurface";
import { AssemblyRotationSurface } from "../../../interaction/assemblies/AssemblyRotationSurface";
import { WallSegmentDraftSurface } from "../../../interaction/walls/WallSegmentDraftSurface";
import { AssemblyLayer } from "../../../rendering/assemblies/AssemblyLayer";
import { AssemblyPlacementCandidateRenderer } from "../../../rendering/assemblies/AssemblyPlacementCandidateRenderer";
import { AssemblyPlacementFeedbackLayer } from "../../../rendering/assemblies/AssemblyPlacementFeedbackLayer";
import { SelectedAssemblyOutlineLayer } from "../../../rendering/assemblies/SelectedAssemblyOutlineLayer";
import { WallLayer } from "../../../rendering/walls/WallLayer";
import { kitchenEditorCatalogRegistry } from "../../../catalogs/registry/kitchenEditorCatalogRegistry";
import { getDerivedCutoutAssemblySources } from "@/engine/scene/derivedCutoutAssemblySources";
import {
  buildPlacedAssemblyById,
  getSelectedPlacedAssembly,
} from "../../../selection/sceneSelectionLookups";

export function DesignSceneRenderer() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const wallSegmentDraft = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "wall-segment-draft"
    ? state.designScene.activeSceneOperation.wallSegmentDraft
    : null);
  const positionedPlacementCandidate = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "assembly-placement" &&
    state.designScene.activeSceneOperation.placementState === "positioned"
      ? state.designScene.activeSceneOperation.placedAssembly
      : null);
  const hasAssemblyPlacementOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "assembly-placement");
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const assemblyPlacementFeedback = useDesignSceneStore((state) => state.assemblyPlacementFeedback);
  const showFrontOutlineLines = activeSceneViewMode === "elevation";
  const showWallPlanMeasurements = activeSceneViewMode === "floor-plan" && wallSegmentDraft === null;
  const shouldRenderPlacementFeedback = assemblyPlacementFeedback !== null;
  const shouldRenderPlacementCandidate = hasAssemblyPlacementOperation;
  const shouldRenderAssemblyDragSurface = activeDrag?.kind === "assembly-move";
  const shouldRenderAssemblyRotationSurface = activeDrag?.kind === "assembly-rotation";
  const shouldRenderWallSegmentDraftSurface = activeSceneViewMode === "floor-plan" && activeToolbarTool === "draw-wall-segment";
  const cutoutAssemblySources = useMemo(() => getDerivedCutoutAssemblySources({
    placedAssemblies,
    positionedPlacementCandidate,
    registry: kitchenEditorCatalogRegistry,
  }), [placedAssemblies, positionedPlacementCandidate]);
  const placedAssemblyById = useMemo(() => buildPlacedAssemblyById(placedAssemblies), [placedAssemblies]);
  const selectedAssembly = useMemo(() => getSelectedPlacedAssembly({
    activeSelection,
    placedAssemblyById,
  }), [activeSelection, placedAssemblyById]);

  return (
    <>
      <WallLayer
        placedWallGraphs={placedWallGraphs}
        wallOpeningAssemblies={cutoutAssemblySources.wallOpeningAssemblies}
        activeSelection={activeSelection}
        wallSegmentDraft={wallSegmentDraft}
        showPlanMeasurements={showWallPlanMeasurements}
        sceneViewMode={activeSceneViewMode}
      />
      <AssemblyLayer
        placedAssemblies={placedAssemblies}
        countertopOpeningAssemblies={cutoutAssemblySources.countertopOpeningAssemblies}
        showFrontOutlineLines={showFrontOutlineLines}
      />
      <SelectedAssemblyOutlineLayer
        selectedAssembly={selectedAssembly}
        sceneViewMode={activeSceneViewMode}
      />
      {shouldRenderPlacementFeedback ? (
        <AssemblyPlacementFeedbackLayer
          sceneViewMode={activeSceneViewMode}
          placementFeedback={assemblyPlacementFeedback}
        />
      ) : null}
      {shouldRenderPlacementCandidate ? (
        <AssemblyPlacementCandidateRenderer
          candidateAssembly={positionedPlacementCandidate}
          showFrontOutlineLines={showFrontOutlineLines}
        />
      ) : null}
      {shouldRenderAssemblyDragSurface ? <AssemblyDragSurface /> : null}
      {shouldRenderAssemblyRotationSurface ? <AssemblyRotationSurface /> : null}
      {shouldRenderWallSegmentDraftSurface ? <WallSegmentDraftSurface /> : null}
    </>
  );
}
