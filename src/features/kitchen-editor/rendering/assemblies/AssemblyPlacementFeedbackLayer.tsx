"use client";

import type { AssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { AssemblyPlacementBoundingBox } from "./AssemblyPlacementBoundingBox";
import { AssemblyWallMeasurementGuides } from "./AssemblyWallMeasurementGuides";

type AssemblyPlacementFeedbackLayerProps = Readonly<{
  sceneViewMode: SceneViewMode;
  placementFeedback: AssemblyPlacementFeedback | null;
}>;

export function AssemblyPlacementFeedbackLayer({
  sceneViewMode,
  placementFeedback,
}: AssemblyPlacementFeedbackLayerProps) {
  if (sceneViewMode === "elevation" || placementFeedback === null) {
    return null;
  }

  return (
    <group>
      <AssemblyPlacementBoundingBox
        footprint={placementFeedback.footprint}
        state={placementFeedback.isValid ? "moving" : "invalid"}
        zInches={sceneViewMode === "perspective" ? getPerspectiveBoundingBoxZInches(placementFeedback) : undefined}
      />
      {sceneViewMode === "floor-plan" ? (
        <AssemblyWallMeasurementGuides measurementGuides={placementFeedback.wallMeasurementGuides} />
      ) : null}
    </group>
  );
}

function getPerspectiveBoundingBoxZInches(placementFeedback: AssemblyPlacementFeedback): number {
  return (
    placementFeedback.placedAssembly.worldPositionInches.zInches +
    placementFeedback.placedAssembly.configuration.sizeInches.heightInches / 2 +
    1
  );
}
