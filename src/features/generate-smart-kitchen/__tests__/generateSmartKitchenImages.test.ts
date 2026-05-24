import { describe, expect, it, vi } from 'vitest';
import { generateSmartKitchenImages } from '../utils/generateSmartKitchenImages';

describe('generateSmartKitchenImages', () => {
  it('posts the attached room data and returns the generated images', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          projectId: 'editor-draft',
          attachedFileName: 'pelican-smart-kitchen-editor-room-export.json',
          images: [
            { id: 'image-1', imageUrl: 'data:image/png;base64,one', mimeType: 'image/png' },
            { id: 'image-2', imageUrl: 'data:image/png;base64,two', mimeType: 'image/png' },
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
    expect(result.images).toHaveLength(2);
  });

  it('returns placeholder images without calling fetch when placeholder mode is enabled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

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

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.generationMode).toBe('placeholder');
    expect(result.images).toHaveLength(15);
    expect(result.images.every((image) => image.imageUrl.startsWith('data:image/svg+xml'))).toBe(true);
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
