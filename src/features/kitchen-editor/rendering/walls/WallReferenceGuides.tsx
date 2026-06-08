"use client";

import { Line } from "@react-three/drei";
import type { WallReferenceGuides } from "@/engine/walls/draft-guides/wallDraftGuideTypes";

const GUIDE_Z_INCHES = 0.3;
const GUIDE_HALF_LENGTH_INCHES = 1600;
const GUIDE_RENDER_ORDER = 90;
const GUIDE_COLOR = "#ef4444";

type WallReferenceGuidesProps = Readonly<{
  referenceGuides: WallReferenceGuides;
}>;

export function WallReferenceGuides({ referenceGuides }: WallReferenceGuidesProps) {
  return (
    <>
      {referenceGuides.horizontalGuide !== null ? (
        <Line
          points={[
            [-GUIDE_HALF_LENGTH_INCHES, referenceGuides.horizontalGuide, GUIDE_Z_INCHES],
            [GUIDE_HALF_LENGTH_INCHES, referenceGuides.horizontalGuide, GUIDE_Z_INCHES],
          ]}
          color={GUIDE_COLOR}
          lineWidth={1.5}
          dashed
          dashSize={8}
          gapSize={8}
          dashScale={1}
          depthTest={false}
          renderOrder={GUIDE_RENDER_ORDER}
        />
      ) : null}
      {referenceGuides.verticalGuide !== null ? (
        <Line
          points={[
            [referenceGuides.verticalGuide, -GUIDE_HALF_LENGTH_INCHES, GUIDE_Z_INCHES],
            [referenceGuides.verticalGuide, GUIDE_HALF_LENGTH_INCHES, GUIDE_Z_INCHES],
          ]}
          color={GUIDE_COLOR}
          lineWidth={1.5}
          dashed
          dashSize={8}
          gapSize={8}
          dashScale={1}
          depthTest={false}
          renderOrder={GUIDE_RENDER_ORDER}
        />
      ) : null}
    </>
  );
}
