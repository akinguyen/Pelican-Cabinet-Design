"use client";

import type { AssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { createPlacedAssemblySceneEntityBounds } from "@/engine/scene-entities/placedAssemblySceneEntityBounds";
import { AssemblyPlacementBoundingBox } from "./AssemblyPlacementBoundingBox";
import { AssemblyObjectAlignmentGuides } from "./AssemblyObjectAlignmentGuides";
import { SceneEntityWallMeasurementGuides } from "../scene-entities/SceneEntityWallMeasurementGuides";
import { SceneEntityVolumeBoundingBox } from "../scene-entities/SceneEntityVolumeBoundingBox";

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
        sceneViewMode === "perspective" ? (
          <SceneEntityVolumeBoundingBox
            bounds={createPlacedAssemblySceneEntityBounds(placementFeedback.placedAssembly)}
            state={placementFeedback.isValid ? "moving" : "invalid"}
          />
        ) : (
          <AssemblyPlacementBoundingBox
            footprint={placementFeedback.footprint}
            state={placementFeedback.isValid ? "moving" : "invalid"}
          />
        )
      ) : null}
      <AssemblyObjectAlignmentGuides alignmentGuides={placementFeedback.objectAlignmentGuides} />
      {sceneViewMode === "floor-plan" && showWallMeasurementGuides ? (
        <SceneEntityWallMeasurementGuides measurementGuides={placementFeedback.wallMeasurementGuides} />
      ) : null}
    </group>
  );
}

