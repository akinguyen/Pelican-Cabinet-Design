"use client";

import { Html, Line } from "@react-three/drei";
import type { WallEdgeMeasurement } from "@/engine/walls/footprint/wallFootprintTypes";
import { formatInchesLabel } from "../../shared/formatInchesLabel";

const MEASUREMENT_Z_INCHES = 1.2;

export type WallMeasurementGuideVariant = "default" | "draft" | "split-preview";

type WallMeasurementGuidesProps = Readonly<{
  measurements: readonly WallEdgeMeasurement[];
  variant?: WallMeasurementGuideVariant;
}>;

export function WallMeasurementGuides({
  measurements,
  variant = "default",
}: WallMeasurementGuidesProps) {
  return (
    <>
      {measurements.map((measurement) => (
        <WallMeasurementGuide
          key={measurement.id}
          measurement={measurement}
          variant={variant}
        />
      ))}
    </>
  );
}

function WallMeasurementGuide({
  measurement,
  variant,
}: Readonly<{
  measurement: WallEdgeMeasurement;
  variant: WallMeasurementGuideVariant;
}>) {
  const startPoint = [
    measurement.startPointInches.xInches,
    measurement.startPointInches.yInches,
    MEASUREMENT_Z_INCHES,
  ] as const;
  const endPoint = [
    measurement.endPointInches.xInches,
    measurement.endPointInches.yInches,
    MEASUREMENT_Z_INCHES,
  ] as const;
  const labelXInches = (measurement.startPointInches.xInches + measurement.endPointInches.xInches) / 2;
  const labelYInches = (measurement.startPointInches.yInches + measurement.endPointInches.yInches) / 2;
  const color = variant === "split-preview" ? "#f97316" : variant === "draft" ? "#0284c7" : "#334155";

  return (
    <group>
      <Line points={[startPoint, endPoint]} color={color} lineWidth={1.25} dashed dashScale={14} gapSize={5} />
      <Html
        center
        position={[labelXInches, labelYInches, MEASUREMENT_Z_INCHES + 0.25]}
        style={{ pointerEvents: "none" }}
      >
        <div className="rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200">
          {formatInchesLabel(measurement.lengthInches)}
        </div>
      </Html>
    </group>
  );
}
