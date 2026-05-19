import { useState } from 'react';
import { KitchenImageCard } from '../components/shared/KitchenImageCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { SectionCard } from '../components/shared/SectionCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { SMART_KITCHEN_EXPORT_FILE_TYPES } from '../constants';
import type {
  Estimate,
  ExportFileType,
  KitchenDesign,
  ProductionHandoffFormData,
  ReviewData,
  SmartKitchenProject,
} from '../types';
import { formatSmartKitchenCurrency } from '../utils/smartKitchenCalculations';

export type ExportActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ExportActionResult {
  readonly downloadUrl: string;
  readonly fileName?: string;
}

export interface ExportActionStateItem {
  readonly status: ExportActionStatus;
  readonly errorMessage?: string;
  readonly downloadUrl?: string;
}

export type ExportActionState = Record<ExportFileType, ExportActionStateItem>;

export interface FinalReviewExportScreenProps {
  readonly project: SmartKitchenProject;
  readonly design: KitchenDesign;
  readonly estimate: Estimate;
  readonly reviewData?: ReviewData;
  readonly handoffFormData?: ProductionHandoffFormData | null;
  readonly onBackToPresentation?: () => void;
  readonly onExportFile?: (fileType: ExportFileType) => Promise<ExportActionResult | void> | ExportActionResult | void;
  readonly onSendInternalTeam?: () => void;
  readonly initialExportActionState?: Partial<ExportActionState>;
}

export function createInitialExportActionState(overrides: Partial<ExportActionState> = {}): ExportActionState {
  return Object.fromEntries(
    SMART_KITCHEN_EXPORT_FILE_TYPES.map((definition) => [
      definition.type,
      overrides[definition.type] ?? { status: 'idle' as const },
    ]),
  ) as ExportActionState;
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function exportStatusLabel(status: ExportActionStatus): string {
  if (status === 'loading') {
    return 'Exporting';
  }

  if (status === 'success') {
    return 'Ready';
  }

  if (status === 'error') {
    return 'Failed';
  }

  return 'Export';
}

function exportStatusVariant(status: ExportActionStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'loading') {
    return 'info';
  }

  if (status === 'success') {
    return 'success';
  }

  if (status === 'error') {
    return 'danger';
  }

  return 'neutral';
}

export function FinalReviewExportScreen({
  project,
  design,
  estimate,
  reviewData = project.reviewData,
  handoffFormData = project.handoffFormData,
  onBackToPresentation,
  onExportFile,
  onSendInternalTeam,
  initialExportActionState = {},
}: FinalReviewExportScreenProps) {
  const [exportActionState, setExportActionState] = useState<ExportActionState>(() => (
    createInitialExportActionState(initialExportActionState)
  ));
  const finalTotal = estimate.recalculatedTotal ?? estimate.roughTotal + estimate.upgradesTotal;

  async function handleExport(fileType: ExportFileType): Promise<void> {
    setExportActionState((currentState) => ({
      ...currentState,
      [fileType]: { status: 'loading' },
    }));

    try {
      const result = await onExportFile?.(fileType);
      setExportActionState((currentState) => ({
        ...currentState,
        [fileType]: {
          status: 'success',
          downloadUrl: result?.downloadUrl ?? `/mock/downloads/${project.id}-${fileType}`,
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed.';
      setExportActionState((currentState) => ({
        ...currentState,
        [fileType]: { status: 'error', errorMessage },
      }));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge variant="info">Step 7 of 7</StatusBadge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Final Review &amp; Export</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review the completed design package, export customer and production files, then send the project to the
            internal team for production review.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton variant="secondary" onClick={onBackToPresentation}>Back to Presentation</PrimaryButton>
          <PrimaryButton variant="secondary">Download All ZIP</PrimaryButton>
          <PrimaryButton onClick={onSendInternalTeam}>Send to Internal Team</PrimaryButton>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Customer Presentation" description="Beautiful visuals for your client." className="ring-1 ring-cyan-100">
              <p className="text-sm leading-6 text-slate-600">
                Includes selected design images, material mood board, and customer-friendly estimate summary.
              </p>
              <div className="mt-4">
                <StatusBadge variant="success">Ready</StatusBadge>
              </div>
            </SectionCard>
            <SectionCard title="Production Handoff" description="Complete data for your internal team." className="ring-2 ring-cyan-100">
              <p className="text-sm leading-6 text-slate-600">
                Includes measurements, cabinet summary, material list, pricing workbook, and export files.
              </p>
              <div className="mt-4">
                <StatusBadge variant="info">Selected</StatusBadge>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Project Summary" description="Final selected design.">
              <KitchenImageCard
                imageUrl={design.thumbnailUrl || design.imageUrl}
                alt={`${design.title} final export thumbnail`}
                title={design.title}
                subtitle={design.styleName}
                badge={<StatusBadge variant="success">Customer Favorite</StatusBadge>}
              />
              <div className="mt-4 space-y-1">
                <SummaryRow label="Project" value={reviewData.projectName} />
                <SummaryRow label="Room" value={reviewData.roomName} />
                <SummaryRow label="Style" value={design.styleName} />
                <SummaryRow label="Design ID" value={design.id} />
              </div>
            </SectionCard>

            <SectionCard title="Key Measurements" description="Measurement snapshot for production review.">
              <SummaryRow label="Kitchen shape" value={reviewData.measurements.shape} />
              <SummaryRow
                label="Room width"
                value={`${reviewData.measurements.roomWidth.value} ${reviewData.measurements.roomWidth.unit}`}
              />
              <SummaryRow
                label="Room length"
                value={`${reviewData.measurements.roomLength.value} ${reviewData.measurements.roomLength.unit}`}
              />
              <SummaryRow
                label="Ceiling height"
                value={`${reviewData.measurements.ceilingHeight.value} ${reviewData.measurements.ceilingHeight.unit}`}
              />
              <SummaryRow label="Total area" value={`${reviewData.measurements.totalAreaSqFt} sq ft`} />
              <SummaryRow label="Openings" value={reviewData.measurements.openings.length.toString()} />
            </SectionCard>

            <SectionCard title="Cabinet List Summary" description="Production cabinet planning snapshot.">
              <SummaryRow label="Required cabinet groups" value={reviewData.cabinetRequirements.length.toString()} />
              <SummaryRow
                label="Total cabinet quantity"
                value={reviewData.cabinetRequirements.reduce((total, item) => total + item.quantity, 0).toString()}
              />
              <SummaryRow label="Cabinet finish" value={design.materials.cabinet} />
              <SummaryRow label="Storage score" value={design.scores.storage.toString()} />
            </SectionCard>

            <SectionCard title="Materials List Summary" description="Selected finish package.">
              <SummaryRow label="Countertop" value={design.materials.countertop} />
              <SummaryRow label="Backsplash" value={design.materials.backsplash} />
              <SummaryRow label="Flooring" value={design.materials.flooring} />
              <SummaryRow label="Hardware" value={design.materials.hardware} />
            </SectionCard>
          </div>

          <SectionCard title="Pricing Summary" description="Preferred budget version.">
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryRow label="Rough estimate" value={formatSmartKitchenCurrency(estimate.roughTotal)} />
              <SummaryRow label="Upgrades" value={formatSmartKitchenCurrency(estimate.upgradesTotal)} />
              <SummaryRow label="Final estimate" value={formatSmartKitchenCurrency(finalTotal)} />
            </div>
          </SectionCard>

          <SectionCard title="Export Your Design" description="Each export runs independently, so one failed export does not block the others.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {SMART_KITCHEN_EXPORT_FILE_TYPES.map((definition) => {
                const actionState = exportActionState[definition.type];

                return (
                  <div key={definition.type} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{definition.label}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{definition.extension}</p>
                      </div>
                      <StatusBadge variant={exportStatusVariant(actionState.status)}>{exportStatusLabel(actionState.status)}</StatusBadge>
                    </div>
                    <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{definition.description}</p>
                    {actionState.errorMessage ? <p className="mt-2 text-xs text-red-600">{actionState.errorMessage}</p> : null}
                    {actionState.downloadUrl ? <p className="mt-2 text-xs text-emerald-700">Export ready</p> : null}
                    <div className="mt-4">
                      <PrimaryButton
                        variant="secondary"
                        fullWidth
                        isLoading={actionState.status === 'loading'}
                        onClick={() => {
                          void handleExport(definition.type);
                        }}
                      >
                        {exportStatusLabel(actionState.status)}
                      </PrimaryButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard title="Handoff Checklist" description="Readiness before internal submission.">
            <ul className="space-y-2 text-sm text-slate-600">
              <li>✓ Customer favorite selected</li>
              <li>✓ Preferred budget version saved</li>
              <li>✓ Presentation package ready</li>
              <li>✓ Production export options available</li>
            </ul>
          </SectionCard>

          <SectionCard title="Data Security">
            <p className="text-sm leading-6 text-slate-600">
              Export packages are generated for the current project only and should be reviewed before ordering.
            </p>
          </SectionCard>

          <SectionCard title="Internal Handoff Preview" description="Default routing details.">
            <SummaryRow label="Assigned to" value={handoffFormData?.assignedTo ?? 'Production Team'} />
            <SummaryRow label="Priority" value={handoffFormData?.priority ?? 'normal'} />
            <SummaryRow label="Approval" value={handoffFormData?.customerApprovalStatus ?? 'pending'} />
            <SummaryRow label="Payment" value={handoffFormData?.paymentStatus ?? 'notCollected'} />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
