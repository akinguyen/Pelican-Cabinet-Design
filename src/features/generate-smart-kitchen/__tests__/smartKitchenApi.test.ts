import { describe, expect, it } from 'vitest';
import {
  createFakeSmartKitchenApi,
  createMockEstimate,
  createMockProductionHandoffFormData,
  createMockReviewData,
  MOCK_SMART_KITCHEN_PROJECT_ID,
  SMART_KITCHEN_REQUESTED_DESIGN_COUNT,
} from '../index';

async function completeGeneration(api = createFakeSmartKitchenApi()) {
  const result = await api.startGeneration(MOCK_SMART_KITCHEN_PROJECT_ID);
  let job = result.job;

  for (let index = 0; index < 6; index += 1) {
    job = await api.getGenerationJob(result.jobId);
  }

  return { api, job };
}

describe('createFakeSmartKitchenApi', () => {
  it('loads the seeded mock project', async () => {
    const api = createFakeSmartKitchenApi();
    const project = await api.getProject(MOCK_SMART_KITCHEN_PROJECT_ID);

    expect(project.id).toBe(MOCK_SMART_KITCHEN_PROJECT_ID);
    expect(project.reviewData.projectName).toBe('Smith Residence - Main Kitchen');
  });

  it('saves review data and validates project data', async () => {
    const api = createFakeSmartKitchenApi();
    const reviewData = createMockReviewData({ projectName: 'Updated Project' });
    const project = await api.saveReviewData(MOCK_SMART_KITCHEN_PROJECT_ID, reviewData);
    const validation = await api.validateProject(MOCK_SMART_KITCHEN_PROJECT_ID);

    expect(project.reviewData.projectName).toBe('Updated Project');
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('returns validation errors for missing required project name', async () => {
    const api = createFakeSmartKitchenApi();
    const reviewData = createMockReviewData({ projectName: '   ' });

    await api.saveReviewData(MOCK_SMART_KITCHEN_PROJECT_ID, reviewData);
    const validation = await api.validateProject(MOCK_SMART_KITCHEN_PROJECT_ID);

    expect(validation.isValid).toBe(false);
    expect(validation.errors.some((error) => error.id === 'project-name-required')).toBe(true);
  });

  it('simulates deterministic generation progress and completion', async () => {
    const { job } = await completeGeneration();

    expect(job.status).toBe('completed');
    expect(job.progressPercent).toBe(100);
    expect(job.completedDesignCount).toBe(SMART_KITCHEN_REQUESTED_DESIGN_COUNT);
  });

  it('returns 10 generated designs', async () => {
    const { api } = await completeGeneration();
    const designSet = await api.getDesigns(MOCK_SMART_KITCHEN_PROJECT_ID);

    expect(designSet.designs).toHaveLength(SMART_KITCHEN_REQUESTED_DESIGN_COUNT);
    expect(designSet.designs[0]?.id).toBe('design-01');
  });

  it('refines a design into a new version without removing the original', async () => {
    const { api } = await completeGeneration();
    const refinedDesign = await api.refineDesign('design-03', {
      suggestionTags: ['Storage'],
      promptText: 'Add more pantry storage.',
    });
    const designSet = await api.getDesigns(MOCK_SMART_KITCHEN_PROJECT_ID);

    expect(refinedDesign.parentDesignId).toBe('design-03');
    expect(refinedDesign.status).toBe('refined');
    expect(designSet.designs.some((design) => design.id === 'design-03')).toBe(true);
    expect(designSet.designs.some((design) => design.id === refinedDesign.id)).toBe(true);
  });

  it('duplicates a version into a new design version', async () => {
    const { api } = await completeGeneration();
    const duplicatedDesign = await api.duplicateVersion('design-03-v1', { name: 'Customer Copy' });

    expect(duplicatedDesign.title).toBe('Customer Copy');
    expect(duplicatedDesign.parentDesignId).toBe('design-03');
  });

  it('marks one customer favorite and stores ratings', async () => {
    const { api } = await completeGeneration();
    const favoriteProject = await api.markCustomerFavorite(MOCK_SMART_KITCHEN_PROJECT_ID, 'design-03');
    const ratedProject = await api.saveCustomerRatings(MOCK_SMART_KITCHEN_PROJECT_ID, [
      { designId: 'design-03', style: 5, priceFit: 4, storage: 5, layout: 5 },
    ]);

    expect(favoriteProject.customerFavoriteDesignId).toBe('design-03');
    expect(ratedProject.customerRatings).toHaveLength(1);
  });

  it('recalculates and saves an estimate', async () => {
    const { api } = await completeGeneration();
    const estimate = createMockEstimate('design-03');
    const optionalItems = estimate.optionalItems.map((item) => ({ ...item, selected: true }));
    const recalculated = await api.recalculateEstimate('design-03', optionalItems);
    const saved = await api.savePreferredBudgetVersion('design-03', recalculated);

    expect(recalculated.upgradesTotal).toBeGreaterThan(estimate.upgradesTotal);
    expect(saved.id).toBe(recalculated.id);
  });

  it('creates presentation, export file, and internal handoff results', async () => {
    const { api } = await completeGeneration();
    const presentation = await api.createPresentation('design-03');
    const exportResult = await api.exportFile(MOCK_SMART_KITCHEN_PROJECT_ID, 'presentationPdf');
    const handoff = await api.sendInternalHandoff(
      MOCK_SMART_KITCHEN_PROJECT_ID,
      createMockProductionHandoffFormData(),
    );

    expect(presentation.downloadUrl).toContain('presentation-design-03.pdf');
    expect(exportResult.fileName).toContain('presentationPdf.pdf');
    expect(handoff.success).toBe(true);
    expect(handoff.status).toBe('handoffSubmitted');
  });
});
