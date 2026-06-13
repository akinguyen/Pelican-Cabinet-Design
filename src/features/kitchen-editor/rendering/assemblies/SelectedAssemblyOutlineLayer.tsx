"use client";

import { measurePlacedAssemblyPlacementBounds } from "@/engine/assemblies/assemblyBounds";
import { createAssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { AssemblyFloorPlanEditControls } from "./AssemblyFloorPlanEditControls";
import { AssemblyFloorPlanRotationControl } from "./AssemblyFloorPlanRotationControl";
import { AssemblyPlacementBoundingBox } from "./AssemblyPlacementBoundingBox";
import { SelectedAssemblyOutlineMesh } from "./SelectedAssemblyOutlineMesh";

type SelectedAssemblyOutlineLayerProps = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  activeSelection: SceneSelection | null;
  sceneViewMode: SceneViewMode;
}>;

export function SelectedAssemblyOutlineLayer({
  placedAssemblies,
  activeSelection,
  sceneViewMode,
}: SelectedAssemblyOutlineLayerProps) {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const assemblyPlacementFeedback = useDesignSceneStore((state) => state.assemblyPlacementFeedback);
  const canEditScene = canManuallyEditScene(workspaceMode);

  if (activeSelection?.kind !== "placed-assembly") {
    return null;
  }

  const selectedAssembly = placedAssemblies.find(
    (assembly) => assembly.id === activeSelection.placedAssemblyId,
  );

  if (selectedAssembly === undefined) {
    return null;
  }

  if (sceneViewMode === "elevation") {
    return (
      <SelectedAssemblyOutlineMesh
        boundsInches={measurePlacedAssemblyPlacementBounds(selectedAssembly)}
      />
    );
  }

  const footprint = createAssemblyPlacementFootprint(selectedAssembly);
  const isSelectedAssemblyBeingMoved = activeDrag?.kind === "assembly-move" && activeDrag.assemblyId === selectedAssembly.id;
  const isSelectedAssemblyBeingRotated = activeDrag?.kind === "assembly-rotation" && activeDrag.assemblyId === selectedAssembly.id;
  const activeFeedbackBelongsToSelectedAssembly = assemblyPlacementFeedback?.placedAssembly.id === selectedAssembly.id;
  const shouldRenderSelectionBoundingBox =
    !activeFeedbackBelongsToSelectedAssembly ||
    (!isSelectedAssemblyBeingMoved && !isSelectedAssemblyBeingRotated);

  if (sceneViewMode === "floor-plan") {
    const showUtilityControls =
      canEditScene &&
      activeSceneOperation === null &&
      activeToolbarTool === null &&
      activeDrag === null;
    const showRotationControl =
      canEditScene &&
      activeSceneOperation === null &&
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
