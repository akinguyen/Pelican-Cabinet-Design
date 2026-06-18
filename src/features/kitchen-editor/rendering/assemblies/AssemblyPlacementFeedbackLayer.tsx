"use client";

import type { AssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { AssemblyPlacementBoundingBox } from "./AssemblyPlacementBoundingBox";
import { AssemblyObjectAlignmentGuides } from "./AssemblyObjectAlignmentGuides";
import { AssemblyWallMeasurementGuides } from "./AssemblyWallMeasurementGuides";

type AssemblyPlacementFeedbackLayerProps = Readonly<{
  sceneViewMode: SceneViewMode;
  placementFeedback: AssemblyPlacementFeedback | null;
  showWallMeasurementGuides?: boolean;
  showBoundingBox?: boolean;
}>;

export function AssemblyPlacementFeedbackLayer({
  sceneViewMode,
  placementFeedback,
  showWallMeasurementGuides = true,
  showBoundingBox = true,
}: AssemblyPlacementFeedbackLayerProps) {
  if (placementFeedback === null) {
    return null;
  }

  if (sceneViewMode === "elevation") {
    return <AssemblyObjectAlignmentGuides alignmentGuides={placementFeedback.objectAlignmentGuides} />;
  }

  return (
    <group>
      {showBoundingBox ? (
        <AssemblyPlacementBoundingBox
          footprint={placementFeedback.footprint}
          state={placementFeedback.isValid ? "moving" : "invalid"}
          zInches={sceneViewMode === "perspective" ? getPerspectiveBoundingBoxZInches(placementFeedback) : undefined}
        />
      ) : null}
      <AssemblyObjectAlignmentGuides alignmentGuides={placementFeedback.objectAlignmentGuides} />
      {sceneViewMode === "floor-plan" && showWallMeasurementGuides ? (
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
