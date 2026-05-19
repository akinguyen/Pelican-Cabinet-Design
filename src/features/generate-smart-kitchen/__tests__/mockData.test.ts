import { describe, expect, it } from 'vitest';
import {
  createMockDesignSet,
  createMockEstimate,
  createMockKitchenDesign,
  createMockKitchenDesigns,
  createMockProductionHandoffFormData,
  createMockReviewData,
  createMockSmartKitchenProject,
  MOCK_SMART_KITCHEN_PROJECT_ID,
  SMART_KITCHEN_REQUESTED_DESIGN_COUNT,
} from '../index';

describe('Generate Smart Kitchen mock data', () => {
  it('creates deterministic review data with required sections', () => {
    const first = createMockReviewData();
    const second = createMockReviewData();

    expect(first).toEqual(second);
    expect(first.projectName).toBe('Smith Residence - Main Kitchen');
    expect(first.measurements.walls.length).toBeGreaterThan(0);
    expect(first.appliances.length).toBeGreaterThan(0);
    expect(first.cabinetRequirements.length).toBeGreaterThan(0);
    expect(first.budget.targetBudget).toBeGreaterThan(0);
  });

  it('allows review data overrides without mutating defaults', () => {
    const overridden = createMockReviewData({ projectName: 'Custom Project' });
    const defaultReviewData = createMockReviewData();

    expect(overridden.projectName).toBe('Custom Project');
    expect(defaultReviewData.projectName).toBe('Smith Residence - Main Kitchen');
  });

  it('creates the requested number of unique generated designs', () => {
    const designs = createMockKitchenDesigns(SMART_KITCHEN_REQUESTED_DESIGN_COUNT);
    const ids = new Set(designs.map((design) => design.id));

    expect(designs).toHaveLength(10);
    expect(ids.size).toBe(10);
    expect(designs.map((design) => design.optionNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('creates a generated design with required presentation fields', () => {
    const design = createMockKitchenDesign(3);

    expect(design.id).toBe('design-03');
    expect(design.imageUrl).toContain('design-03.jpg');
    expect(design.thumbnailUrl).toContain('design-03-thumb.jpg');
    expect(design.estimatedPriceRange.min).toBeLessThan(design.estimatedPriceRange.max);
    expect(design.keyFeatures.length).toBeGreaterThan(0);
    expect(design.pros.length).toBeGreaterThan(0);
    expect(design.cons.length).toBeGreaterThan(0);
  });

  it('creates a design set linked to the mock project', () => {
    const designSet = createMockDesignSet();

    expect(designSet.projectId).toBe(MOCK_SMART_KITCHEN_PROJECT_ID);
    expect(designSet.designs).toHaveLength(10);
  });

  it('creates a consistent estimate with selected upgrade totals', () => {
    const estimate = createMockEstimate('design-03');
    const selectedUpgradeTotal = estimate.optionalItems
      .filter((item) => item.selected)
      .reduce((total, item) => total + item.amount, 0);

    expect(estimate.designId).toBe('design-03');
    expect(estimate.upgradesTotal).toBe(selectedUpgradeTotal);
    expect(estimate.recalculatedTotal).toBe(estimate.roughTotal + estimate.upgradesTotal);
    expect(estimate.disclaimer).toContain('preliminary');
  });

  it('creates handoff form data with pending customer approval allowed', () => {
    const handoff = createMockProductionHandoffFormData();

    expect(handoff.assignedTo).toBeTruthy();
    expect(handoff.customerApprovalStatus).toBe('pending');
    expect(handoff.specialRisks.length).toBeGreaterThan(0);
  });

  it('creates a project foundation for the workspace', () => {
    const project = createMockSmartKitchenProject();

    expect(project.id).toBe(MOCK_SMART_KITCHEN_PROJECT_ID);
    expect(project.activeStepId).toBe('review');
    expect(project.reviewData.projectName).toBe('Smith Residence - Main Kitchen');
    expect(project.designSet?.designs).toHaveLength(10);
    expect(project.activeEstimate?.designId).toBe(project.customerFavoriteDesignId);
  });
});
