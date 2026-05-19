import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CompareChooseScreen,
  EstimateReviewScreen,
  FinalReviewExportScreen,
  GenerateDesignsScreen,
  KitchenStudioScreen,
  MOCK_SMART_KITCHEN_PROJECT_ID,
  PresentationScreen,
  ReviewConfirmScreen,
  SMART_KITCHEN_EXPORT_FILE_TYPES,
  createFakeSmartKitchenApi,
  createMockProductionHandoffFormData,
  toggleOptionalEstimateItem,
} from '../index';
import type { GenerationJob, SmartKitchenApi } from '../index';

async function completeGeneration(api: SmartKitchenApi, jobId: string): Promise<GenerationJob> {
  let job: GenerationJob | null = null;

  for (let pollIndex = 0; pollIndex < 10; pollIndex += 1) {
    job = await api.getGenerationJob(jobId);

    if (job.status === 'completed') {
      return job;
    }
  }

  throw new Error('Fake generation job did not complete within the expected poll count.');
}

describe('Generate Smart Kitchen full workspace flow', () => {
  it('moves from review through generation, studio, comparison, estimate, presentation, and export with the fake API', async () => {
    const api = createFakeSmartKitchenApi();
    const project = await api.getProject(MOCK_SMART_KITCHEN_PROJECT_ID);

    const reviewMarkup = renderToStaticMarkup(<ReviewConfirmScreen reviewData={project.reviewData} />);
    expect(reviewMarkup).toContain('Review &amp; Confirm Kitchen');
    expect(reviewMarkup).toContain('Generate 10 AI Designs');

    const savedProject = await api.saveReviewData(project.id, project.reviewData);
    const validationResult = await api.validateProject(savedProject.id);
    expect(validationResult.isValid).toBe(true);

    const generationStart = await api.startGeneration(savedProject.id);
    const completedJob = await completeGeneration(api, generationStart.jobId);
    expect(completedJob.status).toBe('completed');
    expect(completedJob.completedDesignCount).toBe(10);

    const generationMarkup = renderToStaticMarkup(
      <GenerateDesignsScreen generationJob={completedJob} reviewData={project.reviewData} />,
    );
    expect(generationMarkup).toContain('Generating Smart Kitchen Designs');
    expect(generationMarkup).toContain('100%');

    const designSet = await api.getDesigns(savedProject.id);
    expect(designSet.designs).toHaveLength(10);

    const activeDesign = designSet.designs[2];
    expect(activeDesign).toBeDefined();

    const studioMarkup = renderToStaticMarkup(
      <KitchenStudioScreen
        designs={designSet.designs}
        activeDesignId={activeDesign.id}
        selectedComparisonDesignIds={['design-01', 'design-02', activeDesign.id]}
      />,
    );
    expect(studioMarkup).toContain('AI Kitchen Studio');
    expect(studioMarkup).toContain('Compare Selected (3)');

    const favoriteProject = await api.markCustomerFavorite(savedProject.id, activeDesign.id);
    expect(favoriteProject.customerFavoriteDesignId).toBe(activeDesign.id);
    expect(favoriteProject.activeStepId).toBe('compare');

    const comparisonDesigns = designSet.designs.slice(0, 3);
    const comparisonMarkup = renderToStaticMarkup(
      <CompareChooseScreen designs={comparisonDesigns} customerFavoriteDesignId={activeDesign.id} />,
    );
    expect(comparisonMarkup).toContain('Compare &amp; Choose Your Kitchen');
    expect(comparisonMarkup).toContain('Ready for Estimate Review');

    const estimate = await api.recalculateEstimate(activeDesign.id, favoriteProject.activeEstimate?.optionalItems ?? []);
    const toggledItems = toggleOptionalEstimateItem(estimate.optionalItems, 'upgraded-countertop');
    const recalculatedEstimate = await api.recalculateEstimate(activeDesign.id, toggledItems);
    expect(recalculatedEstimate.recalculatedTotal).toBeGreaterThan(estimate.recalculatedTotal ?? estimate.roughTotal);

    const savedEstimate = await api.savePreferredBudgetVersion(activeDesign.id, recalculatedEstimate);
    expect(savedEstimate.designId).toBe(activeDesign.id);

    const estimateMarkup = renderToStaticMarkup(<EstimateReviewScreen design={activeDesign} estimate={savedEstimate} />);
    expect(estimateMarkup).toContain('Estimate Review');
    expect(estimateMarkup).toContain('Save as Preferred Budget Version');

    const presentationResult = await api.createPresentation(activeDesign.id);
    expect(presentationResult.downloadUrl).toContain(activeDesign.id);

    const presentationMarkup = renderToStaticMarkup(
      <PresentationScreen design={activeDesign} estimate={savedEstimate} reviewData={project.reviewData} />,
    );
    expect(presentationMarkup).toContain('Presentation');
    expect(presentationMarkup).toContain('Download PDF');
    expect(presentationMarkup).not.toContain('Refine with AI');

    const exportResults = await Promise.all(
      SMART_KITCHEN_EXPORT_FILE_TYPES.map((definition) => api.exportFile(savedProject.id, definition.type)),
    );
    expect(exportResults).toHaveLength(SMART_KITCHEN_EXPORT_FILE_TYPES.length);
    expect(new Set(exportResults.map((result) => result.fileType)).size).toBe(SMART_KITCHEN_EXPORT_FILE_TYPES.length);

    const handoffFormData = createMockProductionHandoffFormData();
    const handoffResult = await api.sendInternalHandoff(savedProject.id, handoffFormData);
    expect(handoffResult.success).toBe(true);
    expect(handoffResult.status).toBe('handoffSubmitted');

    const completedProject = await api.getProject(savedProject.id);
    const exportMarkup = renderToStaticMarkup(
      <FinalReviewExportScreen
        project={completedProject}
        design={activeDesign}
        estimate={savedEstimate}
        reviewData={project.reviewData}
        handoffFormData={handoffFormData}
      />,
    );
    expect(exportMarkup).toContain('Final Review &amp; Export');
    expect(exportMarkup).toContain('Production Handoff');
    expect(exportMarkup).toContain('Send to Internal Team');
  });
});
