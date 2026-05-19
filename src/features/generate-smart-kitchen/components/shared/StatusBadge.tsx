import type { ReactNode } from 'react';

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

export type StatusBadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'ai';

export interface StatusBadgeProps {
  readonly children: ReactNode;
  readonly variant?: StatusBadgeVariant;
  readonly className?: string;
}

const variantClassNames: Record<StatusBadgeVariant, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  ai: 'border-violet-200 bg-violet-50 text-violet-700',
};

export function StatusBadge({ children, variant = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={joinClassNames(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none',
        variantClassNames[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
