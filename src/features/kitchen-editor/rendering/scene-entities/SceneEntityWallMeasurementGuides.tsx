"use client";

import { memo } from "react";
import type { SceneEntityWallMeasurementGuide } from "@/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides";
import { formatFeetInchesLabel } from "../../formatting/kitchenEditorLabelFormatting";
import { PlanMeasurementLine } from "../shared/PlanMeasurementLine";

const SCENE_ENTITY_WALL_MEASUREMENT_Z_INCHES = 8.5;
const SCENE_ENTITY_WALL_MEASUREMENT_RENDER_ORDER = 122;
const SCENE_ENTITY_WALL_MEASUREMENT_STROKE = "#38bdf8";
const SCENE_ENTITY_WALL_MEASUREMENT_DASH_SIZE_INCHES = 3;
const SCENE_ENTITY_WALL_MEASUREMENT_GAP_SIZE_INCHES = 3;

export const SceneEntityWallMeasurementGuides = memo(function SceneEntityWallMeasurementGuides({
  measurementGuides,
}: Readonly<{
  measurementGuides: readonly SceneEntityWallMeasurementGuide[];
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
          zInches={SCENE_ENTITY_WALL_MEASUREMENT_Z_INCHES}
          color={SCENE_ENTITY_WALL_MEASUREMENT_STROKE}
          renderOrder={SCENE_ENTITY_WALL_MEASUREMENT_RENDER_ORDER}
          lineWidth={1.25}
          dashSizeInches={SCENE_ENTITY_WALL_MEASUREMENT_DASH_SIZE_INCHES}
          gapSizeInches={SCENE_ENTITY_WALL_MEASUREMENT_GAP_SIZE_INCHES}
        />
      ))}
    </group>
  );
});
