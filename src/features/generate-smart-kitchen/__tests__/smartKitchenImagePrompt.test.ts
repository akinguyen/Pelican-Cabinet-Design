import { describe, expect, it } from 'vitest';
import type { AiRoomInput } from '../../../../../lib/ai/types';
import {
  buildSmartKitchenImagePrompt,
  createSmartKitchenImageRoomSummary,
  SMART_KITCHEN_IMAGE_SYSTEM_PROMPT,
} from '../utils/smartKitchenImagePrompt';

describe('Smart kitchen image prompt', () => {
  const room: AiRoomInput = {
    walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }],
    windows: [
      {
        id: 'window-1',
        wallId: 'wall-1',
        t: 0.25,
        width: 36,
        heightInches: 48,
        distanceFromFloorInches: 36,
      },
    ],
    doors: [
      {
        id: 'door-1',
        wallId: 'wall-1',
        t: 0.75,
        width: 30,
        heightInches: 80,
        distanceFromFloorInches: 0,
      },
    ],
    cabinets: [],
    catalog: [],
    wallChains: [],
    meta: {
      source: 'editor-export',
      gridSize: 28,
      wallThickness: 16,
      generatedAt: '2026-05-23T12:00:00.000Z',
    },
  };

  const generatedLayoutSummary = {
    layoutType: 'connected-wall-return',
    wallOrder: ['wall-1', 'wall-2'],
    placementCounts: {
      total: 3,
      cabinets: 2,
      products: 1,
      accessories: 0,
    },
    walls: [
      {
        wallId: 'wall-1',
        wallLabel: 'Wall 1',
        cabinetPlacementMode: 'interior',
        zoneType: 'prep',
        placements: [
          {
            catalogId: 'base-two-door-cabinet',
            wallFace: 'interior',
            leftInches: 12,
            bottomInches: 0,
            widthInches: 24,
            depthInches: 24,
            heightInches: 34.5,
            topOption: 'sink',
            notes: ['sink cabinet'],
          },
        ],
      },
    ],
  } as const;

  it('includes the attached room geometry summary and user instructions', () => {
    const prompt = buildSmartKitchenImagePrompt({
      projectId: 'editor-draft',
      attachedFileName: 'pelican-smart-kitchen-editor-room-export.json',
      room,
      userInstructions: 'Use warm neutral materials and show the island seating clearly.',
    });

    expect(prompt).toContain('Project ID: editor-draft');
    expect(prompt).toContain('pelican-smart-kitchen-editor-room-export.json');
    expect(prompt).toContain('Use warm neutral materials and show the island seating clearly.');
    expect(prompt).toContain('Attached room geometry summary:');
    expect(prompt).toContain('"wallCount": 1');
    expect(prompt).toContain('"windowCount": 1');
    expect(prompt).toContain('"doorCount": 1');
    expect(prompt).toContain('"catalogItemCount": 0');
    expect(prompt).not.toContain('"cabinets": []');
    expect(prompt).not.toContain('"catalog": []');
    expect(prompt).not.toContain('"wallChains": []');
    expect(prompt).toContain(SMART_KITCHEN_IMAGE_SYSTEM_PROMPT);
    expect(prompt).toContain('Concepts requested: 5');
    expect(prompt).toContain('Return a real kitchen interior render.');
    expect(prompt).toContain('The generated layout summary is the source of truth for cabinet, product, and accessory placement.');
    expect(prompt).toContain('The room geometry summary is the source of truth for wall geometry, openings, windows, doors, and fixed objects.');
    expect(prompt).toContain('The room geometry summary intentionally omits generated cabinet, product, and catalog detail.');
    expect(prompt).toContain('Do not make a poster, brochure, ad creative, catalog page, concept board, or graphic layout.');
    expect(prompt).not.toContain('Prompt version: smart-kitchen-image-prompt-debug-v1');
    expect(prompt.length).toBeLessThan(12000);
  });

  it('includes the generated layout summary when provided and gates the debug marker', () => {
    const prompt = buildSmartKitchenImagePrompt({
      projectId: 'editor-draft',
      attachedFileName: 'pelican-smart-kitchen-editor-room-export.json',
      room,
      userInstructions: 'Use warm neutral materials and show the island seating clearly.',
      roomSummary: createSmartKitchenImageRoomSummary(room),
      generatedLayoutSummary,
      includeDebugMetadata: true,
    });

    expect(prompt).toContain('Prompt version: smart-kitchen-image-prompt-debug-v1');
    expect(prompt).toContain('Generated cabinet/product/accessory layout summary:');
    expect(prompt).toContain('"placementCounts"');
    expect(prompt).toContain('"catalogId": "base-two-door-cabinet"');
    expect(prompt).toContain('"wallFace": "interior"');
    expect(prompt).toContain('"topOption": "sink"');
  });

  it('supports concept-specific prompts for the batched generation flow', () => {
    const prompt = buildSmartKitchenImagePrompt({
      projectId: 'editor-draft',
      attachedFileName: 'pelican-smart-kitchen-editor-room-export.json',
      conceptIndex: 0,
      conceptCount: 5,
      imagesPerConcept: 3,
      room,
      userInstructions: 'Use warm neutral materials and show the island seating clearly.',
    });

    expect(prompt).toContain('Concept focus: Concept 1 of 5');
    expect(prompt).toContain('Image focus: Image 1 of 3 for this concept.');
  });
});
