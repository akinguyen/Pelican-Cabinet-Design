import type {
  KitchenAiDevelopmentImagePromptItem,
  KitchenAiDevelopmentImagePromptPackage,
} from "./kitchenAiDevelopmentImagePromptPackage";
import type { KitchenAiDevelopmentPromptPackage } from "./kitchenAiDevelopmentPromptPackage";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

export async function copyKitchenAiDevelopmentPromptPackage(
  promptPackage: KitchenAiDevelopmentPromptPackage,
): Promise<void> {
  await copyTextToClipboard(promptPackage.combinedPromptText);
}

export async function copyKitchenAiDevelopmentImagePromptPackage(
  imagePromptPackage: KitchenAiDevelopmentImagePromptPackage,
): Promise<void> {
  await copyTextToClipboard(imagePromptPackage.combinedPromptText);
}

export async function copyKitchenAiDevelopmentImagePromptItem(
  imagePromptItem: KitchenAiDevelopmentImagePromptItem,
): Promise<void> {
  await copyTextToClipboard(imagePromptItem.promptText);
}

export function downloadKitchenAiPreDesignedJson(preDesigned: KitchenAiPreDesigned): void {
  downloadTextFile({
    filename: `preDesigned-${sanitizeFilePart(preDesigned.requestId)}.json`,
    text: JSON.stringify(preDesigned, null, 2),
    mimeType: "application/json",
  });
}

export function downloadKitchenAiDevelopmentPrompt(promptPackage: KitchenAiDevelopmentPromptPackage): void {
  downloadTextFile({
    filename: `kitchenAiDevelopmentPrompt-${sanitizeFilePart(promptPackage.sourceRequestId)}.txt`,
    text: promptPackage.systemPrompt,
    mimeType: "text/plain",
  });
}

export function downloadKitchenAiDevelopmentPromptPackage(promptPackage: KitchenAiDevelopmentPromptPackage): void {
  downloadTextFile({
    filename: `kitchenAiDevelopmentPromptPackage-${sanitizeFilePart(promptPackage.sourceRequestId)}.txt`,
    text: promptPackage.combinedPromptText,
    mimeType: "text/plain",
  });
}

export function downloadKitchenAiDevelopmentImagePromptPackage(
  imagePromptPackage: KitchenAiDevelopmentImagePromptPackage,
): void {
  downloadTextFile({
    filename: `kitchenAiImageGenerationPrompts-${sanitizeFilePart(imagePromptPackage.sourceRequestId)}.txt`,
    text: imagePromptPackage.combinedPromptText,
    mimeType: "text/plain",
  });
}

export function downloadKitchenAiDevelopmentImagePromptItem(
  imagePromptItem: KitchenAiDevelopmentImagePromptItem,
): void {
  downloadTextFile({
    filename: `${sanitizeFilePart(imagePromptItem.fileName.replace(/\.png$/i, ""))}.txt`,
    text: imagePromptItem.promptText,
    mimeType: "text/plain",
  });
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
    throw new Error("Clipboard is not available in this browser.");
  }

  await navigator.clipboard.writeText(text);
}

function downloadTextFile(args: { filename: string; text: string; mimeType: string }): void {
  const blob = new Blob([args.text], { type: `${args.mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = args.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "request";
}
