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
}

export interface GenerateSmartKitchenImagesResponse {
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly prompt?: string;
  readonly systemPrompt?: string;
  readonly generatedLayout?: GeneratedKitchenLayout;
  readonly generatedRoom?: AiRoomInput;
  readonly generatedRoomFileName?: string;
  readonly images: readonly GeneratedSmartKitchenImage[];
}

export async function generateSmartKitchenImages(
  input: GenerateSmartKitchenImagesInput,
): Promise<GenerateSmartKitchenImagesResponse> {
  const response = await fetch('/api/generate-smart-kitchen-images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { readonly error?: string } | null;
    throw new Error(errorPayload?.error ?? 'Image generation failed.');
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
    images: Array.isArray(payload.images) ? payload.images : [],
  };
}
