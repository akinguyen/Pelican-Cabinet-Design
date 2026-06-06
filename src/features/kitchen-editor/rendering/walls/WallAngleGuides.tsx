"use client";

import { Html, Line } from "@react-three/drei";
import type { WallAngleGuide } from "@/engine/walls/draft-guides/wallDraftGuideTypes";

const ANGLE_GUIDE_Z_INCHES = 1.6;
const ANGLE_LABEL_OFFSET_INCHES = 14;
const ANGLE_GUIDE_RADIUS_INCHES = 20;
const ANGLE_GUIDE_SEGMENTS = 24;

type WallAngleGuidesProps = Readonly<{
  angleGuide: WallAngleGuide | null;
}>;

export function WallAngleGuides({ angleGuide }: WallAngleGuidesProps) {
  if (angleGuide === null) {
    return null;
  }

  const directionRadians = (angleGuide.directionDegrees * Math.PI) / 180;
  const labelDirectionDegrees = angleGuide.referenceDirectionDegrees + angleGuide.angleDegrees / 2;
  const labelDirectionRadians = (labelDirectionDegrees * Math.PI) / 180;
  const labelXInches = angleGuide.centerPointInches.xInches + Math.cos(labelDirectionRadians) * ANGLE_LABEL_OFFSET_INCHES;
  const labelYInches = angleGuide.centerPointInches.yInches + Math.sin(labelDirectionRadians) * ANGLE_LABEL_OFFSET_INCHES;
  const arcPoints = createAngleArcPoints(angleGuide);
  const directionGuideEnd = [
    angleGuide.centerPointInches.xInches + Math.cos(directionRadians) * ANGLE_GUIDE_RADIUS_INCHES,
    angleGuide.centerPointInches.yInches + Math.sin(directionRadians) * ANGLE_GUIDE_RADIUS_INCHES,
    ANGLE_GUIDE_Z_INCHES,
  ] as const;
  const centerPoint = [
    angleGuide.centerPointInches.xInches,
    angleGuide.centerPointInches.yInches,
    ANGLE_GUIDE_Z_INCHES,
  ] as const;

  return (
    <group>
      <Line
        points={[centerPoint, directionGuideEnd]}
        color="#64748b"
        lineWidth={1}
        dashed
        dashScale={16}
        gapSize={6}
      />
      <Line points={arcPoints} color="#64748b" lineWidth={1.25} />
      <Html
        center
        position={[labelXInches, labelYInches, ANGLE_GUIDE_Z_INCHES + 0.15]}
        style={{ pointerEvents: "none" }}
      >
        <div className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 shadow-sm ring-1 ring-sky-200">
          {Math.round(angleGuide.angleDegrees)}°
        </div>
      </Html>
    </group>
  );
}

function createAngleArcPoints(angleGuide: WallAngleGuide): readonly [number, number, number][] {
  const startDegrees = angleGuide.referenceDirectionDegrees;
  const endDegrees = angleGuide.directionDegrees;
  const deltaDegrees = normalizeSignedAngleDegrees(endDegrees - startDegrees);
  const points: [number, number, number][] = [];

  for (let segmentIndex = 0; segmentIndex <= ANGLE_GUIDE_SEGMENTS; segmentIndex += 1) {
    const progress = segmentIndex / ANGLE_GUIDE_SEGMENTS;
    const angleDegrees = startDegrees + deltaDegrees * progress;
    const angleRadians = (angleDegrees * Math.PI) / 180;

    points.push([
      angleGuide.centerPointInches.xInches + Math.cos(angleRadians) * ANGLE_GUIDE_RADIUS_INCHES,
      angleGuide.centerPointInches.yInches + Math.sin(angleRadians) * ANGLE_GUIDE_RADIUS_INCHES,
      ANGLE_GUIDE_Z_INCHES,
    ]);
  }

  return points;
}

function normalizeSignedAngleDegrees(angleDegrees: number): number {
  let normalizedAngleDegrees = angleDegrees;

  while (normalizedAngleDegrees > 180) {
    normalizedAngleDegrees -= 360;
  }

  while (normalizedAngleDegrees < -180) {
    normalizedAngleDegrees += 360;
  }

  return normalizedAngleDegrees;
}
