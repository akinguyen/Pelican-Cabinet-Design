import { updateAssemblyHeightPreservingDistanceFromFloor } from "@/engine/assemblies/placedAssemblyTypes";
import { getSceneEntitiesByRefs, replaceSceneEntity } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createAssemblyEditingActions(get: DesignSceneStoreGetter, set: DesignSceneStoreSetter): Pick<DesignSceneStore, "updateSelectedAssemblyDimension" | "updateSelectedAssemblyOptionValue"> {
  return {
    updateSelectedAssemblyDimension(dimensionId, valueInches) {
      const assembly = getSelectedAssembly(get);
      if (assembly === null) return;
      const nextAssembly = dimensionId === "heightInches"
        ? updateAssemblyHeightPreservingDistanceFromFloor(assembly, valueInches)
        : { ...assembly, configuration: { ...assembly.configuration, sizeInches: { ...assembly.configuration.sizeInches, [dimensionId]: valueInches } } };
      recordDesignSceneHistoryEntry({ get, set, label: "Update assembly dimension" });
      set((state) => ({ designScene: { ...state.designScene, sceneEntities: replaceSceneEntity(state.designScene.sceneEntities, nextAssembly) } }));
    },
    updateSelectedAssemblyOptionValue(optionId, value) {
      const assembly = getSelectedAssembly(get);
      if (assembly === null) return;
      const nextAssembly = { ...assembly, configuration: { ...assembly.configuration, optionValues: { ...assembly.configuration.optionValues, [optionId]: value } } };
      recordDesignSceneHistoryEntry({ get, set, label: "Update assembly option" });
      set((state) => ({ designScene: { ...state.designScene, sceneEntities: replaceSceneEntity(state.designScene.sceneEntities, nextAssembly) } }));
    },
  };
}

function getSelectedAssembly(get: DesignSceneStoreGetter) {
  const refs = getSceneEntityRefsFromSelection(get().designScene.activeSelection).filter((ref) => ref.entityKind === "placed-assembly");
  if (refs.length !== 1) return null;
  const entity = getSceneEntitiesByRefs(get().designScene.sceneEntities, refs)[0];
  return entity?.entityKind === "placed-assembly" ? entity : null;
}
