import { buildKitchenAiImagePromptObjectManifest } from "./kitchenAiImagePromptObjectManifest";
import type { KitchenAiPostDesigned, KitchenAiPostDesignedImagePlan } from "./kitchenAiPostDesignedTypes";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

export type KitchenAiDevelopmentImagePromptItem = Readonly<{
  id: string;
  label: string;
  fileName: string;
  promptText: string;
}>;

export type KitchenAiDevelopmentImagePromptPackage = Readonly<{
  promptVersion: "kitchen-ai-development-image-prompt/v1";
  sourceRequestId: string;
  imagePlanCount: number;
  perImagePrompts: readonly KitchenAiDevelopmentImagePromptItem[];
  combinedPromptText: string;
  promptText: string;
}>;

export function buildKitchenAiDevelopmentImagePromptPackage(args: {
  preDesigned: KitchenAiPreDesigned;
  postDesigned: KitchenAiPostDesigned;
  imageGenerationPlan?: readonly KitchenAiPostDesignedImagePlan[];
}): KitchenAiDevelopmentImagePromptPackage {
  const imageGenerationPlan = args.imageGenerationPlan ?? args.postDesigned.imageGenerationPlan;
  const perImagePrompts = imageGenerationPlan.map((imagePlan, index) => buildImagePromptItem({
    preDesigned: args.preDesigned,
    postDesigned: args.postDesigned,
    imagePlan,
    imageIndex: index,
    imageCount: imageGenerationPlan.length,
  }));
  const combinedPromptText = buildCombinedMultiImagePrompt({
    sourceRequestId: args.postDesigned.sourceRequestId,
    promptItems: perImagePrompts,
  });

  return {
    promptVersion: "kitchen-ai-development-image-prompt/v1",
    sourceRequestId: args.postDesigned.sourceRequestId,
    imagePlanCount: imageGenerationPlan.length,
    perImagePrompts,
    combinedPromptText,
    promptText: combinedPromptText,
  };
}

function buildCombinedMultiImagePrompt(args: {
  sourceRequestId: string;
  promptItems: readonly KitchenAiDevelopmentImagePromptItem[];
}): string {
  const imageCount = args.promptItems.length;
  const pluralImage = imageCount === 1 ? "image" : "images";

  return [
    "You are a kitchen interior image generation assistant.",
    "",
    `Create exactly ${imageCount} separate kitchen design ${pluralImage} from the view specifications below.`,
    "",
    "Critical output rules:",
    `- Return exactly ${imageCount} separate image outputs, one for each numbered view.`,
    "- Do not combine views into one image.",
    "- Do not create a collage.",
    "- Do not create a split-screen image.",
    "- Do not place multiple camera views in the same canvas.",
    "- Each numbered view must become its own separate image file/output.",
    "- Use the requested output file name for each image when your tool supports file names.",
    "- Keep every generated image consistent as the same kitchen design from different camera positions.",
    "- Follow the strict object counts inside each view prompt, especially windows, doors, appliances, fixtures, and cabinets.",
    "- Do not add extra windows, doors, appliances, fixtures, cabinets, islands, decorations, or wall openings unless that object is explicitly listed in that view prompt.",
    "- Use eye-level, straight-ahead camera views only. Do not create top-down or low-angle images.",
    "",
    `Source request id: ${args.sourceRequestId}`,
    "",
    "Generate the following views as separate images:",
    ...args.promptItems.map((promptItem, index) => [
      "",
      `================ IMAGE ${index + 1} OF ${imageCount}: ${promptItem.label} ================`,
      `Required output file name: ${promptItem.fileName}`,
      "Generate only this numbered view for this image output. The next numbered section is a different separate image output, not a second view inside the same image.",
      "",
      promptItem.promptText,
    ].join("\n")),
    "",
    "Final reminder:",
    `Return exactly ${imageCount} separate image outputs. Do not merge, tile, stack, collage, or split-screen these views into one image.`,
  ].join("\n");
}

function buildImagePromptItem(args: {
  preDesigned: KitchenAiPreDesigned;
  postDesigned: KitchenAiPostDesigned;
  imagePlan: KitchenAiPostDesignedImagePlan;
  imageIndex: number;
  imageCount: number;
}): KitchenAiDevelopmentImagePromptItem {
  const targetReference = args.imagePlan.viewType === "corner"
    ? `cornerId: ${args.imagePlan.cornerId ?? "unknown"}`
    : `wallFaceId: ${args.imagePlan.wallFaceId ?? "unknown"}`;
  const objectManifest = buildKitchenAiImagePromptObjectManifest({
    preDesigned: args.preDesigned,
    postDesigned: args.postDesigned,
    imagePlan: args.imagePlan,
  });
  const relevantPostDesignedText = JSON.stringify(
    {
      schemaVersion: args.postDesigned.schemaVersion,
      sourceRequestId: args.postDesigned.sourceRequestId,
      designSummary: args.postDesigned.designSummary,
      scenePatch: args.postDesigned.scenePatch,
      imagePlan: args.imagePlan,
    },
    null,
    2,
  );
  const relevantPreDesignedText = JSON.stringify(
    {
      requestId: args.preDesigned.requestId,
      units: args.preDesigned.units,
      wallFaces: args.preDesigned.wallFaces,
      wallCorners: args.preDesigned.wallCorners,
      existingSceneEntities: args.preDesigned.existingSceneEntities,
      userReservationZones: args.preDesigned.userReservationZones,
    },
    null,
    2,
  );
  const label = args.imagePlan.label || `Design Image ${args.imageIndex + 1}`;

  return {
    id: args.imagePlan.id,
    label,
    fileName: `${String(args.imageIndex + 1).padStart(2, "0")}-${sanitizeFilePart(label)}.png`,
    promptText: `You are a kitchen interior image generation assistant.

Generate exactly ONE image only for this single view.
Do not create a collage.
Do not create a split-screen image.
Do not include multiple views in one image.
This is image ${args.imageIndex + 1} of ${args.imageCount}, but you must generate only image ${args.imageIndex + 1}.

View target:
- label: ${label}
- viewType: ${args.imagePlan.viewType}
- ${targetReference}
- output file name: ${String(args.imageIndex + 1).padStart(2, "0")}-${sanitizeFilePart(label)}.png

Camera requirements:
- Use an eye-level, straight-ahead camera view.
- Do not create a top-down view.
- Do not create a bottom-looking-up view.
- Do not create an impossible camera angle.
- Wall-face views should look directly toward the specified wall face.
- Corner views should look into the specified corner and show both adjacent wall faces.

Consistency requirements:
- This image must represent the same kitchen design as postDesigned.json.
- Keep cabinets, appliances, fixtures, doors, windows, walls, and finishes consistent with postDesigned.json.
- Do not add objects that are not present in the object manifest.
- Do not add extra windows. If the object manifest says Windows: exactly 0, show no windows in this view. If it says Windows: exactly 2, show exactly two windows.
- Do not add extra doors, appliances, fixtures, or cabinets.
- Keep the room realistic, but use plain wall/floor/ceiling finishes when details are not specified.

${objectManifest}

View-specific camera instruction:
${args.imagePlan.cameraInstruction}

Relevant postDesigned.json data for this one image:
${relevantPostDesignedText}

preDesigned context for walls, corners, and original fixed scene entities:
${relevantPreDesignedText}`,
  };
}

function sanitizeFilePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}
