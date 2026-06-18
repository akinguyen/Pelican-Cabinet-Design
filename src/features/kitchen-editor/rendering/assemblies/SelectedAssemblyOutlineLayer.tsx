"use client";

import { useCallback, useMemo } from "react";
import { ASSEMBLY_ROTATION_SNAP_STEP_DEGREES } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { createPlacedAssemblySceneEntityBounds } from "@/engine/scene-entities/placedAssemblySceneEntityBounds";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { SceneEntityFloorPlanEditControls } from "../scene-entities/SceneEntityFloorPlanEditControls";
import { SceneEntityFloorPlanRotationControl } from "../scene-entities/SceneEntityFloorPlanRotationControl";
import { SceneEntityFootprintBoundingBox } from "../scene-entities/SceneEntityFootprintBoundingBox";

type SelectedAssemblyOutlineLayerProps = Readonly<{
  selectedAssembly: PlacedAssembly | null;
  sceneViewMode: SceneViewMode;
  hideFloorPlanSelectionBox?: boolean;
  hideFloorPlanRotationControl?: boolean;
}>;

export function SelectedAssemblyOutlineLayer({
  selectedAssembly,
  sceneViewMode,
  hideFloorPlanSelectionBox = false,
  hideFloorPlanRotationControl = false,
}: SelectedAssemblyOutlineLayerProps) {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const isSceneOperationActive = useDesignSceneStore((state) => state.designScene.activeSceneOperation !== null);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const assemblyPlacementFeedback = useDesignSceneStore((state) => state.assemblyPlacementFeedback);

  const bounds = useMemo(() => selectedAssembly === null
    ? null
    : createPlacedAssemblySceneEntityBounds(selectedAssembly), [selectedAssembly]);

  const handleStartRotation = useCallback((pointerWorldInches: Point3DInches) => {
    if (selectedAssembly === null || bounds === null) {
      return;
    }

    useDesignSceneStore.getState().startAssemblyRotationDrag({
      assemblyId: selectedAssembly.id,
      centerPointInches: bounds.footprint.centerPointInches,
      pointerWorldInches,
    });
  }, [bounds, selectedAssembly]);

  if (selectedAssembly === null || bounds === null) {
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
      !isSceneOperationActive &&
      activeToolbarTool === null &&
      activeDrag === null;
    const showRotationControl =
      !hideFloorPlanRotationControl &&
      !isSceneOperationActive &&
      activeToolbarTool === null &&
      (activeDrag === null || isSelectedAssemblyBeingRotated);

    return (
      <group>
        {shouldRenderSelectionBoundingBox && !hideFloorPlanSelectionBox ? (
          <SceneEntityFootprintBoundingBox
            bounds={bounds}
            state={isSelectedAssemblyBeingMoved || isSelectedAssemblyBeingRotated ? "moving" : "default"}
          />
        ) : null}
        {showUtilityControls ? (
          <SceneEntityFloorPlanEditControls
            bounds={bounds}
            duplicateLabel={`Duplicate assembly ${selectedAssembly.id}`}
            deleteLabel={`Delete assembly ${selectedAssembly.id}`}
            onDuplicate={() => useDesignSceneStore.getState().duplicateSelectedAssembly()}
            onDelete={() => useDesignSceneStore.getState().deleteSelectedAssembly()}
          />
        ) : null}
        {showRotationControl ? (
          <SceneEntityFloorPlanRotationControl
            bounds={bounds}
            isRotating={isSelectedAssemblyBeingRotated}
            rotationDegrees={selectedAssembly.rotationDegrees.zDegrees}
            snapStepDegrees={ASSEMBLY_ROTATION_SNAP_STEP_DEGREES}
            onStartRotation={handleStartRotation}
          />
        ) : null}
      </group>
    );
  }

  if (!shouldRenderSelectionBoundingBox) {
    return null;
  }

  return (
    <SceneEntityFootprintBoundingBox
      bounds={bounds}
      state={isSelectedAssemblyBeingMoved || isSelectedAssemblyBeingRotated ? "moving" : "default"}
      zInches={bounds.heightRangeInches.maxZInches + 1}
    />
  );
}
