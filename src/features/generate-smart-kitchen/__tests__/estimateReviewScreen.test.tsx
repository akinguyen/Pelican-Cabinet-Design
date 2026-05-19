import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EstimateReviewScreen,
  buildEstimateWithOptionalItems,
  createMockEstimate,
  createMockKitchenDesign,
  toggleOptionalEstimateItem,
} from '../index';

describe('EstimateReviewScreen', () => {
  it('renders estimate review details and optional upgrade toggles', () => {
    const design = createMockKitchenDesign(3);
    const estimate = createMockEstimate(design.id);
    const markup = renderToStaticMarkup(<EstimateReviewScreen design={design} estimate={estimate} />);

    expect(markup).toContain('Estimate Review');
    expect(markup).toContain('Selected Customer Favorite');
    expect(markup).toContain('Price Breakdown');
    expect(markup).toContain('Upgrade Options (Optional)');
    expect(markup).toContain('Premium Hardware');
    expect(markup).toContain('Under-Cabinet Lighting');
    expect(markup).toContain('Save as Preferred Budget Version');
    expect(markup).toContain('$44,700');
  });

  it('uses calculation helpers so toggling upgrades updates totals deterministically', () => {
    const estimate = createMockEstimate('design-03');
    const toggledItems = toggleOptionalEstimateItem(estimate.optionalItems, 'upgraded-countertop');
    const updatedEstimate = buildEstimateWithOptionalItems(estimate, toggledItems);

    expect(estimate.upgradesTotal).toBe(1950);
    expect(estimate.recalculatedTotal).toBe(44700);
    expect(updatedEstimate.upgradesTotal).toBe(3750);
    expect(updatedEstimate.recalculatedTotal).toBe(46500);
  });
});
