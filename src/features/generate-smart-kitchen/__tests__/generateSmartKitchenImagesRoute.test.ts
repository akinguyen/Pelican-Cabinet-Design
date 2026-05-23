import { describe, expect, it, vi } from 'vitest';
import { POST } from '../../../../app/api/generate-smart-kitchen-images/route';

describe('generate-smart-kitchen-images route', () => {
  it('batches generation into five concepts with three standalone image requests each', async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (url.includes('/api/smart-kitchen')) {
        return new Response(
          JSON.stringify({
            layout: {
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
              cabinets: [],
              summary: {
                layoutType: 'single-wall',
                notes: [],
                selectedWallIds: ['wall-1'],
              },
              elevations: [],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      const body = JSON.parse(String(init?.body));
      expect(body.n).toBe(1);

      return new Response(
        JSON.stringify({
          data: [
            {
              b64_json: 'concept-image-1',
              mime_type: 'image/png',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const response = await POST(
      new Request('http://localhost/api/generate-smart-kitchen-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          userInstructions: 'Use warm wood finishes.',
        }),
      }),
    );

    try {
      const payload = (await response.json()) as { readonly images?: readonly unknown[] };

      expect(fetchSpy).toHaveBeenCalledTimes(16);
      expect(fetchSpy.mock.calls.some(([input]) => String(input).includes('/api/smart-kitchen'))).toBe(true);
      expect(payload.images).toHaveLength(15);
      expect(payload.generatedRoom).toBeDefined();
    } finally {
      process.env.OPENAI_API_KEY = originalApiKey;
      vi.restoreAllMocks();
    }
  });
});
