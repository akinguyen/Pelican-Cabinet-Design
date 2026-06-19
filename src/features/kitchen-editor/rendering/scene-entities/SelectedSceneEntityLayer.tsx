"use client";

import { useCallback } from "react";
import { ASSEMBLY_ROTATION_SNAP_STEP_DEGREES } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { SceneEntityFloorPlanEditControls } from "./SceneEntityFloorPlanEditControls";
import { SceneEntityFloorPlanRotationControl } from "./SceneEntityFloorPlanRotationControl";
import { SceneEntityVolumeBoundingBox } from "./SceneEntityVolumeBoundingBox";

type SelectedSceneEntityLayerProps = Readonly<{
  selectedAssemblies: readonly PlacedAssembly[];
  selectedDesignReservationZones: readonly DesignReservationZone[];
  selectedSceneEntityBounds: readonly SceneEntityBounds[];
  placedWallGraphs: readonly PlacedWallGraph[];
  sceneViewMode: SceneViewMode;
  selectedAssemblyIsWallOpening: boolean;
}>;

export function SelectedSceneEntityLayer({
  selectedAssemblies,
  selectedDesignReservationZones,
  selectedSceneEntityBounds,
  placedWallGraphs,
  sceneViewMode,
  selectedAssemblyIsWallOpening,
}: SelectedSceneEntityLayerProps) {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const isSceneOperationActive = useDesignSceneStore((state) => state.designScene.activeSceneOperation !== null);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const assemblyPlacementFeedback = useDesignSceneStore((state) => state.assemblyPlacementFeedback);
  const singleSelectedAssembly = selectedAssemblies.length === 1 && selectedDesignReservationZones.length === 0
    ? selectedAssemblies[0]
    : null;
  const singleSelectedDesignReservationZone = selectedDesignReservationZones.length === 1 && selectedAssemblies.length === 0
    ? selectedDesignReservationZones[0]
    : null;
  const singleBounds = selectedSceneEntityBounds.length === 1 ? selectedSceneEntityBounds[0] : null;
  const selectedSceneEntityCount = selectedSceneEntityBounds.length;
  const isMultiSelection = selectedSceneEntityCount > 1;

  const handleStartAssemblyRotation = useCallback((pointerWorldInches: Point3DInches) => {
    if (singleSelectedAssembly === null || singleBounds === null) {
      return;
    }

    useDesignSceneStore.getState().startAssemblyRotationDrag({
      assemblyId: singleSelectedAssembly.id,
      centerPointInches: singleBounds.footprint.centerPointInches,
      pointerWorldInches,
    });
  }, [singleBounds, singleSelectedAssembly]);

  const handleStartDesignReservationZoneRotation = useCallback((pointerWorldInches: Point3DInches) => {
    if (singleSelectedDesignReservationZone === null || singleBounds === null) {
      return;
    }

    useDesignSceneStore.getState().startDesignReservationZoneRotationDrag({
      designReservationZoneId: singleSelectedDesignReservationZone.id,
      centerPointInches: singleBounds.footprint.centerPointInches,
      pointerWorldInches,
    });
  }, [singleBounds, singleSelectedDesignReservationZone]);

  if (selectedSceneEntityCount === 0) {
    return null;
  }

  const isSingleAssemblyBeingMoved = singleSelectedAssembly !== null && activeDrag?.kind === "assembly-move" && activeDrag.assemblyId === singleSelectedAssembly.id;
  const isSingleAssemblyBeingRotated = singleSelectedAssembly !== null && activeDrag?.kind === "assembly-rotation" && activeDrag.assemblyId === singleSelectedAssembly.id;
  const isSingleDesignReservationZoneBeingMoved = singleSelectedDesignReservationZone !== null && activeDrag?.kind === "design-reservation-zone-move" && activeDrag.designReservationZoneId === singleSelectedDesignReservationZone.id;
  const isSingleDesignReservationZoneBeingRotated = singleSelectedDesignReservationZone !== null && activeDrag?.kind === "design-reservation-zone-rotation" && activeDrag.designReservationZoneId === singleSelectedDesignReservationZone.id;
  const isSceneEntityMultiMoveActive = activeDrag?.kind === "scene-entity-multi-move";
  const isSelectedSceneEntityMoving = isSingleAssemblyBeingMoved ||
    isSingleAssemblyBeingRotated ||
    isSingleDesignReservationZoneBeingMoved ||
    isSingleDesignReservationZoneBeingRotated ||
    isSceneEntityMultiMoveActive;
  const activeFeedbackBelongsToSingleAssembly = singleSelectedAssembly !== null && assemblyPlacementFeedback?.placedAssembly.id === singleSelectedAssembly.id;
  const shouldRenderSingleSelectionBoundingBox = !activeFeedbackBelongsToSingleAssembly ||
    (!isSingleAssemblyBeingMoved && !isSingleAssemblyBeingRotated);

  if (sceneViewMode !== "floor-plan") {
    if (!isMultiSelection && !shouldRenderSingleSelectionBoundingBox) {
      return null;
    }

    return (
      <group>
        <SceneEntityBoundingBoxes
          bounds={selectedSceneEntityBounds}
          state={isSelectedSceneEntityMoving ? "moving" : "default"}
        />
      </group>
    );
  }

  const showUtilityControls = !isSceneOperationActive && activeToolbarTool === null && activeDrag === null;
  const showAssemblyRotationControl = singleSelectedAssembly !== null &&
    !selectedAssemblyIsWallOpening &&
    !isSceneOperationActive &&
    activeToolbarTool === null &&
    (activeDrag === null || isSingleAssemblyBeingRotated);
  const showDesignReservationZoneRotationControl = singleSelectedDesignReservationZone !== null &&
    !isSceneOperationActive &&
    activeToolbarTool === null &&
    (activeDrag === null || isSingleDesignReservationZoneBeingRotated);

  return (
    <group>
      <SceneEntityBoundingBoxes
        bounds={selectedSceneEntityBounds}
        state={isSelectedSceneEntityMoving ? "moving" : "default"}
      />
      {showUtilityControls && singleBounds !== null && singleSelectedAssembly !== null ? (
        <SceneEntityFloorPlanEditControls
          bounds={singleBounds}
          duplicateLabel={`Duplicate assembly ${singleSelectedAssembly.id}`}
          deleteLabel={`Delete assembly ${singleSelectedAssembly.id}`}
          onDuplicate={() => useDesignSceneStore.getState().duplicateSelectedSceneEntities()}
          onDelete={() => useDesignSceneStore.getState().deleteSelectedSceneEntities()}
        />
      ) : null}
      {showUtilityControls && singleBounds !== null && singleSelectedDesignReservationZone !== null ? (
        <SceneEntityFloorPlanEditControls
          bounds={singleBounds}
          duplicateLabel={`Duplicate design reservation zone ${singleSelectedDesignReservationZone.id}`}
          deleteLabel={`Delete design reservation zone ${singleSelectedDesignReservationZone.id}`}
          onDuplicate={() => useDesignSceneStore.getState().duplicateSelectedSceneEntities()}
          onDelete={() => useDesignSceneStore.getState().deleteSelectedSceneEntities()}
        />
      ) : null}
      {showUtilityControls && isMultiSelection ? (
        <SceneEntityFloorPlanEditControls
          bounds={selectedSceneEntityBounds}
          selectedCountLabel={`${selectedSceneEntityCount} selected`}
          duplicateLabel={`Duplicate ${selectedSceneEntityCount} selected scene entities`}
          deleteLabel={`Delete ${selectedSceneEntityCount} selected scene entities`}
          onDuplicate={() => useDesignSceneStore.getState().duplicateSelectedSceneEntities()}
          onDelete={() => useDesignSceneStore.getState().deleteSelectedSceneEntities()}
        />
      ) : null}
      {showAssemblyRotationControl && singleBounds !== null && singleSelectedAssembly !== null ? (
        <SceneEntityFloorPlanRotationControl
          bounds={singleBounds}
          isRotating={isSingleAssemblyBeingRotated}
          rotationDegrees={singleSelectedAssembly.rotationDegrees.zDegrees}
          snapStepDegrees={ASSEMBLY_ROTATION_SNAP_STEP_DEGREES}
          onStartRotation={handleStartAssemblyRotation}
          handleCenterAngleDegrees={isSingleAssemblyBeingRotated ? undefined : getWallAwareInitialRotationHandleCenterAngleDegrees({
            bounds: singleBounds,
            placedWallGraphs,
            rotationDegrees: singleSelectedAssembly.rotationDegrees.zDegrees,
          })}
        />
      ) : null}
      {showDesignReservationZoneRotationControl && singleBounds !== null && singleSelectedDesignReservationZone !== null ? (
        <SceneEntityFloorPlanRotationControl
          bounds={singleBounds}
          isRotating={isSingleDesignReservationZoneBeingRotated}
          rotationDegrees={singleSelectedDesignReservationZone.rotationDegrees.zDegrees}
          snapStepDegrees={ASSEMBLY_ROTATION_SNAP_STEP_DEGREES}
          onStartRotation={handleStartDesignReservationZoneRotation}
        />
      ) : null}
    </group>
  );
}

function SceneEntityBoundingBoxes({
  bounds,
  state,
}: Readonly<{
  bounds: readonly SceneEntityBounds[];
  state: "default" | "moving";
}>) {
  return (
    <>
      {bounds.map((item) => (
        <SceneEntityVolumeBoundingBox
          key={`selected-scene-entity-volume-${item.entityKind}-${item.entityId}`}
          bounds={item}
          state={state}
        />
      ))}
    </>
  );
}

function getDefaultRotationHandleCenterAngleDegrees(rotationDegrees: number): number {
  return -rotationDegrees - 90;
}

function getWallAwareInitialRotationHandleCenterAngleDegrees(args: {
  bounds: SceneEntityBounds;
  placedWallGraphs: readonly PlacedWallGraph[];
  rotationDegrees: number;
}): number {
  const defaultAngleDegrees = getDefaultRotationHandleCenterAngleDegrees(args.rotationDegrees);

  if (!isNearlyCardinalRotationDegrees(args.rotationDegrees)) {
    return defaultAngleDegrees;
  }

  const nearbyWallDirection = getNearestWallDirectionFromBoundsCenter(args);

  if (nearbyWallDirection === null) {
    return defaultAngleDegrees;
  }

  const handleAngleRadians = convertDegreesToRadians(defaultAngleDegrees);
  const handleDirection = {
    xInches: Math.cos(handleAngleRadians),
    yInches: Math.sin(handleAngleRadians),
  };
  const dot = handleDirection.xInches * nearbyWallDirection.xInches + handleDirection.yInches * nearbyWallDirection.yInches;

  return dot > 0.25 ? defaultAngleDegrees + 180 : defaultAngleDegrees;
}

function isNearlyCardinalRotationDegrees(rotationDegrees: number): boolean {
  const normalizedDegrees = ((rotationDegrees % 360) + 360) % 360;
  const nearestCardinalDegrees = Math.round(normalizedDegrees / 90) * 90;
  const distanceDegrees = Math.abs(normalizedDegrees - nearestCardinalDegrees);
  return Math.min(distanceDegrees, 360 - distanceDegrees) <= 1;
}

function getNearestWallDirectionFromBoundsCenter(args: {
  bounds: SceneEntityBounds;
  placedWallGraphs: readonly PlacedWallGraph[];
}): { xInches: number; yInches: number } | null {
  const center = args.bounds.footprint.centerPointInches;
  const boundsPlan = getPlanBounds(args.bounds.footprintCornersInches);
  let nearest: { distanceInches: number; direction: { xInches: number; yInches: number } } | null = null;

  args.placedWallGraphs.forEach((wallGraph) => {
    buildConnectedWallGeometry(wallGraph).segmentBodies.forEach((segmentBody) => {
      [
        [segmentBody.start.sideAPointInches, segmentBody.end.sideAPointInches],
        [segmentBody.start.sideBPointInches, segmentBody.end.sideBPointInches],
      ].forEach(([startPointInches, endPointInches]) => {
        const wallFace = createAxisAlignedWallFace(startPointInches, endPointInches);

        if (wallFace === null) {
          return;
        }

        if (wallFace.orientation === "vertical" && rangesOverlap(boundsPlan.minYInches, boundsPlan.maxYInches, wallFace.minRangeInches, wallFace.maxRangeInches)) {
          const distanceFromLeft = Math.abs(boundsPlan.minXInches - wallFace.fixedCoordinateInches);
          const distanceFromRight = Math.abs(boundsPlan.maxXInches - wallFace.fixedCoordinateInches);
          const direction = wallFace.fixedCoordinateInches < center.xInches
            ? { xInches: -1, yInches: 0 }
            : { xInches: 1, yInches: 0 };
          const distanceInches = Math.min(distanceFromLeft, distanceFromRight);
          nearest = getNearerWallDirection(nearest, { distanceInches, direction });
          return;
        }

        if (wallFace.orientation === "horizontal" && rangesOverlap(boundsPlan.minXInches, boundsPlan.maxXInches, wallFace.minRangeInches, wallFace.maxRangeInches)) {
          const distanceFromBottom = Math.abs(boundsPlan.minYInches - wallFace.fixedCoordinateInches);
          const distanceFromTop = Math.abs(boundsPlan.maxYInches - wallFace.fixedCoordinateInches);
          const direction = wallFace.fixedCoordinateInches < center.yInches
            ? { xInches: 0, yInches: -1 }
            : { xInches: 0, yInches: 1 };
          const distanceInches = Math.min(distanceFromBottom, distanceFromTop);
          nearest = getNearerWallDirection(nearest, { distanceInches, direction });
        }
      });
    });
  });

  return nearest !== null && nearest.distanceInches <= 18 ? nearest.direction : null;
}

function createAxisAlignedWallFace(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): { orientation: "horizontal" | "vertical"; fixedCoordinateInches: number; minRangeInches: number; maxRangeInches: number } | null {
  const deltaXInches = endPointInches.xInches - startPointInches.xInches;
  const deltaYInches = endPointInches.yInches - startPointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);

  if (lengthInches <= 0.001) {
    return null;
  }

  if (Math.abs(deltaXInches / lengthInches) > 0.985) {
    return {
      orientation: "horizontal",
      fixedCoordinateInches: (startPointInches.yInches + endPointInches.yInches) / 2,
      minRangeInches: Math.min(startPointInches.xInches, endPointInches.xInches),
      maxRangeInches: Math.max(startPointInches.xInches, endPointInches.xInches),
    };
  }

  if (Math.abs(deltaYInches / lengthInches) > 0.985) {
    return {
      orientation: "vertical",
      fixedCoordinateInches: (startPointInches.xInches + endPointInches.xInches) / 2,
      minRangeInches: Math.min(startPointInches.yInches, endPointInches.yInches),
      maxRangeInches: Math.max(startPointInches.yInches, endPointInches.yInches),
    };
  }

  return null;
}

function getPlanBounds(pointsInches: readonly Point3DInches[]): {
  minXInches: number;
  maxXInches: number;
  minYInches: number;
  maxYInches: number;
} {
  return pointsInches.reduce((bounds, pointInches) => ({
    minXInches: Math.min(bounds.minXInches, pointInches.xInches),
    maxXInches: Math.max(bounds.maxXInches, pointInches.xInches),
    minYInches: Math.min(bounds.minYInches, pointInches.yInches),
    maxYInches: Math.max(bounds.maxYInches, pointInches.yInches),
  }), {
    minXInches: Number.POSITIVE_INFINITY,
    maxXInches: Number.NEGATIVE_INFINITY,
    minYInches: Number.POSITIVE_INFINITY,
    maxYInches: Number.NEGATIVE_INFINITY,
  });
}

function rangesOverlap(firstMinInches: number, firstMaxInches: number, secondMinInches: number, secondMaxInches: number): boolean {
  return firstMaxInches >= secondMinInches && secondMaxInches >= firstMinInches;
}

function getNearerWallDirection(
  current: { distanceInches: number; direction: { xInches: number; yInches: number } } | null,
  candidate: { distanceInches: number; direction: { xInches: number; yInches: number } },
): { distanceInches: number; direction: { xInches: number; yInches: number } } {
  return current === null || candidate.distanceInches < current.distanceInches ? candidate : current;
}

function convertDegreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
