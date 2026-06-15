"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallSegmentDraftPreviewGraph } from "@/engine/walls/segment-draft/wallSegmentDraftPreview";
import { getWallSegmentAnchorPoint } from "@/engine/walls/segment-draft/wallSegmentDraftAnchors";
import type { WallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";
import { getWallSegmentEndpointPoint } from "@/engine/walls/wallSegmentGeometry";
import { PlanMeasurementLine } from "../shared/PlanMeasurementLine";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";
import {
  convertDegreesToRadians,
  getNormalizedPlanDirection,
  getPlanDirectionAngleDegrees,
  getPlanDistanceInches,
  getPlanMidpoint,
  getReadablePlanLabelRotationDegrees,
  normalizeDegrees,
  offsetPlanPoint,
  type PlanDirection,
} from "./guides/wallPlanGuideGeometry";
import { WallAnchorRing } from "./WallAnchorRing";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const DRAFT_CENTERLINE_Z_INCHES = 0.45;
const DRAFT_GUIDE_Z_INCHES = 0.55;
const DRAFT_MEASUREMENT_Z_INCHES = 1.0;
const DRAFT_MEASUREMENT_OFFSET_INCHES = 8;
const DRAFT_MEASUREMENT_RENDER_ORDER = 128;
const DRAFT_MEASUREMENT_DASH_SIZE_INCHES = 3;
const DRAFT_MEASUREMENT_GAP_SIZE_INCHES = 3;
const DRAFT_ANGLE_GUIDE_Z_INCHES = 1.25;
const ANCHOR_RING_DEDUPLICATION_DISTANCE_INCHES = 0.75;
const EXTENDED_ALIGNMENT_GUIDE_HALF_LENGTH_INCHES = 5000;
const MIN_DRAFT_MEASUREMENT_LENGTH_INCHES = 3;
const ANGLE_GUIDE_MIN_RADIUS_INCHES = 30;
const ANGLE_GUIDE_MAX_RADIUS_INCHES = 78;
const ANGLE_GUIDE_RADIUS_LENGTH_RATIO = 0.55;
const ANGLE_GUIDE_LABEL_RADIUS_RATIO = 0.58;
const ANGLE_GUIDE_SEGMENT_COUNT = 96;

type WallSegmentDraftRendererProps = Readonly<{
  draft: WallSegmentDraft | null;
  placedWallGraphs: readonly PlacedWallGraph[];
  previewGraph: WallSegmentDraftPreviewGraph | null;
  previewSegmentBodiesByWallGraphId: ReadonlyMap<string, readonly BuiltWallSegmentBody[]>;
}>;

type DraftAngleGuide = Readonly<{
  centerPointInches: Point3DInches;
  radiusInches: number;
  firstLabel: DraftAngleGuideLabel;
  secondLabel: DraftAngleGuideLabel;
}>;

type DraftAngleGuideLabel = Readonly<{
  label: string;
  pointInches: Point3DInches;
}>;

export function WallSegmentDraftRenderer({
  draft,
  placedWallGraphs,
  previewGraph,
  previewSegmentBodiesByWallGraphId,
}: WallSegmentDraftRendererProps) {
  const wallGraphById = useMemo(() => buildWallGraphById(placedWallGraphs), [placedWallGraphs]);
  const previewBody = useMemo(() => findPreviewSegmentBody({
    previewGraph,
    previewSegmentBodiesByWallGraphId,
  }), [previewGraph, previewSegmentBodiesByWallGraphId]);

  if (draft === null) {
    return null;
  }
  const startPointInches = draft.activeStartAnchor === null
    ? null
    : getWallSegmentAnchorPoint(draft.activeStartAnchor);
  const hoverPointInches = draft.hoverAnchor === null
    ? null
    : getWallSegmentAnchorPoint(draft.hoverAnchor);
  const draftAnchorRingPoints = previewBody === null
    ? getDraftAnchorRingPoints({ startPointInches, hoverPointInches })
    : [];
  const measurementStartPointInches = previewBody?.start.centerPointInches ?? startPointInches;
  const measurementEndPointInches = previewBody?.end.centerPointInches ?? hoverPointInches;
  const angleGuide = startPointInches === null || hoverPointInches === null
    ? null
    : createDraftAngleGuide({
      draft,
      wallGraphById,
      startPointInches,
      hoverPointInches,
    });

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
      {measurementStartPointInches !== null && measurementEndPointInches !== null ? (
        <WallDraftMeasurementLabel
          startPointInches={measurementStartPointInches}
          endPointInches={measurementEndPointInches}
        />
      ) : null}
      {angleGuide !== null ? <WallDraftAngleGuide angleGuide={angleGuide} /> : null}
      {draftAnchorRingPoints.map((pointInches) => (
        <WallAnchorRing
          key={`${pointInches.xInches}:${pointInches.yInches}:${pointInches.zInches}`}
          pointInches={pointInches}
        />
      ))}
    </group>
  );
}

function findPreviewSegmentBody(args: {
  previewGraph: WallSegmentDraftPreviewGraph | null;
  previewSegmentBodiesByWallGraphId: ReadonlyMap<string, readonly BuiltWallSegmentBody[]>;
}): BuiltWallSegmentBody | null {
  if (args.previewGraph === null) {
    return null;
  }

  for (const wallGraphId of args.previewGraph.previewWallGraphIds) {
    const previewBody = (args.previewSegmentBodiesByWallGraphId.get(wallGraphId) ?? []).find((segmentBody) => (
      segmentBody.wallSegmentId === args.previewGraph?.previewWallSegmentId
    ));

    if (previewBody !== undefined) {
      return previewBody;
    }
  }

  return null;
}

function buildWallGraphById(
  placedWallGraphs: readonly PlacedWallGraph[],
): ReadonlyMap<string, PlacedWallGraph> {
  return new Map(placedWallGraphs.map((wallGraph) => [wallGraph.id, wallGraph]));
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
      [getGuideMidpoint(guide.startXInches, guide.endXInches) - EXTENDED_ALIGNMENT_GUIDE_HALF_LENGTH_INCHES, guide.yInches, DRAFT_GUIDE_Z_INCHES] as const,
      [getGuideMidpoint(guide.startXInches, guide.endXInches) + EXTENDED_ALIGNMENT_GUIDE_HALF_LENGTH_INCHES, guide.yInches, DRAFT_GUIDE_Z_INCHES] as const,
    ]
    : [
      [guide.xInches, getGuideMidpoint(guide.startYInches, guide.endYInches) - EXTENDED_ALIGNMENT_GUIDE_HALF_LENGTH_INCHES, DRAFT_GUIDE_Z_INCHES] as const,
      [guide.xInches, getGuideMidpoint(guide.startYInches, guide.endYInches) + EXTENDED_ALIGNMENT_GUIDE_HALF_LENGTH_INCHES, DRAFT_GUIDE_Z_INCHES] as const,
    ];

  return (
    <Line
      points={points}
      color={wallSegmentRenderColors.activeAlignmentGuideStroke}
      lineWidth={1.5}
      dashed
      dashScale={1}
      dashSize={DRAFT_MEASUREMENT_DASH_SIZE_INCHES}
      gapSize={DRAFT_MEASUREMENT_GAP_SIZE_INCHES}
      depthTest={false}
      renderOrder={125}
    />
  );
}

function getGuideMidpoint(firstValueInches: number, secondValueInches: number): number {
  return (firstValueInches + secondValueInches) / 2;
}

function WallDraftMeasurementLabel({
  startPointInches,
  endPointInches,
}: Readonly<{
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>) {
  const lengthInches = Math.hypot(
    endPointInches.xInches - startPointInches.xInches,
    endPointInches.yInches - startPointInches.yInches,
  );

  if (lengthInches < MIN_DRAFT_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const measurementDirection = getNormalizedPlanDirection(startPointInches, endPointInches);

  if (measurementDirection === null) {
    return null;
  }

  const measurementNormal = {
    xInches: -measurementDirection.yInches,
    yInches: measurementDirection.xInches,
  };
  const measurementStartPointInches = offsetDraftMeasurementPoint(startPointInches, measurementNormal);
  const measurementEndPointInches = offsetDraftMeasurementPoint(endPointInches, measurementNormal);
  const rotationDegrees = getReadablePlanLabelRotationDegrees((Math.atan2(
    measurementEndPointInches.yInches - measurementStartPointInches.yInches,
    measurementEndPointInches.xInches - measurementStartPointInches.xInches,
  ) * 180) / Math.PI);

  return (
    <PlanMeasurementLine
      startPointInches={measurementStartPointInches}
      endPointInches={measurementEndPointInches}
      labelPointInches={getPlanMidpoint(measurementStartPointInches, measurementEndPointInches)}
      label={formatFeetInchesLabel(lengthInches)}
      labelRotationDegrees={rotationDegrees}
      zInches={DRAFT_MEASUREMENT_Z_INCHES}
      color={wallSegmentRenderColors.planMeasurementStroke}
      renderOrder={DRAFT_MEASUREMENT_RENDER_ORDER}
      dashSizeInches={DRAFT_MEASUREMENT_DASH_SIZE_INCHES}
      gapSizeInches={DRAFT_MEASUREMENT_GAP_SIZE_INCHES}
    />
  );
}

function offsetDraftMeasurementPoint(
  pointInches: Point3DInches,
  direction: PlanDirection,
): Point3DInches {
  return offsetPlanPoint(pointInches, direction, DRAFT_MEASUREMENT_OFFSET_INCHES, 0);
}

function WallDraftAngleGuide({
  angleGuide,
}: Readonly<{
  angleGuide: DraftAngleGuide;
}>) {
  return (
    <group renderOrder={130}>
      <Line
        points={createCirclePoints({
          centerPointInches: angleGuide.centerPointInches,
          radiusInches: angleGuide.radiusInches,
        })}
        color={wallSegmentRenderColors.activeAngleGuideStroke}
        lineWidth={1.5}
        transparent
        opacity={0.75}
        depthTest={false}
        renderOrder={130}
      />
      <WallDraftAngleGuideLabel label={angleGuide.firstLabel} />
      <WallDraftAngleGuideLabel label={angleGuide.secondLabel} />
    </group>
  );
}

function WallDraftAngleGuideLabel({
  label,
}: Readonly<{
  label: DraftAngleGuideLabel;
}>) {
  return (
    <Html
      center
      position={[label.pointInches.xInches, label.pointInches.yInches, DRAFT_ANGLE_GUIDE_Z_INCHES + 0.4]}
      style={{ pointerEvents: "none", whiteSpace: "nowrap", zIndex: 70 }}
    >
      <div className="text-[12px] font-bold leading-none text-slate-950 drop-shadow-sm">
        {label.label}
      </div>
    </Html>
  );
}

function createDraftAngleGuide(args: {
  draft: WallSegmentDraft;
  wallGraphById: ReadonlyMap<string, PlacedWallGraph>;
  startPointInches: Point3DInches;
  hoverPointInches: Point3DInches;
}): DraftAngleGuide | null {
  const draftDirection = getNormalizedPlanDirection(args.startPointInches, args.hoverPointInches);

  if (draftDirection === null) {
    return null;
  }

  const draftLengthInches = getPlanDistanceInches(args.startPointInches, args.hoverPointInches);
  const referenceDirection = findReferenceDirectionFromStartAnchor({
    draft: args.draft,
    wallGraphById: args.wallGraphById,
    startPointInches: args.startPointInches,
  });
  const radiusInches = Math.min(
    ANGLE_GUIDE_MAX_RADIUS_INCHES,
    Math.max(ANGLE_GUIDE_MIN_RADIUS_INCHES, draftLengthInches * ANGLE_GUIDE_RADIUS_LENGTH_RATIO),
  );
  const draftAngleDegrees = getPlanDirectionAngleDegrees(draftDirection);

  if (referenceDirection === null) {
    return {
      centerPointInches: args.startPointInches,
      radiusInches,
      firstLabel: createAngleGuideLabel({
        centerPointInches: args.startPointInches,
        radiusInches,
        angleDegrees: draftAngleDegrees + 90,
        label: "180°",
      }),
      secondLabel: createAngleGuideLabel({
        centerPointInches: args.startPointInches,
        radiusInches,
        angleDegrees: draftAngleDegrees - 90,
        label: "180°",
      }),
    };
  }

  const referenceAngleDegrees = getPlanDirectionAngleDegrees(referenceDirection);
  const draftAngleFromReferenceDegrees = normalizeDegrees(draftAngleDegrees - referenceAngleDegrees);
  const innerAngleDegrees = Math.round(Math.min(
    draftAngleFromReferenceDegrees,
    360 - draftAngleFromReferenceDegrees,
  ));
  const outerAngleDegrees = 360 - innerAngleDegrees;
  const innerLabelAngleDegrees = draftAngleFromReferenceDegrees <= 180
    ? referenceAngleDegrees + draftAngleFromReferenceDegrees / 2
    : draftAngleDegrees + (360 - draftAngleFromReferenceDegrees) / 2;
  const outerLabelAngleDegrees = draftAngleFromReferenceDegrees <= 180
    ? draftAngleDegrees + (360 - draftAngleFromReferenceDegrees) / 2
    : referenceAngleDegrees + draftAngleFromReferenceDegrees / 2;

  return {
    centerPointInches: args.startPointInches,
    radiusInches,
    firstLabel: createAngleGuideLabel({
      centerPointInches: args.startPointInches,
      radiusInches,
      angleDegrees: innerLabelAngleDegrees,
      label: `${innerAngleDegrees}°`,
    }),
    secondLabel: createAngleGuideLabel({
      centerPointInches: args.startPointInches,
      radiusInches,
      angleDegrees: outerLabelAngleDegrees,
      label: `${outerAngleDegrees}°`,
    }),
  };
}

function findReferenceDirectionFromStartAnchor(args: {
  draft: WallSegmentDraft;
  wallGraphById: ReadonlyMap<string, PlacedWallGraph>;
  startPointInches: Point3DInches;
}): PlanDirection | null {
  const activeStartAnchor = args.draft.activeStartAnchor;

  if (activeStartAnchor === null) {
    return null;
  }

  if (activeStartAnchor.kind === "existing-node") {
    const wallGraph = args.wallGraphById.get(activeStartAnchor.wallGraphId);
    const connectedWallSegment = wallGraph?.segments.find((wallSegment) => (
      wallSegment.startNodeId === activeStartAnchor.wallNodeId || wallSegment.endNodeId === activeStartAnchor.wallNodeId
    ));

    if (wallGraph === undefined || connectedWallSegment === undefined) {
      return null;
    }

    const otherWallNodeId = connectedWallSegment.startNodeId === activeStartAnchor.wallNodeId
      ? connectedWallSegment.endNodeId
      : connectedWallSegment.startNodeId;
    const otherPointInches = getWallSegmentEndpointPoint(wallGraph.nodes, otherWallNodeId);

    return otherPointInches === null
      ? null
      : getNormalizedPlanDirection(args.startPointInches, otherPointInches);
  }

  if (activeStartAnchor.kind === "segment-body") {
    const wallGraph = args.wallGraphById.get(activeStartAnchor.wallGraphId);
    const wallSegment = wallGraph?.segments.find((candidate) => candidate.id === activeStartAnchor.wallSegmentId);

    if (wallGraph === undefined || wallSegment === undefined) {
      return null;
    }

    const startPointInches = getWallSegmentEndpointPoint(wallGraph.nodes, wallSegment.startNodeId);
    const endPointInches = getWallSegmentEndpointPoint(wallGraph.nodes, wallSegment.endNodeId);

    if (startPointInches === null || endPointInches === null) {
      return null;
    }

    return getNormalizedPlanDirection(startPointInches, endPointInches);
  }

  return null;
}

function createAngleGuideLabel(args: {
  centerPointInches: Point3DInches;
  radiusInches: number;
  angleDegrees: number;
  label: string;
}): DraftAngleGuideLabel {
  const angleRadians = convertDegreesToRadians(args.angleDegrees);
  const labelRadiusInches = args.radiusInches * ANGLE_GUIDE_LABEL_RADIUS_RATIO;

  return {
    label: args.label,
    pointInches: {
      xInches: args.centerPointInches.xInches + Math.cos(angleRadians) * labelRadiusInches,
      yInches: args.centerPointInches.yInches + Math.sin(angleRadians) * labelRadiusInches,
      zInches: args.centerPointInches.zInches,
    },
  };
}

function createCirclePoints(args: {
  centerPointInches: Point3DInches;
  radiusInches: number;
}): [number, number, number][] {
  return Array.from({ length: ANGLE_GUIDE_SEGMENT_COUNT + 1 }, (_, pointIndex) => {
    const angleRadians = (pointIndex / ANGLE_GUIDE_SEGMENT_COUNT) * Math.PI * 2;

    return [
      args.centerPointInches.xInches + Math.cos(angleRadians) * args.radiusInches,
      args.centerPointInches.yInches + Math.sin(angleRadians) * args.radiusInches,
      DRAFT_ANGLE_GUIDE_Z_INCHES,
    ];
  });
}

