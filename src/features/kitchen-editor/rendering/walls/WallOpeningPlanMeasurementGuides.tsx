"use client";

import { memo, useMemo } from "react";
import type { DerivedWallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import { buildDerivedWallOpeningPlanMeasurementGuides } from "@/engine/walls/openings/wallOpeningPlanMeasurements";
import { PlanMeasurementLine } from "../shared/PlanMeasurementLine";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const WALL_OPENING_MEASUREMENT_Z_INCHES = 7.5;
const WALL_OPENING_MEASUREMENT_RENDER_ORDER = 119;
const WALL_OPENING_MEASUREMENT_DASH_SIZE_INCHES = 100000;
const WALL_OPENING_MEASUREMENT_GAP_SIZE_INCHES = 0.001;

export const WallOpeningPlanMeasurementGuides = memo(function WallOpeningPlanMeasurementGuides({
  activeSourceAssemblyId,
  derivedWallOpenings,
  segmentBodies,
}: Readonly<{
  activeSourceAssemblyId: string;
  derivedWallOpenings: readonly DerivedWallOpening[];
  segmentBodies: readonly BuiltWallSegmentBody[];
}>) {
  const measurementGuides = useMemo(() => buildDerivedWallOpeningPlanMeasurementGuides({
    activeSourceAssemblyId,
    segmentBodies,
    derivedWallOpenings,
  }), [activeSourceAssemblyId, segmentBodies, derivedWallOpenings]);

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
          zInches={WALL_OPENING_MEASUREMENT_Z_INCHES}
          color={wallSegmentRenderColors.openingMeasurementStroke}
          renderOrder={WALL_OPENING_MEASUREMENT_RENDER_ORDER}
          lineWidth={1.5}
          dashSizeInches={WALL_OPENING_MEASUREMENT_DASH_SIZE_INCHES}
          gapSizeInches={WALL_OPENING_MEASUREMENT_GAP_SIZE_INCHES}
        />
      ))}
    </group>
  );
});
