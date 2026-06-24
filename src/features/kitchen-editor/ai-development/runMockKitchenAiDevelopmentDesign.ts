import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { AiKitchenDesignImage, AiKitchenDesignRequest } from "./aiKitchenDevelopmentTypes";
import { aiKitchenDevelopmentProgressLabels } from "./aiKitchenDevelopmentOptions";
import { applyKitchenAiDevelopmentScenePatchToStore } from "./applyKitchenAiDevelopmentScenePatchToStore";
import type { KitchenAiDevelopmentScenePatchApplyResult } from "./applyKitchenAiDevelopmentScenePatchToStore";
import { buildKitchenAiRequiredImageGenerationPlan } from "./buildKitchenAiRequiredImageGenerationPlan";
import { createKitchenAiDevelopmentImageCards } from "./createKitchenAiDevelopmentImageCards";
import { summarizeKitchenAiImageGenerationPlanRepair } from "./kitchenAiImageGenerationPlanSummary";
import { createMockKitchenAiPostDesigned } from "./createMockKitchenAiPostDesigned";
import type { KitchenAiDevelopmentPromptPackage } from "./kitchenAiDevelopmentPromptPackage";
import type { KitchenAiPostDesigned } from "./kitchenAiPostDesignedTypes";
import type { KitchenAiPostDesignedValidationResult } from "./kitchenAiPostDesignedValidator";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

type RunMockKitchenAiDevelopmentDesignArgs = {
  request: AiKitchenDesignRequest;
  preDesigned: KitchenAiPreDesigned;
  promptPackage: KitchenAiDevelopmentPromptPackage;
  assemblyDefinitions: readonly AssemblyDefinition[];
  onProgressStepChange: (stepIndex: number) => void;
};

export type KitchenAiDevelopmentRunResult = Readonly<{
  postDesigned: KitchenAiPostDesigned;
  validationResult: KitchenAiPostDesignedValidationResult;
  scenePatchResult: KitchenAiDevelopmentScenePatchApplyResult;
  imagePlanSummary: string | null;
  images: readonly AiKitchenDesignImage[];
}>;

const progressStepDelayMs = 320;

export async function runMockKitchenAiDevelopmentDesign({
  request,
  preDesigned,
  promptPackage,
  assemblyDefinitions,
  onProgressStepChange,
}: RunMockKitchenAiDevelopmentDesignArgs): Promise<KitchenAiDevelopmentRunResult> {
  void request;
  void promptPackage;

  for (let stepIndex = 0; stepIndex < aiKitchenDevelopmentProgressLabels.length; stepIndex += 1) {
    onProgressStepChange(stepIndex);
    await delay(progressStepDelayMs);
  }

  const postDesigned = createMockKitchenAiPostDesigned({ preDesigned });
  const scenePatchResult = applyKitchenAiDevelopmentScenePatchToStore({
    preDesigned,
    postDesigned,
    assemblyDefinitions,
  });
  const validationResult = scenePatchResult.validationResult;

  if (validationResult.postDesigned === null) {
    return {
      postDesigned,
      validationResult,
      scenePatchResult,
      imagePlanSummary: null,
      images: [],
    };
  }

  const imagePlanRepairResult = buildKitchenAiRequiredImageGenerationPlan({ preDesigned, postDesigned });
  const repairedPostDesigned: KitchenAiPostDesigned = {
    ...postDesigned,
    imageGenerationPlan: imagePlanRepairResult.finalImageGenerationPlan,
  };

  return {
    postDesigned: repairedPostDesigned,
    validationResult,
    scenePatchResult,
    imagePlanSummary: summarizeKitchenAiImageGenerationPlanRepair(imagePlanRepairResult),
    images: createKitchenAiDevelopmentImageCards(imagePlanRepairResult.finalImageGenerationPlan, {
      sourceLabel: "Mock preview generated from repaired imageGenerationPlan",
    }),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
