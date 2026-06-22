import { alignSceneEntityWithSpatialGuides } from "@/engine/scene-entities/spatial-guides/sceneEntitySpatialGuideEngine";
import { createSceneEntityMovementFrame, type SceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createSceneEntityPlacementActions(get: DesignSceneStoreGetter, set: DesignSceneStoreSetter): Pick<DesignSceneStore, "startSceneEntityPlacementCandidate" | "updateSceneEntityPlacementCandidate" | "commitSceneEntityPlacementCandidate" | "cancelActiveSceneOperation"> {
  return {
    startSceneEntityPlacementCandidate(sceneEntity) {
      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSelection: null,
          activeSceneOperation: {
            kind: "scene-entity-placement",
            candidate: {
              sceneEntity,
              placementState: "waiting-for-pointer",
              movementFrame: null,
            },
          },
        },
        activeToolbarTool: sceneEntity.entityKind === "design-reservation-zone" ? "draw-design-reservation-zone" : null,
        activeSceneEntityAlignmentGuides: [],
      }));
    },
    updateSceneEntityPlacementCandidate(worldPositionInches, sceneViewMode, elevationMoveFrame, movementFrame) {
      const { designScene } = get();
      const operation = designScene.activeSceneOperation;
      if (operation?.kind !== "scene-entity-placement") return;
      const activeMovementFrame = movementFrame ?? createSceneEntityMovementFrame({ sceneViewMode, elevationMoveFrame });
      const proposed = createPlacementCandidateForMovementFrame({
        sceneEntity: operation.candidate.sceneEntity,
        worldPositionInches,
        movementFrame: activeMovementFrame,
      });
      const aligned = alignSceneEntityWithSpatialGuides({
        movingSceneEntity: proposed,
        sceneEntities: designScene.sceneEntities,
        excludedSceneEntityIds: [proposed.id],
        placedWallGraphs: designScene.placedWallGraphs,
        movementFrame: activeMovementFrame,
      });
      set((state) => ({
        activeSceneEntityAlignmentGuides: aligned.alignmentGuides,
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            kind: "scene-entity-placement",
            candidate: {
              sceneEntity: aligned.sceneEntity,
              placementState: "positioned",
              movementFrame: activeMovementFrame,
            },
          },
        },
      }));
    },
    commitSceneEntityPlacementCandidate() {
      const operation = get().designScene.activeSceneOperation;
      if (operation?.kind !== "scene-entity-placement" || operation.candidate.placementState !== "positioned") return;
      const newSceneEntity = operation.candidate.sceneEntity;
      recordDesignSceneHistoryEntry({ get, set, label: newSceneEntity.entityKind === "placed-assembly" ? "Place assembly" : "Place design reservation zone" });
      set((state) => ({
        activeToolbarTool: null,
        activeSceneEntityAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          sceneEntities: [...state.designScene.sceneEntities, newSceneEntity],
          activeSelection: { kind: "scene-entity", sceneEntity: { entityKind: newSceneEntity.entityKind, entityId: newSceneEntity.id } },
          activeSceneOperation: null,
        },
      }));
    },
    cancelActiveSceneOperation() {
      set((state) => ({
        activeToolbarTool: state.designScene.activeSceneOperation?.kind === "scene-entity-placement" && state.activeToolbarTool === "draw-design-reservation-zone" ? null : state.activeToolbarTool,
        activeSceneEntityAlignmentGuides: [],
        designScene: { ...state.designScene, activeSceneOperation: null },
      }));
    },
  };
}

function createPlacementCandidateForMovementFrame<TSceneEntity extends { worldPositionInches: unknown; rotationDegrees: { zDegrees: number } }>(args: { sceneEntity: TSceneEntity; worldPositionInches: TSceneEntity["worldPositionInches"]; movementFrame: SceneEntityMovementFrame }): TSceneEntity {
  if (args.movementFrame.kind !== "wall-face-plane") {
    return { ...args.sceneEntity, worldPositionInches: args.worldPositionInches };
  }

  return {
    ...args.sceneEntity,
    worldPositionInches: args.worldPositionInches,
    rotationDegrees: {
      zDegrees: Math.atan2(args.movementFrame.lockedNormalInches.xInches, args.movementFrame.lockedNormalInches.yInches) * 180 / Math.PI,
    },
  };
}
