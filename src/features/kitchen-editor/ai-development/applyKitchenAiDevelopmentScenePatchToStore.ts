import { createId } from "@/core/ids/createId";
import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import type { DesignSceneStore } from "@/engine/scene/designSceneStoreTypes";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { importKitchenAiDevelopmentScenePatch } from "./kitchenAiDevelopmentScenePatchImporter";
import { validateKitchenAiPostDesignedForPreDesigned } from "./kitchenAiPostDesignedValidator";
import type { KitchenAiPostDesignedValidationResult } from "./kitchenAiPostDesignedValidator";
import type { KitchenAiPostDesigned } from "./kitchenAiPostDesignedTypes";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

export type KitchenAiDevelopmentScenePatchApplyResult = Readonly<{
  applied: boolean;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  summary: string;
  errors: readonly string[];
  warnings: readonly string[];
  validationResult: KitchenAiPostDesignedValidationResult;
}>;

export function applyKitchenAiDevelopmentScenePatchToStore(args: {
  preDesigned: KitchenAiPreDesigned;
  postDesigned: KitchenAiPostDesigned;
  assemblyDefinitions: readonly AssemblyDefinition[];
}): KitchenAiDevelopmentScenePatchApplyResult {
  const state = useDesignSceneStore.getState();
  const existingSceneEntityIds = new Set<string>(state.designScene.sceneEntities.map((sceneEntity: SceneEntity) => sceneEntity.id));
  const validationResult = validateKitchenAiPostDesignedForPreDesigned({
    preDesigned: args.preDesigned,
    postDesigned: args.postDesigned,
    existingSceneEntityIds,
  });

  if (validationResult.postDesigned === null) {
    return {
      applied: false,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      summary: "postDesigned.json failed validation. No editor scene changes applied.",
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      validationResult,
    };
  }

  const addedCount = args.postDesigned.scenePatch.addSceneEntities.length;
  const updatedCount = args.postDesigned.scenePatch.updateSceneEntities.length;
  const deletedCount = args.postDesigned.scenePatch.deleteSceneEntityIds.length;

  if (addedCount === 0 && updatedCount === 0 && deletedCount === 0) {
    return {
      applied: false,
      addedCount,
      updatedCount,
      deletedCount,
      summary: "Scene patch is valid, but no editor scene changes were included yet.",
      errors: [],
      warnings: validationResult.warnings,
      validationResult,
    };
  }

  let nextDesignScene: DesignScene;

  try {
    nextDesignScene = importKitchenAiDevelopmentScenePatch({
      designScene: state.designScene,
      preDesigned: args.preDesigned,
      postDesigned: args.postDesigned,
      assemblyDefinitions: args.assemblyDefinitions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import Development scene patch.";

    return {
      applied: false,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      summary: "Scene patch import failed. No editor scene changes applied.",
      errors: [message],
      warnings: validationResult.warnings,
      validationResult,
    };
  }

  useDesignSceneStore.setState((currentState: DesignSceneStore) => ({
    designScene: nextDesignScene,
    activeToolbarTool: null,
    activeDrag: null,
    activeSceneEntityAlignmentGuides: [],
    sceneHistory: {
      past: [
        ...currentState.sceneHistory.past,
        {
          id: createId(),
          label: "AI Development design",
          createdAtMs: Date.now(),
          designScene: currentState.designScene,
        },
      ].slice(-100),
      future: [],
    },
  }));

  return {
    applied: true,
    addedCount,
    updatedCount,
    deletedCount,
    summary: `Scene patch applied: ${addedCount} added, ${updatedCount} updated, ${deletedCount} deleted.`,
    errors: [],
    warnings: validationResult.warnings,
    validationResult,
  };
}
