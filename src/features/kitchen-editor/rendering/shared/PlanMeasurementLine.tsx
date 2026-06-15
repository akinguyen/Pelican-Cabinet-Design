"use client";

import { memo, useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";

const DEFAULT_DASH_SIZE_INCHES = 3;
const DEFAULT_GAP_SIZE_INCHES = 3;
const DEFAULT_LABEL_GAP_MIN_HALF_LENGTH_INCHES = 9;
const DEFAULT_LABEL_GAP_CHARACTER_WIDTH_INCHES = 1.9;
const MIN_LINE_SEGMENT_LENGTH_INCHES = 0.5;

type PlanMeasurementLineProps = Readonly<{
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  labelPointInches: Point3DInches;
  label: string;
  labelRotationDegrees: number;
  zInches: number;
  color: string;
  renderOrder: number;
  lineWidth?: number;
  dashSizeInches?: number;
  gapSizeInches?: number;
}>;

export const PlanMeasurementLine = memo(function PlanMeasurementLine({
  startPointInches,
  endPointInches,
  labelPointInches,
  label,
  labelRotationDegrees,
  zInches,
  color,
  renderOrder,
  lineWidth = 1,
  dashSizeInches = DEFAULT_DASH_SIZE_INCHES,
  gapSizeInches = DEFAULT_GAP_SIZE_INCHES,
}: PlanMeasurementLineProps) {
  const lineSegments = useMemo(
    () => createLineSegmentsAroundLabelGap({
      startPointInches,
      endPointInches,
      labelPointInches,
      label,
    }),
    [startPointInches, endPointInches, labelPointInches, label],
  );

  return (
    <group renderOrder={renderOrder}>
      {lineSegments.map((lineSegment, index) => (
        <Line
          key={`${index}:${lineSegment.startPointInches.xInches}:${lineSegment.startPointInches.yInches}`}
          points={[
            [lineSegment.startPointInches.xInches, lineSegment.startPointInches.yInches, zInches],
            [lineSegment.endPointInches.xInches, lineSegment.endPointInches.yInches, zInches],
          ]}
          color={color}
          lineWidth={lineWidth}
          dashed
          dashScale={1}
          dashSize={dashSizeInches}
          gapSize={gapSizeInches}
          depthTest={false}
          renderOrder={renderOrder}
        />
      ))}
      <Html
        center
        position={[labelPointInches.xInches, labelPointInches.yInches, zInches + 0.4]}
        style={{ pointerEvents: "none", whiteSpace: "nowrap", zIndex: renderOrder }}
      >
        <div
          className="inline-flex whitespace-nowrap text-[12px] font-bold leading-none text-slate-800"
          style={{
            transform: `rotate(${-labelRotationDegrees}deg)`,
            transformOrigin: "center",
            textShadow: "0 1px 2px rgba(255,255,255,0.98), 0 -1px 2px rgba(255,255,255,0.98), 1px 0 2px rgba(255,255,255,0.98), -1px 0 2px rgba(255,255,255,0.98)",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
});

type PlanMeasurementLineSegment = Readonly<{
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>;

function createLineSegmentsAroundLabelGap(args: {
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  labelPointInches: Point3DInches;
  label: string;
}): readonly PlanMeasurementLineSegment[] {
  const deltaXInches = args.endPointInches.xInches - args.startPointInches.xInches;
  const deltaYInches = args.endPointInches.yInches - args.startPointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);

  if (lengthInches <= MIN_LINE_SEGMENT_LENGTH_INCHES) {
    return [];
  }

  const direction = {
    xInches: deltaXInches / lengthInches,
    yInches: deltaYInches / lengthInches,
  };
  const projectedLabelDistanceInches = Math.max(
    0,
    Math.min(
      lengthInches,
      (args.labelPointInches.xInches - args.startPointInches.xInches) * direction.xInches +
        (args.labelPointInches.yInches - args.startPointInches.yInches) * direction.yInches,
    ),
  );
  const labelGapHalfLengthInches = Math.min(
    lengthInches / 2 - MIN_LINE_SEGMENT_LENGTH_INCHES,
    Math.max(
      DEFAULT_LABEL_GAP_MIN_HALF_LENGTH_INCHES,
      args.label.length * DEFAULT_LABEL_GAP_CHARACTER_WIDTH_INCHES,
    ),
  );

  if (labelGapHalfLengthInches <= MIN_LINE_SEGMENT_LENGTH_INCHES) {
    return [{ startPointInches: args.startPointInches, endPointInches: args.endPointInches }];
  }

  const firstSegmentEndDistanceInches = Math.max(0, projectedLabelDistanceInches - labelGapHalfLengthInches);
  const secondSegmentStartDistanceInches = Math.min(lengthInches, projectedLabelDistanceInches + labelGapHalfLengthInches);
  const lineSegments: PlanMeasurementLineSegment[] = [];

  if (firstSegmentEndDistanceInches > MIN_LINE_SEGMENT_LENGTH_INCHES) {
    lineSegments.push({
      startPointInches: args.startPointInches,
      endPointInches: getPointOnLine(args.startPointInches, direction, firstSegmentEndDistanceInches),
    });
  }

  if (lengthInches - secondSegmentStartDistanceInches > MIN_LINE_SEGMENT_LENGTH_INCHES) {
    lineSegments.push({
      startPointInches: getPointOnLine(args.startPointInches, direction, secondSegmentStartDistanceInches),
      endPointInches: args.endPointInches,
    });
  }

  return lineSegments;
}

function getPointOnLine(
  startPointInches: Point3DInches,
  direction: Readonly<{ xInches: number; yInches: number }>,
  distanceInches: number,
): Point3DInches {
  return {
    xInches: startPointInches.xInches + direction.xInches * distanceInches,
    yInches: startPointInches.yInches + direction.yInches * distanceInches,
    zInches: startPointInches.zInches,
  };
}
