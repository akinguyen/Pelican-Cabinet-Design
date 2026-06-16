"use client";

import { useCallback, useMemo } from "react";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { deriveWallOpeningsFromAssemblies } from "@/engine/walls/openings/deriveWallOpeningsFromAssemblies";
import { buildWallSegmentDraftPreviewGraph } from "@/engine/walls/segment-draft/wallSegmentDraftPreview";
import type { WallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import type { PlacedWallSegment, DerivedWallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { WallSegmentMesh } from "./WallSegmentMesh";
import { WallSegmentDraftRenderer } from "./WallSegmentDraftRenderer";
import { WallElevationViewZoneOverlay } from "./WallElevationViewZoneOverlay";
import { WallPlanMeasurementGuides } from "./WallPlanMeasurementGuides";
import { WallOpeningPlanOutlines } from "./WallOpeningPlanOutlines";
import { WallOpeningPlanMeasurementGuides } from "./WallOpeningPlanMeasurementGuides";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";

const SHOW_WALL_ELEVATION_VIEW_ZONE_OVERLAY = true;
const EMPTY_DERIVED_WALL_OPENINGS: readonly DerivedWallOpening[] = [];
const EMPTY_DERIVED_WALL_OPENINGS_BY_SEGMENT_ID: ReadonlyMap<string, readonly DerivedWallOpening[]> = new Map();

type WallLayerProps = Readonly<{
  placedWallGraphs: readonly PlacedWallGraph[];
  wallOpeningAssemblies: readonly PlacedAssembly[];
  activeSelection: SceneSelection | null;
  wallSegmentDraft: WallSegmentDraft | null;
  showPlanMeasurements: boolean;
  sceneViewMode: SceneViewMode;
}>;

type WallSegmentRenderItem = Readonly<{
  key: string;
  segmentBody: BuiltWallSegmentBody;
  wallSegment: PlacedWallSegment;
  renderState: "committed" | "preview-existing" | "preview-draft" | "selected";
}>;

export function WallLayer({
  placedWallGraphs,
  wallOpeningAssemblies,
  activeSelection,
  wallSegmentDraft,
  showPlanMeasurements,
  sceneViewMode,
}: WallLayerProps) {
  const shouldRenderWallSegmentDraft = sceneViewMode === "floor-plan" && wallSegmentDraft !== null;
  const committedSegmentBodiesByWallGraphId = useMemo(
    () => buildWallSegmentBodiesByWallGraphId(placedWallGraphs),
    [placedWallGraphs],
  );
  const committedSegmentBodies = useMemo(() => placedWallGraphs.flatMap((placedWallGraph) => (
    committedSegmentBodiesByWallGraphId.get(placedWallGraph.id) ?? []
  )), [committedSegmentBodiesByWallGraphId, placedWallGraphs]);
  const committedWallSegmentsByWallGraphId = useMemo(
    () => buildWallSegmentsByWallGraphId(placedWallGraphs),
    [placedWallGraphs],
  );
  const derivedWallOpenings = useMemo(() => (
    wallOpeningAssemblies.length === 0 || committedSegmentBodies.length === 0
      ? EMPTY_DERIVED_WALL_OPENINGS
      : deriveWallOpeningsFromAssemblies({
        placedAssemblies: wallOpeningAssemblies,
        placedWallGraphs,
        registry: kitchenEditorCatalogRegistry,
        segmentBodies: committedSegmentBodies,
      })
  ), [committedSegmentBodies, wallOpeningAssemblies, placedWallGraphs]);
  const derivedWallOpeningsBySegmentId = useMemo(
    () => derivedWallOpenings.length === 0
      ? EMPTY_DERIVED_WALL_OPENINGS_BY_SEGMENT_ID
      : buildDerivedWallOpeningsBySegmentId(derivedWallOpenings),
    [derivedWallOpenings],
  );
  const selectedWallSegment = useMemo(() => (
    activeSelection?.kind === "placed-wall-segment"
      ? { wallGraphId: activeSelection.wallGraphId, wallSegmentId: activeSelection.wallSegmentId }
      : null
  ), [activeSelection]);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const activeWallOpeningSourceAssemblyId = useMemo(() => (
    activeDrag?.kind === "assembly-move"
      ? activeDrag.assemblyId
      : activeSelection?.kind === "placed-assembly"
        ? activeSelection.placedAssemblyId
        : null
  ), [activeDrag, activeSelection]);
  const shouldRenderWallOpeningPlanOverlays = sceneViewMode === "floor-plan" && wallSegmentDraft === null;
  const previewGraph = useMemo(() => (
    !shouldRenderWallSegmentDraft
      ? null
      : buildWallSegmentDraftPreviewGraph({
        draft: wallSegmentDraft,
        placedWallGraphs,
      })
  ), [placedWallGraphs, shouldRenderWallSegmentDraft, wallSegmentDraft]);
  const previewSegmentBodiesByWallGraphId = useMemo(
    () => buildWallSegmentBodiesByWallGraphId(previewGraph?.placedWallGraphs ?? []),
    [previewGraph],
  );
  const previewWallSegmentsByWallGraphId = useMemo(
    () => buildWallSegmentsByWallGraphId(previewGraph?.placedWallGraphs ?? []),
    [previewGraph],
  );
  const renderItems = useMemo(() => buildWallSegmentRenderItems({
    committedWallGraphs: placedWallGraphs,
    committedSegmentBodiesByWallGraphId,
    committedWallSegmentsByWallGraphId,
    previewGraph,
    previewSegmentBodiesByWallGraphId,
    previewWallSegmentsByWallGraphId,
    selectedWallSegment,
  }), [
    committedSegmentBodiesByWallGraphId,
    committedWallSegmentsByWallGraphId,
    placedWallGraphs,
    previewGraph,
    previewSegmentBodiesByWallGraphId,
    previewWallSegmentsByWallGraphId,
    selectedWallSegment,
  ]);
  const selectedWallElevationTarget = useMemo(() => {
    if (selectedWallSegment === null) {
      return null;
    }

    const selectedGraph = placedWallGraphs.find((wallGraph) => wallGraph.id === selectedWallSegment.wallGraphId);
    const selectedSegment = selectedGraph?.segments.find((wallSegment) => wallSegment.id === selectedWallSegment.wallSegmentId);

    if (selectedSegment === undefined) {
      return null;
    }

    return {
      wallGraphId: selectedWallSegment.wallGraphId,
      wallSegmentId: selectedWallSegment.wallSegmentId,
      faceSide: selectedSegment.preferredViewFaceSide,
    };
  }, [placedWallGraphs, selectedWallSegment]);
  const shouldShowElevationViewZone = (
    sceneViewMode === "floor-plan" &&
    SHOW_WALL_ELEVATION_VIEW_ZONE_OVERLAY &&
    selectedWallElevationTarget !== null
  );
  const elevationViewZone = useMemo(() => shouldShowElevationViewZone
    ? getWallElevationViewZoneForTarget({
      placedWallGraphs,
      activeWallElevationTarget: selectedWallElevationTarget,
    })
    : null, [placedWallGraphs, selectedWallElevationTarget, shouldShowElevationViewZone]);

  const openSelectedWallElevationTarget = useCallback(() => {
    if (selectedWallElevationTarget === null) {
      return;
    }

    const designSceneStore = useDesignSceneStore.getState();
    designSceneStore.setActiveWallElevationTarget(selectedWallElevationTarget);
    designSceneStore.setActiveSceneViewMode("elevation");
  }, [selectedWallElevationTarget]);

  return (
    <group>
      {renderItems.map((renderItem) => (
        <WallSegmentMesh
          key={renderItem.key}
          segmentBody={renderItem.segmentBody}
          wallSegment={renderItem.wallSegment}
          derivedOpenings={derivedWallOpeningsBySegmentId.get(renderItem.wallSegment.id) ?? EMPTY_DERIVED_WALL_OPENINGS}
          renderState={renderItem.renderState}
          sceneViewMode={sceneViewMode}
        />
      ))}
      {showPlanMeasurements ? (
        <WallPlanMeasurementGuides segmentBodies={committedSegmentBodies} />
      ) : null}
      {shouldRenderWallOpeningPlanOverlays ? (
        <WallOpeningPlanOutlines
          derivedWallOpenings={derivedWallOpenings}
          segmentBodies={committedSegmentBodies}
          wallOpeningAssemblies={wallOpeningAssemblies}
        />
      ) : null}
      {shouldRenderWallOpeningPlanOverlays && activeWallOpeningSourceAssemblyId !== null ? (
        <WallOpeningPlanMeasurementGuides
          activeSourceAssemblyId={activeWallOpeningSourceAssemblyId}
          derivedWallOpenings={derivedWallOpenings}
          segmentBodies={committedSegmentBodies}
        />
      ) : null}
      {elevationViewZone !== null ? (
        <WallElevationViewZoneOverlay
          viewZone={elevationViewZone}
          onPointerDown={openSelectedWallElevationTarget}
        />
      ) : null}
      {shouldRenderWallSegmentDraft ? (
        <WallSegmentDraftRenderer
          draft={wallSegmentDraft}
          placedWallGraphs={placedWallGraphs}
          previewGraph={previewGraph}
          previewSegmentBodiesByWallGraphId={previewSegmentBodiesByWallGraphId}
        />
      ) : null}
    </group>
  );
}

function buildWallSegmentBodiesByWallGraphId(
  placedWallGraphs: readonly PlacedWallGraph[],
): ReadonlyMap<string, readonly BuiltWallSegmentBody[]> {
  const segmentBodiesByWallGraphId = new Map<string, readonly BuiltWallSegmentBody[]>();

  for (const placedWallGraph of placedWallGraphs) {
    segmentBodiesByWallGraphId.set(
      placedWallGraph.id,
      buildConnectedWallGeometry(placedWallGraph).segmentBodies,
    );
  }

  return segmentBodiesByWallGraphId;
}

function buildWallSegmentsByWallGraphId(
  placedWallGraphs: readonly PlacedWallGraph[],
): ReadonlyMap<string, ReadonlyMap<string, PlacedWallSegment>> {
  const wallSegmentsByWallGraphId = new Map<string, ReadonlyMap<string, PlacedWallSegment>>();

  for (const placedWallGraph of placedWallGraphs) {
    wallSegmentsByWallGraphId.set(
      placedWallGraph.id,
      new Map(placedWallGraph.segments.map((wallSegment) => [wallSegment.id, wallSegment])),
    );
  }

  return wallSegmentsByWallGraphId;
}

function buildDerivedWallOpeningsBySegmentId(
  wallOpenings: readonly DerivedWallOpening[],
): ReadonlyMap<string, readonly DerivedWallOpening[]> {
  const wallOpeningsBySegmentId = new Map<string, DerivedWallOpening[]>();

  for (const wallOpening of wallOpenings) {
    const existingDerivedWallOpenings = wallOpeningsBySegmentId.get(wallOpening.wallSegmentId);

    if (existingDerivedWallOpenings === undefined) {
      wallOpeningsBySegmentId.set(wallOpening.wallSegmentId, [wallOpening]);
      continue;
    }

    existingDerivedWallOpenings.push(wallOpening);
  }

  return wallOpeningsBySegmentId;
}

function buildWallSegmentRenderItems(args: {
  committedWallGraphs: readonly PlacedWallGraph[];
  committedSegmentBodiesByWallGraphId: ReadonlyMap<string, readonly BuiltWallSegmentBody[]>;
  committedWallSegmentsByWallGraphId: ReadonlyMap<string, ReadonlyMap<string, PlacedWallSegment>>;
  previewGraph: ReturnType<typeof buildWallSegmentDraftPreviewGraph>;
  previewSegmentBodiesByWallGraphId: ReadonlyMap<string, readonly BuiltWallSegmentBody[]>;
  previewWallSegmentsByWallGraphId: ReadonlyMap<string, ReadonlyMap<string, PlacedWallSegment>>;
  selectedWallSegment: { wallGraphId: string; wallSegmentId: string } | null;
}): readonly WallSegmentRenderItem[] {
  const affectedGraphIds = new Set(args.previewGraph?.affectedCommittedWallGraphIds ?? []);
  const previewSegmentKeys = new Set((args.previewGraph?.previewWallSegmentReferences ?? []).map(createWallSegmentKey));
  const previewDraftKey = args.previewGraph === null
    ? null
    : createWallSegmentKey({
      wallGraphId: args.previewGraph.previewWallGraphIds[0] ?? "",
      wallSegmentId: args.previewGraph.previewWallSegmentId,
    });
  const renderItems: WallSegmentRenderItem[] = [];

  for (const wallGraph of args.committedWallGraphs) {
    if (affectedGraphIds.has(wallGraph.id)) {
      continue;
    }

    appendWallSegmentRenderItems({
      renderItems,
      keyPrefix: "committed",
      segmentBodies: args.committedSegmentBodiesByWallGraphId.get(wallGraph.id) ?? [],
      wallSegmentById: args.committedWallSegmentsByWallGraphId.get(wallGraph.id),
      getRenderState: (segmentBody) => isSelectedSegment(segmentBody, args.selectedWallSegment) ? "selected" : "committed",
    });
  }

  for (const wallGraphId of args.previewGraph?.previewWallGraphIds ?? []) {
    appendWallSegmentRenderItems({
      renderItems,
      keyPrefix: "preview",
      segmentBodies: args.previewSegmentBodiesByWallGraphId.get(wallGraphId) ?? [],
      wallSegmentById: args.previewWallSegmentsByWallGraphId.get(wallGraphId),
      getRenderState: (segmentBody) => {
        const segmentKey = createWallSegmentKey(segmentBody);

        return segmentKey === previewDraftKey ||
          (previewSegmentKeys.has(segmentKey) && segmentBody.wallSegmentId === args.previewGraph?.previewWallSegmentId)
          ? "preview-draft"
          : "preview-existing";
      },
    });
  }

  return renderItems;
}

function appendWallSegmentRenderItems(args: {
  renderItems: WallSegmentRenderItem[];
  keyPrefix: string;
  segmentBodies: readonly BuiltWallSegmentBody[];
  wallSegmentById: ReadonlyMap<string, PlacedWallSegment> | undefined;
  getRenderState: (segmentBody: BuiltWallSegmentBody) => WallSegmentRenderItem["renderState"];
}): void {
  if (args.wallSegmentById === undefined) {
    return;
  }

  for (const segmentBody of args.segmentBodies) {
    const wallSegment = args.wallSegmentById.get(segmentBody.wallSegmentId);

    if (wallSegment === undefined) {
      continue;
    }

    args.renderItems.push({
      key: `${args.keyPrefix}-${segmentBody.id}`,
      segmentBody,
      wallSegment,
      renderState: args.getRenderState(segmentBody),
    });
  }
}

function createWallSegmentKey(args: { wallGraphId: string; wallSegmentId: string }): string {
  return `${args.wallGraphId}:${args.wallSegmentId}`;
}

function isSelectedSegment(
  segmentBody: BuiltWallSegmentBody,
  selectedWallSegment: { wallGraphId: string; wallSegmentId: string } | null,
): boolean {
  return (
    selectedWallSegment !== null &&
    segmentBody.wallGraphId === selectedWallSegment.wallGraphId &&
    segmentBody.wallSegmentId === selectedWallSegment.wallSegmentId
  );
}
