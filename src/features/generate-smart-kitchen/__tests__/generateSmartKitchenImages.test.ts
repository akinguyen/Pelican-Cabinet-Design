import { describe, expect, it, vi } from 'vitest';
import { generateSmartKitchenImages } from '../utils/generateSmartKitchenImages';

describe('generateSmartKitchenImages', () => {
  it('posts the attached room data and returns the generated images', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          projectId: 'editor-draft',
          attachedFileName: 'pelican-smart-kitchen-editor-room-export.json',
          generationId: 'batch-1',
          generatedLayout: {
            room: {
              walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }],
              windows: [],
              doors: [],
              cabinets: [],
              catalog: [],
              wallChains: [],
              meta: {
                source: 'generated',
                gridSize: 28,
                wallThickness: 16,
                generatedAt: '2026-05-23T12:00:00.000Z',
              },
            },
            cabinets: [],
            summary: {
              layoutType: 'single-wall',
              notes: ['Generated for test'],
              selectedWallIds: ['wall-1'],
            },
            elevations: [],
          },
          generatedRoom: {
            walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }],
            windows: [],
            doors: [],
            cabinets: [],
            catalog: [],
            wallChains: [],
            meta: {
              source: 'generated',
              gridSize: 28,
              wallThickness: 16,
              generatedAt: '2026-05-23T12:00:00.000Z',
            },
          },
          generatedRoomFileName: 'generated-smart-kitchen-room.json',
          images: [
            {
              id: 'image-1',
              generationId: 'batch-1',
              imageUrl: 'data:image/png;base64,one',
              mimeType: 'image/png',
            },
            {
              id: 'image-2',
              generationId: 'batch-1',
              imageUrl: 'data:image/png;base64,two',
              mimeType: 'image/png',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await generateSmartKitchenImages({
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
      userInstructions: 'Add warm oak cabinets and soft lighting.',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/generate-smart-kitchen-images',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result.projectId).toBe('editor-draft');
    expect(result.attachedFileName).toBe('pelican-smart-kitchen-editor-room-export.json');
    expect(result.generationId).toBe('batch-1');
    expect(result.generatedRoomFileName).toBe('generated-smart-kitchen-room.json');
    expect(result.generatedRoom).toBeDefined();
    expect(result.generatedLayout).toBeDefined();
    expect(result.images).toHaveLength(2);
    expect(result.images.every((image) => image.generationId === 'batch-1')).toBe(true);
  });

  it('passes placeholder mode through to the API and returns the placeholder images', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          projectId: 'editor-draft',
          attachedFileName: 'pelican-smart-kitchen-editor-room-export.json',
          generatedLayout: {
            room: {
              walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }],
              windows: [],
              doors: [],
              cabinets: [],
              catalog: [],
              wallChains: [],
              meta: {
                source: 'generated',
                gridSize: 28,
                wallThickness: 16,
                generatedAt: '2026-05-23T12:00:00.000Z',
              },
            },
            cabinets: [],
            summary: {
              layoutType: 'single-wall',
              notes: ['Placeholder mode'],
              selectedWallIds: ['wall-1'],
            },
            elevations: [],
          },
          generatedRoom: {
            walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }],
            windows: [],
            doors: [],
            cabinets: [],
            catalog: [],
            wallChains: [],
            meta: {
              source: 'generated',
              gridSize: 28,
              wallThickness: 16,
              generatedAt: '2026-05-23T12:00:00.000Z',
            },
          },
          generatedRoomFileName: 'generated-smart-kitchen-room.json',
          generationMode: 'placeholder',
          placeholderReason: 'Placeholder mode enabled.',
          images: Array.from({ length: 15 }, (_, index) => ({
            id: `placeholder-image-${index + 1}`,
            generationId: 'batch-placeholder',
            imageUrl: `data:image/svg+xml,placeholder-${index + 1}`,
            mimeType: 'image/svg+xml',
            conceptIndex: Math.floor(index / 3),
            conceptLabel: `Concept ${Math.floor(index / 3) + 1}`,
            imageIndex: index % 3,
            imageLabel: `Image ${index % 3 + 1}`,
          })),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await generateSmartKitchenImages({
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
      userInstructions: 'Add warm oak cabinets and soft lighting.',
      usePlaceholderImages: true,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.generationMode).toBe('placeholder');
    expect(result.images).toHaveLength(15);
    expect(result.images.every((image) => image.imageUrl.startsWith('data:image/svg+xml'))).toBe(true);
    expect(result.images.every((image) => image.generationId === 'batch-placeholder')).toBe(true);
  });

  it('throws a readable error when the API returns an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      generateSmartKitchenImages({
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
        userInstructions: '',
      }),
    ).rejects.toThrow('Missing OPENAI_API_KEY.');
  });

  it('falls back to placeholder images when the API reports quota exhaustion', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: 'You exceeded your current quota, please check your plan and billing details.',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const result = await generateSmartKitchenImages({
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
      userInstructions: '',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.generationMode).toBe('placeholder');
    expect(result.placeholderReason).toContain('quota');
    expect(result.images).toHaveLength(15);
  });
});
