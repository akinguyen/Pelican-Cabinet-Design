"use client";

import { Html, Line } from "@react-three/drei";
import type { WallPlanMeasurementFrame } from "@/engine/walls/footprint/wallPlanMeasurements";
import { formatSquareFeetLabel } from "../../shared/formatSquareFeetLabel";

const PLAN_MEASUREMENT_Z_INCHES = 2.6;
const PLAN_MEASUREMENT_LABEL_Z_INCHES = 3;
const PLAN_MEASUREMENT_OFFSET_INCHES = 10;

type WallPlanMeasurementOverlayProps = Readonly<{
  measurementFrame: WallPlanMeasurementFrame | null;
}>;

export function WallPlanMeasurementOverlay({ measurementFrame }: WallPlanMeasurementOverlayProps) {
  if (measurementFrame === null) {
    return null;
  }

  const leftXInches = measurementFrame.minXInches - PLAN_MEASUREMENT_OFFSET_INCHES;
  const rightXInches = measurementFrame.maxXInches + PLAN_MEASUREMENT_OFFSET_INCHES;
  const bottomYInches = measurementFrame.minYInches - PLAN_MEASUREMENT_OFFSET_INCHES;
  const topYInches = measurementFrame.maxYInches + PLAN_MEASUREMENT_OFFSET_INCHES;
  const centerXInches = measurementFrame.centerPointInches.xInches;
  const centerYInches = measurementFrame.centerPointInches.yInches;

  return (
    <group>
      <Line
        points={[
          [leftXInches, topYInches, PLAN_MEASUREMENT_Z_INCHES],
          [rightXInches, topYInches, PLAN_MEASUREMENT_Z_INCHES],
          [rightXInches, bottomYInches, PLAN_MEASUREMENT_Z_INCHES],
          [leftXInches, bottomYInches, PLAN_MEASUREMENT_Z_INCHES],
          [leftXInches, topYInches, PLAN_MEASUREMENT_Z_INCHES],
        ]}
        color="#38bdf8"
        lineWidth={1.5}
        dashed
        dashScale={18}
        gapSize={8}
        depthTest={false}
        renderOrder={80}
      />
      <PlanAreaMeasurementLabel
        positionInches={[centerXInches, centerYInches, PLAN_MEASUREMENT_LABEL_Z_INCHES]}
        label={formatSquareFeetLabel(measurementFrame.areaSquareFeet)}
      />
    </group>
  );
}

function PlanAreaMeasurementLabel({
  positionInches,
  label,
}: Readonly<{
  positionInches: [number, number, number];
  label: string;
}>) {
  return (
    <Html center position={positionInches} style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
      <div className="whitespace-nowrap rounded bg-white/75 px-2 py-1 text-sm font-bold leading-none text-slate-900">
        {label}
      </div>
    </Html>
  );
}
