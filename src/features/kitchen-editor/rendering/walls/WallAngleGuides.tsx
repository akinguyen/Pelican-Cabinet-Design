"use client";

import { Html, Line } from "@react-three/drei";
import type { WallAngleGuide } from "@/engine/walls/draft-guides/wallDraftGuideTypes";

const ANGLE_GUIDE_Z_INCHES = 0.5;
const ANGLE_LABEL_OFFSET_INCHES = 8;
const ANGLE_GUIDE_MIN_RADIUS_INCHES = 6;
const ANGLE_GUIDE_MAX_RADIUS_INCHES = 20;
const ANGLE_GUIDE_RADIUS_SCALE = 0.35;
const ANGLE_GUIDE_SEGMENTS = 24;

type WallAngleGuidesProps = Readonly<{
  angleGuide: WallAngleGuide | null;
}>;

export function WallAngleGuides({ angleGuide }: WallAngleGuidesProps) {
  if (angleGuide === null) {
    return null;
  }

  const arcRadiusInches = getAngleArcRadiusInches(angleGuide);
  const signedDeltaDegrees = normalizeSignedAngleDegrees(
    angleGuide.previewDirectionDegrees - angleGuide.referenceDirectionDegrees,
  );
  const labelDirectionDegrees = angleGuide.referenceDirectionDegrees + signedDeltaDegrees / 2;
  const labelDirectionRadians = (labelDirectionDegrees * Math.PI) / 180;
  const labelDistanceInches = arcRadiusInches + ANGLE_LABEL_OFFSET_INCHES;
  const labelXInches = angleGuide.centerPointInches.xInches + Math.cos(labelDirectionRadians) * labelDistanceInches;
  const labelYInches = angleGuide.centerPointInches.yInches + Math.sin(labelDirectionRadians) * labelDistanceInches;
  const arcPoints = createAngleArcPoints({ angleGuide, arcRadiusInches, signedDeltaDegrees });

  return (
    <group>
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

function getAngleArcRadiusInches(angleGuide: WallAngleGuide): number {
  const shortestEdgeLengthInches = Math.min(
    angleGuide.referenceLengthInches,
    angleGuide.previewLengthInches,
  );

  if (shortestEdgeLengthInches <= 0) {
    return 0;
  }

  const preferredRadiusInches = shortestEdgeLengthInches * ANGLE_GUIDE_RADIUS_SCALE;
  return Math.min(
    shortestEdgeLengthInches,
    Math.max(ANGLE_GUIDE_MIN_RADIUS_INCHES, Math.min(preferredRadiusInches, ANGLE_GUIDE_MAX_RADIUS_INCHES)),
  );
}

function createAngleArcPoints(args: {
  angleGuide: WallAngleGuide;
  arcRadiusInches: number;
  signedDeltaDegrees: number;
}): readonly [number, number, number][] {
  const points: [number, number, number][] = [];

  for (let segmentIndex = 0; segmentIndex <= ANGLE_GUIDE_SEGMENTS; segmentIndex += 1) {
    const progress = segmentIndex / ANGLE_GUIDE_SEGMENTS;
    const angleDegrees = args.angleGuide.referenceDirectionDegrees + args.signedDeltaDegrees * progress;
    const angleRadians = (angleDegrees * Math.PI) / 180;

    points.push([
      args.angleGuide.centerPointInches.xInches + Math.cos(angleRadians) * args.arcRadiusInches,
      args.angleGuide.centerPointInches.yInches + Math.sin(angleRadians) * args.arcRadiusInches,
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
