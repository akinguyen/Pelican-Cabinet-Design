import { duplicateSceneEntities, getSceneEntitiesByRefs, removeSceneEntities } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { createSceneSelectionFromSceneEntities, getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createSceneEntityEditingActions(get: DesignSceneStoreGetter, set: DesignSceneStoreSetter): Pick<DesignSceneStore, "deleteSelectedSceneEntities" | "duplicateSelectedSceneEntities"> {
  return {
    deleteSelectedSceneEntities() {
      const selectedRefs = getSceneEntityRefsFromSelection(get().designScene.activeSelection);
      if (selectedRefs.length === 0) return;
      recordDesignSceneHistoryEntry({ get, set, label: selectedRefs.length === 1 ? "Delete scene entity" : "Delete selected scene entities" });
      set((state) => ({ activeSceneEntityAlignmentGuides: [], designScene: { ...state.designScene, sceneEntities: removeSceneEntities(state.designScene.sceneEntities, selectedRefs), activeSelection: null } }));
    },
    duplicateSelectedSceneEntities() {
      const selectedRefs = getSceneEntityRefsFromSelection(get().designScene.activeSelection);
      if (selectedRefs.length === 0) return;
      const duplicated = duplicateSceneEntities(get().designScene.sceneEntities, selectedRefs);
      if (duplicated.length === 0) return;
      recordDesignSceneHistoryEntry({ get, set, label: duplicated.length === 1 ? "Duplicate scene entity" : "Duplicate selected scene entities" });
      set((state) => ({
        activeSceneEntityAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          sceneEntities: [...state.designScene.sceneEntities, ...duplicated],
          activeSelection: createSceneSelectionFromSceneEntities(duplicated.map((sceneEntity) => ({ entityKind: sceneEntity.entityKind, entityId: sceneEntity.id }))),
        },
      }));
    },
  };
}
