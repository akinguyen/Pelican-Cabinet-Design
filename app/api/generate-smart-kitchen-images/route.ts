import { NextResponse } from 'next/server';

import type { AiRoomInput, GeneratedKitchenLayout } from '../../../lib/ai/types';
import {
  buildSmartKitchenImagePrompt,
  SMART_KITCHEN_IMAGE_SYSTEM_PROMPT,
} from '../../../src/features/generate-smart-kitchen/utils/smartKitchenImagePrompt';

export const runtime = 'nodejs';

type GenerateSmartKitchenImagesRequestBody = {
  readonly projectId?: string;
  readonly attachedFileName?: string;
  readonly room?: AiRoomInput;
  readonly userInstructions?: string;
};

type OpenAiImagesGenerationResponseItem = {
  readonly b64_json?: string;
  readonly revised_prompt?: string;
  readonly url?: string;
  readonly mime_type?: string;
};

type OpenAiImagesGenerationResponse = {
  readonly data?: readonly OpenAiImagesGenerationResponseItem[];
  readonly error?: {
    readonly message?: string;
  };
};

type SmartKitchenLayoutResponse = {
  readonly layout?: GeneratedKitchenLayout;
  readonly error?: string;
};

interface GeneratedSmartKitchenImageResponseItem {
  readonly id: string;
  readonly imageUrl: string;
  readonly mimeType: string;
  readonly conceptIndex: number;
  readonly conceptLabel: string;
  readonly imageIndex: number;
  readonly imageLabel: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown image generation error.';
}

function toDataUrl(base64Image: string, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${base64Image}`;
}

function normalizeImageItem(
  item: OpenAiImagesGenerationResponseItem,
  index: number,
  conceptIndex: number,
  conceptLabel: string,
  imageIndex: number,
  imageLabel: string,
): GeneratedSmartKitchenImageResponseItem & { readonly revisedPrompt?: string } {
  const mimeType = item.mime_type ?? 'image/png';
  const imageUrl = item.b64_json ? toDataUrl(item.b64_json, mimeType) : item.url ?? '';

  return {
    id: `smart-kitchen-image-${index + 1}`,
    imageUrl,
    mimeType,
    conceptIndex,
    conceptLabel,
    imageIndex,
    imageLabel,
    revisedPrompt: item.revised_prompt,
  };
}

async function generateImagesForConcept(
  apiKey: string,
  prompt: string,
  conceptIndex: number,
  conceptLabel: string,
  imageIndex: number,
  imageLabel: string,
): Promise<readonly GeneratedSmartKitchenImageResponseItem[]> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SMART_KITCHEN_IMAGE_MODEL ?? 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const errorPayload = (() => {
      try {
        return JSON.parse(errorText) as OpenAiImagesGenerationResponse;
      } catch {
        return null;
      }
    })();
    const errorMessage = errorPayload?.error?.message ?? (errorText || 'OpenAI image generation failed.');

    throw new Error(`Concept ${conceptIndex + 1} failed: ${errorMessage}`);
  }

  const payload = (await response.json()) as OpenAiImagesGenerationResponse;
  const data = payload.data ?? [];

  return data
    .map((item, index) => normalizeImageItem(item, index, conceptIndex, conceptLabel, imageIndex, imageLabel))
    .filter((image) => image.imageUrl.length > 0);
}

async function generateSmartKitchenLayoutFromRoom(
  requestUrl: string,
  room: AiRoomInput,
  userInstructions: string,
): Promise<GeneratedKitchenLayout> {
  const response = await fetch(new URL('/api/smart-kitchen', requestUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      room,
      designerFeedback: userInstructions,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const errorPayload = (() => {
      try {
        return JSON.parse(errorText) as SmartKitchenLayoutResponse;
      } catch {
        return null;
      }
    })();
    const errorMessage = errorPayload?.error ?? (errorText || 'Smart kitchen layout generation failed.');

    throw new Error(errorMessage);
  }

  const payload = (await response.json()) as SmartKitchenLayoutResponse;

  if (!payload.layout) {
    throw new Error('Smart kitchen layout generation failed.');
  }

  return payload.layout;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY. Add it to your environment before generating images.' },
      { status: 500 },
    );
  }

  let body: GenerateSmartKitchenImagesRequestBody;

  try {
    body = (await request.json()) as GenerateSmartKitchenImagesRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const projectId = typeof body.projectId === 'string' && body.projectId.trim().length > 0
    ? body.projectId.trim()
    : 'editor-draft';
  const attachedFileName = typeof body.attachedFileName === 'string' && body.attachedFileName.trim().length > 0
    ? body.attachedFileName.trim()
    : 'pelican-smart-kitchen-editor-room-export.json';
  const room = body.room;
  const userInstructions = typeof body.userInstructions === 'string' ? body.userInstructions.trim() : '';

  if (!room) {
    return NextResponse.json({ error: 'Missing room export data.' }, { status: 400 });
  }

  if (!room.walls?.length) {
    return NextResponse.json(
      { error: 'The attached room data does not contain any walls to generate from.' },
      { status: 400 },
    );
  }

  const generatedLayout = await generateSmartKitchenLayoutFromRoom(request.url, room, userInstructions);
  const generatedRoom = generatedLayout.room;
  const prompt = buildSmartKitchenImagePrompt({
    projectId,
    attachedFileName,
    room: generatedRoom,
    userInstructions,
    conceptCount: 5,
    imagesPerConcept: 3,
  });
  const conceptCount = 5;
  const imagesPerConcept = 3;
  const images: GeneratedSmartKitchenImageResponseItem[] = [];

  for (let conceptIndex = 0; conceptIndex < conceptCount; conceptIndex += 1) {
    const conceptLabel = `Concept ${conceptIndex + 1}`;
    for (let imageIndex = 0; imageIndex < imagesPerConcept; imageIndex += 1) {
      const imageLabel = `Image ${imageIndex + 1}`;
      const conceptPrompt = buildSmartKitchenImagePrompt({
        projectId,
        attachedFileName,
        room: generatedRoom,
        userInstructions,
        conceptIndex,
        conceptCount,
        imagesPerConcept,
        imageIndex,
      });

      const conceptImages = await generateImagesForConcept(
        apiKey,
        conceptPrompt,
        conceptIndex,
        conceptLabel,
        imageIndex,
        imageLabel,
      );
      images.push(...conceptImages);
    }
  }

  return NextResponse.json({
    projectId,
    attachedFileName,
    prompt,
    systemPrompt: SMART_KITCHEN_IMAGE_SYSTEM_PROMPT,
    generatedLayout,
    generatedRoom,
    generatedRoomFileName: 'generated-smart-kitchen-room.json',
    images,
  });
}
