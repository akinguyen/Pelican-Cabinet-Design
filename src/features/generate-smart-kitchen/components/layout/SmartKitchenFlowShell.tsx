import type { ReactNode } from 'react';
import type { SmartKitchenStepId } from '../../types';
import { SmartKitchenStepSidebar } from './SmartKitchenStepSidebar';
import { SmartKitchenTopBar } from './SmartKitchenTopBar';

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

export interface SmartKitchenFlowShellProps {
  readonly activeStepId: SmartKitchenStepId;
  readonly completedStepIds?: readonly SmartKitchenStepId[];
  readonly projectName: string;
  readonly children: ReactNode;
  readonly rightPanel?: ReactNode;
  readonly onStepSelect?: (stepId: SmartKitchenStepId) => void;
  readonly onBackToEditor?: () => void;
  readonly onSaveDraft?: () => void;
  readonly onExit?: () => void;
  readonly topBarSecondaryActions?: ReactNode;
  readonly className?: string;
  readonly mainClassName?: string;
}

export function SmartKitchenFlowShell({
  activeStepId,
  completedStepIds = [],
  projectName,
  children,
  rightPanel,
  onStepSelect,
  onBackToEditor,
  onSaveDraft,
  onExit,
  topBarSecondaryActions,
  className,
  mainClassName,
}: SmartKitchenFlowShellProps) {
  return (
    <div className={joinClassNames('flex h-screen min-h-0 w-full bg-slate-100', className)}>
      <SmartKitchenStepSidebar
        activeStepId={activeStepId}
        completedStepIds={completedStepIds}
        onStepSelect={onStepSelect}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <SmartKitchenTopBar
          projectName={projectName}
          onBackToEditor={onBackToEditor}
          onSaveDraft={onSaveDraft}
          onExit={onExit}
          secondaryActions={topBarSecondaryActions}
        />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main
            className={joinClassNames(
              'min-w-0 flex-1 overflow-auto px-6 py-6',
              mainClassName,
            )}
          >
            {children}
          </main>
          {rightPanel ? (
            <aside className="hidden w-80 shrink-0 overflow-auto border-l border-slate-200 bg-white px-5 py-6 xl:block">
              {rightPanel}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
