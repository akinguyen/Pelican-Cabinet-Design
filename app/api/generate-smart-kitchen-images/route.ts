import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

import type {
  AiRoomInput,
  GeneratedKitchenLayout,
  SmartKitchenPlacement,
  SmartKitchenPlan,
} from '../../../lib/ai/types';
import {
  buildSmartKitchenImagePrompt,
  createSmartKitchenImageRoomSummary,
  SMART_KITCHEN_IMAGE_SYSTEM_PROMPT,
  SMART_KITCHEN_IMAGE_PROMPT_VERSION,
  type SmartKitchenImageLayoutSummary,
  type SmartKitchenImageLayoutPlacementSummary,
  type SmartKitchenImageWallSummary,
} from '../../../src/features/generate-smart-kitchen/utils/smartKitchenImagePrompt';

export const runtime = 'nodejs';

type GenerateSmartKitchenImagesRequestBody = {
  readonly projectId?: string;
  readonly attachedFileName?: string;
  readonly room?: AiRoomInput;
  readonly userInstructions?: string;
  readonly usePlaceholderImages?: boolean;
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
  readonly plan?: SmartKitchenPlan;
  readonly error?: string;
};

interface GeneratedSmartKitchenImageResponseItem {
  readonly id: string;
  readonly generationId: string;
  readonly imageUrl: string;
  readonly mimeType: string;
  readonly conceptIndex: number;
  readonly conceptLabel: string;
  readonly imageIndex: number;
  readonly imageLabel: string;
}

interface ImageGenerationDebugRecord {
  readonly createdAtIso: string;
  readonly promptVersion: string;
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly conceptIndex: number;
  readonly imageIndex: number;
  readonly conceptCount: number;
  readonly imagesPerConcept: number;
  readonly model: string;
  readonly size: string;
  readonly promptHash: string;
  readonly promptLength: number;
  readonly promptContainsPhotorealisticKitchen: boolean;
  readonly promptContainsNoPostersRule: boolean;
  readonly promptContainsRoomSummary: boolean;
  readonly promptContainsPromptVersion: boolean;
  readonly promptContainsGeneratedLayoutSummary: boolean;
  readonly promptPreviewStart: string;
  readonly promptPreviewEnd: string;
  readonly fullPrompt?: string;
  readonly promptGeneratedLayoutPlacementCount: number;
  readonly promptGeneratedLayoutCabinetCount: number;
  readonly promptGeneratedLayoutProductCount: number;
  readonly promptGeneratedLayoutAccessoryCount: number;
  readonly providerRequestSent: boolean;
  readonly providerStatus?: number;
  readonly providerReturnedDataCount?: number;
  readonly providerReturnedUrl?: boolean;
  readonly providerReturnedBase64?: boolean;
  readonly providerRevisedPrompt?: string;
  readonly providerErrorMessage?: string;
  readonly usedPlaceholder: boolean;
  readonly placeholderReason?: string;
}

interface ImageGenerationDebugRun {
  readonly createdAtIso: string;
  readonly promptVersion: string;
  readonly records: ImageGenerationDebugRecord[];
  readonly errorMessage?: string;
}

function createSmartKitchenRequestId(request: Request): string {
  const incomingRequestId = request.headers.get('x-smart-kitchen-request-id')?.trim();

  if (incomingRequestId) {
    return incomingRequestId;
  }

  return `sk-images-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function logSmartKitchenImageEvent(
  requestId: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  if (details) {
    console.info(`[smart-kitchen-images:${requestId}] ${message}`, details);
    return;
  }

  console.info(`[smart-kitchen-images:${requestId}] ${message}`);
}

function isImageGenerationDebugEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.SMART_KITCHEN_IMAGE_DEBUG === '1';
}

function parsePositiveIntegerEnv(name: string): number | null {
  const rawValue = process.env[name];
  if (!rawValue) {
    return null;
  }
  const value = Number.parseInt(rawValue, 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function isImageGenerationDebugFullPromptEnabled(): boolean {
  return process.env.SMART_KITCHEN_IMAGE_DEBUG_FULL_PROMPT === '1';
}

function createPromptHash(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

function createPromptPreview(prompt: string): { readonly start: string; readonly end: string } {
  return {
    start: prompt.slice(0, 800),
    end: prompt.slice(Math.max(prompt.length - 800, 0)),
  };
}

function toRoundedSummaryInches(value: number): number {
  return Math.round(value * 10) / 10;
}

function getGeneratedLayoutPlacementCounts(
  generatedLayout: GeneratedKitchenLayout,
): SmartKitchenImageLayoutSummary['placementCounts'] {
  const placements = generatedLayout.cabinets;

  return {
    total: placements.length,
    cabinets: placements.filter((placement) => placement.kind === 'cabinet').length,
    products: placements.filter((placement) => placement.kind === 'product').length,
    accessories: placements.filter((placement) => placement.kind === 'accessory').length,
  };
}

function getGeneratedLayoutPlacementSummary(
  placement: SmartKitchenPlacement,
): SmartKitchenImageLayoutPlacementSummary {
  return {
    catalogId: placement.catalogId,
    wallFace: placement.wallFace ?? null,
    leftInches: toRoundedSummaryInches(placement.leftInches),
    bottomInches:
      typeof placement.bottomInches === 'number'
        ? toRoundedSummaryInches(placement.bottomInches)
        : null,
    widthInches:
      typeof placement.widthInches === 'number'
        ? toRoundedSummaryInches(placement.widthInches)
        : null,
    depthInches:
      typeof placement.depthInches === 'number'
        ? toRoundedSummaryInches(placement.depthInches)
        : null,
    heightInches:
      typeof placement.heightInches === 'number'
        ? toRoundedSummaryInches(placement.heightInches)
        : null,
    topOption:
      placement.topOption === 'sink' ||
      placement.topOption === 'surface-cooktop' ||
      placement.topOption === 'front-control-cooktop'
        ? placement.topOption
        : null,
    notes:
      Array.isArray(placement.notes) && placement.notes.length > 0
        ? placement.notes.slice(0, 3)
        : undefined,
  };
}

function createGeneratedLayoutSummary(
  plan: SmartKitchenPlan,
  generatedLayout: GeneratedKitchenLayout,
): SmartKitchenImageLayoutSummary {
  const placementCounts = getGeneratedLayoutPlacementCounts(generatedLayout);
  const wallOrder = plan.wallOrder.length > 0 ? plan.wallOrder : undefined;
  const wallPlans = plan.wallPlans;

  return {
    layoutType: plan.layoutType,
    ...(wallOrder ? { wallOrder } : {}),
    placementCounts,
    walls: wallPlans.map((wallPlan, index) => {
      const wallPlacements = wallPlan.placements ?? [];

      return {
        wallId: wallPlan.wallId,
        wallLabel: wallPlan.wallLabel ?? `Wall ${index + 1}`,
        cabinetPlacementMode: wallPlan.cabinetPlacementMode ?? null,
        zoneType: wallPlan.zoneType ?? null,
        placements: wallPlacements.map((placement) => getGeneratedLayoutPlacementSummary(placement)),
      } satisfies SmartKitchenImageWallSummary;
    }),
  };
}

function buildImageGenerationDebugRecordBase(params: {
  readonly prompt: string;
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly conceptIndex: number;
  readonly imageIndex: number;
  readonly conceptCount: number;
  readonly imagesPerConcept: number;
  readonly model: string;
  readonly size: string;
  readonly generatedLayoutSummary: SmartKitchenImageLayoutSummary;
}): ImageGenerationDebugRecord {
  const promptPreview = createPromptPreview(params.prompt);

  return {
    createdAtIso: new Date().toISOString(),
    promptVersion: SMART_KITCHEN_IMAGE_PROMPT_VERSION,
    projectId: params.projectId,
    attachedFileName: params.attachedFileName,
    conceptIndex: params.conceptIndex,
    imageIndex: params.imageIndex,
    conceptCount: params.conceptCount,
    imagesPerConcept: params.imagesPerConcept,
    model: params.model,
    size: params.size,
    promptHash: createPromptHash(params.prompt),
    promptLength: params.prompt.length,
    promptContainsPhotorealisticKitchen: params.prompt.includes('photorealistic kitchen interior render'),
    promptContainsNoPostersRule: params.prompt.includes('Do not create posters'),
    promptContainsRoomSummary: params.prompt.includes('Attached room geometry summary:'),
    promptContainsPromptVersion: params.prompt.includes(
      `Prompt version: ${SMART_KITCHEN_IMAGE_PROMPT_VERSION}`,
    ),
    promptContainsGeneratedLayoutSummary: params.prompt.includes(
      'Generated cabinet/product/accessory layout summary:',
    ),
    promptPreviewStart: promptPreview.start,
    promptPreviewEnd: promptPreview.end,
    ...(isImageGenerationDebugFullPromptEnabled() ? { fullPrompt: params.prompt } : {}),
    promptGeneratedLayoutPlacementCount: params.generatedLayoutSummary.placementCounts.total,
    promptGeneratedLayoutCabinetCount: params.generatedLayoutSummary.placementCounts.cabinets,
    promptGeneratedLayoutProductCount: params.generatedLayoutSummary.placementCounts.products,
    promptGeneratedLayoutAccessoryCount: params.generatedLayoutSummary.placementCounts.accessories,
    providerRequestSent: false,
    usedPlaceholder: false,
  };
}

function logImageGenerationDebugRecord(record: ImageGenerationDebugRecord): void {
  if (!isImageGenerationDebugEnabled()) {
    return;
  }

  console.info(
    `[SmartKitchenImageDebug] concept=${record.conceptIndex + 1} image=${record.imageIndex + 1} promptHash=${record.promptHash} containsKitchen=${record.promptContainsPhotorealisticKitchen} containsRoomSummary=${record.promptContainsRoomSummary} usedPlaceholder=${record.usedPlaceholder} providerStatus=${typeof record.providerStatus === 'number' ? record.providerStatus : 'n/a'} revisedPromptPresent=${typeof record.providerRevisedPrompt === 'string' && record.providerRevisedPrompt.length > 0}`,
  );
}

async function writeImageGenerationDebugArtifact(run: ImageGenerationDebugRun | null): Promise<void> {
  if (!run || !isImageGenerationDebugEnabled()) {
    return;
  }

  const artifactPath = path.join(
    process.cwd(),
    'artifacts',
    'debug-image-generation',
    'latest-image-generation-run.json',
  );

  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(
    artifactPath,
    JSON.stringify(
      {
        createdAtIso: run.createdAtIso,
        promptVersion: run.promptVersion,
        ...(run.errorMessage ? { errorMessage: run.errorMessage } : {}),
        records: run.records,
      },
      null,
      2,
    ),
    'utf8',
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown image generation error.';
}

function toDataUrl(base64Image: string, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${base64Image}`;
}

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

function createPlaceholderImageDataUrl(
  projectId: string,
  attachedFileName: string,
  conceptLabel: string,
  imageLabel: string,
  reason: string,
): string {
  const headline = escapeSvgText(conceptLabel);
  const subheadline = escapeSvgText(imageLabel);
  const projectLabel = escapeSvgText(projectId);
  const fileLabel = escapeSvgText(attachedFileName);
  const reasonLabel = escapeSvgText(reason);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768" role="img" aria-label="${headline} ${subheadline}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1b31" />
          <stop offset="55%" stop-color="#12344f" />
          <stop offset="100%" stop-color="#1f5f8d" />
        </linearGradient>
      </defs>
      <rect width="1024" height="768" fill="url(#bg)" />
      <rect x="84" y="92" width="856" height="584" rx="42" fill="#ffffff" fill-opacity="0.12" stroke="#d7f2ef" stroke-opacity="0.2" />
      <rect x="140" y="146" width="744" height="90" rx="24" fill="#ffffff" fill-opacity="0.92" />
      <rect x="140" y="264" width="744" height="300" rx="30" fill="#ffffff" fill-opacity="0.88" />
      <rect x="176" y="300" width="200" height="228" rx="22" fill="#dff5f2" fill-opacity="0.95" />
      <rect x="404" y="300" width="168" height="228" rx="22" fill="#c7eaf1" fill-opacity="0.95" />
      <rect x="600" y="300" width="248" height="228" rx="22" fill="#e7faf7" fill-opacity="0.95" />
      <text x="192" y="188" fill="#0b1b31" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${headline}</text>
      <text x="192" y="224" fill="#0e796e" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">${subheadline}</text>
      <text x="192" y="612" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">Placeholder generated for layout verification</text>
      <text x="192" y="642" fill="#d7f2ef" font-family="Arial, Helvetica, sans-serif" font-size="16">Project: ${projectLabel}</text>
      <text x="192" y="668" fill="#d7f2ef" font-family="Arial, Helvetica, sans-serif" font-size="16">Attached file: ${fileLabel}</text>
      <text x="192" y="694" fill="#d7f2ef" font-family="Arial, Helvetica, sans-serif" font-size="16">Reason: ${reasonLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildPlaceholderImageItem(params: {
  readonly generationId: string;
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly conceptIndex: number;
  readonly conceptLabel: string;
  readonly imageIndex: number;
  readonly imageLabel: string;
  readonly reason: string;
}): GeneratedSmartKitchenImageResponseItem {
  return {
    id: `smart-kitchen-image-${params.conceptIndex + 1}-${params.imageIndex + 1}`,
    generationId: params.generationId,
    imageUrl: createPlaceholderImageDataUrl(
      params.projectId,
      params.attachedFileName,
      params.conceptLabel,
      params.imageLabel,
      params.reason,
    ),
    mimeType: 'image/svg+xml',
    conceptIndex: params.conceptIndex,
    conceptLabel: params.conceptLabel,
    imageIndex: params.imageIndex,
    imageLabel: params.imageLabel,
  };
}

function buildPlaceholderImageItemsForRoute(params: {
  readonly generationId: string;
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly conceptCount: number;
  readonly imagesPerConcept: number;
  readonly reason: string;
}): readonly GeneratedSmartKitchenImageResponseItem[] {
  const items: GeneratedSmartKitchenImageResponseItem[] = [];

  for (let conceptIndex = 0; conceptIndex < params.conceptCount; conceptIndex += 1) {
    const conceptLabel = `Concept ${conceptIndex + 1}`;

    for (let imageIndex = 0; imageIndex < params.imagesPerConcept; imageIndex += 1) {
      const imageLabel = `Image ${imageIndex + 1}`;
      items.push(
        buildPlaceholderImageItem({
          generationId: params.generationId,
          projectId: params.projectId,
          attachedFileName: params.attachedFileName,
          conceptIndex,
          conceptLabel,
          imageIndex,
          imageLabel,
          reason: params.reason,
        }),
      );
    }
  }

  return items;
}

function normalizeImageItem(
  item: OpenAiImagesGenerationResponseItem,
  index: number,
  generationId: string,
  conceptIndex: number,
  conceptLabel: string,
  imageIndex: number,
  imageLabel: string,
): GeneratedSmartKitchenImageResponseItem & { readonly revisedPrompt?: string } {
  const mimeType = item.mime_type ?? 'image/png';
  const imageUrl = item.b64_json ? toDataUrl(item.b64_json, mimeType) : item.url ?? '';

  return {
    id: `smart-kitchen-image-${index + 1}`,
    generationId,
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
  generationId: string,
  projectId: string,
  attachedFileName: string,
  conceptCount: number,
  imagesPerConcept: number,
  conceptIndex: number,
  conceptLabel: string,
  imageIndex: number,
  imageLabel: string,
  generatedLayoutSummary: SmartKitchenImageLayoutSummary,
  requestId: string,
): Promise<{
  readonly images: readonly GeneratedSmartKitchenImageResponseItem[];
  readonly debugRecord: ImageGenerationDebugRecord;
}> {
  const imageStartedAt = Date.now();
  const model = process.env.OPENAI_SMART_KITCHEN_IMAGE_MODEL ?? 'gpt-image-2';
  let debugRecord = buildImageGenerationDebugRecordBase({
    prompt,
    generatedLayoutSummary,
    projectId,
    attachedFileName,
    conceptIndex,
    imageIndex,
    conceptCount,
    imagesPerConcept,
    model,
    size: '1024x1024',
  });

  try {
    logSmartKitchenImageEvent(requestId, 'OpenAI image request start', {
      concept: conceptIndex + 1,
      image: imageIndex + 1,
      conceptLabel,
      imageLabel,
    });

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    debugRecord = {
      ...debugRecord,
      providerRequestSent: true,
      providerStatus: response.status,
    };

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
      const placeholderRecord: ImageGenerationDebugRecord = {
        ...debugRecord,
        providerReturnedDataCount: undefined,
        providerReturnedUrl: false,
        providerReturnedBase64: false,
        providerErrorMessage: errorMessage,
        usedPlaceholder: true,
        placeholderReason: errorMessage,
      };

      logImageGenerationDebugRecord(placeholderRecord);

      return {
        debugRecord: placeholderRecord,
        images: [
          buildPlaceholderImageItem({
            generationId,
            projectId,
            attachedFileName,
            conceptIndex,
            conceptLabel,
            imageIndex,
            imageLabel,
            reason: errorMessage,
          }),
        ],
      };
    }

    const payload = (await response.json()) as OpenAiImagesGenerationResponse;
    const data = payload.data ?? [];
    const normalizedImages = data
      .map((item, index) =>
        normalizeImageItem(item, index, generationId, conceptIndex, conceptLabel, imageIndex, imageLabel)
      )
      .filter((image) => image.imageUrl.length > 0);
    const revisedPrompt =
      data.find((item) => typeof item.revised_prompt === 'string' && item.revised_prompt.length > 0)?.revised_prompt ??
      undefined;
    const providerRecordBase: ImageGenerationDebugRecord = {
      ...debugRecord,
      providerReturnedDataCount: data.length,
      providerReturnedUrl: data.some((item) => typeof item.url === 'string' && item.url.length > 0),
      providerReturnedBase64: data.some((item) => typeof item.b64_json === 'string' && item.b64_json.length > 0),
      providerRevisedPrompt: revisedPrompt,
    };

    if (normalizedImages.length > 0) {
      const successRecord: ImageGenerationDebugRecord = {
        ...providerRecordBase,
        providerErrorMessage: undefined,
        usedPlaceholder: false,
      };

      logSmartKitchenImageEvent(requestId, 'OpenAI image request complete', {
        concept: conceptIndex + 1,
        image: imageIndex + 1,
        durationMs: Date.now() - imageStartedAt,
        resultCount: normalizedImages.length,
      });
      logImageGenerationDebugRecord(successRecord);
      return {
        debugRecord: successRecord,
        images: normalizedImages,
      };
    }

    const emptyRecord: ImageGenerationDebugRecord = {
      ...providerRecordBase,
      providerErrorMessage: 'OpenAI returned no image payload.',
      usedPlaceholder: true,
      placeholderReason: 'OpenAI returned no image payload.',
    };

    logImageGenerationDebugRecord(emptyRecord);

      return {
        debugRecord: emptyRecord,
        images: [
          buildPlaceholderImageItem({
            generationId,
            projectId,
            attachedFileName,
            conceptIndex,
            conceptLabel,
            imageIndex,
            imageLabel,
            reason: 'OpenAI returned no image payload.',
          }),
        ],
      };
    } catch (error) {
    const errorMessage = getErrorMessage(error);
    logSmartKitchenImageEvent(requestId, 'OpenAI image request failed, using placeholder', {
      concept: conceptIndex + 1,
      image: imageIndex + 1,
      durationMs: Date.now() - imageStartedAt,
      errorMessage,
    });

    const errorRecord: ImageGenerationDebugRecord = {
      ...debugRecord,
      providerErrorMessage: errorMessage,
      usedPlaceholder: true,
      placeholderReason: errorMessage,
    };

    logImageGenerationDebugRecord(errorRecord);

    return {
      debugRecord: errorRecord,
      images: [
        buildPlaceholderImageItem({
          generationId,
          projectId,
          attachedFileName,
          conceptIndex,
          conceptLabel,
          imageIndex,
          imageLabel,
          reason: errorMessage,
        }),
      ],
    };
  }
}

async function generateSmartKitchenLayoutFromRoom(
  requestUrl: string,
  room: AiRoomInput,
  userInstructions: string,
  requestId: string,
): Promise<{ readonly layout: GeneratedKitchenLayout; readonly plan: SmartKitchenPlan }> {
  const plannerStartedAt = Date.now();
  logSmartKitchenImageEvent(requestId, 'Planner request start', {
    roomWallCount: room.walls.length,
  });

  const response = await fetch(new URL('/api/smart-kitchen', requestUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-smart-kitchen-request-id': requestId,
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

  if (!payload.layout || !payload.plan) {
    throw new Error('Smart kitchen layout generation failed.');
  }

  logSmartKitchenImageEvent(requestId, 'Planner request complete', {
    durationMs: Date.now() - plannerStartedAt,
    cabinetCount: payload.layout.cabinets.length,
    wallCount: payload.layout.room.walls.length,
  });

  return {
    layout: payload.layout,
    plan: payload.plan,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const requestId = createSmartKitchenRequestId(request);

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
  const usePlaceholderImages = body.usePlaceholderImages === true;

  if (!room) {
    return NextResponse.json({ error: 'Missing room export data.' }, { status: 400 });
  }

  if (!room.walls?.length) {
    return NextResponse.json(
      { error: 'The attached room data does not contain any walls to generate from.' },
      { status: 400 },
    );
  }

  logSmartKitchenImageEvent(requestId, 'Image generation request received', {
    projectId,
    attachedFileName,
    roomWallCount: room.walls.length,
    usePlaceholderImages,
  });

  let debugRun: ImageGenerationDebugRun | null = isImageGenerationDebugEnabled()
    ? {
        createdAtIso: new Date().toISOString(),
        promptVersion: SMART_KITCHEN_IMAGE_PROMPT_VERSION,
        records: [],
      }
    : null;

  let generatedLayout: GeneratedKitchenLayout;
  let generatedPlan: SmartKitchenPlan;

  try {
    const generatedResult = await generateSmartKitchenLayoutFromRoom(
      request.url,
      room,
      userInstructions,
      requestId,
    );
    generatedLayout = generatedResult.layout;
    generatedPlan = generatedResult.plan;
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (debugRun) {
      debugRun = {
        ...debugRun,
        errorMessage,
      };
    }

    try {
      await writeImageGenerationDebugArtifact(debugRun);
    } catch (artifactError) {
      logSmartKitchenImageEvent(requestId, 'Failed to write image debug artifact after planner error', {
        errorMessage: getErrorMessage(artifactError),
      });
    }

    throw error;
  }
  const generatedRoom = generatedLayout.room;
  const generationId = randomUUID();
  const generatedLayoutSummary = createGeneratedLayoutSummary(generatedPlan, generatedLayout);
  const roomSummary = createSmartKitchenImageRoomSummary(generatedRoom);
  const conceptCount = parsePositiveIntegerEnv('SMART_KITCHEN_IMAGE_DEBUG_CONCEPT_COUNT') ?? 5;
  const imagesPerConcept =
    parsePositiveIntegerEnv('SMART_KITCHEN_IMAGE_DEBUG_IMAGES_PER_CONCEPT') ?? 3;
  const images: GeneratedSmartKitchenImageResponseItem[] = [];

  if (usePlaceholderImages) {
    logSmartKitchenImageEvent(requestId, 'Placeholder mode enabled', {
      conceptCount,
      imagesPerConcept,
    });
  }

  for (let conceptIndex = 0; conceptIndex < conceptCount; conceptIndex += 1) {
      const conceptLabel = `Concept ${conceptIndex + 1}`;
      const conceptStartedAt = Date.now();
      logSmartKitchenImageEvent(requestId, 'Concept generation start', {
        concept: conceptIndex + 1,
        conceptCount,
      imagesPerConcept,
    });

    for (let imageIndex = 0; imageIndex < imagesPerConcept; imageIndex += 1) {
      const imageLabel = `Image ${imageIndex + 1}`;
      const conceptPrompt = buildSmartKitchenImagePrompt({
        projectId,
        attachedFileName,
        room: generatedRoom,
        roomSummary,
        userInstructions,
        generatedLayoutSummary,
        includeDebugMetadata: isImageGenerationDebugEnabled(),
        conceptIndex,
        conceptCount,
        imagesPerConcept,
        imageIndex,
      });

      if (usePlaceholderImages) {
        const placeholderReason = 'Placeholder mode enabled.';
        const placeholderRecord: ImageGenerationDebugRecord = {
          ...buildImageGenerationDebugRecordBase({
            prompt: conceptPrompt,
            projectId,
            attachedFileName,
            conceptIndex,
            imageIndex,
            conceptCount,
            imagesPerConcept,
            model: process.env.OPENAI_SMART_KITCHEN_IMAGE_MODEL ?? 'gpt-image-2',
            size: '1024x1024',
            generatedLayoutSummary,
          }),
          providerRequestSent: false,
          providerErrorMessage: placeholderReason,
          usedPlaceholder: true,
          placeholderReason,
        };

        debugRun?.records.push(placeholderRecord);
        logImageGenerationDebugRecord(placeholderRecord);
        images.push(
          buildPlaceholderImageItem({
            generationId,
            projectId,
            attachedFileName,
            conceptIndex,
            conceptLabel,
            imageIndex,
            imageLabel,
            reason: placeholderReason,
          }),
        );
        continue;
      }

      const conceptImagesResult = await generateImagesForConcept(
        apiKey,
        conceptPrompt,
        generationId,
        projectId,
        attachedFileName,
        conceptCount,
        imagesPerConcept,
        conceptIndex,
        conceptLabel,
        imageIndex,
        imageLabel,
        generatedLayoutSummary,
        requestId,
      );
      images.push(...conceptImagesResult.images);
      debugRun?.records.push(conceptImagesResult.debugRecord);
      if (debugRun) {
        try {
          await writeImageGenerationDebugArtifact({ ...debugRun, records: debugRun.records });
        } catch (error) {
          logSmartKitchenImageEvent(requestId, 'Failed to write image debug artifact', {
            errorMessage: getErrorMessage(error),
          });
        }
      }
    }

    logSmartKitchenImageEvent(requestId, 'Concept generation complete', {
      concept: conceptIndex + 1,
      durationMs: Date.now() - conceptStartedAt,
      imagesSoFar: images.length,
    });
  }

  logSmartKitchenImageEvent(requestId, 'Image generation complete', {
    totalImages: images.length,
    conceptCount,
    imagesPerConcept,
  });

  try {
    await writeImageGenerationDebugArtifact(debugRun ? { ...debugRun, records: debugRun.records } : null);
  } catch (error) {
    logSmartKitchenImageEvent(requestId, 'Failed to write image debug artifact', {
      errorMessage: getErrorMessage(error),
    });
  }

  return NextResponse.json({
    projectId,
    attachedFileName,
    generationId,
    prompt: buildSmartKitchenImagePrompt({
      projectId,
      attachedFileName,
      room: generatedRoom,
      userInstructions,
      generatedLayoutSummary,
      includeDebugMetadata: isImageGenerationDebugEnabled(),
      conceptCount,
      imagesPerConcept,
    }),
    systemPrompt: SMART_KITCHEN_IMAGE_SYSTEM_PROMPT,
    generatedLayout,
    generatedRoom,
    generatedRoomFileName: 'generated-smart-kitchen-room.json',
    images,
  });
}
