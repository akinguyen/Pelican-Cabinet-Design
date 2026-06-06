"use client";

import { Html, Line } from "@react-three/drei";
import { Scissors } from "lucide-react";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallEdgeMeasurement } from "@/engine/walls/footprint/wallFootprintTypes";
import type { WallSplitAnchor, WallSplitDraft } from "@/engine/walls/split-draft/wallSplitDraftTypes";
import { WallAngleGuides } from "./WallAngleGuides";
import { WallMeasurementGuides } from "./WallMeasurementGuides";
import { WallReferenceGuides } from "./WallReferenceGuides";

const WALL_SPLIT_Z_INCHES = 2.8;
const WALL_SPLIT_MARKER_Z_INCHES = 3.2;

type WallSplitDraftRendererProps = Readonly<{
  draft: WallSplitDraft | null;
}>;

export function WallSplitDraftRenderer({ draft }: WallSplitDraftRendererProps) {
  if (draft === null || draft.phase === "waiting-for-target-wall") {
    return null;
  }

  if (draft.phase === "choosing-start") {
    return <WallSplitAnchorMarker anchor={draft.hoverAnchor} />;
  }

  const previewCut = draft.hoverAnchor === null
    ? null
    : {
        startPointInches: draft.startAnchor.pointInches,
        endPointInches: draft.hoverAnchor.pointInches,
      };
  const previewMeasurement = previewCut === null
    ? []
    : [createWallSplitMeasurement(previewCut)];
  const splitPreviewMeasurements = draft.hoverAnchor === null
    ? []
    : createSplitEdgeMeasurements(draft.hoverAnchor);

  return (
    <group>
      <WallSplitAnchorMarker anchor={draft.startAnchor} />
      <WallSplitAnchorMarker anchor={draft.hoverAnchor} />
      {previewCut !== null ? <WallSplitPreviewCut previewCut={previewCut} /> : null}
      <WallMeasurementGuides measurements={previewMeasurement} variant="draft" />
      <WallMeasurementGuides measurements={splitPreviewMeasurements} variant="split-preview" />
      <WallReferenceGuides referenceGuides={draft.referenceGuides} />
      <WallAngleGuides angleGuide={draft.angleGuide} />
    </group>
  );
}

function WallSplitPreviewCut({
  previewCut,
}: Readonly<{
  previewCut: Readonly<{
    startPointInches: Point3DInches;
    endPointInches: Point3DInches;
  }>;
}>) {
  return (
    <Line
      points={[
        [previewCut.startPointInches.xInches, previewCut.startPointInches.yInches, WALL_SPLIT_Z_INCHES],
        [previewCut.endPointInches.xInches, previewCut.endPointInches.yInches, WALL_SPLIT_Z_INCHES],
      ]}
      color="#0ea5e9"
      lineWidth={3}
      depthTest={false}
      renderOrder={60}
    />
  );
}

function WallSplitAnchorMarker({ anchor }: Readonly<{ anchor: WallSplitAnchor | null }>) {
  if (anchor === null) {
    return null;
  }

  return (
    <Html
      center
      position={[anchor.pointInches.xInches, anchor.pointInches.yInches, WALL_SPLIT_MARKER_Z_INCHES]}
      style={{ pointerEvents: "none" }}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-700 bg-blue-500 shadow-md">
        <Scissors className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </div>
    </Html>
  );
}

function createWallSplitMeasurement(args: Readonly<{
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>): WallEdgeMeasurement {
  return {
    id: "wall-split-preview-cut-measurement",
    edgeIndex: 0,
    startPointInches: args.startPointInches,
    endPointInches: args.endPointInches,
    lengthInches: getPoint3DDistanceInches(args.startPointInches, args.endPointInches),
  };
}

function createSplitEdgeMeasurements(anchor: WallSplitAnchor): readonly WallEdgeMeasurement[] {
  if (anchor.pointKind !== "edge-body") {
    return [];
  }

  return [
    {
      id: "wall-split-edge-preview-start",
      edgeIndex: 0,
      startPointInches: anchor.edgeStartPointInches,
      endPointInches: anchor.pointInches,
      lengthInches: anchor.splitStartLengthInches,
    },
    {
      id: "wall-split-edge-preview-end",
      edgeIndex: 1,
      startPointInches: anchor.pointInches,
      endPointInches: anchor.edgeEndPointInches,
      lengthInches: anchor.splitEndLengthInches,
    },
  ];
}
