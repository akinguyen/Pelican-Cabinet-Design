"use client";

import { useCallback, useMemo } from "react";
import { SCENE_ENTITY_ROTATION_SNAP_STEP_DEGREES } from "@/engine/scene-entities/sceneEntityRotationSnapping";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { createSceneEntitySelectionKey } from "@/engine/scene/sceneSelectionTypes";
import { SceneEntityRotationControl } from "./SceneEntityRotationControl";
import { SceneEntityVolumeBoundingBox } from "./SceneEntityVolumeBoundingBox";

type SelectedSceneEntityLayerProps = Readonly<{
  selectedSceneEntities: readonly SceneEntity[];
  selectedSceneEntityBounds: readonly SceneEntityBounds[];
  placedWallGraphs: readonly PlacedWallGraph[];
  selectedAssemblyIsWallOpening: boolean;
  showRotationHandle: boolean;
  enableRotationHandleInteraction: boolean;
}>;

export function SelectedSceneEntityLayer({ selectedSceneEntities, selectedSceneEntityBounds, placedWallGraphs, selectedAssemblyIsWallOpening, showRotationHandle, enableRotationHandleInteraction }: SelectedSceneEntityLayerProps) {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const isSceneOperationActive = useDesignSceneStore((state) => state.designScene.activeSceneOperation !== null);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const lastRotationHandleCenterAngleDegreesBySceneEntityKey = useDesignSceneStore((state) => state.lastRotationHandleCenterAngleDegreesBySceneEntityKey);
  const singleSelectedSceneEntityObject = selectedSceneEntities.length === 1 ? selectedSceneEntities[0] : null;
  const singleSelectedSceneEntity = singleSelectedSceneEntityObject === null ? null : { entityKind: singleSelectedSceneEntityObject.entityKind, entityId: singleSelectedSceneEntityObject.id };
  const singleSelectedSceneEntityKey = useMemo(() => singleSelectedSceneEntity === null ? null : createSceneEntitySelectionKey(singleSelectedSceneEntity), [singleSelectedSceneEntity]);
  const singleBounds = selectedSceneEntityBounds.length === 1 ? selectedSceneEntityBounds[0] : null;
  const selectedSceneEntityCount = selectedSceneEntityBounds.length;

  const handleStartSceneEntityRotation = useCallback((pointerWorldInches: Point3DInches, startHandleCenterAngleDegrees: number) => {
    if (singleSelectedSceneEntity === null || singleBounds === null) return;
    useDesignSceneStore.getState().startSceneEntityRotationDrag({ sceneEntity: singleSelectedSceneEntity, centerPointInches: { ...singleBounds.footprint.centerPointInches, zInches: getRotationControlZInches(singleBounds, showRotationHandle) ?? singleBounds.footprint.centerPointInches.zInches }, pointerWorldInches, startHandleCenterAngleDegrees });
  }, [showRotationHandle, singleBounds, singleSelectedSceneEntity]);

  if (selectedSceneEntityCount === 0) return null;

  const isSingleSceneEntityBeingMoved = singleSelectedSceneEntity !== null && activeDrag?.kind === "scene-entity-move" && activeDrag.sceneEntities.some((sceneEntity) => sceneEntity.entityKind === singleSelectedSceneEntity.entityKind && sceneEntity.entityId === singleSelectedSceneEntity.entityId);
  const isSingleSceneEntityBeingRotated = singleSelectedSceneEntity !== null && activeDrag?.kind === "scene-entity-rotation" && activeDrag.sceneEntity.entityKind === singleSelectedSceneEntity.entityKind && activeDrag.sceneEntity.entityId === singleSelectedSceneEntity.entityId;
  const isSelectedSceneEntityMoving = isSingleSceneEntityBeingMoved || isSingleSceneEntityBeingRotated;

  const showSceneEntityRotationControl = showRotationHandle && singleSelectedSceneEntity !== null && !(singleSelectedSceneEntityObject?.entityKind === "placed-assembly" && selectedAssemblyIsWallOpening) && !isSceneOperationActive && activeToolbarTool === null && (activeDrag === null || isSingleSceneEntityBeingRotated);
  const rotationHandleCenterAngleDegrees = singleBounds === null || singleSelectedSceneEntityObject === null
    ? undefined
    : getRotationHandleCenterAngleDegreesForSelectedEntity({
        activeDrag,
        isRotating: isSingleSceneEntityBeingRotated,
        lastRotationHandleCenterAngleDegreesBySceneEntityKey,
        placedWallGraphs,
        rotationDegrees: singleSelectedSceneEntityObject.rotationDegrees.zDegrees,
        sceneEntityKind: singleSelectedSceneEntityObject.entityKind,
        sceneEntityKey: singleSelectedSceneEntityKey,
        bounds: singleBounds,
      });

  return (
    <group>
      <SceneEntityBoundingBoxes bounds={selectedSceneEntityBounds} state={isSelectedSceneEntityMoving ? "moving" : "default"} />
      {showSceneEntityRotationControl && singleBounds !== null && singleSelectedSceneEntityObject !== null ? (
        <SceneEntityRotationControl
          bounds={singleBounds}
          isRotating={isSingleSceneEntityBeingRotated}
          rotationDegrees={singleSelectedSceneEntityObject.rotationDegrees.zDegrees}
          snapStepDegrees={SCENE_ENTITY_ROTATION_SNAP_STEP_DEGREES}
          onStartRotation={handleStartSceneEntityRotation}
          isInteractionEnabled={enableRotationHandleInteraction}
          controlZInches={getRotationControlZInches(singleBounds, showRotationHandle)}
          handleCenterAngleDegrees={rotationHandleCenterAngleDegrees}
        />
      ) : null}
    </group>
  );
}

function SceneEntityBoundingBoxes({ bounds, state }: Readonly<{ bounds: readonly SceneEntityBounds[]; state: "default" | "moving" }>) {
  return <>{bounds.map((item) => <SceneEntityVolumeBoundingBox key={`selected-scene-entity-volume-${item.entityKind}-${item.entityId}`} bounds={item} state={state} />)}</>;
}

function getRotationHandleCenterAngleDegreesForSelectedEntity(args: {
  activeDrag: ReturnType<typeof useDesignSceneStore.getState>["activeDrag"];
  isRotating: boolean;
  lastRotationHandleCenterAngleDegreesBySceneEntityKey: Readonly<Record<string, number>>;
  placedWallGraphs: readonly PlacedWallGraph[];
  rotationDegrees: number;
  sceneEntityKind: SceneEntity["entityKind"];
  sceneEntityKey: string | null;
  bounds: SceneEntityBounds;
}): number | undefined {
  if (args.isRotating && args.activeDrag?.kind === "scene-entity-rotation") {
    return args.activeDrag.latestHandleCenterAngleDegrees;
  }

  const lastHandleCenterAngleDegrees = args.sceneEntityKey === null
    ? undefined
    : args.lastRotationHandleCenterAngleDegreesBySceneEntityKey[args.sceneEntityKey];

  if (lastHandleCenterAngleDegrees !== undefined) {
    return lastHandleCenterAngleDegrees;
  }

  return args.sceneEntityKind === "placed-assembly"
    ? getWallAwareInitialRotationHandleCenterAngleDegrees({
        bounds: args.bounds,
        placedWallGraphs: args.placedWallGraphs,
        rotationDegrees: args.rotationDegrees,
      })
    : undefined;
}

function getRotationControlZInches(bounds: SceneEntityBounds, showRotationHandle: boolean): number | undefined {
  if (!showRotationHandle) return undefined;
  return bounds.heightRangeInches.maxZInches + 6;
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
