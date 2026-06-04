import { describe, expect, it } from 'vitest';
import { getInteriorMeasurementGuideSide, getWallPlacementGuideSides } from '../components/elevation/ElevationPlanView';
import type { Wall } from '../types/editorTypes';

function createWall(overrides: Partial<Wall> = {}): Wall {
  return {
    id: 'wall-1',
    start: { x: 0, y: 0 },
    end: { x: 280, y: 0 },
    ...overrides,
  };
}

describe('ElevationPlanView wall guide side resolution', () => {
  it('respects the wall interior override when determining the red guide side', () => {
    const wall = createWall({
      interiorSideOverride: 'right',
    });

    expect(getInteriorMeasurementGuideSide(wall, [wall])).toBe('right');
    expect(getWallPlacementGuideSides(wall, [wall])).toEqual(['right']);
  });

  it('respects the wall exterior override when determining the red guide side', () => {
    const wall = createWall({
      elevationViewSideOverride: 'left',
    });

    expect(getInteriorMeasurementGuideSide(wall, [wall])).toBe('left');
  });

  it('uses the connected wall system when left and right guide lengths tie', () => {
    const topWall = createWall({
      id: 'top-wall',
      start: { x: 120, y: 0 },
      end: { x: 0, y: 0 },
    });
    const rightWall = createWall({
      id: 'right-wall',
      start: { x: 120, y: 0 },
      end: { x: 120, y: 120 },
    });
    const bottomWall = createWall({
      id: 'bottom-wall',
      start: { x: 120, y: 120 },
      end: { x: 0, y: 120 },
    });
    const leftWall = createWall({
      id: 'left-wall',
      start: { x: 0, y: 120 },
      end: { x: 0, y: 0 },
    });
    const walls = [topWall, rightWall, bottomWall, leftWall];

    expect(getInteriorMeasurementGuideSide(topWall, walls)).toBe('right');
    expect(getWallPlacementGuideSides(topWall, walls)).toEqual(['right']);
  });
});
