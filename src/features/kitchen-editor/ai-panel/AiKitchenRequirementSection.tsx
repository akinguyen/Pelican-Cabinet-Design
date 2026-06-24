"use client";

import type { ReactNode } from "react";

type AiKitchenRequirementSectionProps = {
  title: string;
  description?: string;
  disabled: boolean;
  children: ReactNode;
  onAdd: () => void;
};

export function AiKitchenRequirementSection({
  title,
  description,
  disabled,
  children,
  onAdd,
}: AiKitchenRequirementSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          {description ? <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{description}</p> : null}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
          disabled={disabled}
          onClick={onAdd}
        >
          + Add
        </button>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}
