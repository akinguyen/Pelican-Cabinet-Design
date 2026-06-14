"use client";

import type { AssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { AssemblyPlacementBoundingBox } from "./AssemblyPlacementBoundingBox";
import { AssemblyObjectAlignmentGuides } from "./AssemblyObjectAlignmentGuides";

type AssemblyPlacementFeedbackLayerProps = Readonly<{
  sceneViewMode: SceneViewMode;
  placementFeedback: AssemblyPlacementFeedback | null;
}>;

export function AssemblyPlacementFeedbackLayer({
  sceneViewMode,
  placementFeedback,
}: AssemblyPlacementFeedbackLayerProps) {
  if (placementFeedback === null) {
    return null;
  }

  if (sceneViewMode === "elevation") {
    return <AssemblyObjectAlignmentGuides alignmentGuides={placementFeedback.objectAlignmentGuides} />;
  }

  return (
    <group>
      <AssemblyPlacementBoundingBox
        footprint={placementFeedback.footprint}
        state={placementFeedback.isValid ? "moving" : "invalid"}
        zInches={sceneViewMode === "perspective" ? getPerspectiveBoundingBoxZInches(placementFeedback) : undefined}
      />
      <AssemblyObjectAlignmentGuides alignmentGuides={placementFeedback.objectAlignmentGuides} />
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
