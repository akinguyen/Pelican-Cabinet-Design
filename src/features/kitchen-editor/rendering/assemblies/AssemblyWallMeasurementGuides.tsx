"use client";

import { Html, Line } from "@react-three/drei";
import type { AssemblyWallMeasurementGuide } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";

const ASSEMBLY_WALL_GUIDE_Z_INCHES = 6;

export function AssemblyWallMeasurementGuides({
  measurementGuides,
}: Readonly<{
  measurementGuides: readonly AssemblyWallMeasurementGuide[];
}>) {
  return (
    <group>
      {measurementGuides.map((measurementGuide) => (
        <group key={measurementGuide.id} renderOrder={115}>
          <Line
            points={[
              [measurementGuide.startPointInches.xInches, measurementGuide.startPointInches.yInches, ASSEMBLY_WALL_GUIDE_Z_INCHES],
              [measurementGuide.endPointInches.xInches, measurementGuide.endPointInches.yInches, ASSEMBLY_WALL_GUIDE_Z_INCHES],
            ]}
            color="#0ea5e9"
            lineWidth={1.5}
            dashed
            dashScale={10}
            gapSize={5}
            depthTest={false}
            renderOrder={115}
          />
          <Html
            center
            position={[
              measurementGuide.labelPointInches.xInches,
              measurementGuide.labelPointInches.yInches,
              ASSEMBLY_WALL_GUIDE_Z_INCHES + 0.6,
            ]}
            style={{ pointerEvents: "none", whiteSpace: "nowrap", zIndex: 30 }}
          >
            <div
              className="inline-flex whitespace-nowrap rounded bg-white/85 px-1.5 py-0.5 text-[11px] font-bold leading-none text-slate-800 shadow-sm ring-1 ring-cyan-100"
              style={{
                transform: `rotate(${-measurementGuide.labelRotationDegrees}deg)`,
                transformOrigin: "center",
                whiteSpace: "nowrap",
              }}
            >
              {formatFeetInchesLabel(measurementGuide.lengthInches)}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
