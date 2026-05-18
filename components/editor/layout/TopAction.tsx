import { cn } from "@/lib/utils";

export function TopAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3.5 text-sm font-semibold",
        disabled
          ? "cursor-not-allowed bg-slate-100 text-slate-400"
          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
