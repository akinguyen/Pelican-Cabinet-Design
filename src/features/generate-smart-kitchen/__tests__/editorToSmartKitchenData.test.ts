import { describe, expect, it } from 'vitest';
import { editorToSmartKitchenData } from '../index';

const sourceFloorPlanJson = {
  wallCount: 4,
  cabinetCount: 12,
};

describe('editorToSmartKitchenData', () => {
  it('maps known editor fields into review data without mutating the base mock shape', () => {
    const reviewData = editorToSmartKitchenData({
      projectName: 'Route Project',
      customerName: 'Route Customer',
      roomName: 'Kitchen A',
      widthInches: 144,
      lengthInches: 180,
      ceilingHeightInches: 108,
      totalAreaSqFt: 180,
      sourceFloorPlanJson,
    });

    expect(reviewData.projectName).toBe('Route Project');
    expect(reviewData.customerName).toBe('Route Customer');
    expect(reviewData.roomName).toBe('Kitchen A');
    expect(reviewData.measurements.roomWidth.value).toBe(144);
    expect(reviewData.measurements.roomLength.value).toBe(180);
    expect(reviewData.measurements.ceilingHeight.value).toBe(108);
    expect(reviewData.measurements.totalAreaSqFt).toBe(180);
    expect(reviewData.sourceFloorPlanJson).toEqual(sourceFloorPlanJson);
  });

  it('falls back safely when editor data is missing or malformed', () => {
    const reviewData = editorToSmartKitchenData(null);

    expect(reviewData.projectName).toBe('Smith Residence - Main Kitchen');
    expect(reviewData.sourceFloorPlanJson.source).toBe('editor-export');
    expect(reviewData.sourceFloorPlanJson.rawValueType).toBe('object');
  });
});
