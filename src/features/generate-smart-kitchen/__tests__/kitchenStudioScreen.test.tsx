import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KitchenStudioScreen, createMockKitchenDesigns } from '../index';

describe('KitchenStudioScreen', () => {
  it('renders the studio with 10 generated designs and active details', () => {
    const designs = createMockKitchenDesigns(10);
    const markup = renderToStaticMarkup(
      <KitchenStudioScreen
        designs={designs}
        activeDesignId="design-03"
        selectedComparisonDesignIds={['design-01', 'design-03']}
        customerFavoriteDesignId="design-03"
      />,
    );

    expect(markup).toContain('AI Kitchen Studio');
    expect(markup).toContain('Design 3 of 10');
    expect(markup).toContain('Selected Design Details');
    expect(markup).toContain('Customer Favorite');
    expect(markup).toContain('Compare Selected (2)');
    expect(markup).toContain('Generated Design Options');

    for (let optionNumber = 1; optionNumber <= 10; optionNumber += 1) {
      expect(markup).toContain(`Design ${optionNumber.toString().padStart(2, '0')}`);
    }
  });

  it('renders an empty state when no generated designs are available', () => {
    const markup = renderToStaticMarkup(<KitchenStudioScreen designs={[]} />);

    expect(markup).toContain('No generated designs are available yet.');
  });

  it('shows comparison limit guidance when the active design cannot be added', () => {
    const designs = createMockKitchenDesigns(4);
    const markup = renderToStaticMarkup(
      <KitchenStudioScreen
        designs={designs}
        activeDesignId="design-04"
        selectedComparisonDesignIds={['design-01', 'design-02', 'design-03']}
      />,
    );

    expect(markup).toContain('Remove another design before adding this one.');
    expect(markup).toContain('Comparison is limited to 3 designs.');
  });
});
