"use client";

import { Line } from "@react-three/drei";
import type { WallParallelGuide } from "@/engine/walls/draft-guides/wallDraftGuideTypes";

const PARALLEL_GUIDE_Z_INCHES = 0.36;

type WallParallelGuidesProps = Readonly<{
  parallelGuide: WallParallelGuide | null;
}>;

export function WallParallelGuides({ parallelGuide }: WallParallelGuidesProps) {
  if (parallelGuide === null) {
    return null;
  }

  return (
    <group>
      <Line
        points={[
          [
            parallelGuide.referenceStartPointInches.xInches,
            parallelGuide.referenceStartPointInches.yInches,
            PARALLEL_GUIDE_Z_INCHES,
          ],
          [
            parallelGuide.referenceEndPointInches.xInches,
            parallelGuide.referenceEndPointInches.yInches,
            PARALLEL_GUIDE_Z_INCHES,
          ],
        ]}
        color="#f97316"
        lineWidth={2}
      />
      <Line
        points={[
          [
            parallelGuide.previewStartPointInches.xInches,
            parallelGuide.previewStartPointInches.yInches,
            PARALLEL_GUIDE_Z_INCHES,
          ],
          [
            parallelGuide.previewEndPointInches.xInches,
            parallelGuide.previewEndPointInches.yInches,
            PARALLEL_GUIDE_Z_INCHES,
          ],
        ]}
        color="#f97316"
        lineWidth={1.5}
        dashed
        dashScale={16}
        gapSize={6}
      />
    </group>
  );
}
