import type { ReactNode } from 'react';

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

export interface SectionCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly action?: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  children,
  action,
  footer,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <section
      className={joinClassNames(
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={joinClassNames('px-5 py-4', contentClassName)}>{children}</div>
      {footer ? <div className="border-t border-slate-100 px-5 py-4">{footer}</div> : null}
    </section>
  );
}
