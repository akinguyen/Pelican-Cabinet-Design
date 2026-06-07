"use client";

import { Html, Line } from "@react-three/drei";
import { Scissors } from "lucide-react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallSplitAnchor, WallSplitDraft } from "@/engine/walls/split-draft/wallSplitDraftTypes";

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

  return (
    <group>
      <WallSplitAnchorMarker anchor={draft.startAnchor} />
      <WallSplitAnchorMarker anchor={draft.hoverAnchor} />
      {previewCut !== null ? <WallSplitPreviewCut previewCut={previewCut} /> : null}
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
