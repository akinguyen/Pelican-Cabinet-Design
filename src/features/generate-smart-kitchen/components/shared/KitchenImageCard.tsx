import type { ImgHTMLAttributes, ReactNode } from 'react';

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

export interface KitchenImageCardProps {
  readonly imageUrl?: string;
  readonly alt: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly badge?: ReactNode;
  readonly isActive?: boolean;
  readonly className?: string;
  readonly imageClassName?: string;
  readonly imgProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'className' | 'src'>;
}

export function KitchenImageCard({
  imageUrl,
  alt,
  title,
  subtitle,
  badge,
  isActive = false,
  className,
  imageClassName,
  imgProps,
}: KitchenImageCardProps) {
  return (
    <figure
      className={joinClassNames(
        'overflow-hidden rounded-2xl border bg-white shadow-sm',
        isActive ? 'border-pelican-teal ring-2 ring-cyan-100' : 'border-slate-200',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            {...imgProps}
            src={imageUrl}
            alt={alt}
            className={joinClassNames('h-full w-full object-cover', imageClassName)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm font-medium text-slate-500">
            No image available
          </div>
        )}
        {badge ? <div className="absolute left-3 top-3">{badge}</div> : null}
      </div>
      {title || subtitle ? (
        <figcaption className="space-y-1 px-4 py-3">
          {title ? <p className="text-sm font-semibold text-slate-950">{title}</p> : null}
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
