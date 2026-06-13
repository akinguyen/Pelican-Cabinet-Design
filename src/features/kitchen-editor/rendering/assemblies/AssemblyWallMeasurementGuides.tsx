"use client";

import type { AssemblyWallMeasurementGuide } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import { PlanMeasurementLine } from "../shared/PlanMeasurementLine";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";

const ASSEMBLY_WALL_GUIDE_Z_INCHES = 6;
const ASSEMBLY_WALL_GUIDE_RENDER_ORDER = 115;
const ASSEMBLY_WALL_GUIDE_STROKE = "#38bdf8";
const ASSEMBLY_WALL_GUIDE_DASH_SIZE_INCHES = 3;
const ASSEMBLY_WALL_GUIDE_GAP_SIZE_INCHES = 3;

export function AssemblyWallMeasurementGuides({
  measurementGuides,
}: Readonly<{
  measurementGuides: readonly AssemblyWallMeasurementGuide[];
}>) {
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
          zInches={ASSEMBLY_WALL_GUIDE_Z_INCHES}
          color={ASSEMBLY_WALL_GUIDE_STROKE}
          renderOrder={ASSEMBLY_WALL_GUIDE_RENDER_ORDER}
          dashSizeInches={ASSEMBLY_WALL_GUIDE_DASH_SIZE_INCHES}
          gapSizeInches={ASSEMBLY_WALL_GUIDE_GAP_SIZE_INCHES}
        />
      ))}
    </group>
  );
}
