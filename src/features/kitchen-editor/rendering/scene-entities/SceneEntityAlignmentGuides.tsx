"use client";

import { Line } from "@react-three/drei";
import { memo } from "react";
import type { SceneEntityAlignmentGuide } from "@/engine/scene-entities/alignment/sceneEntityAlignmentTypes";

const SCENE_ENTITY_ALIGNMENT_PLAN_GUIDE_Z_INCHES = 7.4;
const SCENE_ENTITY_ALIGNMENT_GUIDE_RENDER_ORDER = 126;
const SCENE_ENTITY_ALIGNMENT_GUIDE_STROKE = "#ff00cc";

export const SceneEntityAlignmentGuides = memo(function SceneEntityAlignmentGuides({
  alignmentGuides,
}: Readonly<{
  alignmentGuides: readonly SceneEntityAlignmentGuide[];
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
          color={SCENE_ENTITY_ALIGNMENT_GUIDE_STROKE}
          lineWidth={2}
          dashed
          dashSize={3}
          gapSize={2}
          depthTest={false}
          renderOrder={SCENE_ENTITY_ALIGNMENT_GUIDE_RENDER_ORDER}
        />
      ))}
    </group>
  );
});

function getGuideRenderPoint(
  alignmentGuide: SceneEntityAlignmentGuide,
  endpoint: "start" | "end",
): [number, number, number] {
  const pointInches = endpoint === "start"
    ? alignmentGuide.startPointInches
    : alignmentGuide.endPointInches;

  return alignmentGuide.guidePlane === "elevation"
    ? [pointInches.xInches, pointInches.yInches, pointInches.zInches]
    : [pointInches.xInches, pointInches.yInches, SCENE_ENTITY_ALIGNMENT_PLAN_GUIDE_Z_INCHES];
}
