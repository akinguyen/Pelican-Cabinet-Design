"use client";

import { memo } from "react";
import type { AssemblyWallMeasurementGuide } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";
import { PlanMeasurementLine } from "../shared/PlanMeasurementLine";

const ASSEMBLY_WALL_MEASUREMENT_Z_INCHES = 8.5;
const ASSEMBLY_WALL_MEASUREMENT_RENDER_ORDER = 122;
const ASSEMBLY_WALL_MEASUREMENT_STROKE = "#38bdf8";
const ASSEMBLY_WALL_MEASUREMENT_DASH_SIZE_INCHES = 3;
const ASSEMBLY_WALL_MEASUREMENT_GAP_SIZE_INCHES = 3;

export const AssemblyWallMeasurementGuides = memo(function AssemblyWallMeasurementGuides({
  measurementGuides,
}: Readonly<{
  measurementGuides: readonly AssemblyWallMeasurementGuide[];
}>) {
  if (measurementGuides.length === 0) {
    return null;
  }

  return (
    <group>
      {measurementGuides.map((measurementGuide) => (
        <PlanMeasurementLine
          key={measurementGuide.id}
          startPointInches={measurementGuide.startPointInches}
          endPointInches={measurementGuide.endPointInches}
          labelPointInches={measurementGuide.labelPointInches}
          label={formatFeetInchesLabel(measurementGuide.lengthInches)}
          labelRotationDegrees={measurementGuide.labelRotationDegrees}
          zInches={ASSEMBLY_WALL_MEASUREMENT_Z_INCHES}
          color={ASSEMBLY_WALL_MEASUREMENT_STROKE}
          renderOrder={ASSEMBLY_WALL_MEASUREMENT_RENDER_ORDER}
          lineWidth={1.25}
          dashSizeInches={ASSEMBLY_WALL_MEASUREMENT_DASH_SIZE_INCHES}
          gapSizeInches={ASSEMBLY_WALL_MEASUREMENT_GAP_SIZE_INCHES}
        />
      ))}
    </group>
  );
});
