import { KitchenImageCard } from '../components/shared/KitchenImageCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { SectionCard } from '../components/shared/SectionCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import type { Estimate, KitchenDesign, ReviewData } from '../types';
import { formatSmartKitchenCurrency } from '../utils/smartKitchenCalculations';

export interface PresentationScreenProps {
  readonly design: KitchenDesign;
  readonly estimate: Estimate;
  readonly reviewData: ReviewData;
  readonly onDownloadPdf?: () => void;
  readonly onExitPresentation?: () => void;
  readonly onContinueToExport?: () => void;
}

function PresentationMenu() {
  const sections = ['Images', 'Materials', 'Estimate', 'Floor Plan', 'Elevations'];

  return (
    <nav aria-label="Presentation sections" className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
      <ul className="space-y-1 text-sm font-semibold text-slate-600">
        {sections.map((section, index) => (
          <li key={section}>
            <a
              href={`#presentation-${section.toLowerCase().replaceAll(' ', '-')}`}
              className={index === 0 ? 'block border-l-2 border-pelican-teal px-3 py-2 text-pelican-teal' : 'block border-l-2 border-transparent px-3 py-2 hover:text-pelican-teal'}
            >
              {section}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MaterialTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EstimateRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

export function PresentationScreen({
  design,
  estimate,
  reviewData,
  onDownloadPdf,
  onExitPresentation,
  onContinueToExport,
}: PresentationScreenProps) {
  const finalTotal = estimate.recalculatedTotal ?? estimate.roughTotal + estimate.upgradesTotal;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge variant="success">Step 6 of 7</StatusBadge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Presentation</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">{reviewData.projectName} - {reviewData.roomName}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton variant="secondary" onClick={onDownloadPdf}>Download PDF</PrimaryButton>
          <PrimaryButton onClick={onExitPresentation}>Exit Presentation</PrimaryButton>
          <PrimaryButton variant="secondary" onClick={onContinueToExport}>Continue to Final Export</PrimaryButton>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <PresentationMenu />
        <div className="space-y-6">
          <section id="presentation-images" className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <KitchenImageCard
              imageUrl={design.imageUrl}
              alt={`${design.title} proposed kitchen presentation render`}
              title="PROPOSED DESIGN"
              subtitle={design.title}
              badge={<StatusBadge variant="ai">Customer Proposal</StatusBadge>}
              imageClassName="min-h-[28rem]"
            />
            <SectionCard title={design.styleName} description="Modern customer-facing proposal summary.">
              <p className="text-sm leading-6 text-slate-600">{design.description}</p>
              <div className="mt-5 space-y-3">
                <EstimateRow label="Design Style" value={design.styleName} />
                <EstimateRow label="Design ID" value={design.id} />
                <EstimateRow label="Room" value={reviewData.roomName} />
                <EstimateRow label="Estimated Total" value={formatSmartKitchenCurrency(finalTotal)} />
              </div>
            </SectionCard>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Materials & Finishes" description="Mood board for the selected kitchen." contentClassName="space-y-4">
              <div id="presentation-materials" className="grid gap-3 md:grid-cols-2">
                <MaterialTile label="Cabinetry" value={design.materials.cabinet} />
                <MaterialTile label="Countertop" value={design.materials.countertop} />
                <MaterialTile label="Backsplash" value={design.materials.backsplash} />
                <MaterialTile label="Hardware" value={design.materials.hardware} />
                <MaterialTile label="Flooring" value={design.materials.flooring} />
                <MaterialTile label="Palette" value={reviewData.style.palette.join(' / ')} />
              </div>
            </SectionCard>

            <SectionCard title="Estimate Summary" description="Customer-facing project estimate range.">
              <div id="presentation-estimate" className="space-y-2">
                {estimate.breakdown.map((item) => (
                  <EstimateRow key={item.id} label={item.label} value={formatSmartKitchenCurrency(item.amount)} />
                ))}
                <div className="mt-4 rounded-2xl bg-cyan-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Total Project Estimate</p>
                  <p className="mt-1 text-3xl font-bold text-pelican-teal">{formatSmartKitchenCurrency(finalTotal)}</p>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">{estimate.disclaimer}</p>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Floor Plan" description="2D plan preview and key measurements.">
              <div id="presentation-floor-plan" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-950">{reviewData.measurements.shape} kitchen layout</p>
                <p className="mt-2 text-sm text-slate-600">
                  {reviewData.measurements.roomWidth.value} {reviewData.measurements.roomWidth.unit} x {reviewData.measurements.roomLength.value} {reviewData.measurements.roomLength.unit}
                </p>
                <p className="mt-1 text-sm text-slate-600">{reviewData.measurements.totalAreaSqFt} sq ft</p>
              </div>
            </SectionCard>

            <SectionCard title="Elevations" description="Production drawings will be attached later in the export step.">
              <div id="presentation-elevations" className="grid gap-3 md:grid-cols-2">
                {['Island Elevation', 'Range Wall Elevation', 'Sink Wall Elevation', 'Refrigerator Wall Elevation'].map((label) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">
                    {label}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 text-center">
            <p className="text-lg font-bold text-slate-950">Designed with you in mind</p>
            <p className="mt-2 text-sm text-slate-600">A polished proposal for customer review before production handoff.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
