import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  PresentationScreen,
  createMockEstimate,
  createMockKitchenDesign,
  createMockReviewData,
} from '../index';

describe('PresentationScreen', () => {
  it('renders a customer-facing proposal with images, materials, estimate, floor plan, and elevations', () => {
    const design = createMockKitchenDesign(3);
    const estimate = createMockEstimate(design.id);
    const reviewData = createMockReviewData();
    const markup = renderToStaticMarkup(
      <PresentationScreen design={design} estimate={estimate} reviewData={reviewData} />,
    );

    expect(markup).toContain('Presentation');
    expect(markup).toContain('PROPOSED DESIGN');
    expect(markup).toContain('Materials &amp; Finishes');
    expect(markup).toContain('Estimate Summary');
    expect(markup).toContain('Floor Plan');
    expect(markup).toContain('Elevations');
    expect(markup).toContain('Download PDF');
    expect(markup).toContain('Exit Presentation');
  });

  it('does not render internal AI refinement controls', () => {
    const markup = renderToStaticMarkup(
      <PresentationScreen
        design={createMockKitchenDesign(3)}
        estimate={createMockEstimate('design-03')}
        reviewData={createMockReviewData()}
      />,
    );

    expect(markup).not.toContain('Refine with AI');
    expect(markup).not.toContain('Ask AI');
    expect(markup).not.toContain('Version History');
  });
});
