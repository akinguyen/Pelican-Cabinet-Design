"use client";

import { useMemo } from "react";
import { getDesignReservationZonesFromSceneEntities, getPlacedAssembliesFromSceneEntities, getSceneEntitiesByRefs } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { createSceneEntityBounds, createSceneEntityBoundsForRefs } from "@/engine/scene-entities/sceneEntityBounds";
import { buildSceneEntityWallMeasurementGuides } from "@/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { getSceneEntityRefsFromSelection } from "@/engine/scene/sceneSelectionTypes";
import { SceneEntityMoveDragSurface } from "../../../interaction/scene-entities/SceneEntityMoveDragSurface";
import { SceneEntityPlacementSurface } from "../../../interaction/scene-entities/SceneEntityPlacementSurface";
import { SceneEntityRotationSurface } from "../../../interaction/scene-entities/SceneEntityRotationSurface";
import { WallSegmentDraftSurface } from "../../../interaction/walls/WallSegmentDraftSurface";
import { AssemblyLayer } from "../../../rendering/assemblies/AssemblyLayer";
import { AssemblyPlacementCandidateRenderer } from "../../../rendering/assemblies/AssemblyPlacementCandidateRenderer";
import { DesignReservationZonePlacementCandidateRenderer } from "../../../rendering/design-zones/DesignReservationZonePlacementCandidateRenderer";
import { DesignReservationZoneLayer } from "../../../rendering/design-zones/DesignReservationZoneLayer";
import { SceneEntityAlignmentGuides } from "../../../rendering/scene-entities/SceneEntityAlignmentGuides";
import { SceneEntityWallMeasurementGuides } from "../../../rendering/scene-entities/SceneEntityWallMeasurementGuides";
import { SceneEntityGroupGuides } from "../../../rendering/scene-entities/SceneEntityGroupGuides";
import { SelectedSceneEntityLayer } from "../../../rendering/scene-entities/SelectedSceneEntityLayer";
import { WallLayer } from "../../../rendering/walls/WallLayer";
import { kitchenEditorCatalogRegistry } from "../../../catalogs/registry/kitchenEditorCatalogRegistry";
import { getDerivedCutoutAssemblySources } from "@/engine/scene/derivedCutoutAssemblySources";
import { buildDesignReservationZoneById, buildPlacedAssemblyById, getSelectedDesignReservationZones, getSelectedPlacedAssembly, getSelectedPlacedAssemblies } from "../../../selection/sceneSelectionLookups";

export function DesignSceneRenderer() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const sceneEntities = useDesignSceneStore((state) => state.designScene.sceneEntities);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const wallSegmentDraft = activeSceneOperation?.kind === "wall-segment-draft" ? activeSceneOperation.wallSegmentDraft : null;
  const sceneEntityPlacementCandidate = activeSceneOperation?.kind === "scene-entity-placement" ? activeSceneOperation.candidate : null;
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const activeSceneEntityAlignmentGuides = useDesignSceneStore((state) => state.activeSceneEntityAlignmentGuides);
  const placedAssemblies = useMemo(() => getPlacedAssembliesFromSceneEntities(sceneEntities), [sceneEntities]);
  const designReservationZones = useMemo(() => getDesignReservationZonesFromSceneEntities(sceneEntities), [sceneEntities]);
  const positionedPlacementSceneEntity = sceneEntityPlacementCandidate?.placementState === "positioned" ? sceneEntityPlacementCandidate.sceneEntity : null;
  const positionedPlacementAssembly = positionedPlacementSceneEntity?.entityKind === "placed-assembly" ? positionedPlacementSceneEntity : null;
  const positionedPlacementZone = positionedPlacementSceneEntity?.entityKind === "design-reservation-zone" ? {
    zone: positionedPlacementSceneEntity,
    placementState: "positioned" as const,
    sceneViewMode: sceneEntityPlacementCandidate?.sceneViewMode ?? activeSceneViewMode,
    elevationMoveFrame: sceneEntityPlacementCandidate?.elevationMoveFrame,
  } : null;
  const showFrontOutlineLines = activeSceneViewMode === "elevation";
  const showWallPlanMeasurements = activeSceneViewMode === "floor-plan" && wallSegmentDraft === null;
  const shouldRenderSceneEntityPlacementSurface = activeSceneOperation?.kind === "scene-entity-placement";
  const shouldRenderSceneEntityMoveDragSurface = activeDrag?.kind === "scene-entity-move";
  const shouldRenderWallSegmentDraftSurface = activeSceneViewMode === "floor-plan" && activeToolbarTool === "draw-wall-segment";
  const shouldRenderSceneEntityRotationSurface = activeDrag?.kind === "scene-entity-rotation";
  const cutoutAssemblySources = useMemo(() => getDerivedCutoutAssemblySources({ placedAssemblies, positionedPlacementCandidate: positionedPlacementAssembly, registry: kitchenEditorCatalogRegistry }), [placedAssemblies, positionedPlacementAssembly]);
  const wallOpeningAssemblyIds = useMemo(() => new Set(cutoutAssemblySources.wallOpeningAssemblies.map((assembly) => assembly.id)), [cutoutAssemblySources.wallOpeningAssemblies]);
  const activeWallOpeningSourceAssemblyId = useMemo(() => {
    const activeDragAssemblyId = activeDrag?.kind === "scene-entity-move"
      ? activeDrag.sceneEntities.find((sceneEntity) => sceneEntity.entityKind === "placed-assembly")?.entityId ?? null
      : activeDrag?.kind === "scene-entity-rotation" && activeDrag.sceneEntity.entityKind === "placed-assembly"
        ? activeDrag.sceneEntity.entityId
        : null;
    if (activeDragAssemblyId !== null && wallOpeningAssemblyIds.has(activeDragAssemblyId)) return activeDragAssemblyId;
    if (positionedPlacementAssembly !== null && wallOpeningAssemblyIds.has(positionedPlacementAssembly.id)) return positionedPlacementAssembly.id;
    if (activeSelection?.kind === "scene-entity" && activeSelection.sceneEntity.entityKind === "placed-assembly" && wallOpeningAssemblyIds.has(activeSelection.sceneEntity.entityId)) return activeSelection.sceneEntity.entityId;
    return null;
  }, [activeDrag, activeSelection, positionedPlacementAssembly, wallOpeningAssemblyIds]);
  const placedAssemblyById = useMemo(() => buildPlacedAssemblyById(placedAssemblies), [placedAssemblies]);
  const selectedAssembly = useMemo(() => getSelectedPlacedAssembly({ activeSelection, placedAssemblyById }), [activeSelection, placedAssemblyById]);
  const selectedAssemblies = useMemo(() => getSelectedPlacedAssemblies({ activeSelection, placedAssemblyById }), [activeSelection, placedAssemblyById]);
  const designReservationZoneById = useMemo(() => buildDesignReservationZoneById(designReservationZones), [designReservationZones]);
  const selectedDesignReservationZones = useMemo(() => getSelectedDesignReservationZones({ activeSelection, designReservationZoneById }), [activeSelection, designReservationZoneById]);
  const selectedSceneEntityRefs = useMemo(() => getSceneEntityRefsFromSelection(activeSelection), [activeSelection]);
  const selectedSceneEntities = useMemo(() => getSceneEntitiesByRefs(sceneEntities, selectedSceneEntityRefs), [sceneEntities, selectedSceneEntityRefs]);
  const selectedSceneEntityBounds = useMemo(() => createSceneEntityBoundsForRefs(sceneEntities, selectedSceneEntityRefs), [sceneEntities, selectedSceneEntityRefs]);
  const selectedSceneEntityWallMeasurementGuides = useMemo(() => activeSceneViewMode !== "floor-plan" ? [] : selectedSceneEntityBounds.flatMap((bounds) => buildSceneEntityWallMeasurementGuides({ bounds, placedWallGraphs })), [activeSceneViewMode, placedWallGraphs, selectedSceneEntityBounds]);
  const placementSceneEntityWallMeasurementGuides = useMemo(() => activeSceneViewMode !== "floor-plan" || positionedPlacementSceneEntity === null ? [] : buildSceneEntityWallMeasurementGuides({ bounds: createSceneEntityBounds(positionedPlacementSceneEntity), placedWallGraphs }), [activeSceneViewMode, placedWallGraphs, positionedPlacementSceneEntity]);
  const sceneEntityWallMeasurementGuides = [...selectedSceneEntityWallMeasurementGuides, ...placementSceneEntityWallMeasurementGuides];
  const selectedAssemblyIsWallOpening = selectedAssembly !== null && wallOpeningAssemblyIds.has(selectedAssembly.id);
  const showSceneEntityGroupGuides = activeSceneViewMode === "floor-plan" && selectedSceneEntityBounds.length > 1 && activeDrag?.kind === "scene-entity-move";

  return (
    <>
      <WallLayer placedWallGraphs={placedWallGraphs} wallOpeningAssemblies={cutoutAssemblySources.wallOpeningAssemblies} activeSelection={activeSelection} wallSegmentDraft={wallSegmentDraft} showPlanMeasurements={showWallPlanMeasurements} sceneViewMode={activeSceneViewMode} activeWallOpeningSourceAssemblyId={activeWallOpeningSourceAssemblyId} />
      <AssemblyLayer placedAssemblies={placedAssemblies} countertopOpeningAssemblies={cutoutAssemblySources.countertopOpeningAssemblies} showFrontOutlineLines={showFrontOutlineLines} sceneViewMode={activeSceneViewMode} />
      <DesignReservationZoneLayer zones={designReservationZones} activeSelection={activeSelection} sceneViewMode={activeSceneViewMode} />
      <DesignReservationZonePlacementCandidateRenderer candidate={positionedPlacementZone} sceneViewMode={activeSceneViewMode} />
      <SelectedSceneEntityLayer selectedSceneEntities={selectedSceneEntities} selectedSceneEntityBounds={selectedSceneEntityBounds} placedWallGraphs={placedWallGraphs} sceneViewMode={activeSceneViewMode} selectedAssemblyIsWallOpening={selectedAssemblyIsWallOpening} />
      {showSceneEntityGroupGuides ? <SceneEntityGroupGuides bounds={selectedSceneEntityBounds} placedWallGraphs={placedWallGraphs} /> : null}
      {sceneEntityWallMeasurementGuides.length > 0 ? <SceneEntityWallMeasurementGuides measurementGuides={sceneEntityWallMeasurementGuides} /> : null}
      {activeSceneEntityAlignmentGuides.length > 0 ? <SceneEntityAlignmentGuides alignmentGuides={activeSceneEntityAlignmentGuides} /> : null}
      {positionedPlacementAssembly !== null ? <AssemblyPlacementCandidateRenderer candidateAssembly={positionedPlacementAssembly} showFrontOutlineLines={showFrontOutlineLines} sceneViewMode={activeSceneViewMode} /> : null}
      {shouldRenderSceneEntityMoveDragSurface ? <SceneEntityMoveDragSurface /> : null}
      {shouldRenderSceneEntityRotationSurface ? <SceneEntityRotationSurface /> : null}
      {shouldRenderWallSegmentDraftSurface ? <WallSegmentDraftSurface /> : null}
      {shouldRenderSceneEntityPlacementSurface ? <SceneEntityPlacementSurface sceneViewMode={activeSceneViewMode} /> : null}
    </>
  );
}
