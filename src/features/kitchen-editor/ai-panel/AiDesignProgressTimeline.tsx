import type { AiDesignProgressStep } from "../ai-development/aiKitchenDevelopmentTypes";

type AiDesignProgressTimelineProps = {
  steps: AiDesignProgressStep[];
};

export function AiDesignProgressTimeline({ steps }: AiDesignProgressTimelineProps) {
  return (
    <section className="rounded-xl border border-sky-100 bg-sky-50 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Design progress</p>
        {steps.some((step) => step.status === "active") ? (
          <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 shadow-sm">
            Working
          </span>
        ) : null}
      </div>
      <ol className="mt-3 space-y-1.5">
        {steps.map((step) => (
          <li key={step.id} className={getStepRowClass(step.status)}>
            <span className={getStatusDotClass(step.status)}>{getStatusIndicator(step.status)}</span>
            <span className={getLabelClass(step.status)}>{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function getStepRowClass(status: AiDesignProgressStep["status"]): string {
  const baseClass = "flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition";

  if (status === "active") {
    return `${baseClass} border border-sky-100 bg-white/80 shadow-sm`;
  }

  if (status === "error") {
    return `${baseClass} border border-rose-100 bg-rose-50`;
  }

  return baseClass;
}

function getStatusDotClass(status: AiDesignProgressStep["status"]): string {
  const baseClass = "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold";

  if (status === "complete") {
    return `${baseClass} bg-emerald-500 text-white`;
  }

  if (status === "active") {
    return `${baseClass} bg-sky-100 text-sky-700 ring-2 ring-sky-100`;
  }

  if (status === "error") {
    return `${baseClass} bg-rose-500 text-white`;
  }

  return `${baseClass} bg-slate-200 text-slate-400`;
}

function getStatusIndicator(status: AiDesignProgressStep["status"]) {
  if (status === "complete") {
    return "✓";
  }

  if (status === "error") {
    return "!";
  }

  if (status === "active") {
    return <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />;
  }

  return null;
}

function getLabelClass(status: AiDesignProgressStep["status"]): string {
  if (status === "active") {
    return "font-semibold text-slate-950";
  }

  if (status === "complete") {
    return "text-slate-700";
  }

  if (status === "error") {
    return "font-semibold text-rose-700";
  }

  return "text-slate-400";
}
