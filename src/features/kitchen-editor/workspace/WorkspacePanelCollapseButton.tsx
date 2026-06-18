"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type WorkspacePanelCollapseButtonProps = Readonly<{
  label: string;
  title: string;
  direction: "left" | "right";
  onClick: () => void;
  className?: string;
}>;

export function WorkspacePanelCollapseButton({
  label,
  title,
  direction,
  onClick,
  className = "",
}: WorkspacePanelCollapseButtonProps) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 ${className}`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
    </button>
  );
}
