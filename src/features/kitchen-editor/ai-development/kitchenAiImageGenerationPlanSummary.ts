import type { KitchenAiImageGenerationPlanRepairResult } from "./buildKitchenAiRequiredImageGenerationPlan";

export function summarizeKitchenAiImageGenerationPlanRepair(
  repairResult: KitchenAiImageGenerationPlanRepairResult,
): string {
  const missingCount = Math.max(0, repairResult.requiredCount - repairResult.originalCount);

  return [
    "Image plan repaired:",
    `${repairResult.originalCount} views returned by postDesigned.json`,
    `${repairResult.requiredCount} required views detected`,
    `${repairResult.addedCount || missingCount} missing or repaired views added`,
    `Final image prompts: ${repairResult.finalImageGenerationPlan.length}`,
  ].join("\n");
}
