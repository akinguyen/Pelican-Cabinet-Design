import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPlanPointerAngleDegrees } from "@/core/geometry/planPointGeometry";
import { getShortestSceneEntityRotationDeltaDegrees, snapSceneEntityRotationDegrees } from "@/engine/scene-entities/sceneEntityRotationSnapping";
import { getSceneEntityByRef, replaceSceneEntity } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { createSceneEntityWithRotationZ } from "@/engine/scene-entities/sceneEntityTransforms";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type { DesignScene } from "../designSceneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createSceneEntityRotationActions(get: DesignSceneStoreGetter, set: DesignSceneStoreSetter): Pick<DesignSceneStore, "startSceneEntityRotationDrag" | "updateSceneEntityRotationDrag" | "finishSceneEntityRotationDrag" | "cancelSceneEntityRotationDrag"> {
  return {
    startSceneEntityRotationDrag({ sceneEntity, centerPointInches, pointerWorldInches, startHandleCenterAngleDegrees }) {
      if (get().activeSceneViewMode !== "floor-plan") return;

      const entity = getSceneEntityByRef(get().designScene.sceneEntities, sceneEntity);
      if (entity === null) return;

      set({
        activeDrag: {
          kind: "scene-entity-rotation",
          sceneEntity,
          centerPointInches,
          startPointerAngleDegrees: getPlanPointerAngleDegrees(centerPointInches, pointerWorldInches),
          startRotationDegrees: entity.rotationDegrees.zDegrees,
          startWorldPositionInches: entity.worldPositionInches,
          latestValidRotationDegrees: entity.rotationDegrees.zDegrees,
          startHandleCenterAngleDegrees,
          latestHandleCenterAngleDegrees: startHandleCenterAngleDegrees,
        },
        activeSceneEntityAlignmentGuides: [],
      });
    },

    updateSceneEntityRotationDrag(pointerWorldInches) {
      const activeDrag = get().activeDrag;
      if (activeDrag?.kind !== "scene-entity-rotation") return;

      const entity = getSceneEntityByRef(get().designScene.sceneEntities, activeDrag.sceneEntity);
      if (entity === null) return;

      const pointerAngleDegrees = getPlanPointerAngleDegrees(activeDrag.centerPointInches, pointerWorldInches);
      const rotationDeltaDegrees = activeDrag.startPointerAngleDegrees - pointerAngleDegrees;
      const snapResult = snapSceneEntityRotationDegrees(activeDrag.startRotationDegrees + rotationDeltaDegrees);
      const snappedRotationDeltaDegrees = getShortestSceneEntityRotationDeltaDegrees(activeDrag.startRotationDegrees, snapResult.rotationDegrees);
      const rotatedEntity = createSceneEntityWithRotationZ(entity, snapResult.rotationDegrees);

      set((state) => ({
        designScene: {
          ...state.designScene,
          sceneEntities: replaceSceneEntity(state.designScene.sceneEntities, rotatedEntity),
        },
        activeDrag: {
          ...activeDrag,
          latestValidRotationDegrees: snapResult.rotationDegrees,
          latestHandleCenterAngleDegrees: activeDrag.startHandleCenterAngleDegrees - snappedRotationDeltaDegrees,
        },
        activeSceneEntityAlignmentGuides: [],
      }));
    },

    finishSceneEntityRotationDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "scene-entity-rotation") {
        set({ activeDrag: null, activeSceneEntityAlignmentGuides: [] });
        return;
      }

      const entity = getSceneEntityByRef(get().designScene.sceneEntities, activeDrag.sceneEntity);
      if (entity !== null) {
        recordDesignSceneHistoryEntry({
          get,
          set,
          label: getSceneEntityRotationHistoryLabel(entity),
          designScene: createDesignSceneWithSceneEntityRotation({
            designScene: get().designScene,
            sceneEntity: entity,
            rotationDegrees: activeDrag.startRotationDegrees,
            worldPositionInches: activeDrag.startWorldPositionInches,
          }),
        });
      }

      set({ activeDrag: null, activeSceneEntityAlignmentGuides: [] });
    },

    cancelSceneEntityRotationDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "scene-entity-rotation") {
        set({ activeDrag: null, activeSceneEntityAlignmentGuides: [] });
        return;
      }

      const entity = getSceneEntityByRef(get().designScene.sceneEntities, activeDrag.sceneEntity);
      set((state) => ({
        designScene: entity === null
          ? state.designScene
          : createDesignSceneWithSceneEntityRotation({
              designScene: state.designScene,
              sceneEntity: entity,
              rotationDegrees: activeDrag.startRotationDegrees,
              worldPositionInches: activeDrag.startWorldPositionInches,
            }),
        activeDrag: null,
        activeSceneEntityAlignmentGuides: [],
      }));
    },
  };
}

function createDesignSceneWithSceneEntityRotation(args: {
  designScene: DesignScene;
  sceneEntity: SceneEntity;
  rotationDegrees: number;
  worldPositionInches: Point3DInches;
}): DesignScene {
  const restoredEntity: SceneEntity = {
    ...createSceneEntityWithRotationZ(args.sceneEntity, args.rotationDegrees),
    worldPositionInches: args.worldPositionInches,
  };

  return {
    ...args.designScene,
    sceneEntities: replaceSceneEntity(args.designScene.sceneEntities, restoredEntity),
  };
}

function getSceneEntityRotationHistoryLabel(sceneEntity: SceneEntity): string {
  return sceneEntity.entityKind === "design-reservation-zone"
    ? "Rotate reservation zone"
    : "Rotate assembly";
}
