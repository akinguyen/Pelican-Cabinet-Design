import type { ReactNode } from 'react';
import { PrimaryButton } from '../shared/PrimaryButton';

export interface SmartKitchenTopBarProps {
  readonly projectName: string;
  readonly backLabel?: string;
  readonly exitLabel?: string;
  readonly isSaving?: boolean;
  readonly onBackToEditor?: () => void;
  readonly onSaveDraft?: () => void;
  readonly onExit?: () => void;
  readonly secondaryActions?: ReactNode;
}

export function SmartKitchenTopBar({
  projectName,
  backLabel = 'Back to Editor',
  exitLabel = 'Exit Workspace',
  isSaving = false,
  onBackToEditor,
  onSaveDraft,
  onExit,
  secondaryActions,
}: SmartKitchenTopBarProps) {
  return (
    <header className="flex h-[55px] w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <PrimaryButton variant="ghost" onClick={onBackToEditor} aria-label={backLabel}>
          {backLabel}
        </PrimaryButton>
        <div className="hidden h-6 w-px bg-slate-200 md:block" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{projectName}</p>
          <p className="text-xs text-slate-500">AI workspace</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {secondaryActions}
        <PrimaryButton variant="secondary" isLoading={isSaving} onClick={onSaveDraft}>
          Save Draft
        </PrimaryButton>
        <PrimaryButton variant="secondary" onClick={onExit}>
          {exitLabel}
        </PrimaryButton>
      </div>
    </header>
  );
}
