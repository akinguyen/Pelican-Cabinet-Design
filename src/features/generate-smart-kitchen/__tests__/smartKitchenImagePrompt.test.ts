import { describe, expect, it } from 'vitest';
import { buildSmartKitchenImagePrompt, SMART_KITCHEN_IMAGE_SYSTEM_PROMPT } from '../utils/smartKitchenImagePrompt';

describe('Smart kitchen image prompt', () => {
  it('includes the attached room JSON and user instructions', () => {
    const prompt = buildSmartKitchenImagePrompt({
      projectId: 'editor-draft',
      attachedFileName: 'pelican-smart-kitchen-editor-room-export.json',
      room: {
        walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }],
        windows: [],
        doors: [],
        cabinets: [],
        catalog: [],
        wallChains: [],
        meta: {
          source: 'editor-export',
          gridSize: 28,
          wallThickness: 16,
          generatedAt: '2026-05-23T12:00:00.000Z',
        },
      },
      userInstructions: 'Use warm neutral materials and show the island seating clearly.',
    });

    expect(prompt).toContain('Project ID: editor-draft');
    expect(prompt).toContain('pelican-smart-kitchen-editor-room-export.json');
    expect(prompt).toContain('Use warm neutral materials and show the island seating clearly.');
    expect(prompt).toContain('"walls"');
    expect(prompt).toContain(SMART_KITCHEN_IMAGE_SYSTEM_PROMPT);
    expect(prompt).toContain('Concepts requested: 5');
  });

  it('supports concept-specific prompts for the batched generation flow', () => {
    const prompt = buildSmartKitchenImagePrompt({
      projectId: 'editor-draft',
      attachedFileName: 'pelican-smart-kitchen-editor-room-export.json',
      conceptIndex: 0,
      conceptCount: 5,
      imagesPerConcept: 3,
      room: {
        walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }],
        windows: [],
        doors: [],
        cabinets: [],
        catalog: [],
        wallChains: [],
        meta: {
          source: 'editor-export',
          gridSize: 28,
          wallThickness: 16,
          generatedAt: '2026-05-23T12:00:00.000Z',
        },
      },
      userInstructions: 'Use warm neutral materials and show the island seating clearly.',
    });

    expect(prompt).toContain('Concept focus: Concept 1 of 5');
    expect(prompt).toContain('Generate exactly 3 standalone images for this concept.');
  });
});
