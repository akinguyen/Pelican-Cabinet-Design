import { getSceneEntityByRef } from "./sceneEntityCollectionEditing";
import { createDesignReservationZoneSceneEntityBounds } from "./designReservationZoneSceneEntityBounds";
import { createPlacedAssemblySceneEntityBounds } from "./placedAssemblySceneEntityBounds";
import type { SceneEntity, SceneEntityRef } from "./sceneEntityTypes";
import type { SceneEntityBounds } from "./sceneEntityBoundsTypes";

export function createSceneEntityBounds(sceneEntity: SceneEntity): SceneEntityBounds {
  return sceneEntity.entityKind === "placed-assembly"
    ? createPlacedAssemblySceneEntityBounds(sceneEntity)
    : createDesignReservationZoneSceneEntityBounds(sceneEntity);
}

export function createSceneEntityBoundsForRefs(
  sceneEntities: readonly SceneEntity[],
  refs: readonly SceneEntityRef[],
): readonly SceneEntityBounds[] {
  return refs.map((ref) => getSceneEntityByRef(sceneEntities, ref)).filter(isSceneEntity).map(createSceneEntityBounds);
}

function isSceneEntity(sceneEntity: SceneEntity | null): sceneEntity is SceneEntity {
  return sceneEntity !== null;
}
