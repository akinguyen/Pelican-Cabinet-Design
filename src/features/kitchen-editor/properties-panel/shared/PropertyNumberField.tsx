"use client";

import { formatNumberInputValue } from "./propertyPanelFormatting";

type PropertyNumberFieldProps = Readonly<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}>;

export function PropertyNumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: PropertyNumberFieldProps) {
  return (
    <label className="block text-xs text-slate-600">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type="number"
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        value={formatNumberInputValue(value)}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isFinite(nextValue)) {
            onChange(nextValue);
          }
        }}
      />
    </label>
  );
}
