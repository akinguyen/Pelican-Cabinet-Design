import { describe, expect, it } from 'vitest';
import { createMockSmartKitchenProject } from '../index';
import type {
  Estimate,
  ExportFileType,
  KitchenDesign,
  ReviewData,
  SmartKitchenProject,
  SmartKitchenStepId,
} from '../index';

describe('Generate Smart Kitchen type compile coverage', () => {
  it('supports typed project objects through the public barrel export', () => {
    const project: SmartKitchenProject = createMockSmartKitchenProject();
    const activeStepId: SmartKitchenStepId = project.activeStepId;
    const reviewData: ReviewData = project.reviewData;
    const firstDesign: KitchenDesign | undefined = project.designSet?.designs[0];
    const estimate: Estimate | undefined = project.activeEstimate;
    const exportFileType: ExportFileType = 'presentationPdf';

    const typedSummary = {
      activeStepId,
      projectName: reviewData.projectName,
      firstDesignId: firstDesign?.id,
      estimateId: estimate?.id,
      exportFileType,
    } satisfies {
      activeStepId: SmartKitchenStepId;
      projectName: string;
      firstDesignId?: string;
      estimateId?: string;
      exportFileType: ExportFileType;
    };

    expect(typedSummary.activeStepId).toBe('review');
    expect(typedSummary.projectName).toBe('Smith Residence - Main Kitchen');
    expect(typedSummary.firstDesignId).toBe('design-01');
    expect(typedSummary.exportFileType).toBe('presentationPdf');
  });
});
