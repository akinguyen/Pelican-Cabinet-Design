import type { Point3DInches } from "@/core/geometry/pointTypes";
import { alignSceneEntity, alignSceneEntityGroup } from "@/engine/scene-entities/alignment/sceneEntityObjectAlignment";
import { getSceneEntitiesByRefs, getSceneEntityByRef, replaceSceneEntities } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { createDraggedSceneEntityWorldPosition } from "@/engine/scene-entities/sceneEntityMoveGeometry";
import { createSceneEntityWithWorldPosition, getSceneEntitySizeInches } from "@/engine/scene-entities/sceneEntityTransforms";
import type { SceneEntity, SceneEntityRef } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneEntityMoveDragState } from "../sceneDragTypes";
import { createSceneEntitySelectionKey, getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createSceneEntityMoveActions(get: DesignSceneStoreGetter, set: DesignSceneStoreSetter): Pick<DesignSceneStore, "startSceneEntityMoveDrag" | "updateSceneEntityMoveDrag" | "finishSceneEntityMoveDrag" | "cancelSceneEntityMoveDrag"> {
  return {
    startSceneEntityMoveDrag({ sceneEntity, pointerWorldInches, sceneViewMode, elevationMoveFrame }) {
      const state = get();
      const selectedRefs = getSceneEntityRefsFromSelection(state.designScene.activeSelection);
      const refs = selectedRefs.some((selected) => createSceneEntitySelectionKey(selected) === createSceneEntitySelectionKey(sceneEntity)) ? selectedRefs : [sceneEntity];
      set({ activeDrag: createMoveState({ refs, pointerWorldInches, sceneViewMode, elevationMoveFrame, sceneEntities: state.designScene.sceneEntities }), activeSceneEntityAlignmentGuides: [] });
    },
    updateSceneEntityMoveDrag(pointerWorldInches) {
      const activeDrag = get().activeDrag;
      if (activeDrag?.kind !== "scene-entity-move") return;
      const designScene = get().designScene;
      const moving = getSceneEntitiesByRefs(designScene.sceneEntities, activeDrag.sceneEntities);
      const proposed = moving.map((sceneEntity) => {
        const key = createSceneEntitySelectionKey({ entityKind: sceneEntity.entityKind, entityId: sceneEntity.id });
        return createSceneEntityWithWorldPosition(sceneEntity, createDraggedSceneEntityWorldPosition({
          sceneViewMode: activeDrag.sceneViewMode,
          elevationMoveFrame: activeDrag.elevationMoveFrame,
          dragStartPointerWorldInches: activeDrag.dragStartPointerWorldInches,
          pointerWorldInches,
          dragStartWorldPositionInches: activeDrag.dragStartWorldPositionsBySceneEntityKey[key] ?? sceneEntity.worldPositionInches,
          minWorldZInches: getSceneEntitySizeInches(sceneEntity).heightInches / 2,
        }));
      });
      const aligned = proposed.length === 1
        ? alignSceneEntity({ movingSceneEntity: proposed[0], sceneEntities: designScene.sceneEntities, excludedSceneEntityIds: [proposed[0].id], placedWallGraphs: designScene.placedWallGraphs, movementSource: activeDrag.sceneViewMode, elevationMoveFrame: activeDrag.elevationMoveFrame })
        : alignSceneEntityGroup({ movingSceneEntities: proposed, sceneEntities: designScene.sceneEntities, excludedSceneEntityIds: proposed.map((item) => item.id), placedWallGraphs: designScene.placedWallGraphs, movementSource: activeDrag.sceneViewMode, elevationMoveFrame: activeDrag.elevationMoveFrame });
      const alignedEntities = "sceneEntity" in aligned ? [aligned.sceneEntity] : aligned.sceneEntities;
      set((state) => ({
        designScene: { ...state.designScene, sceneEntities: replaceSceneEntities(state.designScene.sceneEntities, alignedEntities) },
        activeSceneEntityAlignmentGuides: aligned.alignmentGuides,
        activeDrag: { ...activeDrag, latestWorldPositionsBySceneEntityKey: Object.fromEntries(alignedEntities.map((item) => [createSceneEntitySelectionKey({ entityKind: item.entityKind, entityId: item.id }), item.worldPositionInches])) },
      }));
    },
    finishSceneEntityMoveDrag() {
      const activeDrag = get().activeDrag;
      if (activeDrag?.kind !== "scene-entity-move") { set({ activeDrag: null, activeSceneEntityAlignmentGuides: [] }); return; }
      recordDesignSceneHistoryEntry({ get, set, label: activeDrag.sceneEntities.length === 1 ? "Move scene entity" : "Move selected scene entities", designScene: restorePositions(get().designScene, activeDrag.dragStartWorldPositionsBySceneEntityKey) });
      set({ activeDrag: null, activeSceneEntityAlignmentGuides: [] });
    },
    cancelSceneEntityMoveDrag() {
      const activeDrag = get().activeDrag;
      if (activeDrag?.kind !== "scene-entity-move") return;
      set((state) => ({ designScene: restorePositions(state.designScene, activeDrag.dragStartWorldPositionsBySceneEntityKey), activeDrag: null, activeSceneEntityAlignmentGuides: [] }));
    },
  };
}

function createMoveState(args: { refs: readonly SceneEntityRef[]; pointerWorldInches: Point3DInches; sceneViewMode: SceneEntityMoveDragState["sceneViewMode"]; elevationMoveFrame?: SceneEntityMoveDragState["elevationMoveFrame"]; sceneEntities: readonly SceneEntity[] }): SceneEntityMoveDragState {
  const dragStartWorldPositionsBySceneEntityKey = Object.fromEntries(args.refs.map((ref) => [createSceneEntitySelectionKey(ref), getSceneEntityByRef(args.sceneEntities, ref)?.worldPositionInches ?? args.pointerWorldInches]));
  return { kind: "scene-entity-move", sceneEntities: args.refs, dragStartPointerWorldInches: args.pointerWorldInches, dragStartWorldPositionsBySceneEntityKey, latestWorldPositionsBySceneEntityKey: dragStartWorldPositionsBySceneEntityKey, sceneViewMode: args.sceneViewMode, elevationMoveFrame: args.elevationMoveFrame };
}

function restorePositions(designScene: DesignSceneStore["designScene"], positionsByKey: Readonly<Record<string, Point3DInches>>): DesignSceneStore["designScene"] {
  return { ...designScene, sceneEntities: designScene.sceneEntities.map((sceneEntity) => positionsByKey[createSceneEntitySelectionKey({ entityKind: sceneEntity.entityKind, entityId: sceneEntity.id })] ? createSceneEntityWithWorldPosition(sceneEntity, positionsByKey[createSceneEntitySelectionKey({ entityKind: sceneEntity.entityKind, entityId: sceneEntity.id })]) : sceneEntity) };
}
