import { describe, expect, it } from 'vitest';
import {
  SMART_KITCHEN_EXPORT_FILE_TYPES,
  SMART_KITCHEN_FINAL_STEP_ID,
  SMART_KITCHEN_GENERATION_PHASES,
  SMART_KITCHEN_INITIAL_STEP_ID,
  SMART_KITCHEN_MAX_COMPARISON_DESIGNS,
  SMART_KITCHEN_MIN_COMPARISON_DESIGNS,
  SMART_KITCHEN_REQUESTED_DESIGN_COUNT,
  SMART_KITCHEN_STEP_IDS,
  SMART_KITCHEN_STEPS,
} from '../index';
import type { ExportFileType, SmartKitchenStepId } from '../index';

describe('Generate Smart Kitchen constants', () => {
  it('defines the expected seven-step workflow in order', () => {
    const expectedStepIds: readonly SmartKitchenStepId[] = [
      'review',
      'generating',
      'studio',
      'compare',
      'estimate',
      'presentation',
      'export',
    ];

    expect(SMART_KITCHEN_STEPS).toHaveLength(7);
    expect(SMART_KITCHEN_STEP_IDS).toEqual(expectedStepIds);
    expect(SMART_KITCHEN_INITIAL_STEP_ID).toBe('review');
    expect(SMART_KITCHEN_FINAL_STEP_ID).toBe('export');
  });

  it('uses sequential one-based step orders', () => {
    expect(SMART_KITCHEN_STEPS.map((step) => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('defines design count and comparison limits', () => {
    expect(SMART_KITCHEN_REQUESTED_DESIGN_COUNT).toBe(10);
    expect(SMART_KITCHEN_MIN_COMPARISON_DESIGNS).toBe(2);
    expect(SMART_KITCHEN_MAX_COMPARISON_DESIGNS).toBe(3);
  });

  it('defines generation phases ending at 100 percent', () => {
    expect(SMART_KITCHEN_GENERATION_PHASES.at(-1)?.completedProgress).toBe(100);
    expect(SMART_KITCHEN_GENERATION_PHASES.every((phase) => phase.completedProgress > 0)).toBe(true);
  });

  it('defines all production export file types', () => {
    const expectedFileTypes: readonly ExportFileType[] = [
      'designJson',
      'cabinetListCsv',
      'materialsListCsv',
      'pricingXlsx',
      'measurementsPdf',
      'floorPlanPng',
      'elevationsPdf',
      'imagesZip',
      'presentationPdf',
    ];

    expect(SMART_KITCHEN_EXPORT_FILE_TYPES.map((fileType) => fileType.type)).toEqual(expectedFileTypes);
    expect(SMART_KITCHEN_EXPORT_FILE_TYPES.every((fileType) => fileType.extension.startsWith('.'))).toBe(true);
  });
});
