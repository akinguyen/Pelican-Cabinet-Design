import { KitchenImageCard } from '../components/shared/KitchenImageCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { SectionCard } from '../components/shared/SectionCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import {
  SMART_KITCHEN_MAX_COMPARISON_DESIGNS,
  SMART_KITCHEN_MIN_COMPARISON_DESIGNS,
  SMART_KITCHEN_REQUESTED_DESIGN_COUNT,
} from '../constants';
import type { KitchenDesign } from '../types';
import {
  canCompareSelectedDesigns,
  canSelectComparisonDesign,
  calculateDesignOverallScore,
  findKitchenDesignById,
  formatSmartKitchenPriceRange,
  getActiveKitchenDesign,
  getCabinetCountFromDesign,
} from '../utils/smartKitchenCalculations';

export interface KitchenStudioScreenProps {
  readonly designs: readonly KitchenDesign[];
  readonly activeDesignId?: string | null;
  readonly selectedComparisonDesignIds?: readonly string[];
  readonly customerFavoriteDesignId?: string | null;
  readonly onActiveDesignChange?: (designId: string) => void;
  readonly onMarkCustomerFavorite?: (designId: string) => void;
  readonly onAddComparisonDesign?: (designId: string) => void;
  readonly onRemoveComparisonDesign?: (designId: string) => void;
  readonly onOpenComparison?: () => void;
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { readonly label: string; readonly value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span>{clampedValue}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-pelican-teal" style={{ width: `${clampedValue}%` }} />
      </div>
    </div>
  );
}

function getComparisonButtonLabel(isSelected: boolean): string {
  return isSelected ? 'Remove from Compare' : 'Add to Compare';
}

export function KitchenStudioScreen({
  designs,
  activeDesignId,
  selectedComparisonDesignIds = [],
  customerFavoriteDesignId,
  onActiveDesignChange,
  onMarkCustomerFavorite,
  onAddComparisonDesign,
  onRemoveComparisonDesign,
  onOpenComparison,
}: KitchenStudioScreenProps) {
  const activeDesign = getActiveKitchenDesign(designs, activeDesignId);
  const canOpenComparison = canCompareSelectedDesigns(selectedComparisonDesignIds);

  if (!activeDesign) {
    return (
      <div className="mx-auto max-w-4xl">
        <SectionCard title="AI Kitchen Studio" description="Generated designs will appear here after generation completes.">
          <p className="text-sm text-slate-600">No generated designs are available yet.</p>
        </SectionCard>
      </div>
    );
  }

  const selectedActiveDesignId = activeDesign.id;
  const activeDesignIsFavorite = customerFavoriteDesignId === selectedActiveDesignId;
  const activeDesignIsSelectedForComparison = selectedComparisonDesignIds.includes(selectedActiveDesignId);
  const activeCabinetCount = getCabinetCountFromDesign(activeDesign);
  const activeOverallScore = calculateDesignOverallScore(activeDesign);
  const activeDesignPosition = designs.findIndex((design) => design.id === selectedActiveDesignId) + 1;
  const activeSelectionAllowed = canSelectComparisonDesign(selectedComparisonDesignIds, selectedActiveDesignId);
  const activeComparisonLabel = getComparisonButtonLabel(activeDesignIsSelectedForComparison);

  function handleToggleActiveComparison() {
    if (activeDesignIsSelectedForComparison) {
      onRemoveComparisonDesign?.(selectedActiveDesignId);
      return;
    }

    if (activeSelectionAllowed) {
      onAddComparisonDesign?.(selectedActiveDesignId);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge variant="info">Step 3 of 7</StatusBadge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">AI Kitchen Studio</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Browse {SMART_KITCHEN_REQUESTED_DESIGN_COUNT} generated kitchen options, choose an active design, and pick
            two to three concepts for an in-home customer comparison.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton
            variant="secondary"
            disabled={!canOpenComparison}
            onClick={onOpenComparison}
          >
            Compare Selected ({selectedComparisonDesignIds.length})
          </PrimaryButton>
          <PrimaryButton onClick={() => onMarkCustomerFavorite?.(selectedActiveDesignId)}>
            {activeDesignIsFavorite ? 'Customer Favorite' : 'Mark as Customer Favorite'}
          </PrimaryButton>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <SectionCard title={activeDesign.title} description={activeDesign.description}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
              <div className="relative aspect-[16/9] bg-slate-900">
                <img
                  src={activeDesign.imageUrl}
                  alt={`${activeDesign.title} kitchen render`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <StatusBadge variant="ai">Design {activeDesignPosition} of {designs.length}</StatusBadge>
                  {activeDesignIsFavorite ? <StatusBadge variant="success">Customer Favorite</StatusBadge> : null}
                </div>
                <div className="absolute bottom-4 left-4 rounded-full bg-slate-950/80 px-4 py-2 text-sm font-semibold text-white">
                  View in 3D preview coming later
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Generated Design Options"
            description="Select a thumbnail to change the active kitchen design."
          >
            <div className="flex gap-4 overflow-x-auto pb-2" aria-label="Generated design thumbnails">
              {designs.map((design) => {
                const isActive = design.id === selectedActiveDesignId;
                const isFavorite = design.id === customerFavoriteDesignId;
                const isSelected = selectedComparisonDesignIds.includes(design.id);

                return (
                  <button
                    key={design.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`Select ${design.title}`}
                    onClick={() => onActiveDesignChange?.(design.id)}
                    className="w-44 shrink-0 rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pelican-teal"
                  >
                    <KitchenImageCard
                      imageUrl={design.thumbnailUrl}
                      alt={`${design.title} thumbnail`}
                      title={design.title}
                      subtitle={design.styleName}
                      isActive={isActive}
                      badge={
                        isFavorite ? <StatusBadge variant="success">Favorite</StatusBadge>
                          : isSelected ? <StatusBadge variant="info">Compare</StatusBadge>
                            : undefined
                      }
                    />
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Refine with AI" description="Refinement will be implemented in a later step.">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
              <p className="text-sm text-slate-600">
                The active design is ready for the future AI refinement composer. Step 5 only adds browsing,
                favorite selection, and comparison selection.
              </p>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard title="Selected Design Details" description="Sales talking points for the active option.">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{activeDesign.title}</h2>
                <p className="mt-1 text-sm font-semibold text-pelican-teal">{activeDesign.styleName}</p>
              </div>
              <StatusBadge variant="ai">Score {activeOverallScore}</StatusBadge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeDesign.tags.map((tag) => <StatusBadge key={tag} variant="neutral">{tag}</StatusBadge>)}
            </div>
            <p className="mt-5 text-2xl font-bold text-pelican-teal">
              {formatSmartKitchenPriceRange(activeDesign.estimatedPriceRange)}
            </p>
            <div className="mt-5 space-y-3">
              <ScoreBar label="Storage" value={activeDesign.scores.storage} />
              <ScoreBar label="Style match" value={activeDesign.scores.styleMatch} />
              <ScoreBar label="Budget fit" value={activeDesign.scores.budgetFit} />
              <ScoreBar label="Layout efficiency" value={activeDesign.scores.layoutEfficiency} />
            </div>
            <div className="mt-5">
              <DetailRow label="Cabinet count" value={activeCabinetCount === null ? 'TBD' : activeCabinetCount.toString()} />
              <DetailRow label="Materials" value={activeDesign.materials.cabinet} />
              <DetailRow label="Countertop" value={activeDesign.materials.countertop} />
            </div>
          </SectionCard>

          <SectionCard title="Key Features">
            <ul className="space-y-2 text-sm text-slate-600">
              {activeDesign.keyFeatures.map((feature) => <li key={feature}>✓ {feature}</li>)}
            </ul>
          </SectionCard>

          <SectionCard title="Layout Summary">
            <p className="text-sm leading-6 text-slate-600">{activeDesign.layoutSummary}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{activeDesign.storageSummary}</p>
          </SectionCard>

          <SectionCard
            title="Comparison Selection"
            description={`Choose ${SMART_KITCHEN_MIN_COMPARISON_DESIGNS}-${SMART_KITCHEN_MAX_COMPARISON_DESIGNS} designs.`}
          >
            <PrimaryButton
              variant={activeDesignIsSelectedForComparison ? 'secondary' : 'primary'}
              disabled={!activeDesignIsSelectedForComparison && !activeSelectionAllowed}
              onClick={handleToggleActiveComparison}
              fullWidth
            >
              {activeComparisonLabel}
            </PrimaryButton>
            {!activeDesignIsSelectedForComparison && !activeSelectionAllowed ? (
              <p className="mt-3 text-xs text-amber-700">
                Remove another design before adding this one. Comparison is limited to {SMART_KITCHEN_MAX_COMPARISON_DESIGNS} designs.
              </p>
            ) : null}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
