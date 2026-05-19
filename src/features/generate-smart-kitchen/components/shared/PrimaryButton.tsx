import type { ButtonHTMLAttributes, ReactNode } from 'react';

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

export type PrimaryButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly variant?: PrimaryButtonVariant;
  readonly isLoading?: boolean;
  readonly fullWidth?: boolean;
}

const variantClassNames: Record<PrimaryButtonVariant, string> = {
  primary: 'border-transparent bg-pelican-teal text-white shadow-sm hover:brightness-95',
  secondary: 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100',
  danger: 'border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700',
};

export function PrimaryButton({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  disabled,
  className,
  type = 'button',
  ...buttonProps
}: PrimaryButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={joinClassNames(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pelican-teal',
        variantClassNames[variant],
        isDisabled && 'cursor-not-allowed opacity-60',
        fullWidth && 'w-full',
        className,
      )}
    >
      {isLoading ? <span aria-hidden="true">...</span> : null}
      <span>{children}</span>
    </button>
  );
}
