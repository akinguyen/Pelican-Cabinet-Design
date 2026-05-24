import type { AiRoomInput } from '../../../../lib/ai/types';
import type { GeneratedKitchenLayout } from '../../../../lib/ai/types';

export interface GeneratedSmartKitchenImage {
  readonly id: string;
  readonly imageUrl: string;
  readonly mimeType: string;
  readonly conceptIndex?: number;
  readonly conceptLabel?: string;
  readonly imageIndex?: number;
  readonly imageLabel?: string;
}

export interface GenerateSmartKitchenImagesInput {
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly room: AiRoomInput;
  readonly userInstructions: string;
  readonly usePlaceholderImages?: boolean;
}

export type SmartKitchenImageGenerationMode = 'openai' | 'placeholder';

export interface GenerateSmartKitchenImagesResponse {
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly prompt?: string;
  readonly systemPrompt?: string;
  readonly generatedLayout?: GeneratedKitchenLayout;
  readonly generatedRoom?: AiRoomInput;
  readonly generatedRoomFileName?: string;
  readonly generationMode?: SmartKitchenImageGenerationMode;
  readonly placeholderReason?: string;
  readonly images: readonly GeneratedSmartKitchenImage[];
}

const SMART_KITCHEN_CONCEPT_COUNT = 5;
const SMART_KITCHEN_IMAGES_PER_CONCEPT = 3;

function escapeSvgText(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return character;
    }
  });
}

function createPlaceholderImageDataUrl(params: {
  readonly conceptLabel: string;
  readonly imageLabel: string;
  readonly projectId: string;
  readonly attachedFileName: string;
}): string {
  const headline = escapeSvgText(params.conceptLabel);
  const subheadline = escapeSvgText(params.imageLabel);
  const projectLabel = escapeSvgText(params.projectId);
  const fileLabel = escapeSvgText(params.attachedFileName);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768" role="img" aria-label="${headline} ${subheadline}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1b31" />
          <stop offset="55%" stop-color="#12344f" />
          <stop offset="100%" stop-color="#1f5f8d" />
        </linearGradient>
        <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96" />
          <stop offset="100%" stop-color="#e8fbf8" stop-opacity="0.92" />
        </linearGradient>
      </defs>
      <rect width="1024" height="768" fill="url(#bg)" />
      <circle cx="160" cy="150" r="95" fill="#16b8b0" fill-opacity="0.16" />
      <circle cx="860" cy="610" r="140" fill="#7ff0e6" fill-opacity="0.12" />
      <rect x="84" y="92" width="856" height="584" rx="42" fill="url(#panel)" fill-opacity="0.12" stroke="#d7f2ef" stroke-opacity="0.2" />
      <rect x="140" y="146" width="744" height="90" rx="24" fill="#ffffff" fill-opacity="0.92" />
      <rect x="140" y="264" width="744" height="300" rx="30" fill="#ffffff" fill-opacity="0.88" />
      <rect x="176" y="300" width="200" height="228" rx="22" fill="#dff5f2" fill-opacity="0.95" />
      <rect x="404" y="300" width="168" height="228" rx="22" fill="#c7eaf1" fill-opacity="0.95" />
      <rect x="600" y="300" width="248" height="228" rx="22" fill="#e7faf7" fill-opacity="0.95" />
      <rect x="176" y="566" width="672" height="34" rx="17" fill="#ffffff" fill-opacity="0.82" />
      <text x="192" y="188" fill="#0b1b31" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${headline}</text>
      <text x="192" y="224" fill="#0e796e" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">${subheadline}</text>
      <text x="192" y="612" fill="#12344f" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600">Project: ${projectLabel}</text>
      <text x="192" y="642" fill="#4b6477" font-family="Arial, Helvetica, sans-serif" font-size="16">Attached file: ${fileLabel}</text>
      <text x="192" y="688" fill="#f8fcfb" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700">Demo placeholder generated for layout review</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildPlaceholderImages(input: GenerateSmartKitchenImagesInput): readonly GeneratedSmartKitchenImage[] {
  const images: GeneratedSmartKitchenImage[] = [];

  for (let conceptIndex = 0; conceptIndex < SMART_KITCHEN_CONCEPT_COUNT; conceptIndex += 1) {
    const conceptLabel = `Concept ${conceptIndex + 1}`;

    for (let imageIndex = 0; imageIndex < SMART_KITCHEN_IMAGES_PER_CONCEPT; imageIndex += 1) {
      const imageLabel = `Image ${imageIndex + 1}`;
      images.push({
        id: `placeholder-${conceptIndex + 1}-${imageIndex + 1}`,
        imageUrl: createPlaceholderImageDataUrl({
          conceptLabel,
          imageLabel,
          projectId: input.projectId,
          attachedFileName: input.attachedFileName,
        }),
        mimeType: 'image/svg+xml',
        conceptIndex,
        conceptLabel,
        imageIndex,
        imageLabel,
      });
    }
  }

  return images;
}

function buildPlaceholderResponse(
  input: GenerateSmartKitchenImagesInput,
  placeholderReason?: string,
): GenerateSmartKitchenImagesResponse {
  return {
    projectId: input.projectId,
    attachedFileName: input.attachedFileName,
    generationMode: 'placeholder',
    placeholderReason: placeholderReason ?? 'Placeholder mode enabled.',
    images: buildPlaceholderImages(input),
  };
}

function isQuotaFailureMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes('insufficient_quota') ||
    normalizedMessage.includes('exceeded your current quota') ||
    normalizedMessage.includes('please check your plan and billing details')
  );
}

export async function generateSmartKitchenImages(
  input: GenerateSmartKitchenImagesInput,
): Promise<GenerateSmartKitchenImagesResponse> {
  if (input.usePlaceholderImages) {
    return buildPlaceholderResponse(input);
  }

  const response = await fetch('/api/generate-smart-kitchen-images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { readonly error?: string } | null;
    const errorMessage = errorPayload?.error ?? 'Image generation failed.';

    if (isQuotaFailureMessage(errorMessage)) {
      return buildPlaceholderResponse(input, errorMessage);
    }

    throw new Error(errorMessage);
  }

  const payload = (await response.json()) as Partial<GenerateSmartKitchenImagesResponse>;

  return {
    projectId: typeof payload.projectId === 'string' ? payload.projectId : input.projectId,
    attachedFileName:
      typeof payload.attachedFileName === 'string' ? payload.attachedFileName : input.attachedFileName,
    prompt: typeof payload.prompt === 'string' ? payload.prompt : undefined,
    systemPrompt: typeof payload.systemPrompt === 'string' ? payload.systemPrompt : undefined,
    generatedLayout:
      payload.generatedLayout && typeof payload.generatedLayout === 'object'
        ? (payload.generatedLayout as GeneratedKitchenLayout)
        : undefined,
    generatedRoom:
      payload.generatedRoom && typeof payload.generatedRoom === 'object'
        ? (payload.generatedRoom as AiRoomInput)
        : undefined,
    generatedRoomFileName:
      typeof payload.generatedRoomFileName === 'string' ? payload.generatedRoomFileName : undefined,
    generationMode:
      payload.generationMode === 'placeholder' || payload.generationMode === 'openai'
        ? payload.generationMode
        : 'openai',
    placeholderReason:
      typeof payload.placeholderReason === 'string' ? payload.placeholderReason : undefined,
    images: Array.isArray(payload.images) ? payload.images : [],
  };
}
