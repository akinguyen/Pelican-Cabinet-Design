"use client";

import { useMemo } from "react";
import { buildSceneEntityWallMeasurementGuides } from "@/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides";
import { createDesignReservationZoneSceneEntityBounds } from "@/engine/scene-entities/designReservationZoneSceneEntityBounds";
import { createPlacedAssemblySceneEntityBounds } from "@/engine/scene-entities/placedAssemblySceneEntityBounds";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { AssemblyDragSurface } from "../../../interaction/assemblies/AssemblyDragSurface";
import { DesignReservationZonePlacementSurface } from "../../../interaction/design-zones/DesignReservationZonePlacementSurface";
import { DesignReservationZoneDragSurface } from "../../../interaction/design-zones/DesignReservationZoneDragSurface";
import { SceneEntityMultiDragSurface } from "../../../interaction/scene-entities/SceneEntityMultiDragSurface";
import { SceneEntityRotationSurface } from "../../../interaction/scene-entities/SceneEntityRotationSurface";
import { WallSegmentDraftSurface } from "../../../interaction/walls/WallSegmentDraftSurface";
import { AssemblyLayer } from "../../../rendering/assemblies/AssemblyLayer";
import { AssemblyPlacementCandidateRenderer } from "../../../rendering/assemblies/AssemblyPlacementCandidateRenderer";
import { AssemblyPlacementFeedbackLayer } from "../../../rendering/assemblies/AssemblyPlacementFeedbackLayer";
import { AssemblyObjectAlignmentGuides } from "../../../rendering/assemblies/AssemblyObjectAlignmentGuides";
import { DesignReservationZonePlacementCandidateRenderer } from "../../../rendering/design-zones/DesignReservationZonePlacementCandidateRenderer";
import { DesignReservationZoneLayer } from "../../../rendering/design-zones/DesignReservationZoneLayer";
import { SceneEntityWallMeasurementGuides } from "../../../rendering/scene-entities/SceneEntityWallMeasurementGuides";
import { SceneEntityGroupGuides } from "../../../rendering/scene-entities/SceneEntityGroupGuides";
import { SelectedSceneEntityLayer } from "../../../rendering/scene-entities/SelectedSceneEntityLayer";
import { WallLayer } from "../../../rendering/walls/WallLayer";
import { kitchenEditorCatalogRegistry } from "../../../catalogs/registry/kitchenEditorCatalogRegistry";
import { getDerivedCutoutAssemblySources } from "@/engine/scene/derivedCutoutAssemblySources";
import {
  buildDesignReservationZoneById,
  buildPlacedAssemblyById,
  getSelectedDesignReservationZones,
  getSelectedPlacedAssembly,
  getSelectedPlacedAssemblies,
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
  const shouldRenderSceneEntityMultiDragSurface = activeDrag?.kind === "scene-entity-multi-move";
  const shouldRenderWallSegmentDraftSurface = activeSceneViewMode === "floor-plan" && activeToolbarTool === "draw-wall-segment";
  const shouldRenderDesignReservationZonePlacementSurface = activeToolbarTool === "draw-design-reservation-zone";
  const shouldRenderDesignReservationZoneDragSurface = activeDrag?.kind === "design-reservation-zone-move";
  const shouldRenderSceneEntityRotationSurface = activeDrag?.kind === "assembly-rotation" || activeDrag?.kind === "design-reservation-zone-rotation";
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

    if (
      activeSelection?.kind === "scene-entity" &&
      activeSelection.sceneEntity.entityKind === "placed-assembly" &&
      wallOpeningAssemblyIds.has(activeSelection.sceneEntity.entityId)
    ) {
      return activeSelection.sceneEntity.entityId;
    }

    return null;
  }, [activeDrag, activeSelection, positionedPlacementCandidate, wallOpeningAssemblyIds]);
  const placedAssemblyById = useMemo(() => buildPlacedAssemblyById(placedAssemblies), [placedAssemblies]);
  const selectedAssembly = useMemo(() => getSelectedPlacedAssembly({
    activeSelection,
    placedAssemblyById,
  }), [activeSelection, placedAssemblyById]);
  const selectedAssemblies = useMemo(() => getSelectedPlacedAssemblies({
    activeSelection,
    placedAssemblyById,
  }), [activeSelection, placedAssemblyById]);
  const designReservationZoneById = useMemo(() => buildDesignReservationZoneById(designReservationZones), [designReservationZones]);
  const selectedDesignReservationZones = useMemo(() => getSelectedDesignReservationZones({
    activeSelection,
    designReservationZoneById,
  }), [activeSelection, designReservationZoneById]);
  const selectedDesignReservationZoneWallMeasurementGuides = useMemo(() => {
    if (activeSceneViewMode !== "floor-plan" || selectedDesignReservationZones.length === 0) {
      return [];
    }

    return selectedDesignReservationZones.flatMap((zone) => buildSceneEntityWallMeasurementGuides({
      bounds: createDesignReservationZoneSceneEntityBounds(zone),
      placedWallGraphs,
    }));
  }, [activeSceneViewMode, placedWallGraphs, selectedDesignReservationZones]);
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
  const selectedSceneEntityBounds = useMemo(() => [
    ...selectedAssemblies.map(createPlacedAssemblySceneEntityBounds),
    ...selectedDesignReservationZones.map(createDesignReservationZoneSceneEntityBounds),
  ], [selectedAssemblies, selectedDesignReservationZones]);
  const selectedSceneEntityCount = selectedSceneEntityBounds.length;
  const isSceneEntityMultiMoveActive = activeDrag?.kind === "scene-entity-multi-move";
  const showSceneEntityGroupGuides = activeSceneViewMode === "floor-plan" &&
    selectedSceneEntityCount > 1 &&
    isSceneEntityMultiMoveActive;

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
      <SelectedSceneEntityLayer
        selectedAssemblies={selectedAssemblies}
        selectedDesignReservationZones={selectedDesignReservationZones}
        selectedSceneEntityBounds={selectedSceneEntityBounds}
        placedWallGraphs={placedWallGraphs}
        sceneViewMode={activeSceneViewMode}
        selectedAssemblyIsWallOpening={selectedAssemblyIsWallOpening}
      />
      {showSceneEntityGroupGuides ? (
        <SceneEntityGroupGuides
          bounds={selectedSceneEntityBounds}
          placedWallGraphs={placedWallGraphs}
        />
      ) : null}
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
          showWallMeasurementGuides={!placementFeedbackIsWallOpening && !isSceneEntityMultiMoveActive}
          showBoundingBox={!isSceneEntityMultiMoveActive}
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
      {shouldRenderSceneEntityMultiDragSurface ? <SceneEntityMultiDragSurface /> : null}
      {shouldRenderSceneEntityRotationSurface ? <SceneEntityRotationSurface /> : null}
      {shouldRenderDesignReservationZoneDragSurface ? <DesignReservationZoneDragSurface /> : null}
      {shouldRenderWallSegmentDraftSurface ? <WallSegmentDraftSurface /> : null}
      {shouldRenderDesignReservationZonePlacementSurface ? <DesignReservationZonePlacementSurface /> : null}
    </>
  );
}
