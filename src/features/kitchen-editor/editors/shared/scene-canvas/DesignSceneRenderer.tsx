"use client";

import { useMemo } from "react";
import { getDesignReservationZonesFromSceneEntities, getPlacedAssembliesFromSceneEntities, getSceneEntitiesByRefs } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { createSceneEntityBounds, createSceneEntityBoundsForRefs } from "@/engine/scene-entities/sceneEntityBounds";
import { buildSceneEntitySpatialMeasurementGuides } from "@/engine/scene-entities/spatial-guides/sceneEntitySpatialGuideEngine";
import { createSceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { getSceneEntityRefsFromSelection } from "@/engine/scene/sceneSelectionTypes";
import { SceneEntityMoveDragSurface } from "../../../interaction/scene-entities/SceneEntityMoveDragSurface";
import { createSceneEntityElevationFrame } from "../../../interaction/scene-entities/sceneEntityElevationFrame";
import { SceneEntityPlacementSurface } from "../../../interaction/scene-entities/SceneEntityPlacementSurface";
import { SceneEntityRotationSurface } from "../../../interaction/scene-entities/SceneEntityRotationSurface";
import { WallSegmentDraftSurface } from "../../../interaction/walls/WallSegmentDraftSurface";
import { AssemblyLayer } from "../../../rendering/assemblies/AssemblyLayer";
import { AssemblyPlacementCandidateRenderer } from "../../../rendering/assemblies/AssemblyPlacementCandidateRenderer";
import { DesignReservationZonePlacementCandidateRenderer } from "../../../rendering/design-zones/DesignReservationZonePlacementCandidateRenderer";
import { DesignReservationZoneLayer } from "../../../rendering/design-zones/DesignReservationZoneLayer";
import { SceneEntityAlignmentGuides } from "../../../rendering/scene-entities/SceneEntityAlignmentGuides";
import { SceneEntityWallMeasurementGuides } from "../../../rendering/scene-entities/SceneEntityWallMeasurementGuides";
import { SceneEntityWallMeasurementLabelProjector } from "../../../rendering/scene-entities/SceneEntityWallMeasurementLabelProjector";
import { SelectedSceneEntityLayer } from "../../../rendering/scene-entities/SelectedSceneEntityLayer";
import { WallLayer } from "../../../rendering/walls/WallLayer";
import { kitchenEditorCatalogRegistry } from "../../../catalogs/registry/kitchenEditorCatalogRegistry";
import { getDerivedCutoutAssemblySources } from "@/engine/scene/derivedCutoutAssemblySources";
import { buildDesignReservationZoneById, buildPlacedAssemblyById, getSelectedDesignReservationZones, getSelectedPlacedAssembly, getSelectedPlacedAssemblies } from "../../../selection/sceneSelectionLookups";
import { createSceneEntityViewPolicy } from "../../../view-policies/sceneEntityViewPolicy";

export function DesignSceneRenderer() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
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
    movementFrame: sceneEntityPlacementCandidate?.movementFrame ?? null,
  } : null;
  const sceneEntityViewPolicy = useMemo(() => createSceneEntityViewPolicy(activeSceneViewMode), [activeSceneViewMode]);
  const activeElevationFrame = useMemo(() => activeSceneViewMode === "elevation" ? createSceneEntityElevationFrame({ placedWallGraphs, activeWallElevationTarget }) ?? null : null, [activeSceneViewMode, activeWallElevationTarget, placedWallGraphs]);
  const activeSceneEntityMovementFrame = useMemo(() => createSceneEntityMovementFrame({ sceneViewMode: activeSceneViewMode, elevationMoveFrame: activeElevationFrame ?? undefined }), [activeElevationFrame, activeSceneViewMode]);
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
  const selectedSceneEntityWallMeasurementGuides = useMemo(() => selectedSceneEntityBounds.flatMap((bounds) => buildSceneEntitySpatialMeasurementGuides({ bounds, placedWallGraphs, measurementPolicy: sceneEntityViewPolicy.measurementPolicy, movementFrame: activeSceneEntityMovementFrame })), [activeSceneEntityMovementFrame, placedWallGraphs, sceneEntityViewPolicy.measurementPolicy, selectedSceneEntityBounds]);
  const placementSceneEntityWallMeasurementGuides = useMemo(() => positionedPlacementSceneEntity === null ? [] : buildSceneEntitySpatialMeasurementGuides({ bounds: createSceneEntityBounds(positionedPlacementSceneEntity), placedWallGraphs, measurementPolicy: sceneEntityViewPolicy.measurementPolicy, movementFrame: activeSceneEntityMovementFrame }), [activeSceneEntityMovementFrame, placedWallGraphs, positionedPlacementSceneEntity, sceneEntityViewPolicy.measurementPolicy]);
  const sceneEntityWallMeasurementGuides = [...selectedSceneEntityWallMeasurementGuides, ...placementSceneEntityWallMeasurementGuides];
  const selectedAssemblyIsWallOpening = selectedAssembly !== null && wallOpeningAssemblyIds.has(selectedAssembly.id);

  return (
    <>
      <WallLayer placedWallGraphs={placedWallGraphs} wallOpeningAssemblies={cutoutAssemblySources.wallOpeningAssemblies} activeSelection={activeSelection} wallSegmentDraft={wallSegmentDraft} showPlanMeasurements={showWallPlanMeasurements} sceneViewMode={activeSceneViewMode} activeWallOpeningSourceAssemblyId={activeWallOpeningSourceAssemblyId} />
      <AssemblyLayer placedAssemblies={placedAssemblies} countertopOpeningAssemblies={cutoutAssemblySources.countertopOpeningAssemblies} showFrontOutlineLines={showFrontOutlineLines} sceneViewMode={activeSceneViewMode} />
      <DesignReservationZoneLayer zones={designReservationZones} activeSelection={activeSelection} sceneViewMode={activeSceneViewMode} />
      <DesignReservationZonePlacementCandidateRenderer candidate={positionedPlacementZone} sceneViewMode={activeSceneViewMode} />
      <SelectedSceneEntityLayer selectedSceneEntities={selectedSceneEntities} selectedSceneEntityBounds={selectedSceneEntityBounds} placedWallGraphs={placedWallGraphs} selectedAssemblyIsWallOpening={selectedAssemblyIsWallOpening} showRotationHandle={sceneEntityViewPolicy.showRotationHandle} enableRotationHandleInteraction={sceneEntityViewPolicy.enableRotationHandleInteraction} />
      {sceneEntityWallMeasurementGuides.length > 0 ? <SceneEntityWallMeasurementGuides measurementGuides={sceneEntityWallMeasurementGuides} renderLabels={activeSceneViewMode !== "elevation"} /> : null}
      <SceneEntityWallMeasurementLabelProjector enabled={activeSceneViewMode === "elevation"} measurementGuides={sceneEntityWallMeasurementGuides} />
      {activeSceneEntityAlignmentGuides.length > 0 ? <SceneEntityAlignmentGuides alignmentGuides={activeSceneEntityAlignmentGuides} /> : null}
      {positionedPlacementAssembly !== null ? <AssemblyPlacementCandidateRenderer candidateAssembly={positionedPlacementAssembly} showFrontOutlineLines={showFrontOutlineLines} sceneViewMode={activeSceneViewMode} /> : null}
      {shouldRenderSceneEntityMoveDragSurface ? <SceneEntityMoveDragSurface /> : null}
      {shouldRenderSceneEntityRotationSurface ? <SceneEntityRotationSurface /> : null}
      {shouldRenderWallSegmentDraftSurface ? <WallSegmentDraftSurface /> : null}
      {shouldRenderSceneEntityPlacementSurface ? <SceneEntityPlacementSurface sceneViewMode={activeSceneViewMode} /> : null}
    </>
  );
}
