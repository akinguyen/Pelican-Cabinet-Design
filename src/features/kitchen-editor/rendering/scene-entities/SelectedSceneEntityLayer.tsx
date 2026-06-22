"use client";

import { useCallback } from "react";
import { SCENE_ENTITY_ROTATION_SNAP_STEP_DEGREES } from "@/engine/scene-entities/sceneEntityRotationSnapping";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { SceneEntityEditControls } from "./SceneEntityEditControls";
import { SceneEntityFloorPlanRotationControl } from "./SceneEntityFloorPlanRotationControl";
import { SceneEntityVolumeBoundingBox } from "./SceneEntityVolumeBoundingBox";

type SelectedSceneEntityLayerProps = Readonly<{
  selectedSceneEntities: readonly SceneEntity[];
  selectedSceneEntityBounds: readonly SceneEntityBounds[];
  placedWallGraphs: readonly PlacedWallGraph[];
  sceneViewMode: SceneViewMode;
  selectedAssemblyIsWallOpening: boolean;
}>;

export function SelectedSceneEntityLayer({ selectedSceneEntities, selectedSceneEntityBounds, placedWallGraphs, sceneViewMode, selectedAssemblyIsWallOpening }: SelectedSceneEntityLayerProps) {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const isSceneOperationActive = useDesignSceneStore((state) => state.designScene.activeSceneOperation !== null);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const singleSelectedSceneEntityObject = selectedSceneEntities.length === 1 ? selectedSceneEntities[0] : null;
  const singleSelectedSceneEntity = singleSelectedSceneEntityObject === null ? null : { entityKind: singleSelectedSceneEntityObject.entityKind, entityId: singleSelectedSceneEntityObject.id };
  const singleBounds = selectedSceneEntityBounds.length === 1 ? selectedSceneEntityBounds[0] : null;
  const selectedSceneEntityCount = selectedSceneEntityBounds.length;
  const isMultiSelection = selectedSceneEntityCount > 1;

  const handleStartSceneEntityRotation = useCallback((pointerWorldInches: Point3DInches, startHandleCenterAngleDegrees: number) => {
    if (singleSelectedSceneEntity === null || singleBounds === null) return;
    useDesignSceneStore.getState().startSceneEntityRotationDrag({ sceneEntity: singleSelectedSceneEntity, centerPointInches: singleBounds.footprint.centerPointInches, pointerWorldInches, startHandleCenterAngleDegrees });
  }, [singleBounds, singleSelectedSceneEntity]);

  if (selectedSceneEntityCount === 0) return null;

  const isSingleSceneEntityBeingMoved = singleSelectedSceneEntity !== null && activeDrag?.kind === "scene-entity-move" && activeDrag.sceneEntities.some((sceneEntity) => sceneEntity.entityKind === singleSelectedSceneEntity.entityKind && sceneEntity.entityId === singleSelectedSceneEntity.entityId);
  const isSingleSceneEntityBeingRotated = singleSelectedSceneEntity !== null && activeDrag?.kind === "scene-entity-rotation" && activeDrag.sceneEntity.entityKind === singleSelectedSceneEntity.entityKind && activeDrag.sceneEntity.entityId === singleSelectedSceneEntity.entityId;
  const isSelectedSceneEntityMoving = isSingleSceneEntityBeingMoved || isSingleSceneEntityBeingRotated;

  const showUtilityControls = !isSceneOperationActive && activeToolbarTool === null && activeDrag === null;
  const showSceneEntityRotationControl = sceneViewMode === "floor-plan" && singleSelectedSceneEntity !== null && !(singleSelectedSceneEntityObject?.entityKind === "placed-assembly" && selectedAssemblyIsWallOpening) && !isSceneOperationActive && activeToolbarTool === null && (activeDrag === null || isSingleSceneEntityBeingRotated);

  return (
    <group>
      <SceneEntityBoundingBoxes bounds={selectedSceneEntityBounds} state={isSelectedSceneEntityMoving ? "moving" : "default"} />
      {showUtilityControls && singleBounds !== null && singleSelectedSceneEntityObject !== null ? (
        <SceneEntityEditControls bounds={singleBounds} duplicateLabel={`Duplicate ${getSceneEntityLabel(singleSelectedSceneEntityObject)}`} deleteLabel={`Delete ${getSceneEntityLabel(singleSelectedSceneEntityObject)}`} onDuplicate={() => useDesignSceneStore.getState().duplicateSelectedSceneEntities()} onDelete={() => useDesignSceneStore.getState().deleteSelectedSceneEntities()} />
      ) : null}
      {showUtilityControls && isMultiSelection ? (
        <SceneEntityEditControls bounds={selectedSceneEntityBounds} selectedCountLabel={`${selectedSceneEntityCount} selected`} duplicateLabel={`Duplicate ${selectedSceneEntityCount} selected scene entities`} deleteLabel={`Delete ${selectedSceneEntityCount} selected scene entities`} onDuplicate={() => useDesignSceneStore.getState().duplicateSelectedSceneEntities()} onDelete={() => useDesignSceneStore.getState().deleteSelectedSceneEntities()} />
      ) : null}
      {showSceneEntityRotationControl && singleBounds !== null && singleSelectedSceneEntityObject !== null ? (
        <SceneEntityFloorPlanRotationControl bounds={singleBounds} isRotating={isSingleSceneEntityBeingRotated} rotationDegrees={singleSelectedSceneEntityObject.rotationDegrees.zDegrees} snapStepDegrees={SCENE_ENTITY_ROTATION_SNAP_STEP_DEGREES} onStartRotation={handleStartSceneEntityRotation} handleCenterAngleDegrees={isSingleSceneEntityBeingRotated && activeDrag?.kind === "scene-entity-rotation" ? activeDrag.latestHandleCenterAngleDegrees : singleSelectedSceneEntityObject.entityKind === "placed-assembly" ? getWallAwareInitialRotationHandleCenterAngleDegrees({ bounds: singleBounds, placedWallGraphs, rotationDegrees: singleSelectedSceneEntityObject.rotationDegrees.zDegrees }) : undefined} />
      ) : null}
    </group>
  );
}

function SceneEntityBoundingBoxes({ bounds, state }: Readonly<{ bounds: readonly SceneEntityBounds[]; state: "default" | "moving" }>) {
  return <>{bounds.map((item) => <SceneEntityVolumeBoundingBox key={`selected-scene-entity-volume-${item.entityKind}-${item.entityId}`} bounds={item} state={state} />)}</>;
}

function getSceneEntityLabel(sceneEntity: SceneEntity): string {
  return sceneEntity.entityKind === "design-reservation-zone" ? `design reservation zone ${sceneEntity.id}` : `assembly ${sceneEntity.id}`;
}

function getDefaultRotationHandleCenterAngleDegrees(rotationDegrees: number): number { return -rotationDegrees - 90; }

function getWallAwareInitialRotationHandleCenterAngleDegrees(args: { bounds: SceneEntityBounds; placedWallGraphs: readonly PlacedWallGraph[]; rotationDegrees: number }): number {
  const defaultAngleDegrees = getDefaultRotationHandleCenterAngleDegrees(args.rotationDegrees);
  const nearbyWallDirections = getNearbyWallDirectionsFromBoundsCenter(args);
  if (nearbyWallDirections.length === 0) return defaultAngleDegrees;
  const oppositeAngleDegrees = defaultAngleDegrees + 180;
  return getRotationHandleWallOverlapScore(oppositeAngleDegrees, nearbyWallDirections) < getRotationHandleWallOverlapScore(defaultAngleDegrees, nearbyWallDirections) ? oppositeAngleDegrees : defaultAngleDegrees;
}

function getNearbyWallDirectionsFromBoundsCenter(args: { bounds: SceneEntityBounds; placedWallGraphs: readonly PlacedWallGraph[] }): readonly number[] {
  const boundsCenter = args.bounds.centerPointInches;
  return args.placedWallGraphs.flatMap((wallGraph) => buildConnectedWallGeometry(wallGraph).faces.map((face) => Math.atan2(face.normalInches.yInches, face.normalInches.xInches) * 180 / Math.PI).filter((angleDegrees) => Number.isFinite(angleDegrees) && Math.abs(boundsCenter.zInches) >= 0));
}

function getRotationHandleWallOverlapScore(handleAngleDegrees: number, wallDirections: readonly number[]): number {
  return wallDirections.reduce((score, wallDirectionDegrees) => score + Math.abs(Math.cos((handleAngleDegrees - wallDirectionDegrees) * Math.PI / 180)), 0);
}
