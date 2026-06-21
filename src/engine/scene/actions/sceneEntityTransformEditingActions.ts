import { getSceneEntitiesByRefs, replaceSceneEntities } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { createSceneEntityWithDistanceFromFloor, createSceneEntityWithRotationZ, createSceneEntityWithWorldPosition } from "@/engine/scene-entities/sceneEntityTransforms";
import { getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createSceneEntityTransformEditingActions(get: DesignSceneStoreGetter, set: DesignSceneStoreSetter): Pick<DesignSceneStore, "updateSelectedSceneEntityWorldPositionX" | "updateSelectedSceneEntityWorldPositionY" | "updateSelectedSceneEntityDistanceFromFloor" | "updateSelectedSceneEntityRotationZ"> {
  function updateSelected(label: string, update: (sceneEntity: ReturnType<typeof getSceneEntitiesByRefs>[number]) => ReturnType<typeof getSceneEntitiesByRefs>[number]) {
    const refs = getSceneEntityRefsFromSelection(get().designScene.activeSelection);
    const selected = getSceneEntitiesByRefs(get().designScene.sceneEntities, refs);
    if (selected.length === 0) return;
    recordDesignSceneHistoryEntry({ get, set, label });
    set((state) => ({ designScene: { ...state.designScene, sceneEntities: replaceSceneEntities(state.designScene.sceneEntities, selected.map(update)) } }));
  }
  return {
    updateSelectedSceneEntityWorldPositionX(xInches) { updateSelected("Update scene entity X", (sceneEntity) => createSceneEntityWithWorldPosition(sceneEntity, { ...sceneEntity.worldPositionInches, xInches })); },
    updateSelectedSceneEntityWorldPositionY(yInches) { updateSelected("Update scene entity Y", (sceneEntity) => createSceneEntityWithWorldPosition(sceneEntity, { ...sceneEntity.worldPositionInches, yInches })); },
    updateSelectedSceneEntityDistanceFromFloor(distanceFromFloorInches) { updateSelected("Update scene entity distance from floor", (sceneEntity) => createSceneEntityWithDistanceFromFloor(sceneEntity, distanceFromFloorInches)); },
    updateSelectedSceneEntityRotationZ(zDegrees) { updateSelected("Update scene entity rotation", (sceneEntity) => createSceneEntityWithRotationZ(sceneEntity, zDegrees)); },
  };
}
