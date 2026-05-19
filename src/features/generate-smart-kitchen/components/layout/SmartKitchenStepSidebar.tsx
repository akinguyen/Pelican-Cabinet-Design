import { SMART_KITCHEN_STEPS } from '../../constants';
import type { SmartKitchenStepId, SmartKitchenStepStatus } from '../../types';

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

export interface SmartKitchenStepSidebarProps {
  readonly activeStepId: SmartKitchenStepId;
  readonly completedStepIds?: readonly SmartKitchenStepId[];
  readonly onStepSelect?: (stepId: SmartKitchenStepId) => void;
  readonly className?: string;
}

function getStepStatus(
  stepId: SmartKitchenStepId,
  activeStepId: SmartKitchenStepId,
  completedStepIds: readonly SmartKitchenStepId[],
): SmartKitchenStepStatus {
  if (stepId === activeStepId) {
    return 'active';
  }

  if (completedStepIds.includes(stepId)) {
    return 'completed';
  }

  return 'available';
}

function getStepButtonClassName(status: SmartKitchenStepStatus): string {
  if (status === 'active') {
    return 'border-l-4 border-pelican-teal bg-white/10 text-white';
  }

  if (status === 'completed') {
    return 'border-l-4 border-transparent text-cyan-50 hover:bg-white/10';
  }

  return 'border-l-4 border-transparent text-slate-300 hover:bg-white/10 hover:text-white';
}

export function SmartKitchenStepSidebar({
  activeStepId,
  completedStepIds = [],
  onStepSelect,
  className,
}: SmartKitchenStepSidebarProps) {
  return (
    <aside
      className={joinClassNames(
        'flex h-full w-72 shrink-0 flex-col bg-pelican-slate text-white',
        className,
      )}
      aria-label="Generate Smart Kitchen workflow steps"
    >
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          Generate Smart Kitchen
        </p>
        <p className="mt-2 text-sm text-slate-300">Guided AI design workspace</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Workspace progress">
        {SMART_KITCHEN_STEPS.map((step) => {
          const status = getStepStatus(step.id, activeStepId, completedStepIds);
          const isActive = status === 'active';
          const isCompleted = status === 'completed';
          const marker = isCompleted ? '✓' : step.order.toString();

          return (
            <button
              key={step.id}
              type="button"
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onStepSelect?.(step.id)}
              className={joinClassNames(
                'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition',
                getStepButtonClassName(status),
              )}
            >
              <span
                className={joinClassNames(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isActive || isCompleted ? 'bg-pelican-teal text-white' : 'bg-white/10 text-slate-300',
                )}
                aria-hidden="true"
              >
                {marker}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{step.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-300">{step.description}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
