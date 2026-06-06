"use client";

import type { ReactNode } from "react";

type PropertySectionProps = Readonly<{
  title: string;
  children: ReactNode;
  description?: string;
}>;

export function PropertySection({ title, description, children }: PropertySectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {description !== undefined ? (
        <p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
