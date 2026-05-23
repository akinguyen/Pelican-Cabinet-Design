import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GenerateSmartKitchenProjectPage from '../../../../app/generate-smart-kitchen/[projectId]/page';
import { SmartKitchenFlowProvider } from '../state/SmartKitchenFlowProvider';
import { GenerateSmartKitchenWorkspaceContent } from '../../../../app/generate-smart-kitchen/[projectId]/page';
import { createMockDesignSet, createMockEstimate, createMockSmartKitchenProject } from '../mockData';

describe('Generate Smart Kitchen route page', () => {
  it('reads projectId from route params and renders the Review & Confirm workspace first', () => {
    const markup = renderToStaticMarkup(
      <GenerateSmartKitchenProjectPage params={{ projectId: 'route-project-001' }} />,
    );

    expect(markup).toContain('Project route-project-001');
    expect(markup).toContain('Generate Smart Kitchen');
    expect(markup).toContain('Review &amp; Confirm Kitchen');
    expect(markup).toContain('Generate 10 AI Designs');
  });

  it('does not render the generation progress screen before the user starts generation', () => {
    const markup = renderToStaticMarkup(
      <GenerateSmartKitchenProjectPage params={{ projectId: 'route-project-001' }} />,
    );

    expect(markup).not.toContain('Generating Smart Kitchen Designs');
  });

  it('can render later workspace steps when the project state is already advanced', () => {
    const project = createMockSmartKitchenProject({
      activeStepId: 'compare',
      completedStepIds: ['review', 'generating', 'studio'],
      designSet: createMockDesignSet(),
      activeDesignId: 'design-03',
      customerFavoriteDesignId: 'design-03',
      activeEstimate: createMockEstimate('design-03'),
    });

    const initialState = {
      project,
      reviewData: project.reviewData,
      validationResult: null,
      generationJob: null,
      designSet: project.designSet ?? null,
      activeDesignId: project.activeDesignId ?? null,
      selectedComparisonDesignIds: project.selectedComparisonDesignIds,
      customerRatings: project.customerRatings,
      customerFavoriteDesignId: project.customerFavoriteDesignId ?? null,
      activeEstimate: project.activeEstimate ?? null,
      finalReviewSlide: 'customerPresentation' as const,
      handoffFormData: project.handoffFormData ?? null,
      status: 'success' as const,
      errorMessage: null,
    };

    const markup = renderToStaticMarkup(
      <SmartKitchenFlowProvider initialState={initialState}>
        <GenerateSmartKitchenWorkspaceContent projectId={project.id} />
      </SmartKitchenFlowProvider>,
    );

    expect(markup).toContain('Compare &amp; Choose Your Kitchen');
    expect(markup).toContain('Review Estimates &amp; Continue');
  });
});
