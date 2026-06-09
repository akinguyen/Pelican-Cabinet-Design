"use client";

import { Html } from "@react-three/drei";
import type { WallPlanEdgeMeasurement } from "@/engine/walls/footprint/wallPlanMeasurements";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";

const PLAN_EDGE_MEASUREMENT_LABEL_Z_INCHES = 3.1;

type WallPlanEdgeMeasurementLabelsProps = Readonly<{
  measurements: readonly WallPlanEdgeMeasurement[];
}>;

export function WallPlanEdgeMeasurementLabels({ measurements }: WallPlanEdgeMeasurementLabelsProps) {
  return (
    <group>
      {measurements.map((measurement) => (
        <Html
          key={measurement.id}
          center
          position={[
            measurement.midpointInches.xInches,
            measurement.midpointInches.yInches,
            PLAN_EDGE_MEASUREMENT_LABEL_Z_INCHES,
          ]}
          style={{ pointerEvents: "none" }}
        >
          <div
            className="inline-flex whitespace-nowrap rounded bg-white/85 px-1.5 py-0.5 text-[11px] font-bold leading-none text-slate-800 shadow-sm ring-1 ring-slate-200"
            style={{
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${measurement.labelRotationDegrees}deg)`,
              transformOrigin: "center",
              whiteSpace: "nowrap",
            }}
          >
            {formatFeetInchesLabel(measurement.lengthInches)}
          </div>
        </Html>
      ))}
    </group>
  );
}
