"use client";

import { Line } from "@react-three/drei";
import { memo } from "react";
import type { SceneEntityAlignmentGuide } from "@/engine/scene-entities/alignment/sceneEntityAlignmentTypes";

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
            createGuideRenderPoint(alignmentGuide.startPointInches),
            createGuideRenderPoint(alignmentGuide.endPointInches),
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

function createGuideRenderPoint(pointInches: SceneEntityAlignmentGuide["startPointInches"]): [number, number, number] {
  return [pointInches.xInches, pointInches.yInches, pointInches.zInches];
}
