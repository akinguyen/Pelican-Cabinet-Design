import type { SmartKitchenValidationResult } from '../api/smartKitchenApi';
import { KitchenImageCard } from '../components/shared/KitchenImageCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { SectionCard } from '../components/shared/SectionCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { SMART_KITCHEN_REQUESTED_DESIGN_COUNT } from '../constants';
import type { ReviewData } from '../types';

export interface ReviewConfirmScreenProps {
  readonly reviewData: ReviewData;
  readonly validationResult?: SmartKitchenValidationResult | null;
  readonly isGenerating?: boolean;
  readonly onGenerateDesigns?: () => void;
}

function formatDimension(value: number, unit: string): string {
  return `${value} ${unit}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function ReviewConfirmScreen({
  reviewData,
  validationResult,
  isGenerating = false,
  onGenerateDesigns,
}: ReviewConfirmScreenProps) {
  const issueCount = (validationResult?.errors.length ?? 0) + (validationResult?.warnings.length ?? 0);
  const hasBlockingErrors = (validationResult?.errors.length ?? 0) > 0;
  const primaryCtaLabel = `Generate ${SMART_KITCHEN_REQUESTED_DESIGN_COUNT} AI Designs`;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge variant="info">Step 1 of 7</StatusBadge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Review &amp; Confirm Kitchen</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review the imported kitchen details before the AI creates design options. This step keeps generation
            intentional and gives the salesperson a clear summary to review with the customer.
          </p>
        </div>
        <PrimaryButton
          isLoading={isGenerating}
          disabled={hasBlockingErrors}
          onClick={onGenerateDesigns}
          className="shrink-0"
        >
          {primaryCtaLabel}
        </PrimaryButton>
      </div>

      {issueCount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold">Some reviewed items need attention before final production.</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {validationResult?.errors.map((issue) => <li key={issue.id}>{issue.message}</li>)}
            {validationResult?.warnings.map((issue) => <li key={issue.id}>{issue.message}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <SectionCard title="Kitchen Space" description="Imported room measurements and openings.">
            <div className="grid gap-4 md:grid-cols-2">
              <SummaryRow label="Kitchen shape" value={reviewData.measurements.shape} />
              <SummaryRow label="Room width" value={formatDimension(reviewData.measurements.roomWidth.value, reviewData.measurements.roomWidth.unit)} />
              <SummaryRow label="Room length" value={formatDimension(reviewData.measurements.roomLength.value, reviewData.measurements.roomLength.unit)} />
              <SummaryRow label="Ceiling height" value={formatDimension(reviewData.measurements.ceilingHeight.value, reviewData.measurements.ceilingHeight.unit)} />
              <SummaryRow label="Total area" value={`${reviewData.measurements.totalAreaSqFt} sq ft`} />
              <SummaryRow label="Openings" value={reviewData.measurements.openings.length.toString()} />
            </div>
          </SectionCard>

          <SectionCard title="Style & Preferences" description="Customer-facing design direction for generation.">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{reviewData.style.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {reviewData.style.tags.map((tag) => <StatusBadge key={tag} variant="neutral">{tag}</StatusBadge>)}
                </div>
              </div>
              <div className="flex gap-2" aria-label="Selected color palette">
                {reviewData.style.palette.map((color) => (
                  <span
                    key={color}
                    className="h-8 w-8 rounded-full border border-slate-200 shadow-sm"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <SummaryRow label="Cabinet style" value={reviewData.style.materials.cabinetDoorStyle} />
              <SummaryRow label="Cabinet finish" value={reviewData.style.materials.cabinetFinish} />
              <SummaryRow label="Countertop" value={reviewData.style.materials.countertop} />
              <SummaryRow label="Backsplash" value={reviewData.style.materials.backsplash} />
              <SummaryRow label="Hardware" value={reviewData.style.materials.hardware} />
              <SummaryRow label="Flooring" value={reviewData.style.materials.flooring} />
            </div>
          </SectionCard>

          <SectionCard title="Appliances & Fixtures" description="Required appliance selections for AI layout planning.">
            <div className="grid gap-3 md:grid-cols-2">
              {reviewData.appliances.map((appliance) => (
                <div key={appliance.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{appliance.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{appliance.kind}</p>
                    </div>
                    <StatusBadge variant={appliance.required ? 'success' : 'neutral'}>
                      {appliance.required ? 'Required' : 'Optional'}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Storage & Features" description="Cabinet, storage, and special feature priorities.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Storage needs</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {reviewData.storageNeeds.map((need) => <li key={need}>• {need}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Special features</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {reviewData.specialFeatures.map((feature) => <li key={feature}>• {feature}</li>)}
                </ul>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Budget & Notes"
            description="Budget target and salesperson/customer notes."
            footer={<span className="text-xs text-slate-500">Generation will not start until the primary CTA is clicked.</span>}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SummaryRow label="Target budget" value={formatCurrency(reviewData.budget.targetBudget)} />
              <SummaryRow label="Budget level" value={reviewData.budget.budgetLevel} />
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {reviewData.customerNotes}
            </p>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard title="Project Summary" description="Ready for AI input.">
            <KitchenImageCard
              imageUrl="/mock/smart-kitchen/review-summary.jpg"
              alt="Review summary kitchen preview"
              title={reviewData.projectName}
              subtitle={reviewData.roomName}
            />
            <div className="mt-4">
              <SummaryRow label="Customer" value={reviewData.customerName} />
              <SummaryRow label="Style" value={reviewData.style.name} />
              <SummaryRow label="Designs to generate" value={SMART_KITCHEN_REQUESTED_DESIGN_COUNT.toString()} />
              <SummaryRow label="Target budget" value={formatCurrency(reviewData.budget.targetBudget)} />
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
