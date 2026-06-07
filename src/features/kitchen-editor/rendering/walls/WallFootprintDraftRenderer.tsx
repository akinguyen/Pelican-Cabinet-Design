"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { DoubleSide } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { WallEdgeMeasurement } from "@/engine/walls/footprint/wallFootprintTypes";
import type { WallFootprintDraft } from "@/engine/walls/footprint-draft/wallFootprintDraftTypes";
import { createWallFootprint } from "@/engine/walls/footprint/wallFootprintFactory";
import { getOpenPolylineEdgeMeasurements } from "@/engine/walls/footprint/wallFootprintMeasurements";
import { getActiveWallFootprintDraftPoint } from "@/engine/walls/footprint-draft/wallFootprintDraftSelectors";
import { WallAngleGuides } from "./WallAngleGuides";
import { WallMeasurementGuides } from "./WallMeasurementGuides";
import { WallReferenceGuides } from "./WallReferenceGuides";
import { WallParallelGuides } from "./WallParallelGuides";
import { WallVertexMarkers } from "./WallVertexMarkers";
import { createWallFootprintGeometry } from "./wallRenderingGeometry";

const DRAFT_EDGE_Z_INCHES = 0.42;
const DRAFT_FILL_Z_INCHES = 0.08;

type WallFootprintDraftRendererProps = Readonly<{
  draft: WallFootprintDraft | null;
}>;

export function WallFootprintDraftRenderer({ draft }: WallFootprintDraftRendererProps) {
  if (draft === null) {
    return null;
  }

  const orderedPointsInches = draft.points.map((point) => point.pointInches);
  const activePoint = getActiveWallFootprintDraftPoint(draft);
  const previewEdge = activePoint !== null && draft.hoverPointInches !== null
    ? {
        startPointInches: activePoint.pointInches,
        endPointInches: draft.hoverPointInches,
      }
    : null;
  const committedEdgeMeasurements = getOpenPolylineEdgeMeasurements(orderedPointsInches);
  const previewEdgeMeasurements = previewEdge === null
    ? []
    : [
        {
          id: "wall-footprint-draft-preview-edge-measurement",
          edgeIndex: 0,
          startPointInches: previewEdge.startPointInches,
          endPointInches: previewEdge.endPointInches,
          lengthInches: getPoint3DDistanceInches(previewEdge.startPointInches, previewEdge.endPointInches),
        },
      ];
  const splitPreviewMeasurements = createSplitPreviewMeasurements(draft);

  return (
    <group>
      <DraftClosedLoopFill draft={draft} />
      <DraftEdges pointsInches={orderedPointsInches} previewEdge={previewEdge} />
      <WallMeasurementGuides measurements={committedEdgeMeasurements} variant="draft" />
      <WallMeasurementGuides measurements={previewEdgeMeasurements} variant="draft" />
      <WallMeasurementGuides measurements={splitPreviewMeasurements} variant="split-preview" />
      <WallReferenceGuides referenceGuides={draft.referenceGuides} />
      <WallParallelGuides parallelGuide={draft.parallelGuide} />
      <WallAngleGuides angleGuide={draft.angleGuide} />
      <WallVertexMarkers
        pointsInches={orderedPointsInches}
        hoverPointInches={draft.hoverPointInches}
        snapTarget={draft.snapTarget}
      />
    </group>
  );
}

function DraftEdges({
  pointsInches,
  previewEdge,
}: Readonly<{
  pointsInches: readonly Point3DInches[];
  previewEdge: Readonly<{
    startPointInches: Point3DInches;
    endPointInches: Point3DInches;
  }> | null;
}>) {
  return (
    <>
      {pointsInches.slice(0, -1).map((pointInches, pointIndex) => {
        const nextPointInches = pointsInches[pointIndex + 1];

        return (
          <Line
            key={`wall-footprint-draft-edge-${pointIndex}`}
            points={[
              [pointInches.xInches, pointInches.yInches, DRAFT_EDGE_Z_INCHES],
              [nextPointInches.xInches, nextPointInches.yInches, DRAFT_EDGE_Z_INCHES],
            ]}
            color="#020617"
            lineWidth={2}
          />
        );
      })}
      {previewEdge !== null ? (
        <Line
          points={[
            [previewEdge.startPointInches.xInches, previewEdge.startPointInches.yInches, DRAFT_EDGE_Z_INCHES],
            [previewEdge.endPointInches.xInches, previewEdge.endPointInches.yInches, DRAFT_EDGE_Z_INCHES],
          ]}
          color="#0ea5e9"
          lineWidth={3}
        />
      ) : null}
    </>
  );
}

function DraftClosedLoopFill({ draft }: Readonly<{ draft: WallFootprintDraft }>) {
  const geometry = useMemo(() => {
    const loopPointsInches = getPotentialClosedLoopPoints(draft);

    if (loopPointsInches === null) {
      return null;
    }

    const footprint = createWallFootprint(loopPointsInches);
    return createWallFootprintGeometry(footprint.boundaryPointsInches);
  }, [draft]);

  if (geometry === null) {
    return null;
  }

  return (
    <mesh geometry={geometry} position={[0, 0, DRAFT_FILL_Z_INCHES]}>
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} side={DoubleSide} />
    </mesh>
  );
}

function getPotentialClosedLoopPoints(
  draft: WallFootprintDraft,
): readonly Point3DInches[] | null {
  const snapTarget = draft.snapTarget;

  if (snapTarget?.kind !== "draft-point" || !snapTarget.canCloseLoop) {
    return null;
  }

  const closingPointIndex = draft.points.findIndex(
    (point) => point.id === snapTarget.pointId,
  );

  if (closingPointIndex < 0) {
    return null;
  }

  return draft.points.slice(closingPointIndex).map((point) => point.pointInches);
}

function createSplitPreviewMeasurements(
  draft: WallFootprintDraft,
): readonly WallEdgeMeasurement[] {
  const snapTarget = draft.snapTarget;

  if (snapTarget?.kind !== "placed-wall-edge") {
    return [];
  }

  return [
    {
      id: "wall-footprint-draft-split-preview-start",
      edgeIndex: 0,
      startPointInches: snapTarget.edgeStartPointInches,
      endPointInches: snapTarget.pointInches,
      lengthInches: snapTarget.splitStartLengthInches,
    },
    {
      id: "wall-footprint-draft-split-preview-end",
      edgeIndex: 1,
      startPointInches: snapTarget.pointInches,
      endPointInches: snapTarget.edgeEndPointInches,
      lengthInches: snapTarget.splitEndLengthInches,
    },
  ];
}
