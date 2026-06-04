import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { generateSmartKitchenLayout } from '../../../lib/ai/kitchenDesigner';
import { normalizeWallPlan } from './route';
import type { AiRoomInput, SmartKitchenPlan } from '../../../lib/ai/types';

function createTestRoom(): AiRoomInput {
  return {
    walls: [
      {
        id: 'wall-1',
        start: { x: 0, y: 0 },
        end: { x: 280, y: 0 },
        interiorSideOverride: 'left',
      },
      { id: 'wall-2', start: { x: 280, y: 0 }, end: { x: 280, y: 280 } },
    ],
    windows: [],
    doors: [],
    cabinets: [],
    catalog: [
      {
        id: 'base-two-door-cabinet',
        category: 'base',
        kind: 'cabinet',
        title: 'Base Two Door Cabinet',
        widthInches: 24,
        heightInches: 34.5,
        depthInches: 24,
      },
    ],
    wallChains: [],
    meta: {
      source: 'editor-export',
      gridSize: 28,
      wallThickness: 16,
      generatedAt: '2026-05-23T12:00:00.000Z',
    },
  };
}

function createPlannerWallPlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    wallId: 'wall-1',
    wallLabel: 'Wall 1',
    cabinetPlacementMode: 'interior',
    placements: [
      {
        catalogId: 'base-two-door-cabinet',
        leftInches: 12,
        widthInches: 24,
        depthInches: 24,
        heightInches: 34.5,
        wallFace: 'interior',
      },
    ],
    role: 'primary',
    placeSink: false,
    placePantry: false,
    placeHood: false,
    basePattern: [],
    upperPattern: [],
    notes: [],
    ...overrides,
  };
}

function generateLayoutFromWallPlan(wallPlan: ReturnType<typeof createPlannerWallPlan>) {
  const room = createTestRoom();
  const normalizedWallPlan = normalizeWallPlan(room, wallPlan);

  expect(normalizedWallPlan).not.toBeNull();

  const plan: SmartKitchenPlan = {
    layoutType: 'single-wall',
    wallOrder: ['wall-1'],
    wallPlans: [normalizedWallPlan!],
    notes: [],
    plannerModel: 'test-model',
  };

  return {
    normalizedWallPlan: normalizedWallPlan!,
    generatedLayout: generateSmartKitchenLayout(room, plan),
  };
}

describe('smart-kitchen route', () => {
  it('infers wall placement from actual placements when explicit needsPlacement is missing', () => {
    const { normalizedWallPlan, generatedLayout } = generateLayoutFromWallPlan(
      createPlannerWallPlan({
        needCabinetPlacement: undefined,
        needsPlacement: undefined,
      }),
    );

    expect(normalizedWallPlan.cabinetPlacementMode).toBe('interior');
    expect(normalizedWallPlan.needsPlacement).toBe(true);
    expect(generatedLayout.cabinets.length).toBeGreaterThan(0);
  });

  it('does not place cabinets when the planner marks a wall as none', () => {
    const { normalizedWallPlan, generatedLayout } = generateLayoutFromWallPlan(
      createPlannerWallPlan({
        cabinetPlacementMode: 'none',
        needCabinetPlacement: undefined,
        needsPlacement: undefined,
      }),
    );

    expect(normalizedWallPlan.cabinetPlacementMode).toBe('none');
    expect(normalizedWallPlan.needsPlacement).toBe(false);
    expect(generatedLayout.cabinets).toHaveLength(0);
  });

  it('does not force placement when there are no planner placements', () => {
    const { normalizedWallPlan, generatedLayout } = generateLayoutFromWallPlan(
      createPlannerWallPlan({
        placements: [],
        needCabinetPlacement: undefined,
        needsPlacement: undefined,
      }),
    );

    expect(normalizedWallPlan.needsPlacement).toBe(false);
    expect(generatedLayout.cabinets).toHaveLength(0);
  });

  it('preserves an explicit false needsPlacement value even when placements exist', () => {
    const { normalizedWallPlan, generatedLayout } = generateLayoutFromWallPlan(
      createPlannerWallPlan({
        needsPlacement: false,
      }),
    );

    expect(normalizedWallPlan.needsPlacement).toBe(false);
    expect(generatedLayout.cabinets).toHaveLength(0);
  });

  it('infers the default wall face from cabinet placement mode when placement wallFace is missing', () => {
    const { normalizedWallPlan, generatedLayout } = generateLayoutFromWallPlan(
      createPlannerWallPlan({
        cabinetPlacementMode: 'exterior',
        placements: [
          {
            catalogId: 'base-two-door-cabinet',
            leftInches: 12,
            widthInches: 24,
            depthInches: 24,
            heightInches: 34.5,
          },
        ],
      }),
    );

    expect(normalizedWallPlan.placements[0]?.resolvedWallFace).toBe('right');
    expect(generatedLayout.cabinets[0]).toMatchObject({
      wallFace: 'right',
      wallId: 'wall-1',
    });
  });

  it('retries transient OpenAI planner 5xx responses and surfaces a clear error', async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    const originalPlannerDebug = process.env.SMART_KITCHEN_PLANNER_DEBUG;
    process.env.OPENAI_API_KEY = 'test-openai-key';
    delete process.env.SMART_KITCHEN_PLANNER_DEBUG;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
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
      expect(body.model).toBeTruthy();
      expect(String(body.input?.[0]?.content?.[0]?.text ?? '')).not.toContain(
        'Planner debug version: smart-kitchen-planner-debug-v1',
      );

      return new Response('<!DOCTYPE html><html><body>api.openai.com | 502: Bad gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });
    });

    const response = await POST(
      new Request('http://localhost/api/smart-kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          designerFeedback: 'Use warm wood finishes.',
        }),
      }),
    );

    try {
      const payload = (await response.json()) as { readonly error?: string };

      expect(response.status).toBe(502);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
      expect(payload.error).toContain('OpenAI planning request failed');
    } finally {
      if (typeof originalApiKey === 'string') {
        process.env.OPENAI_API_KEY = originalApiKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }

      if (typeof originalPlannerDebug === 'string') {
        process.env.SMART_KITCHEN_PLANNER_DEBUG = originalPlannerDebug;
      } else {
        delete process.env.SMART_KITCHEN_PLANNER_DEBUG;
      }
      vi.restoreAllMocks();
    }
  });
});
