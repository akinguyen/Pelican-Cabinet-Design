"use client";

import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { buildWallSegmentDraftPreviewGraph } from "@/engine/walls/segment-draft/wallSegmentDraftPreview";
import type { WallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import type { PlacedWallSegment } from "@/engine/walls/placedWallSegmentTypes";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";
import { WallSegmentMesh } from "./WallSegmentMesh";
import { WallSegmentDraftRenderer } from "./WallSegmentDraftRenderer";
import { WallElevationViewZoneOverlay } from "./WallElevationViewZoneOverlay";

const SHOW_WALL_ELEVATION_VIEW_ZONE_OVERLAY = true;

type WallLayerProps = Readonly<{
  placedWallGraphs: readonly PlacedWallGraph[];
  activeSelection: SceneSelection | null;
  activeWallElevationTarget: WallElevationTarget | null;
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
  activeSelection,
  activeWallElevationTarget,
  wallSegmentDraft,
  sceneViewMode,
}: WallLayerProps) {
  const selectedWallSegment = activeSelection?.kind === "placed-wall-segment"
    ? { wallGraphId: activeSelection.wallGraphId, wallSegmentId: activeSelection.wallSegmentId }
    : null;
  const previewGraph = wallSegmentDraft === null
    ? null
    : buildWallSegmentDraftPreviewGraph({
      draft: wallSegmentDraft,
      placedWallGraphs,
    });
  const renderItems = buildWallSegmentRenderItems({
    committedWallGraphs: placedWallGraphs,
    previewGraph,
    selectedWallSegment,
  });
  const shouldShowElevationViewZone = (
    sceneViewMode === "floor-plan" &&
    SHOW_WALL_ELEVATION_VIEW_ZONE_OVERLAY &&
    selectedWallSegment !== null &&
    activeWallElevationTarget !== null &&
    selectedWallSegment.wallGraphId === activeWallElevationTarget.wallGraphId &&
    selectedWallSegment.wallSegmentId === activeWallElevationTarget.wallSegmentId
  );
  const elevationViewZone = shouldShowElevationViewZone
    ? getWallElevationViewZoneForTarget({
      placedWallGraphs,
      activeWallElevationTarget,
    })
    : null;

  return (
    <group>
      {renderItems.map((renderItem) => (
        <WallSegmentMesh
          key={renderItem.key}
          segmentBody={renderItem.segmentBody}
          wallSegment={renderItem.wallSegment}
          renderState={renderItem.renderState}
          sceneViewMode={sceneViewMode}
        />
      ))}
      {elevationViewZone !== null ? (
        <WallElevationViewZoneOverlay viewZone={elevationViewZone} />
      ) : null}
      <WallSegmentDraftRenderer
        draft={wallSegmentDraft}
        previewGraph={previewGraph}
      />
    </group>
  );
}

function buildWallSegmentRenderItems(args: {
  committedWallGraphs: readonly PlacedWallGraph[];
  previewGraph: ReturnType<typeof buildWallSegmentDraftPreviewGraph>;
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
  const committedItems = args.committedWallGraphs
    .filter((wallGraph) => !affectedGraphIds.has(wallGraph.id))
    .flatMap((wallGraph) => buildConnectedWallGeometry(wallGraph).segmentBodies.flatMap<WallSegmentRenderItem>((segmentBody) => {
      const wallSegment = findWallSegment(wallGraph, segmentBody.wallSegmentId);

      return wallSegment === null
        ? []
        : [{
            key: `committed-${segmentBody.id}`,
            segmentBody,
            wallSegment,
            renderState: isSelectedSegment(segmentBody, args.selectedWallSegment) ? "selected" : "committed",
          }];
    }));
  const previewItems = (args.previewGraph?.previewWallGraphIds ?? [])
    .flatMap((wallGraphId) => args.previewGraph?.placedWallGraphs.filter((wallGraph) => wallGraph.id === wallGraphId) ?? [])
    .flatMap((wallGraph) => buildConnectedWallGeometry(wallGraph).segmentBodies.flatMap<WallSegmentRenderItem>((segmentBody) => {
      const wallSegment = findWallSegment(wallGraph, segmentBody.wallSegmentId);

      if (wallSegment === null) {
        return [];
      }

      const segmentKey = createWallSegmentKey(segmentBody);
      return [{
        key: `preview-${segmentBody.id}`,
        segmentBody,
        wallSegment,
        renderState: segmentKey === previewDraftKey || previewSegmentKeys.has(segmentKey) && segmentBody.wallSegmentId === args.previewGraph?.previewWallSegmentId
          ? "preview-draft"
          : "preview-existing",
      }];
    }));

  return [...committedItems, ...previewItems];
}

function findWallSegment(wallGraph: PlacedWallGraph, wallSegmentId: string): PlacedWallSegment | null {
  return wallGraph.segments.find((wallSegment) => wallSegment.id === wallSegmentId) ?? null;
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
