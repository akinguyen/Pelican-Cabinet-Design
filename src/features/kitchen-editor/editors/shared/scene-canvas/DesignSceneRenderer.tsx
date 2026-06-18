"use client";

import { useMemo } from "react";
import { buildSceneEntityWallMeasurementGuides } from "@/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides";
import { createDesignReservationZoneSceneEntityBounds } from "@/engine/scene-entities/designReservationZoneSceneEntityBounds";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { AssemblyDragSurface } from "../../../interaction/assemblies/AssemblyDragSurface";
import { DesignReservationZonePlacementSurface } from "../../../interaction/design-zones/DesignReservationZonePlacementSurface";
import { DesignReservationZoneDragSurface } from "../../../interaction/design-zones/DesignReservationZoneDragSurface";
import { DesignReservationZoneRotationSurface } from "../../../interaction/design-zones/DesignReservationZoneRotationSurface";
import { AssemblyRotationSurface } from "../../../interaction/assemblies/AssemblyRotationSurface";
import { WallSegmentDraftSurface } from "../../../interaction/walls/WallSegmentDraftSurface";
import { AssemblyLayer } from "../../../rendering/assemblies/AssemblyLayer";
import { AssemblyPlacementCandidateRenderer } from "../../../rendering/assemblies/AssemblyPlacementCandidateRenderer";
import { AssemblyPlacementFeedbackLayer } from "../../../rendering/assemblies/AssemblyPlacementFeedbackLayer";
import { AssemblyObjectAlignmentGuides } from "../../../rendering/assemblies/AssemblyObjectAlignmentGuides";
import { SelectedAssemblyOutlineLayer } from "../../../rendering/assemblies/SelectedAssemblyOutlineLayer";
import { DesignReservationZonePlacementCandidateRenderer } from "../../../rendering/design-zones/DesignReservationZonePlacementCandidateRenderer";
import { DesignReservationZoneLayer } from "../../../rendering/design-zones/DesignReservationZoneLayer";
import { SelectedDesignReservationZoneOutlineLayer } from "../../../rendering/design-zones/SelectedDesignReservationZoneOutlineLayer";
import { SceneEntityWallMeasurementGuides } from "../../../rendering/scene-entities/SceneEntityWallMeasurementGuides";
import { WallLayer } from "../../../rendering/walls/WallLayer";
import { kitchenEditorCatalogRegistry } from "../../../catalogs/registry/kitchenEditorCatalogRegistry";
import { getDerivedCutoutAssemblySources } from "@/engine/scene/derivedCutoutAssemblySources";
import {
  buildDesignReservationZoneById,
  buildPlacedAssemblyById,
  getSelectedDesignReservationZone,
  getSelectedPlacedAssembly,
} from "../../../selection/sceneSelectionLookups";

export function DesignSceneRenderer() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const designReservationZones = useDesignSceneStore((state) => state.designScene.designReservationZones);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const wallSegmentDraft = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "wall-segment-draft"
    ? state.designScene.activeSceneOperation.wallSegmentDraft
    : null);
  const designReservationZonePlacementCandidate = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "design-reservation-zone-placement"
    ? state.designScene.activeSceneOperation.candidate
    : null);
  const positionedPlacementCandidate = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "assembly-placement" &&
    state.designScene.activeSceneOperation.placementState === "positioned"
      ? state.designScene.activeSceneOperation.placedAssembly
      : null);
  const hasAssemblyPlacementOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "assembly-placement");
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const assemblyPlacementFeedback = useDesignSceneStore((state) => state.assemblyPlacementFeedback);
  const activeObjectAlignmentGuides = useDesignSceneStore((state) => state.activeObjectAlignmentGuides);
  const showFrontOutlineLines = activeSceneViewMode === "elevation";
  const showWallPlanMeasurements = activeSceneViewMode === "floor-plan" && wallSegmentDraft === null;
  const shouldRenderPlacementFeedback = assemblyPlacementFeedback !== null;
  const shouldRenderPlacementCandidate = hasAssemblyPlacementOperation;
  const shouldRenderAssemblyDragSurface = activeDrag?.kind === "assembly-move";
  const shouldRenderAssemblyRotationSurface = activeDrag?.kind === "assembly-rotation";
  const shouldRenderWallSegmentDraftSurface = activeSceneViewMode === "floor-plan" && activeToolbarTool === "draw-wall-segment";
  const shouldRenderDesignReservationZonePlacementSurface = activeToolbarTool === "draw-design-reservation-zone";
  const shouldRenderDesignReservationZoneDragSurface = activeDrag?.kind === "design-reservation-zone-move";
  const shouldRenderDesignReservationZoneRotationSurface = activeDrag?.kind === "design-reservation-zone-rotation";
  const cutoutAssemblySources = useMemo(() => getDerivedCutoutAssemblySources({
    placedAssemblies,
    positionedPlacementCandidate,
    registry: kitchenEditorCatalogRegistry,
  }), [placedAssemblies, positionedPlacementCandidate]);
  const wallOpeningAssemblyIds = useMemo(() => new Set(
    cutoutAssemblySources.wallOpeningAssemblies.map((assembly) => assembly.id),
  ), [cutoutAssemblySources.wallOpeningAssemblies]);
  const activeWallOpeningSourceAssemblyId = useMemo(() => {
    const activeDragAssemblyId = activeDrag?.kind === "assembly-move" || activeDrag?.kind === "assembly-rotation"
      ? activeDrag.assemblyId
      : null;

    if (activeDragAssemblyId !== null && wallOpeningAssemblyIds.has(activeDragAssemblyId)) {
      return activeDragAssemblyId;
    }

    if (positionedPlacementCandidate !== null && wallOpeningAssemblyIds.has(positionedPlacementCandidate.id)) {
      return positionedPlacementCandidate.id;
    }

    if (activeSelection?.kind === "placed-assembly" && wallOpeningAssemblyIds.has(activeSelection.placedAssemblyId)) {
      return activeSelection.placedAssemblyId;
    }

    return null;
  }, [activeDrag, activeSelection, positionedPlacementCandidate, wallOpeningAssemblyIds]);
  const placedAssemblyById = useMemo(() => buildPlacedAssemblyById(placedAssemblies), [placedAssemblies]);
  const selectedAssembly = useMemo(() => getSelectedPlacedAssembly({
    activeSelection,
    placedAssemblyById,
  }), [activeSelection, placedAssemblyById]);
  const designReservationZoneById = useMemo(() => buildDesignReservationZoneById(designReservationZones), [designReservationZones]);
  const selectedDesignReservationZone = useMemo(() => getSelectedDesignReservationZone({
    activeSelection,
    designReservationZoneById,
  }), [activeSelection, designReservationZoneById]);
  const selectedDesignReservationZoneWallMeasurementGuides = useMemo(() => {
    if (activeSceneViewMode !== "floor-plan" || selectedDesignReservationZone === null) {
      return [];
    }

    return buildSceneEntityWallMeasurementGuides({
      bounds: createDesignReservationZoneSceneEntityBounds(selectedDesignReservationZone),
      placedWallGraphs,
    });
  }, [activeSceneViewMode, placedWallGraphs, selectedDesignReservationZone]);
  const placementDesignReservationZoneWallMeasurementGuides = useMemo(() => {
    if (
      activeSceneViewMode !== "floor-plan" ||
      designReservationZonePlacementCandidate === null ||
      designReservationZonePlacementCandidate.placementState !== "positioned"
    ) {
      return [];
    }

    return buildSceneEntityWallMeasurementGuides({
      bounds: createDesignReservationZoneSceneEntityBounds(designReservationZonePlacementCandidate.zone),
      placedWallGraphs,
    });
  }, [activeSceneViewMode, designReservationZonePlacementCandidate, placedWallGraphs]);
  const designReservationZoneWallMeasurementGuides = [
    ...selectedDesignReservationZoneWallMeasurementGuides,
    ...placementDesignReservationZoneWallMeasurementGuides,
  ];
  const selectedAssemblyIsWallOpening = selectedAssembly !== null && wallOpeningAssemblyIds.has(selectedAssembly.id);
  const placementFeedbackIsWallOpening = assemblyPlacementFeedback !== null &&
    wallOpeningAssemblyIds.has(assemblyPlacementFeedback.placedAssembly.id);

  return (
    <>
      <WallLayer
        placedWallGraphs={placedWallGraphs}
        wallOpeningAssemblies={cutoutAssemblySources.wallOpeningAssemblies}
        activeSelection={activeSelection}
        wallSegmentDraft={wallSegmentDraft}
        showPlanMeasurements={showWallPlanMeasurements}
        sceneViewMode={activeSceneViewMode}
        activeWallOpeningSourceAssemblyId={activeWallOpeningSourceAssemblyId}
      />
      <AssemblyLayer
        placedAssemblies={placedAssemblies}
        countertopOpeningAssemblies={cutoutAssemblySources.countertopOpeningAssemblies}
        showFrontOutlineLines={showFrontOutlineLines}
        sceneViewMode={activeSceneViewMode}
      />
      <DesignReservationZoneLayer
        zones={designReservationZones}
        activeSelection={activeSelection}
        sceneViewMode={activeSceneViewMode}
      />
      <DesignReservationZonePlacementCandidateRenderer
        candidate={designReservationZonePlacementCandidate}
        sceneViewMode={activeSceneViewMode}
      />
      <SelectedAssemblyOutlineLayer
        selectedAssembly={selectedAssembly}
        sceneViewMode={activeSceneViewMode}
        hideFloorPlanSelectionBox={false}
        hideFloorPlanRotationControl={selectedAssemblyIsWallOpening}
      />
      <SelectedDesignReservationZoneOutlineLayer
        selectedZone={selectedDesignReservationZone}
        sceneViewMode={activeSceneViewMode}
      />
      {designReservationZoneWallMeasurementGuides.length > 0 ? (
        <SceneEntityWallMeasurementGuides measurementGuides={designReservationZoneWallMeasurementGuides} />
      ) : null}
      {activeObjectAlignmentGuides.length > 0 ? (
        <AssemblyObjectAlignmentGuides alignmentGuides={activeObjectAlignmentGuides} />
      ) : null}
      {shouldRenderPlacementFeedback ? (
        <AssemblyPlacementFeedbackLayer
          sceneViewMode={activeSceneViewMode}
          placementFeedback={assemblyPlacementFeedback}
          showWallMeasurementGuides={!placementFeedbackIsWallOpening}
          showBoundingBox={true}
        />
      ) : null}
      {shouldRenderPlacementCandidate ? (
        <AssemblyPlacementCandidateRenderer
          candidateAssembly={positionedPlacementCandidate}
          showFrontOutlineLines={showFrontOutlineLines}
          sceneViewMode={activeSceneViewMode}
        />
      ) : null}
      {shouldRenderAssemblyDragSurface ? <AssemblyDragSurface /> : null}
      {shouldRenderAssemblyRotationSurface ? <AssemblyRotationSurface /> : null}
      {shouldRenderDesignReservationZoneDragSurface ? <DesignReservationZoneDragSurface /> : null}
      {shouldRenderDesignReservationZoneRotationSurface ? <DesignReservationZoneRotationSurface /> : null}
      {shouldRenderWallSegmentDraftSurface ? <WallSegmentDraftSurface /> : null}
      {shouldRenderDesignReservationZonePlacementSurface ? <DesignReservationZonePlacementSurface /> : null}
    </>
  );
}
