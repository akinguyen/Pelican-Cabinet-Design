import type { KitchenAiDevelopmentScenePatchApplyResult } from "./applyKitchenAiDevelopmentScenePatchToStore";

export function summarizeKitchenAiDevelopmentScenePatchResult(result: KitchenAiDevelopmentScenePatchApplyResult): string {
  const lines = [
    result.applied ? "Scene patch applied:" : "Scene patch validation:",
    `${result.addedCount} objects to add`,
    `${result.updatedCount} objects to update`,
    `${result.deletedCount} objects to delete`,
    result.summary,
  ];

  if (result.warnings.length > 0) {
    lines.push(`Warnings: ${result.warnings.length}`);
  }

  if (result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.length}`);
    lines.push(...result.errors.slice(0, 3));
  }

  return lines.join("\n");
}

export function summarizeKitchenAiPostDesignedValidationResult(args: {
  errors: readonly string[];
  warnings: readonly string[];
}): string {
  if (args.errors.length === 0 && args.warnings.length === 0) {
    return "postDesigned.json passed validation.";
  }

  return [
    args.errors.length === 0 ? "postDesigned.json passed validation with warnings." : "postDesigned.json failed validation.",
    `${args.errors.length} errors`,
    `${args.warnings.length} warnings`,
    ...args.errors.slice(0, 3),
    ...args.warnings.slice(0, 3),
  ].join("\n");
}
