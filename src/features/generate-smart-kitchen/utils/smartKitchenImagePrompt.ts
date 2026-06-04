import type {
  AiPoint,
  AiRoomInput,
  AiWallKind,
  SmartKitchenPlacementWallFace,
} from '../../../../lib/ai/types';

export const SMART_KITCHEN_IMAGE_PROMPT_VERSION = 'smart-kitchen-image-prompt-debug-v1';

export interface SmartKitchenImageLayoutPlacementSummary {
  readonly catalogId: string;
  readonly wallFace?: SmartKitchenPlacementWallFace | null;
  readonly leftInches: number;
  readonly bottomInches?: number | null;
  readonly widthInches?: number | null;
  readonly depthInches?: number | null;
  readonly heightInches?: number | null;
  readonly topOption?: 'sink' | 'surface-cooktop' | 'front-control-cooktop' | null;
  readonly notes?: readonly string[];
}

export interface SmartKitchenImageWallSummary {
  readonly wallId: string;
  readonly wallLabel: string;
  readonly cabinetPlacementMode?: 'none' | 'both' | 'interior' | 'exterior' | null;
  readonly zoneType?: string | null;
  readonly placements: readonly SmartKitchenImageLayoutPlacementSummary[];
}

export interface SmartKitchenImageLayoutSummary {
  readonly layoutType?: string;
  readonly wallOrder?: readonly string[];
  readonly placementCounts: {
    readonly total: number;
    readonly cabinets: number;
    readonly products: number;
    readonly accessories: number;
  };
  readonly walls: readonly SmartKitchenImageWallSummary[];
}

export interface SmartKitchenImageRoomSummaryWall {
  readonly id: string;
  readonly start: AiPoint;
  readonly end: AiPoint;
  readonly kind?: AiWallKind | null;
  readonly elevationViewSideOverride?: 'left' | 'right' | null;
  readonly interiorSideOverride?: 'left' | 'right' | null;
}

export interface SmartKitchenImageRoomSummaryWindow {
  readonly id: string;
  readonly wallId: string;
  readonly t: number;
  readonly width: number;
  readonly heightInches: number;
  readonly distanceFromFloorInches: number;
}

export interface SmartKitchenImageRoomSummaryDoor {
  readonly id: string;
  readonly wallId: string;
  readonly t: number;
  readonly width: number;
  readonly heightInches: number;
  readonly distanceFromFloorInches: number;
}

export interface SmartKitchenImageRoomSummary {
  readonly wallCount: number;
  readonly windowCount: number;
  readonly doorCount: number;
  readonly cabinetCount: number;
  readonly catalogItemCount: number;
  readonly wallChainCount: number;
  readonly walls: readonly SmartKitchenImageRoomSummaryWall[];
  readonly windows: readonly SmartKitchenImageRoomSummaryWindow[];
  readonly doors: readonly SmartKitchenImageRoomSummaryDoor[];
  readonly meta: {
    readonly source: string;
    readonly unit?: 'inches';
    readonly coordinateUnit?: 'pixels';
    readonly measurementUnit?: 'inches';
    readonly gridSize: number;
    readonly gridSizePixelsPerFoot?: number;
    readonly wallThickness: number;
    readonly wallThicknessPixels?: number;
    readonly generatedAt: string;
  };
}

export interface SmartKitchenImagePromptInput {
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly room: AiRoomInput;
  readonly roomSummary?: SmartKitchenImageRoomSummary | null;
  readonly userInstructions: string;
  readonly generatedLayoutSummary?: SmartKitchenImageLayoutSummary | null;
  readonly includeDebugMetadata?: boolean;
  readonly conceptIndex?: number;
  readonly conceptCount?: number;
  readonly imagesPerConcept?: number;
  readonly imageIndex?: number;
}

export const SMART_KITCHEN_IMAGE_SYSTEM_PROMPT = [
  'You are generating photorealistic kitchen interior renders for a cabinet workspace.',
  'Use the supplied room geometry summary as the only source of truth for walls, openings, windows, doors, fixed objects, appliances, cabinet placement, and layout constraints.',
  'Follow the concept and image count stated in the generation brief. Do not add extra concepts, extra images, contact sheets, or multiple views inside one image.',
  'When an Image focus is provided, generate only that single standalone image for that concept.',
  'All images in a concept must show the same kitchen layout. Only vary camera angle, framing, lighting, material styling, and decor that does not conflict with the room geometry summary.',
  'Do not change the room shape, wall count, wall positions, opening locations, cabinet run positions, appliance locations, countertop locations, or fixed-object locations.',
  'Do not invent new windows, doors, islands, sinks, ranges, refrigerators, pantry walls, cabinet runs, wall returns, or decorative architectural features unless they are present in the room geometry summary or explicitly requested without conflicting with the room geometry summary.',
  'If a visual detail is missing from the room geometry summary, choose a simple neutral default, but do not use that default to change the layout.',
  'If user instructions conflict with the room geometry summary, preserve the room geometry summary and apply only the non-conflicting style preference.',
  'Each image must show one complete kitchen scene only.',
  'Do not create posters, brochures, collages, contact sheets, multi-panel layouts, split screens, before-and-after compositions, floor plans, diagrams, or multiple views inside a single image.',
  'Do not add explanatory text, labels, watermarking, callouts, title cards, logos, UI elements, measurements, arrows, or cabinet-code text inside the images.',
  'Make the output look like real kitchen photography or a high-end interior visualization, not a marketing graphic.',
].join(' ');

function roundSummaryInches(value: number): number {
  return Math.round(value * 10) / 10;
}

export function createSmartKitchenImageRoomSummary(room: AiRoomInput): SmartKitchenImageRoomSummary {
  return {
    wallCount: room.walls.length,
    windowCount: room.windows.length,
    doorCount: room.doors.length,
    cabinetCount: room.cabinets.length,
    catalogItemCount: room.catalog.length,
    wallChainCount: room.wallChains.length,
    walls: room.walls.map((wall) => ({
      id: wall.id,
      start: wall.start,
      end: wall.end,
      kind: wall.kind ?? null,
      elevationViewSideOverride: wall.elevationViewSideOverride ?? null,
      interiorSideOverride: wall.interiorSideOverride ?? null,
    })),
    windows: room.windows.map((window) => ({
      id: window.id,
      wallId: window.wallId,
      t: roundSummaryInches(window.t),
      width: roundSummaryInches(window.width),
      heightInches: roundSummaryInches(window.heightInches),
      distanceFromFloorInches: roundSummaryInches(window.distanceFromFloorInches),
    })),
    doors: room.doors.map((door) => ({
      id: door.id,
      wallId: door.wallId,
      t: roundSummaryInches(door.t),
      width: roundSummaryInches(door.width),
      heightInches: roundSummaryInches(door.heightInches),
      distanceFromFloorInches: roundSummaryInches(door.distanceFromFloorInches),
    })),
    meta: {
      source: room.meta.source,
      ...(room.meta.unit ? { unit: room.meta.unit } : {}),
      ...(room.meta.coordinateUnit ? { coordinateUnit: room.meta.coordinateUnit } : {}),
      ...(room.meta.measurementUnit ? { measurementUnit: room.meta.measurementUnit } : {}),
      gridSize: room.meta.gridSize,
      ...(room.meta.gridSizePixelsPerFoot
        ? { gridSizePixelsPerFoot: room.meta.gridSizePixelsPerFoot }
        : {}),
      wallThickness: room.meta.wallThickness,
      ...(room.meta.wallThicknessPixels ? { wallThicknessPixels: room.meta.wallThicknessPixels } : {}),
      generatedAt: room.meta.generatedAt,
    },
  };
}

export function buildSmartKitchenImagePrompt({
  projectId,
  attachedFileName,
  room,
  roomSummary,
  userInstructions,
  generatedLayoutSummary,
  includeDebugMetadata = false,
  conceptIndex,
  conceptCount = 5,
  imagesPerConcept = 3,
  imageIndex,
}: SmartKitchenImagePromptInput): string {
  const instructionText = userInstructions.trim();
  const hasConceptContext = typeof conceptIndex === 'number';
  const hasImageContext = typeof imageIndex === 'number';
  const compactRoomSummary = roomSummary ?? createSmartKitchenImageRoomSummary(room);

  return [
    'Smart Kitchen generation brief:',
    ...(includeDebugMetadata ? [`Prompt version: ${SMART_KITCHEN_IMAGE_PROMPT_VERSION}`] : []),
    `Project ID: ${projectId}`,
    `Attached file: ${attachedFileName}`,
    hasConceptContext ? `Concept focus: Concept ${conceptIndex + 1} of ${conceptCount}` : `Concepts requested: ${conceptCount}`,
    hasImageContext
      ? `Image focus: Image ${imageIndex + 1} of ${imagesPerConcept} for this concept.`
      : hasConceptContext
        ? `Generate exactly ${imagesPerConcept} standalone images for this concept.`
      : `Generate exactly ${conceptCount * imagesPerConcept} standalone images grouped as ${conceptCount} concepts with ${imagesPerConcept} images per concept.`,
    '',
    'System guidance:',
    SMART_KITCHEN_IMAGE_SYSTEM_PROMPT,
    '',
    'Output constraints:',
    'Return the requested photorealistic kitchen interior render.',
    'The generated layout summary is the source of truth for cabinet, product, and accessory placement.',
    'The room geometry summary is the source of truth for wall geometry, openings, windows, doors, and fixed objects.',
    'The room geometry summary intentionally omits generated cabinet, product, and catalog detail.',
    'Do not invent, move, remove, or resize cabinets, products, or accessories from the generated layout summary.',
    'If the camera angle cannot show every item clearly, preserve the layout logically instead of changing it.',
    'Do not make a poster, brochure, ad creative, catalog page, concept board, floor plan, diagram, or graphic layout.',
    generatedLayoutSummary
      ? [
          'Generated cabinet/product/accessory layout summary:',
          JSON.stringify(generatedLayoutSummary, null, 2),
        ].join('\n')
      : '',
    'Attached room geometry summary:',
    JSON.stringify(compactRoomSummary, null, 2),
    '',
    'User instructions:',
    instructionText || '(no additional user instructions provided)',
  ].join('\n');
}
