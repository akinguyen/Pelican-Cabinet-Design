import { describe, expect, it } from 'vitest';
import {
  calculateDesignOverallScore,
  canCompareSelectedDesigns,
  canSelectComparisonDesign,
  createMockKitchenDesign,
  createMockKitchenDesigns,
  findKitchenDesignById,
  formatComparisonPriceSummary,
  formatSmartKitchenPriceRange,
  getActiveKitchenDesign,
  getCabinetCountFromDesign,
  getKitchenDesignsByIds,
  getRecommendationBadges,
  summarizeComparisonDesigns,
  toggleComparisonDesignSelection,
} from '../index';

describe('smartKitchenCalculations', () => {
  it('finds the active design and falls back to the first design', () => {
    const designs = createMockKitchenDesigns(3);

    expect(getActiveKitchenDesign(designs, 'design-02')?.id).toBe('design-02');
    expect(getActiveKitchenDesign(designs, 'missing-design')?.id).toBe('design-01');
    expect(findKitchenDesignById(designs, 'design-03')?.title).toBe('Design 03');
  });

  it('returns designs by selected ids while preserving design order', () => {
    const designs = createMockKitchenDesigns(5);
    const selected = getKitchenDesignsByIds(designs, ['design-04', 'design-02']);

    expect(selected.map((design) => design.id)).toEqual(['design-02', 'design-04']);
  });

  it('handles comparison selection limits deterministically', () => {
    const selected = ['design-01', 'design-02', 'design-03'];

    expect(canSelectComparisonDesign(selected, 'design-03')).toBe(true);
    expect(canSelectComparisonDesign(selected, 'design-04')).toBe(false);
    expect(toggleComparisonDesignSelection(selected, 'design-04')).toEqual(selected);
    expect(toggleComparisonDesignSelection(selected, 'design-02')).toEqual(['design-01', 'design-03']);
    expect(canCompareSelectedDesigns(['design-01'])).toBe(false);
    expect(canCompareSelectedDesigns(['design-01', 'design-02'])).toBe(true);
  });

  it('calculates scores, cabinet count, and formatted price ranges', () => {
    const design = createMockKitchenDesign(3);

    expect(calculateDesignOverallScore(design)).toBeGreaterThan(0);
    expect(getCabinetCountFromDesign(design)).toBe(20);
    expect(formatSmartKitchenPriceRange(design.estimatedPriceRange)).toContain('$');
  });

  it('summarizes compared designs and recommends badge winners', () => {
    const designs = createMockKitchenDesigns(3);
    const summary = summarizeComparisonDesigns(designs);
    const badges = getRecommendationBadges(designs[1], designs);

    expect(summary.selectedCount).toBe(3);
    expect(summary.maxEstimatedPrice).toBeGreaterThan(summary.minEstimatedPrice);
    expect(summary.averageStorageScore).toBeGreaterThan(0);
    expect(summary.bestOverallDesignId).toBe('design-02');
    expect(formatComparisonPriceSummary(summary)).toContain('$');
    expect(badges).toContain('Best Overall');
  });
});
