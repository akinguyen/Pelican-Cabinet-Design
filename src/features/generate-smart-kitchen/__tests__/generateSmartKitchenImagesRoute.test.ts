import { describe, expect, it, vi } from 'vitest';
import { POST } from '../../../../app/api/generate-smart-kitchen-images/route';

describe('generate-smart-kitchen-images route', () => {
  it('batches generation into five concept requests with three images each', async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      const data = Array.from({ length: 3 }, (_, index) => ({
        b64_json: `concept-image-${index + 1}`,
        mime_type: 'image/png',
      }));

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
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

      expect(fetchSpy).toHaveBeenCalledTimes(5);
      expect(
        fetchSpy.mock.calls.every(([, init]: [unknown, { readonly body?: string }?]) => {
          const body = JSON.parse(String(init?.body));
          return body.n === 3;
        }),
      ).toBe(true);
      expect(payload.images).toHaveLength(15);
    } finally {
      process.env.OPENAI_API_KEY = originalApiKey;
      vi.restoreAllMocks();
    }
  });
});
