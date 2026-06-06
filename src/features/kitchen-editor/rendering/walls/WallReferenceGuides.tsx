"use client";

import { Line } from "@react-three/drei";
import type { WallReferenceGuides } from "@/engine/walls/draft-guides/wallDraftGuideTypes";

const GUIDE_Z_INCHES = 0.3;
const GUIDE_HALF_LENGTH_INCHES = 1600;

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
          color="#38bdf8"
          lineWidth={1}
          dashed
          dashScale={20}
          gapSize={8}
        />
      ) : null}
      {referenceGuides.verticalGuide !== null ? (
        <Line
          points={[
            [referenceGuides.verticalGuide, -GUIDE_HALF_LENGTH_INCHES, GUIDE_Z_INCHES],
            [referenceGuides.verticalGuide, GUIDE_HALF_LENGTH_INCHES, GUIDE_Z_INCHES],
          ]}
          color="#38bdf8"
          lineWidth={1}
          dashed
          dashScale={20}
          gapSize={8}
        />
      ) : null}
    </>
  );
}
