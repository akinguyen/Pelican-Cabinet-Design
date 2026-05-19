import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CompareChooseScreen, createMockKitchenDesigns } from '../index';

describe('CompareChooseScreen', () => {
  it('renders side-by-side comparison cards and summary for selected designs', () => {
    const designs = createMockKitchenDesigns(3);
    const markup = renderToStaticMarkup(
      <CompareChooseScreen designs={designs} customerFavoriteDesignId="design-03" />,
    );

    expect(markup).toContain('Compare &amp; Choose Your Kitchen');
    expect(markup).toContain('Comparison Summary');
    expect(markup).toContain('Options selected');
    expect(markup).toContain('Customer Favorite');
    expect(markup).toContain('Ready for Estimate Review');
    expect(markup).toContain('Review Estimates &amp; Continue');

    for (let optionNumber = 1; optionNumber <= 3; optionNumber += 1) {
      expect(markup).toContain(`Design ${optionNumber.toString().padStart(2, '0')}`);
    }
  });

  it('asks the user to choose a favorite before continuing', () => {
    const designs = createMockKitchenDesigns(2);
    const markup = renderToStaticMarkup(<CompareChooseScreen designs={designs} />);

    expect(markup).toContain('Select a customer favorite to unlock the estimate review step.');
    expect(markup).toContain('Select This Design');
  });

  it('renders empty state when no designs are selected for comparison', () => {
    const markup = renderToStaticMarkup(<CompareChooseScreen designs={[]} />);

    expect(markup).toContain('No designs have been selected for comparison yet.');
    expect(markup).toContain('Back to AI Kitchen Studio');
  });
});
