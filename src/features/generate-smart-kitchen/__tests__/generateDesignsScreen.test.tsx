import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GenerateDesignsScreen, SMART_KITCHEN_GENERATION_PHASES, createMockReviewData } from '../index';
import type { GenerationJob } from '../index';

const generationJob: GenerationJob = {
  id: 'job-001',
  projectId: 'smart-kitchen-project-001',
  status: 'running',
  progressPercent: 68,
  activePhaseId: 'generatingConcepts',
  completedDesignCount: 6,
  requestedDesignCount: 10,
  message: 'Generating kitchen concepts.',
};

describe('GenerateDesignsScreen', () => {
  it('renders generation progress, phases, and placeholders', () => {
    const markup = renderToStaticMarkup(
      <GenerateDesignsScreen generationJob={generationJob} reviewData={createMockReviewData()} />,
    );

    expect(markup).toContain('Generating Smart Kitchen Designs');
    expect(markup).toContain('68%');
    expect(markup).toContain('Generating kitchen concepts.');
    expect(markup).toContain('6 of 10 design options completed.');
    expect(markup).toContain('Generating design 1');
    expect(markup).toContain('Project Summary');
  });

  it('renders every workflow phase from constants', () => {
    const markup = renderToStaticMarkup(
      <GenerateDesignsScreen generationJob={generationJob} reviewData={createMockReviewData()} />,
    );

    for (const phase of SMART_KITCHEN_GENERATION_PHASES) {
      expect(markup).toContain(phase.label);
    }
  });
});
