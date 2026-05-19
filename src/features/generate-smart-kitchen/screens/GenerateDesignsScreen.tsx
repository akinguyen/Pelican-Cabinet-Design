import { KitchenImageCard } from '../components/shared/KitchenImageCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { SectionCard } from '../components/shared/SectionCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { SMART_KITCHEN_GENERATION_PHASES } from '../constants';
import type { GenerationJob, GenerationPhaseDefinition, ReviewData } from '../types';

export interface GenerateDesignsScreenProps {
  readonly generationJob: GenerationJob | null;
  readonly reviewData: ReviewData;
  readonly phases?: readonly GenerationPhaseDefinition[];
  readonly onRefreshProgress?: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPhaseState(
  phase: GenerationPhaseDefinition,
  job: GenerationJob | null,
): 'completed' | 'active' | 'pending' {
  if (!job) {
    return phase === SMART_KITCHEN_GENERATION_PHASES[0] ? 'active' : 'pending';
  }

  if (job.activePhaseId === phase.id && job.status !== 'completed') {
    return 'active';
  }

  if (job.status === 'completed' || job.progressPercent >= phase.completedProgress) {
    return 'completed';
  }

  return 'pending';
}

function ProgressRing({ progressPercent }: { readonly progressPercent: number }) {
  return (
    <div className="flex h-52 w-52 items-center justify-center rounded-full border-[14px] border-cyan-100 bg-white shadow-sm">
      <div className="text-center">
        <p className="text-4xl font-bold text-pelican-teal">{progressPercent}%</p>
        <p className="mt-1 text-sm font-semibold text-slate-600">Generating...</p>
      </div>
    </div>
  );
}

export function GenerateDesignsScreen({
  generationJob,
  reviewData,
  phases = SMART_KITCHEN_GENERATION_PHASES,
  onRefreshProgress,
}: GenerateDesignsScreenProps) {
  const progressPercent = generationJob?.progressPercent ?? 0;
  const completedDesignCount = generationJob?.completedDesignCount ?? 0;
  const requestedDesignCount = generationJob?.requestedDesignCount ?? 10;
  const message = generationJob?.message ?? 'Preparing the AI generation job.';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge variant="ai">Step 2 of 7</StatusBadge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Generating Smart Kitchen Designs</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            The AI is analyzing the reviewed kitchen data, style preferences, budget, and appliance requirements to
            create customer-ready design options.
          </p>
        </div>
        <PrimaryButton variant="secondary" onClick={onRefreshProgress}>
          Check Progress
        </PrimaryButton>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <SectionCard title="Generation Progress" description={message}>
            <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-center">
              <div className="flex justify-center">
                <ProgressRing progressPercent={progressPercent} />
              </div>
              <ol className="space-y-3">
                {phases.map((phase) => {
                  const phaseState = getPhaseState(phase, generationJob);
                  const marker = phaseState === 'completed' ? '✓' : phaseState === 'active' ? '•' : phase.completedProgress;

                  return (
                    <li key={phase.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span
                        className={
                          phaseState === 'completed'
                            ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pelican-teal text-xs font-bold text-white'
                            : phaseState === 'active'
                              ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-lg font-bold text-pelican-teal'
                              : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-400'
                        }
                        aria-hidden="true"
                      >
                        {marker}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{phase.label}</p>
                        <p className="mt-0.5 text-xs capitalize text-slate-500">{phaseState}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </SectionCard>

          <SectionCard title="Designs in Progress" description={`${completedDesignCount} of ${requestedDesignCount} design options completed.`}>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <KitchenImageCard
                  key={item}
                  imageUrl=""
                  alt={`Design placeholder ${item}`}
                  title={`Generating design ${item}`}
                  subtitle="Preview will appear after generation completes."
                  badge={<StatusBadge variant="info">Working</StatusBadge>}
                />
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard title="Project Summary" description="Generation input snapshot.">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-slate-500">Project</span>
                <span className="text-right font-semibold text-slate-950">{reviewData.projectName}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-slate-500">Style</span>
                <span className="text-right font-semibold text-slate-950">{reviewData.style.name}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-slate-500">Budget</span>
                <span className="text-right font-semibold text-slate-950">{formatCurrency(reviewData.budget.targetBudget)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Cabinet style</span>
                <span className="text-right font-semibold text-slate-950">{reviewData.style.materials.cabinetDoorStyle}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="AI Generation Tip">
            <p className="text-sm leading-6 text-slate-600">
              Keep this screen open while generation runs. If the job pauses, use Check Progress to refresh the fake API
              progress state during development.
            </p>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
