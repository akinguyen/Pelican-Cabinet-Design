"use client";

import { useCallback, useMemo } from "react";
import { ASSEMBLY_ROTATION_SNAP_STEP_DEGREES } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { createPlacedAssemblySceneEntityBounds } from "@/engine/scene-entities/placedAssemblySceneEntityBounds";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { SceneEntityFloorPlanEditControls } from "../scene-entities/SceneEntityFloorPlanEditControls";
import { SceneEntityFloorPlanRotationControl } from "../scene-entities/SceneEntityFloorPlanRotationControl";
import { SceneEntityFootprintBoundingBox } from "../scene-entities/SceneEntityFootprintBoundingBox";
import { SceneEntityVolumeBoundingBox } from "../scene-entities/SceneEntityVolumeBoundingBox";
import { SelectedAssembliesFloorPlanEditControls } from "./SelectedAssembliesFloorPlanEditControls";
import { SelectedAssembliesGroupMeasurementGuides } from "./SelectedAssembliesGroupMeasurementGuides";

type SelectedAssemblyOutlineLayerProps = Readonly<{
  selectedAssembly: PlacedAssembly | null;
  selectedAssemblies?: readonly PlacedAssembly[];
  placedWallGraphs?: readonly PlacedWallGraph[];
  sceneViewMode: SceneViewMode;
  hideFloorPlanSelectionBox?: boolean;
  hideFloorPlanRotationControl?: boolean;
}>;

export function SelectedAssemblyOutlineLayer({
  selectedAssembly,
  selectedAssemblies,
  placedWallGraphs = [],
  sceneViewMode,
  hideFloorPlanSelectionBox = false,
  hideFloorPlanRotationControl = false,
}: SelectedAssemblyOutlineLayerProps) {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const isSceneOperationActive = useDesignSceneStore((state) => state.designScene.activeSceneOperation !== null);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const assemblyPlacementFeedback = useDesignSceneStore((state) => state.assemblyPlacementFeedback);
  const selectedAssemblyList = useMemo(() => {
    if (selectedAssemblies !== undefined) {
      return selectedAssemblies;
    }

    return selectedAssembly === null ? [] : [selectedAssembly];
  }, [selectedAssemblies, selectedAssembly]);
  const selectedBounds = useMemo(() => selectedAssemblyList.map(createPlacedAssemblySceneEntityBounds), [selectedAssemblyList]);

  const singleSelectedAssembly = selectedAssemblyList.length === 1 ? selectedAssemblyList[0] : null;
  const singleBounds = selectedBounds.length === 1 ? selectedBounds[0] : null;

  const handleStartRotation = useCallback((pointerWorldInches: Point3DInches) => {
    if (singleSelectedAssembly === null || singleBounds === null) {
      return;
    }

    useDesignSceneStore.getState().startAssemblyRotationDrag({
      assemblyId: singleSelectedAssembly.id,
      centerPointInches: singleBounds.footprint.centerPointInches,
      pointerWorldInches,
    });
  }, [singleBounds, singleSelectedAssembly]);

  if (selectedAssemblyList.length === 0 || selectedBounds.length === 0) {
    return null;
  }

  const isMultiSelection = selectedAssemblyList.length > 1;
  const isSelectedAssemblyBeingMoved = singleSelectedAssembly !== null && activeDrag?.kind === "assembly-move" && activeDrag.assemblyId === singleSelectedAssembly.id;
  const isSelectedAssemblyBeingRotated = singleSelectedAssembly !== null && activeDrag?.kind === "assembly-rotation" && activeDrag.assemblyId === singleSelectedAssembly.id;
  const isMultiSelectionBeingMoved = activeDrag?.kind === "assembly-multi-move" && selectedAssemblyList.some((assembly) => activeDrag.assemblyIds.includes(assembly.id));
  const activeFeedbackBelongsToSelectedAssembly = singleSelectedAssembly !== null && assemblyPlacementFeedback?.placedAssembly.id === singleSelectedAssembly.id;
  const shouldRenderSingleSelectionBoundingBox =
    !activeFeedbackBelongsToSelectedAssembly ||
    (!isSelectedAssemblyBeingMoved && !isSelectedAssemblyBeingRotated);

  if (sceneViewMode === "floor-plan") {
    const showUtilityControls =
      !isSceneOperationActive &&
      activeToolbarTool === null &&
      activeDrag === null;
    const showRotationControl =
      !isMultiSelection &&
      !hideFloorPlanRotationControl &&
      !isSceneOperationActive &&
      activeToolbarTool === null &&
      (activeDrag === null || isSelectedAssemblyBeingRotated);

    return (
      <group>
        {isMultiSelectionBeingMoved ? (
          <SelectedAssembliesGroupMeasurementGuides
            bounds={selectedBounds}
            placedWallGraphs={placedWallGraphs}
          />
        ) : null}
        {!hideFloorPlanSelectionBox ? selectedBounds.map((bounds) => (
          <SceneEntityFootprintBoundingBox
            key={`selected-assembly-footprint-${bounds.entityId}`}
            bounds={bounds}
            state={isSelectedAssemblyBeingMoved || isSelectedAssemblyBeingRotated || isMultiSelectionBeingMoved ? "moving" : "default"}
          />
        )) : null}
        {isMultiSelection && showUtilityControls ? (
          <SelectedAssembliesFloorPlanEditControls
            bounds={selectedBounds}
            deleteLabel={`Delete ${selectedBounds.length} selected assemblies`}
            onDelete={() => useDesignSceneStore.getState().deleteSelectedAssembly()}
          />
        ) : null}
        {!isMultiSelection && showUtilityControls && singleBounds !== null && singleSelectedAssembly !== null ? (
          <SceneEntityFloorPlanEditControls
            bounds={singleBounds}
            duplicateLabel={`Duplicate assembly ${singleSelectedAssembly.id}`}
            deleteLabel={`Delete assembly ${singleSelectedAssembly.id}`}
            onDuplicate={() => useDesignSceneStore.getState().duplicateSelectedAssembly()}
            onDelete={() => useDesignSceneStore.getState().deleteSelectedAssembly()}
          />
        ) : null}
        {showRotationControl && singleBounds !== null && singleSelectedAssembly !== null ? (
          <SceneEntityFloorPlanRotationControl
            bounds={singleBounds}
            isRotating={isSelectedAssemblyBeingRotated}
            rotationDegrees={singleSelectedAssembly.rotationDegrees.zDegrees}
            snapStepDegrees={ASSEMBLY_ROTATION_SNAP_STEP_DEGREES}
            onStartRotation={handleStartRotation}
            handleCenterAngleDegrees={isSelectedAssemblyBeingRotated ? undefined : getWallAwareInitialRotationHandleCenterAngleDegrees({
              bounds: singleBounds,
              placedWallGraphs,
              rotationDegrees: singleSelectedAssembly.rotationDegrees.zDegrees,
            })}
          />
        ) : null}
      </group>
    );
  }

  if (!isMultiSelection && !shouldRenderSingleSelectionBoundingBox) {
    return null;
  }

  return (
    <group>
      {selectedBounds.map((bounds) => sceneViewMode === "perspective" ? (
        <SceneEntityVolumeBoundingBox
          key={`selected-assembly-volume-${bounds.entityId}`}
          bounds={bounds}
          state={isSelectedAssemblyBeingMoved || isSelectedAssemblyBeingRotated || isMultiSelectionBeingMoved ? "moving" : "default"}
        />
      ) : (
        <SceneEntityFootprintBoundingBox
          key={`selected-assembly-elevation-${bounds.entityId}`}
          bounds={bounds}
          state={isSelectedAssemblyBeingMoved || isSelectedAssemblyBeingRotated || isMultiSelectionBeingMoved ? "moving" : "default"}
          zInches={bounds.heightRangeInches.maxZInches + 1}
        />
      ))}
    </group>
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
