import { KitchenImageCard } from '../components/shared/KitchenImageCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { SectionCard } from '../components/shared/SectionCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import {
  SMART_KITCHEN_MAX_COMPARISON_DESIGNS,
  SMART_KITCHEN_MIN_COMPARISON_DESIGNS,
} from '../constants';
import type { KitchenDesign } from '../types';
import {
  canCompareSelectedDesigns,
  formatComparisonPriceSummary,
  formatSmartKitchenPriceRange,
  getCabinetCountFromDesign,
  getRecommendationBadges,
  summarizeComparisonDesigns,
} from '../utils/smartKitchenCalculations';

export interface CompareChooseScreenProps {
  readonly designs: readonly KitchenDesign[];
  readonly customerFavoriteDesignId?: string | null;
  readonly onMarkCustomerFavorite?: (designId: string) => void;
  readonly onBackToStudio?: () => void;
  readonly onContinueToEstimate?: () => void;
}

function ScoreRow({ label, value }: { readonly label: string; readonly value: number }) {
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

function CompactSummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

export function CompareChooseScreen({
  designs,
  customerFavoriteDesignId,
  onMarkCustomerFavorite,
  onBackToStudio,
  onContinueToEstimate,
}: CompareChooseScreenProps) {
  const summary = summarizeComparisonDesigns(designs);
  const canContinue = canCompareSelectedDesigns(designs.map((design) => design.id));
  const favoriteDesign = designs.find((design) => design.id === customerFavoriteDesignId) ?? null;

  if (designs.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <SectionCard title="Compare & Choose" description="Choose designs in the studio before comparing.">
          <p className="text-sm text-slate-600">No designs have been selected for comparison yet.</p>
          <div className="mt-4">
            <PrimaryButton variant="secondary" onClick={onBackToStudio}>Back to AI Kitchen Studio</PrimaryButton>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge variant="info">Step 4 of 7</StatusBadge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Compare &amp; Choose Your Kitchen</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review two to three generated options side by side with the customer, then choose one favorite before
            moving to estimate review.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton variant="secondary" onClick={onBackToStudio}>Back to Studio</PrimaryButton>
          <PrimaryButton disabled={!canContinue || !customerFavoriteDesignId} onClick={onContinueToEstimate}>
            Review Estimates &amp; Continue
          </PrimaryButton>
        </div>
      </div>

      {designs.length < SMART_KITCHEN_MIN_COMPARISON_DESIGNS || designs.length > SMART_KITCHEN_MAX_COMPARISON_DESIGNS ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Comparison works best with {SMART_KITCHEN_MIN_COMPARISON_DESIGNS} to {SMART_KITCHEN_MAX_COMPARISON_DESIGNS} designs.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-5 lg:grid-cols-3">
          {designs.map((design) => {
            const isFavorite = customerFavoriteDesignId === design.id;
            const recommendationBadges = getRecommendationBadges(design, designs);
            const cabinetCount = getCabinetCountFromDesign(design);

            return (
              <SectionCard
                key={design.id}
                title={design.title}
                description={design.styleName}
                className={isFavorite ? 'ring-2 ring-cyan-100' : undefined}
                action={isFavorite ? <StatusBadge variant="success">Customer Favorite</StatusBadge> : undefined}
              >
                <KitchenImageCard
                  imageUrl={design.imageUrl}
                  alt={`${design.title} comparison kitchen render`}
                  title={formatSmartKitchenPriceRange(design.estimatedPriceRange)}
                  subtitle={design.description}
                  badge={recommendationBadges[0] ? <StatusBadge variant="ai">{recommendationBadges[0]}</StatusBadge> : undefined}
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {recommendationBadges.map((badge) => <StatusBadge key={badge} variant="ai">{badge}</StatusBadge>)}
                </div>

                <div className="mt-5 space-y-3">
                  <ScoreRow label="Storage score" value={design.scores.storage} />
                  <ScoreRow label="Style match" value={design.scores.styleMatch} />
                  <ScoreRow label="Budget fit" value={design.scores.budgetFit} />
                </div>

                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  <CompactSummaryRow label="Cabinets" value={cabinetCount === null ? 'TBD' : cabinetCount.toString()} />
                  <CompactSummaryRow label="Cabinet finish" value={design.materials.cabinet} />
                  <CompactSummaryRow label="Countertop" value={design.materials.countertop} />
                </div>

                <div className="mt-5 grid gap-4 text-sm text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-950">Pros</p>
                    <ul className="mt-2 space-y-1">
                      {design.pros.slice(0, 2).map((pro) => <li key={pro}>+ {pro}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">Cons</p>
                    <ul className="mt-2 space-y-1">
                      {design.cons.slice(0, 2).map((con) => <li key={con}>- {con}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="mt-5">
                  <PrimaryButton
                    variant={isFavorite ? 'secondary' : 'primary'}
                    fullWidth
                    onClick={() => onMarkCustomerFavorite?.(design.id)}
                  >
                    {isFavorite ? 'Selected Favorite' : 'Select This Design'}
                  </PrimaryButton>
                </div>
              </SectionCard>
            );
          })}
        </div>

        <aside className="space-y-4">
          <SectionCard title="Comparison Summary" description="Customer decision snapshot.">
            <CompactSummaryRow label="Options selected" value={summary.selectedCount.toString()} />
            <CompactSummaryRow label="Price range" value={formatComparisonPriceSummary(summary)} />
            <CompactSummaryRow label="Avg. storage score" value={summary.averageStorageScore.toString()} />
            <CompactSummaryRow label="Avg. style match" value={summary.averageStyleMatchScore.toString()} />
            <CompactSummaryRow label="Avg. budget fit" value={summary.averageBudgetFitScore.toString()} />
          </SectionCard>

          <SectionCard title="Customer Favorite" description="Required before estimate review.">
            {favoriteDesign ? (
              <div>
                <p className="text-lg font-bold text-slate-950">{favoriteDesign.title}</p>
                <p className="mt-1 text-sm font-semibold text-pelican-teal">{favoriteDesign.styleName}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{favoriteDesign.description}</p>
                <div className="mt-4">
                  <StatusBadge variant="success">Ready for Estimate Review</StatusBadge>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                Select a customer favorite to unlock the estimate review step.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Need a Custom Option?">
            <p className="text-sm leading-6 text-slate-600">
              Return to the studio to select different designs or refine a concept in a future step.
            </p>
            <div className="mt-4">
              <PrimaryButton variant="secondary" onClick={onBackToStudio} fullWidth>Refine in Studio</PrimaryButton>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
