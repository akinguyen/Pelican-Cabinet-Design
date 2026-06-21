import { createId } from "@/core/ids/createId";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneEntity, SceneEntityRef } from "./sceneEntityTypes";

const DUPLICATE_OFFSET_INCHES = 6;

export function getPlacedAssembliesFromSceneEntities(sceneEntities: readonly SceneEntity[]): readonly PlacedAssembly[] {
  return sceneEntities.filter((sceneEntity): sceneEntity is PlacedAssembly => sceneEntity.entityKind === "placed-assembly");
}

export function getDesignReservationZonesFromSceneEntities(sceneEntities: readonly SceneEntity[]): readonly DesignReservationZone[] {
  return sceneEntities.filter((sceneEntity): sceneEntity is DesignReservationZone => sceneEntity.entityKind === "design-reservation-zone");
}

export function getSceneEntityByRef(sceneEntities: readonly SceneEntity[], ref: SceneEntityRef): SceneEntity | null {
  return sceneEntities.find((sceneEntity) => sceneEntity.entityKind === ref.entityKind && sceneEntity.id === ref.entityId) ?? null;
}

export function getSceneEntitiesByRefs(sceneEntities: readonly SceneEntity[], refs: readonly SceneEntityRef[]): readonly SceneEntity[] {
  return refs.map((ref) => getSceneEntityByRef(sceneEntities, ref)).filter(isSceneEntity);
}

export function replaceSceneEntity(sceneEntities: readonly SceneEntity[], replacement: SceneEntity): readonly SceneEntity[] {
  return sceneEntities.map((sceneEntity) => sceneEntity.entityKind === replacement.entityKind && sceneEntity.id === replacement.id ? replacement : sceneEntity);
}

export function replaceSceneEntities(sceneEntities: readonly SceneEntity[], replacements: readonly SceneEntity[]): readonly SceneEntity[] {
  const replacementByKey = new Map(replacements.map((sceneEntity) => [createSceneEntityKey(sceneEntity), sceneEntity]));
  return sceneEntities.map((sceneEntity) => replacementByKey.get(createSceneEntityKey(sceneEntity)) ?? sceneEntity);
}

export function removeSceneEntities(sceneEntities: readonly SceneEntity[], refs: readonly SceneEntityRef[]): readonly SceneEntity[] {
  const keys = new Set(refs.map(createSceneEntityRefKey));
  return sceneEntities.filter((sceneEntity) => !keys.has(createSceneEntityKey(sceneEntity)));
}

export function duplicateSceneEntities(sceneEntities: readonly SceneEntity[], refs: readonly SceneEntityRef[]): readonly SceneEntity[] {
  const selectedKeys = new Set(refs.map(createSceneEntityRefKey));
  return sceneEntities
    .filter((sceneEntity) => selectedKeys.has(createSceneEntityKey(sceneEntity)))
    .map((sceneEntity) => ({
      ...sceneEntity,
      id: createId(),
      worldPositionInches: offsetDuplicatePosition(sceneEntity.worldPositionInches),
    }));
}

function offsetDuplicatePosition(position: Point3DInches): Point3DInches {
  return {
    ...position,
    xInches: position.xInches + DUPLICATE_OFFSET_INCHES,
    yInches: position.yInches + DUPLICATE_OFFSET_INCHES,
  };
}

function createSceneEntityKey(sceneEntity: SceneEntity): string {
  return `${sceneEntity.entityKind}:${sceneEntity.id}`;
}

function createSceneEntityRefKey(ref: SceneEntityRef): string {
  return `${ref.entityKind}:${ref.entityId}`;
}

function isSceneEntity(sceneEntity: SceneEntity | null): sceneEntity is SceneEntity {
  return sceneEntity !== null;
}
