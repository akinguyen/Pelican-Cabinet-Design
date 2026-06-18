"use client";

import { useCallback, useMemo } from "react";
import { ASSEMBLY_ROTATION_SNAP_STEP_DEGREES } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { createDesignReservationZoneSceneEntityBounds } from "@/engine/scene-entities/designReservationZoneSceneEntityBounds";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { SceneEntityFloorPlanEditControls } from "../scene-entities/SceneEntityFloorPlanEditControls";
import { SceneEntityFloorPlanRotationControl } from "../scene-entities/SceneEntityFloorPlanRotationControl";
import { SceneEntityFootprintBoundingBox } from "../scene-entities/SceneEntityFootprintBoundingBox";

export function SelectedDesignReservationZoneOutlineLayer({
  selectedZone,
  sceneViewMode,
}: Readonly<{
  selectedZone: DesignReservationZone | null;
  sceneViewMode: SceneViewMode;
}>) {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const isSceneOperationActive = useDesignSceneStore((state) => state.designScene.activeSceneOperation !== null);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const bounds = useMemo(() => selectedZone === null
    ? null
    : createDesignReservationZoneSceneEntityBounds(selectedZone), [selectedZone]);

  const handleStartRotation = useCallback((pointerWorldInches: Point3DInches) => {
    if (selectedZone === null || bounds === null) {
      return;
    }

    useDesignSceneStore.getState().startDesignReservationZoneRotationDrag({
      designReservationZoneId: selectedZone.id,
      centerPointInches: bounds.footprint.centerPointInches,
      pointerWorldInches,
    });
  }, [bounds, selectedZone]);

  if (selectedZone === null || bounds === null) {
    return null;
  }

  const isSelectedZoneBeingMoved = activeDrag?.kind === "design-reservation-zone-move" && activeDrag.designReservationZoneId === selectedZone.id;
  const isSelectedZoneBeingRotated = activeDrag?.kind === "design-reservation-zone-rotation" && activeDrag.designReservationZoneId === selectedZone.id;

  if (sceneViewMode !== "floor-plan") {
    return (
      <SceneEntityFootprintBoundingBox
        bounds={bounds}
        state={isSelectedZoneBeingMoved || isSelectedZoneBeingRotated ? "moving" : "default"}
        zInches={bounds.heightRangeInches.maxZInches + 1}
      />
    );
  }

  const showUtilityControls = !isSceneOperationActive && activeToolbarTool === null && activeDrag === null;
  const showRotationControl = !isSceneOperationActive && activeToolbarTool === null && (activeDrag === null || isSelectedZoneBeingRotated);

  return (
    <group>
      <SceneEntityFootprintBoundingBox
        bounds={bounds}
        state={isSelectedZoneBeingMoved || isSelectedZoneBeingRotated ? "moving" : "default"}
      />
      {showUtilityControls ? (
        <SceneEntityFloorPlanEditControls
          bounds={bounds}
          deleteLabel={`Delete design reservation zone ${selectedZone.id}`}
          onDelete={() => useDesignSceneStore.getState().deleteSelectedDesignReservationZone()}
        />
      ) : null}
      {showRotationControl ? (
        <SceneEntityFloorPlanRotationControl
          bounds={bounds}
          isRotating={isSelectedZoneBeingRotated}
          rotationDegrees={selectedZone.rotationDegrees.zDegrees}
          snapStepDegrees={ASSEMBLY_ROTATION_SNAP_STEP_DEGREES}
          onStartRotation={handleStartRotation}
        />
      ) : null}
    </group>
  );
}
