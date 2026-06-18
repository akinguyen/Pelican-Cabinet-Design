"use client";

import { memo, useMemo } from "react";
import type { BuiltPrimitiveGeometry } from "@/engine/assemblies/assemblyTreeBuilder";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { createPrimitiveEdgeSegments } from "@/engine/primitive-geometry/edge-segments/createPrimitiveEdgeSegments";
import { EdgeSegmentLines } from "../shared/EdgeSegmentLines";

type AssemblyPrimitiveEdgeSegmentsProps = Readonly<{
  primitiveGeometry: BuiltPrimitiveGeometry;
  sceneViewMode?: SceneViewMode;
}>;

export const AssemblyPrimitiveEdgeSegments = memo(function AssemblyPrimitiveEdgeSegments({
  primitiveGeometry,
}: AssemblyPrimitiveEdgeSegmentsProps) {
  const edgeSegmentsInches = useMemo(
    () =>
      createPrimitiveEdgeSegments({
        geometry: primitiveGeometry.geometry,
        sizeInches: primitiveGeometry.sizeInches,
      }),
    [
      primitiveGeometry.geometry,
      primitiveGeometry.sizeInches.widthInches,
      primitiveGeometry.sizeInches.depthInches,
      primitiveGeometry.sizeInches.heightInches,
    ],
  );

  return <EdgeSegmentLines edgeSegmentsInches={edgeSegmentsInches} />;
});
