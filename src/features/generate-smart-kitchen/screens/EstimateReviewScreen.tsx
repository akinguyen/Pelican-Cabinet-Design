import { useMemo, useState } from 'react';
import { KitchenImageCard } from '../components/shared/KitchenImageCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { SectionCard } from '../components/shared/SectionCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import type { Estimate, KitchenDesign, OptionalEstimateItem } from '../types';
import {
  buildEstimateWithOptionalItems,
  formatSmartKitchenCurrency,
  formatSmartKitchenPriceRange,
  toggleOptionalEstimateItem,
} from '../utils/smartKitchenCalculations';

export interface EstimateReviewScreenProps {
  readonly design: KitchenDesign;
  readonly estimate: Estimate;
  readonly onBackToComparison?: () => void;
  readonly onRecalculateEstimate?: (optionalItems: readonly OptionalEstimateItem[]) => Promise<void> | void;
  readonly onSavePreferredBudgetVersion?: (estimate: Estimate) => Promise<void> | void;
  readonly onCreatePresentation?: () => void;
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function getBudgetFitLabel(estimate: Estimate): string {
  return estimate.withinTargetBudget ? 'Within Budget' : 'Over Target Budget';
}

export function EstimateReviewScreen({
  design,
  estimate,
  onBackToComparison,
  onRecalculateEstimate,
  onSavePreferredBudgetVersion,
  onCreatePresentation,
}: EstimateReviewScreenProps) {
  const [optionalItems, setOptionalItems] = useState<readonly OptionalEstimateItem[]>(estimate.optionalItems);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const displayedEstimate = useMemo(
    () => buildEstimateWithOptionalItems(estimate, optionalItems),
    [estimate, optionalItems],
  );
  const finalTotal = displayedEstimate.recalculatedTotal ?? displayedEstimate.roughTotal + displayedEstimate.upgradesTotal;
  const remainingBudget = displayedEstimate.targetBudget - finalTotal;

  async function handleToggleUpgrade(itemId: string): Promise<void> {
    setOptionalItems((currentItems) => toggleOptionalEstimateItem(currentItems, itemId));
  }

  async function handleRecalculate(): Promise<void> {
    setIsRecalculating(true);
    try {
      await onRecalculateEstimate?.(optionalItems);
    } finally {
      setIsRecalculating(false);
    }
  }

  async function handleSavePreferredBudget(): Promise<void> {
    setIsSaving(true);
    try {
      await onSavePreferredBudgetVersion?.(displayedEstimate);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge variant="info">Step 5 of 7</StatusBadge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Estimate Review</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review the cost breakdown for the selected customer favorite and adjust optional upgrades before saving the
            preferred budget version.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton variant="secondary" onClick={onBackToComparison}>Back to Comparison</PrimaryButton>
          <PrimaryButton variant="secondary" onClick={handleRecalculate} isLoading={isRecalculating}>
            Recalculate Final Estimate
          </PrimaryButton>
          <PrimaryButton onClick={handleSavePreferredBudget} isLoading={isSaving}>
            Save as Preferred Budget Version
          </PrimaryButton>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <SectionCard title="Selected Customer Favorite" description="Design summary for estimate discussion.">
            <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <KitchenImageCard
                imageUrl={design.imageUrl}
                alt={`${design.title} selected design render`}
                title={design.title}
                subtitle={design.styleName}
                badge={<StatusBadge variant="success">Customer Favorite</StatusBadge>}
              />
              <div className="space-y-4">
                <div>
                  <p className="text-xl font-bold text-slate-950">{design.styleName}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{design.description}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryRow label="Price range" value={formatSmartKitchenPriceRange(design.estimatedPriceRange)} />
                  <SummaryRow label="Cabinet style" value={design.materials.cabinet} />
                  <SummaryRow label="Countertop" value={design.materials.countertop} />
                  <SummaryRow label="Backsplash" value={design.materials.backsplash} />
                  <SummaryRow label="Flooring" value={design.materials.flooring} />
                  <SummaryRow label="Hardware" value={design.materials.hardware} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Price Breakdown" description="Preliminary category estimate before production review.">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Estimated Cost</th>
                    <th className="px-4 py-3 text-right">Percent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedEstimate.breakdown.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold text-slate-950">{item.label}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatSmartKitchenCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{item.percentOfTotal}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-slate-950">Total Rough Estimate</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-950">
                      {formatSmartKitchenCurrency(displayedEstimate.roughTotal)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Upgrade Options (Optional)" description="Toggle upgrades to update the rough estimate instantly.">
            <div className="grid gap-3 md:grid-cols-2">
              {optionalItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.selected}
                  onClick={() => {
                    void handleToggleUpgrade(item.id);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                    <span className={item.selected ? 'rounded-full bg-pelican-teal px-3 py-1 text-xs font-bold text-white' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500'}>
                      {item.selected ? 'On' : 'Off'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-pelican-teal">+{formatSmartKitchenCurrency(item.amount)}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryRow label="Rough Estimate" value={formatSmartKitchenCurrency(displayedEstimate.roughTotal)} />
              <SummaryRow label="Upgrades Total" value={formatSmartKitchenCurrency(displayedEstimate.upgradesTotal)} />
              <SummaryRow label="Recalculated Final Estimate" value={formatSmartKitchenCurrency(finalTotal)} />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <SectionCard title="Budget Fit Summary" description="Sales discussion snapshot.">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                <StatusBadge variant={displayedEstimate.withinTargetBudget ? 'success' : 'warning'}>
                  {getBudgetFitLabel(displayedEstimate)}
                </StatusBadge>
                <p className="mt-3 text-3xl font-bold text-slate-950">{formatSmartKitchenCurrency(finalTotal)}</p>
                <p className="mt-1 text-sm text-slate-500">Current recalculated estimate</p>
              </div>
              <SummaryRow label="Target budget" value={formatSmartKitchenCurrency(displayedEstimate.targetBudget)} />
              <SummaryRow
                label={remainingBudget >= 0 ? 'Remaining amount' : 'Amount over target'}
                value={formatSmartKitchenCurrency(Math.abs(remainingBudget))}
              />
            </div>
          </SectionCard>

          <SectionCard title="What's Included">
            <ul className="space-y-2 text-sm text-slate-600">
              {displayedEstimate.breakdown.map((item) => <li key={item.id}>✓ {item.label}</li>)}
            </ul>
            <p className="mt-4 text-xs leading-5 text-slate-500">{displayedEstimate.disclaimer}</p>
          </SectionCard>

          <SectionCard title="Next Step">
            <p className="text-sm leading-6 text-slate-600">
              After saving the preferred budget version, create a presentation for the customer-facing proposal.
            </p>
            <div className="mt-4">
              <PrimaryButton fullWidth onClick={onCreatePresentation}>Create Presentation</PrimaryButton>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
