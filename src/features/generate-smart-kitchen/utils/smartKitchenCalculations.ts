import {
  SMART_KITCHEN_MAX_COMPARISON_DESIGNS,
  SMART_KITCHEN_MIN_COMPARISON_DESIGNS,
} from '../constants';
import type { DesignScores, Estimate, KitchenDesign, OptionalEstimateItem, PriceRange } from '../types';

export interface ComparisonSummary {
  readonly selectedCount: number;
  readonly minEstimatedPrice: number;
  readonly maxEstimatedPrice: number;
  readonly averageStorageScore: number;
  readonly averageStyleMatchScore: number;
  readonly averageBudgetFitScore: number;
  readonly bestOverallDesignId: string | null;
}

export type RecommendationBadge = 'Best Overall' | 'Best Budget' | 'Best Storage' | 'Best Style Match';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function roundScore(value: number): number {
  return Math.round(value);
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return roundScore(values.reduce((total, value) => total + value, 0) / values.length);
}

export function formatSmartKitchenCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatSmartKitchenPriceRange(priceRange: PriceRange): string {
  return `${formatSmartKitchenCurrency(priceRange.min)} – ${formatSmartKitchenCurrency(priceRange.max)}`;
}

export function calculateDesignOverallScore(design: KitchenDesign): number {
  const scores: readonly number[] = [
    design.scores.storage,
    design.scores.styleMatch,
    design.scores.budgetFit,
    design.scores.layoutEfficiency,
  ];

  return average(scores);
}

export function findKitchenDesignById(
  designs: readonly KitchenDesign[],
  designId: string | null | undefined,
): KitchenDesign | null {
  if (!designId) {
    return null;
  }

  return designs.find((design) => design.id === designId) ?? null;
}

export function getActiveKitchenDesign(
  designs: readonly KitchenDesign[],
  activeDesignId: string | null | undefined,
): KitchenDesign | null {
  return findKitchenDesignById(designs, activeDesignId) ?? designs[0] ?? null;
}

export function getKitchenDesignsByIds(
  designs: readonly KitchenDesign[],
  designIds: readonly string[],
): readonly KitchenDesign[] {
  const designIdSet = new Set(designIds);
  return designs.filter((design) => designIdSet.has(design.id));
}

export function canSelectComparisonDesign(
  selectedDesignIds: readonly string[],
  designId: string,
  maxSelections = SMART_KITCHEN_MAX_COMPARISON_DESIGNS,
): boolean {
  if (selectedDesignIds.includes(designId)) {
    return true;
  }

  return selectedDesignIds.length < maxSelections;
}

export function toggleComparisonDesignSelection(
  selectedDesignIds: readonly string[],
  designId: string,
  maxSelections = SMART_KITCHEN_MAX_COMPARISON_DESIGNS,
): readonly string[] {
  if (selectedDesignIds.includes(designId)) {
    return selectedDesignIds.filter((selectedDesignId) => selectedDesignId !== designId);
  }

  if (selectedDesignIds.length >= maxSelections) {
    return selectedDesignIds;
  }

  return [...selectedDesignIds, designId];
}

export function canCompareSelectedDesigns(
  selectedDesignIds: readonly string[],
  minSelections = SMART_KITCHEN_MIN_COMPARISON_DESIGNS,
  maxSelections = SMART_KITCHEN_MAX_COMPARISON_DESIGNS,
): boolean {
  return selectedDesignIds.length >= minSelections && selectedDesignIds.length <= maxSelections;
}

export function getCabinetCountFromDesign(design: KitchenDesign): number | null {
  const cabinetCount = design.designJson.cabinetCount;
  return isFiniteNumber(cabinetCount) ? cabinetCount : null;
}

export function getDesignScoreValue(design: KitchenDesign, scoreKey: keyof DesignScores): number {
  return design.scores[scoreKey];
}

function getBestDesignIdByScore(
  designs: readonly KitchenDesign[],
  scoreGetter: (design: KitchenDesign) => number,
): string | null {
  if (designs.length === 0) {
    return null;
  }

  return designs.reduce((bestDesign, design) => (
    scoreGetter(design) > scoreGetter(bestDesign) ? design : bestDesign
  )).id;
}

export function getRecommendationBadges(
  design: KitchenDesign,
  comparedDesigns: readonly KitchenDesign[],
): readonly RecommendationBadge[] {
  const badges: RecommendationBadge[] = [];
  const bestOverallDesignId = getBestDesignIdByScore(comparedDesigns, calculateDesignOverallScore);
  const bestBudgetDesignId = getBestDesignIdByScore(comparedDesigns, (candidate) => candidate.scores.budgetFit);
  const bestStorageDesignId = getBestDesignIdByScore(comparedDesigns, (candidate) => candidate.scores.storage);
  const bestStyleDesignId = getBestDesignIdByScore(comparedDesigns, (candidate) => candidate.scores.styleMatch);

  if (design.id === bestOverallDesignId) {
    badges.push('Best Overall');
  }

  if (design.id === bestBudgetDesignId) {
    badges.push('Best Budget');
  }

  if (design.id === bestStorageDesignId) {
    badges.push('Best Storage');
  }

  if (design.id === bestStyleDesignId) {
    badges.push('Best Style Match');
  }

  return badges;
}

export function summarizeComparisonDesigns(designs: readonly KitchenDesign[]): ComparisonSummary {
  const minEstimatedPrice = designs.length > 0
    ? Math.min(...designs.map((design) => design.estimatedPriceRange.min))
    : 0;
  const maxEstimatedPrice = designs.length > 0
    ? Math.max(...designs.map((design) => design.estimatedPriceRange.max))
    : 0;

  return {
    selectedCount: designs.length,
    minEstimatedPrice,
    maxEstimatedPrice,
    averageStorageScore: average(designs.map((design) => design.scores.storage)),
    averageStyleMatchScore: average(designs.map((design) => design.scores.styleMatch)),
    averageBudgetFitScore: average(designs.map((design) => design.scores.budgetFit)),
    bestOverallDesignId: getBestDesignIdByScore(designs, calculateDesignOverallScore),
  };
}

export function formatComparisonPriceSummary(summary: ComparisonSummary): string {
  if (summary.selectedCount === 0) {
    return 'No designs selected';
  }

  return `${formatSmartKitchenCurrency(summary.minEstimatedPrice)} – ${formatSmartKitchenCurrency(summary.maxEstimatedPrice)}`;
}

export function calculateSelectedUpgradeTotal(optionalItems: readonly OptionalEstimateItem[]): number {
  return optionalItems
    .filter((item) => item.selected)
    .reduce((total, item) => total + item.amount, 0);
}

export function calculateEstimateFinalTotal(roughTotal: number, optionalItems: readonly OptionalEstimateItem[]): number {
  return roughTotal + calculateSelectedUpgradeTotal(optionalItems);
}

export function toggleOptionalEstimateItem(
  optionalItems: readonly OptionalEstimateItem[],
  itemId: string,
): readonly OptionalEstimateItem[] {
  return optionalItems.map((item) => (
    item.id === itemId
      ? { ...item, selected: !item.selected }
      : item
  ));
}

export function buildEstimateWithOptionalItems(
  estimate: Estimate,
  optionalItems: readonly OptionalEstimateItem[],
): Estimate {
  const upgradesTotal = calculateSelectedUpgradeTotal(optionalItems);
  const recalculatedTotal = estimate.roughTotal + upgradesTotal;

  return {
    ...estimate,
    optionalItems,
    upgradesTotal,
    recalculatedTotal,
    withinTargetBudget: recalculatedTotal <= estimate.targetBudget,
  };
}
