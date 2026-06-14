"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { AssemblyDragSurface } from "../../../interaction/assemblies/AssemblyDragSurface";
import { AssemblyRotationSurface } from "../../../interaction/assemblies/AssemblyRotationSurface";
import { CountertopCutoutDraftSurface } from "../../../interaction/countertops/CountertopCutoutDraftSurface";
import { WallOpeningDraftSurface } from "../../../interaction/walls/WallOpeningDraftSurface";
import { WallSegmentDraftSurface } from "../../../interaction/walls/WallSegmentDraftSurface";
import { AssemblyLayer } from "../../../rendering/assemblies/AssemblyLayer";
import { AssemblyPlacementCandidateRenderer } from "../../../rendering/assemblies/AssemblyPlacementCandidateRenderer";
import { AssemblyPlacementFeedbackLayer } from "../../../rendering/assemblies/AssemblyPlacementFeedbackLayer";
import { SelectedAssemblyOutlineLayer } from "../../../rendering/assemblies/SelectedAssemblyOutlineLayer";
import { CountertopCutoutDraftOverlay } from "../../../rendering/countertops/CountertopCutoutDraftOverlay";
import { CountertopOpeningOverlay } from "../../../rendering/countertops/CountertopOpeningOverlay";
import { WallLayer } from "../../../rendering/walls/WallLayer";
import { WallOpeningDraftOverlay } from "../../../rendering/walls/WallOpeningDraftOverlay";

export function DesignSceneRenderer() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const assemblyPlacementFeedback = useDesignSceneStore((state) => state.assemblyPlacementFeedback);
  const wallSegmentDraft =
    activeSceneOperation?.kind === "wall-segment-draft"
      ? activeSceneOperation.wallSegmentDraft
      : null;
  const showFrontOutlineLines = activeSceneViewMode === "elevation";
  const showWallPlanMeasurements = activeSceneViewMode === "floor-plan" && wallSegmentDraft === null;

  return (
    <>
      <WallLayer
        placedWallGraphs={placedWallGraphs}
        activeSelection={activeSelection}
        activeWallElevationTarget={activeWallElevationTarget}
        wallSegmentDraft={wallSegmentDraft}
        showPlanMeasurements={showWallPlanMeasurements}
        sceneViewMode={activeSceneViewMode}
      />
      <AssemblyLayer
        placedAssemblies={placedAssemblies}
        showFrontOutlineLines={showFrontOutlineLines}
      />
      <SelectedAssemblyOutlineLayer
        placedAssemblies={placedAssemblies}
        activeSelection={activeSelection}
        sceneViewMode={activeSceneViewMode}
      />
      <AssemblyPlacementFeedbackLayer
        sceneViewMode={activeSceneViewMode}
        placementFeedback={assemblyPlacementFeedback}
      />
      <AssemblyPlacementCandidateRenderer
        activeSceneOperation={activeSceneOperation}
        showFrontOutlineLines={showFrontOutlineLines}
      />
      <CountertopOpeningOverlay />
      <CountertopCutoutDraftOverlay />
      <AssemblyDragSurface />
      <AssemblyRotationSurface />
      <CountertopCutoutDraftSurface />
      <WallOpeningDraftOverlay />
      <WallOpeningDraftSurface />
      <WallSegmentDraftSurface />
    </>
  );
}
