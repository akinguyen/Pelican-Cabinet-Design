import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { SceneEntity } from "./sceneEntityTypes";

export function getSceneEntitySizeInches(sceneEntity: SceneEntity): Size3DInches {
  return sceneEntity.entityKind === "placed-assembly"
    ? sceneEntity.configuration.sizeInches
    : sceneEntity.sizeInches;
}

export function getSceneEntityDistanceFromFloorInches(sceneEntity: SceneEntity): number {
  return sceneEntity.worldPositionInches.zInches - getSceneEntitySizeInches(sceneEntity).heightInches / 2;
}

export function createSceneEntityWithWorldPosition<TSceneEntity extends SceneEntity>(
  sceneEntity: TSceneEntity,
  worldPositionInches: Point3DInches,
): TSceneEntity {
  return { ...sceneEntity, worldPositionInches };
}

export function createSceneEntityWithRotationZ<TSceneEntity extends SceneEntity>(
  sceneEntity: TSceneEntity,
  zDegrees: number,
): TSceneEntity {
  return { ...sceneEntity, rotationDegrees: { zDegrees } };
}

export function createSceneEntityWithDistanceFromFloor<TSceneEntity extends SceneEntity>(
  sceneEntity: TSceneEntity,
  distanceFromFloorInches: number,
): TSceneEntity {
  const sizeInches = getSceneEntitySizeInches(sceneEntity);
  return createSceneEntityWithWorldPosition(sceneEntity, {
    ...sceneEntity.worldPositionInches,
    zInches: distanceFromFloorInches + sizeInches.heightInches / 2,
  });
}

export function createSceneEntityWithHeightPreservingDistanceFromFloor<TSceneEntity extends SceneEntity>(
  sceneEntity: TSceneEntity,
  heightInches: number,
): TSceneEntity {
  return createSceneEntityWithDistanceFromFloor(sceneEntity, getSceneEntityDistanceFromFloorInches(sceneEntity));
}
