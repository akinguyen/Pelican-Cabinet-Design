export function WindowPropertyInput({
  label,
  value,
  unit,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}) {
  const defaultMin = label === "Width" ? 12 : 0;
  const defaultMax = label === "Width" ? 120 : 144;
  const sliderMin = min ?? defaultMin;
  const sliderMax = Math.max(sliderMin, max ?? defaultMax, value);

  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase text-pelican-navy">
        {label}
      </span>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 accent-pelican-teal"
        />
        <div className="flex h-11 w-[105px] items-center rounded-md border border-slate-200 bg-slate-50 px-3">
          <input
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-bold text-pelican-navy outline-none"
          />
          <span className="ml-1 text-[11px] font-semibold text-slate-400">
            {unit}
          </span>
        </div>
      </div>
    </label>
  );
}
