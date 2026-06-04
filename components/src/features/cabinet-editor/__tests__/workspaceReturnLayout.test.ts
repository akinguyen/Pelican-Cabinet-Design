import { describe, expect, it } from 'vitest';
import type { GeneratedKitchenLayout } from '../../../../../lib/ai/types';
import { buildWorkspaceReturnPlacements } from '../services/workspaceReturnLayout';

function createWorkspaceReturnLayout(): GeneratedKitchenLayout {
  return {
    room: {
      walls: [
        {
          id: 'wall-1',
          start: { x: 100, y: 100 },
          end: { x: 500, y: 100 },
          kind: 'wall',
        },
        {
          id: 'wall-3',
          start: { x: 500, y: 380 },
          end: { x: 100, y: 380 },
          kind: 'wall',
        },
      ],
      windows: [],
      doors: [],
      cabinets: [],
      catalog: [],
      wallChains: [],
      meta: {
        source: 'generated',
        gridSize: 28,
        wallThickness: 16,
        generatedAt: '2026-05-26T00:00:00.000Z',
      },
    },
    cabinets: [
      {
        id: 'ai-cabinet-1',
        kind: 'cabinet',
        center: { x: 120, y: 80 },
        width: 64,
        depth: 28,
        rotation: 0,
        category: 'base',
        catalogId: 'base-two-door-cabinet',
        image: 'base-two-door-one-drawer',
        heightInches: 34.5,
        distanceFromFloorInches: 0,
        wallId: 'wall-1',
        wallFace: 'left',
      },
      {
        id: 'ai-cabinet-2',
        kind: 'cabinet',
        center: { x: 300, y: 416 },
        width: 64,
        depth: 28,
        rotation: 180,
        category: 'base',
        catalogId: 'base-two-door-cabinet',
        image: 'base-two-door-one-drawer',
        heightInches: 34.5,
        distanceFromFloorInches: 0,
        wallId: 'wall-3',
        wallFace: 'right',
      },
    ],
    summary: {
      layoutType: 'single-wall',
      notes: ['Generated for restore'],
      selectedWallIds: ['wall-1'],
      generationMethod: 'smart-ai',
      plannerModel: 'unit-test-model',
    },
    elevations: [
      {
        wallId: 'wall-1',
        label: 'Wall 1',
        cabinetCount: 1,
      },
    ],
  };
}

describe('workspaceReturnLayout', () => {
  it('normalizes generated layout cabinets into editor placements and flips reversed wall faces', () => {
    const placements = buildWorkspaceReturnPlacements(createWorkspaceReturnLayout());

    expect(placements).toHaveLength(2);
    expect(placements[0]).toMatchObject({
      id: 'ai-cabinet-1',
      center: { x: 120, y: 80 },
      catalogId: 'base-two-door-cabinet',
      placementType: 'cabinet',
      wallId: 'wall-1',
      wallFace: 'left',
    });
    expect(placements[1]).toMatchObject({
      id: 'ai-cabinet-2',
      center: { x: 300, y: 344 },
      catalogId: 'base-two-door-cabinet',
      placementType: 'cabinet',
      wallId: 'wall-3',
      wallFace: 'left',
    });
  });
});
