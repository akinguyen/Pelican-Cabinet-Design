"use client";

import { useMemo } from "react";
import { createAssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { AssemblyFloorPlanEditControls } from "./AssemblyFloorPlanEditControls";
import { AssemblyFloorPlanRotationControl } from "./AssemblyFloorPlanRotationControl";
import { AssemblyPlacementBoundingBox } from "./AssemblyPlacementBoundingBox";

type SelectedAssemblyOutlineLayerProps = Readonly<{
  selectedAssembly: PlacedAssembly | null;
  sceneViewMode: SceneViewMode;
}>;

export function SelectedAssemblyOutlineLayer({
  selectedAssembly,
  sceneViewMode,
}: SelectedAssemblyOutlineLayerProps) {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const isSceneOperationActive = useDesignSceneStore((state) => state.designScene.activeSceneOperation !== null);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const assemblyPlacementFeedback = useDesignSceneStore((state) => state.assemblyPlacementFeedback);
  const canEditScene = canManuallyEditScene(workspaceMode);

  const footprint = useMemo(() => selectedAssembly === null
    ? null
    : createAssemblyPlacementFootprint(selectedAssembly), [selectedAssembly]);

  if (selectedAssembly === null || footprint === null) {
    return null;
  }
  const isSelectedAssemblyBeingMoved = activeDrag?.kind === "assembly-move" && activeDrag.assemblyId === selectedAssembly.id;
  const isSelectedAssemblyBeingRotated = activeDrag?.kind === "assembly-rotation" && activeDrag.assemblyId === selectedAssembly.id;
  const activeFeedbackBelongsToSelectedAssembly = assemblyPlacementFeedback?.placedAssembly.id === selectedAssembly.id;
  const shouldRenderSelectionBoundingBox =
    !activeFeedbackBelongsToSelectedAssembly ||
    (!isSelectedAssemblyBeingMoved && !isSelectedAssemblyBeingRotated);

  if (sceneViewMode === "floor-plan") {
    const showUtilityControls =
      canEditScene &&
      !isSceneOperationActive &&
      activeToolbarTool === null &&
      activeDrag === null;
    const showRotationControl =
      canEditScene &&
      !isSceneOperationActive &&
      activeToolbarTool === null &&
      (activeDrag === null || isSelectedAssemblyBeingRotated);

    return (
      <group>
        {shouldRenderSelectionBoundingBox ? (
          <AssemblyPlacementBoundingBox
            footprint={footprint}
            state={isSelectedAssemblyBeingMoved || isSelectedAssemblyBeingRotated ? "moving" : "default"}
          />
        ) : null}
        {showUtilityControls ? (
          <AssemblyFloorPlanEditControls
            placedAssemblyId={selectedAssembly.id}
            footprint={footprint}
          />
        ) : null}
        {showRotationControl ? (
          <AssemblyFloorPlanRotationControl
            placedAssembly={selectedAssembly}
            footprint={footprint}
          />
        ) : null}
      </group>
    );
  }

  if (!shouldRenderSelectionBoundingBox) {
    return null;
  }

  return (
    <AssemblyPlacementBoundingBox
      footprint={footprint}
      state={isSelectedAssemblyBeingMoved || isSelectedAssemblyBeingRotated ? "moving" : "default"}
      zInches={getPerspectiveBoundingBoxZInches(selectedAssembly)}
    />
  );
}

function getPerspectiveBoundingBoxZInches(placedAssembly: PlacedAssembly): number {
  return (
    placedAssembly.worldPositionInches.zInches +
    placedAssembly.configuration.sizeInches.heightInches / 2 +
    1
  );
}
