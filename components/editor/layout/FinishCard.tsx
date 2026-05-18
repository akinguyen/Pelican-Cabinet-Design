import { PencilLine } from "lucide-react";

export function FinishCard({
  label,
  subLabel,
}: {
  label: string;
  subLabel: string;
}) {
  return (
    <div className="flex h-16 items-center justify-between rounded-md border border-slate-200 bg-white px-2">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-md bg-slate-100" />
        <div>
          <div className="text-sm font-bold text-slate-900">{label}</div>
          <div className="text-[11px] text-slate-500">{subLabel}</div>
        </div>
      </div>
      <PencilLine className="h-4 w-4 text-slate-300" />
    </div>
  );
}
