import { buildKitchenAiDevelopmentPrompt } from "./kitchenAiDevelopmentPrompt";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

export type KitchenAiDevelopmentPromptPackage = Readonly<{
  promptVersion: "kitchen-ai-development-prompt/v1";
  sourceRequestId: string;
  systemPrompt: string;
  inputJson: KitchenAiPreDesigned;
  inputJsonText: string;
  combinedPromptText: string;
}>;

export function buildKitchenAiDevelopmentPromptPackage(
  preDesigned: KitchenAiPreDesigned,
): KitchenAiDevelopmentPromptPackage {
  const systemPrompt = buildKitchenAiDevelopmentPrompt();
  const inputJsonText = JSON.stringify(preDesigned, null, 2);

  return {
    promptVersion: "kitchen-ai-development-prompt/v1",
    sourceRequestId: preDesigned.requestId,
    systemPrompt,
    inputJson: preDesigned,
    inputJsonText,
    combinedPromptText: `${systemPrompt}\n\npreDesigned.json:\n${inputJsonText}`,
  };
}
