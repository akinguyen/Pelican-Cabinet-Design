import type { AiRoomInput } from '../../../../lib/ai/types';

export interface GeneratedSmartKitchenImage {
  readonly id: string;
  readonly imageUrl: string;
  readonly mimeType: string;
  readonly conceptIndex?: number;
  readonly conceptLabel?: string;
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
    images: Array.isArray(payload.images) ? payload.images : [],
  };
}
