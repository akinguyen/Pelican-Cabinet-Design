"use client";

import { Line } from "@react-three/drei";
import type { AssemblyObjectAlignmentGuide } from "@/engine/assemblies/placement/assemblyPlacementTypes";

const OBJECT_ALIGNMENT_PLAN_GUIDE_Z_INCHES = 7.4;
const OBJECT_ALIGNMENT_GUIDE_RENDER_ORDER = 126;
const OBJECT_ALIGNMENT_GUIDE_STROKE = "#ff00cc";

export function AssemblyObjectAlignmentGuides({
  alignmentGuides,
}: Readonly<{
  alignmentGuides: readonly AssemblyObjectAlignmentGuide[];
}>) {
  return (
    <group>
      {alignmentGuides.map((alignmentGuide) => (
        <Line
          key={alignmentGuide.id}
          points={[
            getGuideRenderPoint(alignmentGuide, "start"),
            getGuideRenderPoint(alignmentGuide, "end"),
          ]}
          color={OBJECT_ALIGNMENT_GUIDE_STROKE}
          lineWidth={2}
          dashed
          dashSize={3}
          gapSize={2}
          depthTest={false}
          renderOrder={OBJECT_ALIGNMENT_GUIDE_RENDER_ORDER}
        />
      ))}
    </group>
  );
}

function getGuideRenderPoint(
  alignmentGuide: AssemblyObjectAlignmentGuide,
  endpoint: "start" | "end",
): [number, number, number] {
  const pointInches = endpoint === "start"
    ? alignmentGuide.startPointInches
    : alignmentGuide.endPointInches;

  return alignmentGuide.guidePlane === "elevation"
    ? [pointInches.xInches, pointInches.yInches, pointInches.zInches]
    : [pointInches.xInches, pointInches.yInches, OBJECT_ALIGNMENT_PLAN_GUIDE_Z_INCHES];
}
