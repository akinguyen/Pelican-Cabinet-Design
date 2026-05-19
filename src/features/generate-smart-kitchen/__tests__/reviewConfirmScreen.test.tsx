import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReviewConfirmScreen, createMockReviewData } from '../index';

const validationResult = {
  isValid: true,
  errors: [],
  warnings: [
    {
      id: 'measurement-warning',
      fieldPath: 'reviewData.measurements',
      message: 'Confirm field measurements before production.',
      severity: 'warning' as const,
    },
  ],
};

describe('ReviewConfirmScreen', () => {
  it('renders the review sections and generation CTA without starting generation', () => {
    const markup = renderToStaticMarkup(<ReviewConfirmScreen reviewData={createMockReviewData()} />);

    expect(markup).toContain('Review &amp; Confirm Kitchen');
    expect(markup).toContain('Kitchen Space');
    expect(markup).toContain('Style &amp; Preferences');
    expect(markup).toContain('Appliances &amp; Fixtures');
    expect(markup).toContain('Storage &amp; Features');
    expect(markup).toContain('Budget &amp; Notes');
    expect(markup).toContain('Generate 10 AI Designs');
    expect(markup).toContain('Generation will not start until the primary CTA is clicked.');
  });

  it('renders validation warnings when provided', () => {
    const markup = renderToStaticMarkup(
      <ReviewConfirmScreen reviewData={createMockReviewData()} validationResult={validationResult} />,
    );

    expect(markup).toContain('Some reviewed items need attention');
    expect(markup).toContain('Confirm field measurements before production.');
  });
});
