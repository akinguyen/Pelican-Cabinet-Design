import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StructureToolCard({
  title,
  subtitle,
  active = false,
  onClick,
  children,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[150px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 text-center transition hover:border-pelican-teal",
        active
          ? "border-pelican-navy ring-1 ring-pelican-navy"
          : "border-slate-200"
      )}
    >
      <div className="flex h-24 w-full items-center justify-center">
        {children}
      </div>

      <span className="mt-2 text-[13px] font-medium text-slate-900">
        {title}
      </span>
      <span className="mt-1 text-[11px] text-slate-500">
        {subtitle}
      </span>
    </button>
  );
}
