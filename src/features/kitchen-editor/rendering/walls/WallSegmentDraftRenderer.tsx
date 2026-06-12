"use client";

import { Html, Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import type { WallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { WallSegmentDraftPreviewGraph } from "@/engine/walls/segment-draft/wallSegmentDraftPreview";
import { getWallSegmentAnchorPoint } from "@/engine/walls/segment-draft/wallSegmentDraftAnchors";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";
import { WallAnchorRing } from "./WallAnchorRing";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const DRAFT_CENTERLINE_Z_INCHES = 0.45;
const DRAFT_GUIDE_Z_INCHES = 0.55;
const DRAFT_MEASUREMENT_Z_INCHES = 1.0;
const ANCHOR_RING_DEDUPLICATION_DISTANCE_INCHES = 0.75;

type WallSegmentDraftRendererProps = Readonly<{
  draft: WallSegmentDraft | null;
  previewGraph: WallSegmentDraftPreviewGraph | null;
}>;

export function WallSegmentDraftRenderer({
  draft,
  previewGraph,
}: WallSegmentDraftRendererProps) {
  if (draft === null) {
    return null;
  }

  const previewBody = findPreviewSegmentBody(previewGraph);
  const startPointInches = draft.activeStartAnchor === null
    ? null
    : getWallSegmentAnchorPoint(draft.activeStartAnchor);
  const hoverPointInches = draft.hoverAnchor === null
    ? null
    : getWallSegmentAnchorPoint(draft.hoverAnchor);
  const draftAnchorRingPoints = previewBody === null
    ? getDraftAnchorRingPoints({ startPointInches, hoverPointInches })
    : [];

  return (
    <group>
      {draft.activeGuide !== null ? (
        <WallDrawingGuideLine guide={draft.activeGuide} />
      ) : null}
      {previewBody === null && startPointInches !== null && hoverPointInches !== null ? (
        <Line
          points={[
            [startPointInches.xInches, startPointInches.yInches, DRAFT_CENTERLINE_Z_INCHES],
            [hoverPointInches.xInches, hoverPointInches.yInches, DRAFT_CENTERLINE_Z_INCHES],
          ]}
          color={wallSegmentRenderColors.activeCenterlineStroke}
          lineWidth={3}
          depthTest={false}
          renderOrder={120}
        />
      ) : null}
      {previewBody !== null ? (
        <WallSegmentDraftMeasurements segmentBody={previewBody} />
      ) : null}
      {draftAnchorRingPoints.map((pointInches) => (
        <WallAnchorRing
          key={`${pointInches.xInches}:${pointInches.yInches}:${pointInches.zInches}`}
          pointInches={pointInches}
        />
      ))}
    </group>
  );
}

function findPreviewSegmentBody(previewGraph: WallSegmentDraftPreviewGraph | null): BuiltWallSegmentBody | null {
  if (previewGraph === null) {
    return null;
  }

  for (const wallGraphId of previewGraph.previewWallGraphIds) {
    const wallGraph = previewGraph.placedWallGraphs.find((candidate) => candidate.id === wallGraphId);

    if (wallGraph === undefined) {
      continue;
    }

    const previewBody = buildConnectedWallGeometry(wallGraph).segmentBodies.find((segmentBody) => (
      segmentBody.wallSegmentId === previewGraph.previewWallSegmentId
    ));

    if (previewBody !== undefined) {
      return previewBody;
    }
  }

  return null;
}

function getDraftAnchorRingPoints(args: {
  startPointInches: Point3DInches | null;
  hoverPointInches: Point3DInches | null;
}): readonly Point3DInches[] {
  const pointsInches: Point3DInches[] = [];

  if (args.startPointInches !== null) {
    pointsInches.push(args.startPointInches);
  }

  const hoverPointInches = args.hoverPointInches;

  if (
    hoverPointInches !== null &&
    !pointsInches.some((pointInches) => arePlanPointsNear(pointInches, hoverPointInches))
  ) {
    pointsInches.push(hoverPointInches);
  }

  return pointsInches;
}

function arePlanPointsNear(firstPointInches: Point3DInches, secondPointInches: Point3DInches): boolean {
  return Math.hypot(
    secondPointInches.xInches - firstPointInches.xInches,
    secondPointInches.yInches - firstPointInches.yInches,
  ) <= ANCHOR_RING_DEDUPLICATION_DISTANCE_INCHES;
}

function WallDrawingGuideLine({
  guide,
}: Readonly<{
  guide: NonNullable<WallSegmentDraft["activeGuide"]>;
}>) {
  const points = guide.kind === "horizontal"
    ? [
      [guide.startXInches, guide.yInches, DRAFT_GUIDE_Z_INCHES] as const,
      [guide.endXInches, guide.yInches, DRAFT_GUIDE_Z_INCHES] as const,
    ]
    : [
      [guide.xInches, guide.startYInches, DRAFT_GUIDE_Z_INCHES] as const,
      [guide.xInches, guide.endYInches, DRAFT_GUIDE_Z_INCHES] as const,
    ];

  return (
    <Line
      points={points}
      color={wallSegmentRenderColors.activeStroke}
      lineWidth={1.5}
      dashed
      dashScale={8}
      gapSize={4}
      depthTest={false}
      renderOrder={125}
    />
  );
}

function WallSegmentDraftMeasurements({
  segmentBody,
}: Readonly<{
  segmentBody: BuiltWallSegmentBody;
}>) {
  return (
    <group>
      <WallDraftMeasurementLabel
        startPointInches={segmentBody.start.sideAPointInches}
        endPointInches={segmentBody.end.sideAPointInches}
      />
      <WallDraftMeasurementLabel
        startPointInches={segmentBody.start.sideBPointInches}
        endPointInches={segmentBody.end.sideBPointInches}
      />
    </group>
  );
}

function WallDraftMeasurementLabel({
  startPointInches,
  endPointInches,
}: Readonly<{
  startPointInches: { xInches: number; yInches: number };
  endPointInches: { xInches: number; yInches: number };
}>) {
  const lengthInches = Math.hypot(
    endPointInches.xInches - startPointInches.xInches,
    endPointInches.yInches - startPointInches.yInches,
  );
  const midpointXInches = (startPointInches.xInches + endPointInches.xInches) / 2;
  const midpointYInches = (startPointInches.yInches + endPointInches.yInches) / 2;
  const rotationDegrees = (Math.atan2(
    endPointInches.yInches - startPointInches.yInches,
    endPointInches.xInches - startPointInches.xInches,
  ) * 180) / Math.PI;

  return (
    <Html
      center
      position={[midpointXInches, midpointYInches, DRAFT_MEASUREMENT_Z_INCHES]}
      style={{ pointerEvents: "none", whiteSpace: "nowrap", zIndex: 80 }}
    >
      <div
        className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-bold leading-none text-slate-800 shadow-sm ring-1 ring-cyan-100"
        style={{ transform: `rotate(${-rotationDegrees}deg)`, transformOrigin: "center" }}
      >
        {formatFeetInchesLabel(lengthInches)}
      </div>
    </Html>
  );
}
