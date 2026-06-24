import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { AiKitchenDesignImage } from "./aiKitchenDevelopmentTypes";
import { applyKitchenAiDevelopmentScenePatchToStore } from "./applyKitchenAiDevelopmentScenePatchToStore";
import type { KitchenAiDevelopmentScenePatchApplyResult } from "./applyKitchenAiDevelopmentScenePatchToStore";
import { buildKitchenAiRequiredImageGenerationPlan } from "./buildKitchenAiRequiredImageGenerationPlan";
import { createKitchenAiDevelopmentImageCards } from "./createKitchenAiDevelopmentImageCards";
import type { KitchenAiPostDesigned, KitchenAiPostDesignedImagePlan } from "./kitchenAiPostDesignedTypes";
import { parseKitchenAiPostDesignedJson } from "./kitchenAiPostDesignedValidator";
import type { KitchenAiPostDesignedValidationResult } from "./kitchenAiPostDesignedValidator";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";
import { summarizeKitchenAiImageGenerationPlanRepair } from "./kitchenAiImageGenerationPlanSummary";

export type KitchenAiDevelopmentPostDesignedImportResult = Readonly<{
  postDesigned: KitchenAiPostDesigned | null;
  validationResult: KitchenAiPostDesignedValidationResult;
  scenePatchResult: KitchenAiDevelopmentScenePatchApplyResult | null;
  imagePlanSummary: string | null;
  finalImageGenerationPlan: readonly KitchenAiPostDesignedImagePlan[];
  images: readonly AiKitchenDesignImage[];
}>;

export function importKitchenAiDevelopmentPostDesignedJson(args: {
  jsonText: string;
  preDesigned: KitchenAiPreDesigned;
  assemblyDefinitions: readonly AssemblyDefinition[];
}): KitchenAiDevelopmentPostDesignedImportResult {
  const parseResult = parseKitchenAiPostDesignedJson(args.jsonText);

  if (parseResult.postDesigned === null) {
    return {
      postDesigned: null,
      validationResult: parseResult,
      scenePatchResult: null,
      imagePlanSummary: null,
      finalImageGenerationPlan: [],
      images: [],
    };
  }

  const scenePatchResult = applyKitchenAiDevelopmentScenePatchToStore({
    preDesigned: args.preDesigned,
    postDesigned: parseResult.postDesigned,
    assemblyDefinitions: args.assemblyDefinitions,
  });
  const validationResult = scenePatchResult.validationResult;

  if (validationResult.postDesigned === null) {
    return {
      postDesigned: null,
      validationResult,
      scenePatchResult,
      imagePlanSummary: null,
      finalImageGenerationPlan: [],
      images: [],
    };
  }

  const imagePlanRepairResult = buildKitchenAiRequiredImageGenerationPlan({
    preDesigned: args.preDesigned,
    postDesigned: validationResult.postDesigned,
  });
  const repairedPostDesigned: KitchenAiPostDesigned = {
    ...validationResult.postDesigned,
    imageGenerationPlan: imagePlanRepairResult.finalImageGenerationPlan,
  };

  return {
    postDesigned: repairedPostDesigned,
    validationResult,
    scenePatchResult,
    imagePlanSummary: summarizeKitchenAiImageGenerationPlanRepair(imagePlanRepairResult),
    finalImageGenerationPlan: imagePlanRepairResult.finalImageGenerationPlan,
    images: createKitchenAiDevelopmentImageCards(imagePlanRepairResult.finalImageGenerationPlan, {
      sourceLabel: "Preview generated from repaired imageGenerationPlan",
    }),
  };
}
