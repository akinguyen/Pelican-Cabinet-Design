import type { KitchenAiPostDesigned } from "./kitchenAiPostDesignedTypes";

export function summarizeKitchenAiPostDesigned(postDesigned: KitchenAiPostDesigned): string {
  return [
    "postDesigned.json ready:",
    `status: ${postDesigned.status}`,
    `${postDesigned.scenePatch.addSceneEntities.length} scene entities to add`,
    `${postDesigned.scenePatch.updateSceneEntities.length} scene entities to update`,
    `${postDesigned.scenePatch.deleteSceneEntityIds.length} scene entities to delete`,
    `${postDesigned.imageGenerationPlan.length} image views planned`,
  ].join("\n");
}
