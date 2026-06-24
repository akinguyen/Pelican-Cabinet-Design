"use client";

import type { AiKitchenSelectOption } from "../ai-development/aiKitchenDevelopmentOptions";

type AiKitchenRequirementRowProps = {
  label: string;
  placeholder: string;
  value: string;
  quantity?: number;
  options: readonly AiKitchenSelectOption[];
  disabled: boolean;
  canRemove: boolean;
  showQuantity?: boolean;
  onChangeValue: (value: string) => void;
  onChangeQuantity?: (quantity: number) => void;
  onRemove: () => void;
};

export function AiKitchenRequirementRow({
  label,
  placeholder,
  value,
  quantity = 0,
  options,
  disabled,
  canRemove,
  showQuantity = true,
  onChangeValue,
  onChangeQuantity,
  onRemove,
}: AiKitchenRequirementRowProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className={showQuantity ? "grid grid-cols-[minmax(0,1fr)_72px] gap-2" : "grid grid-cols-1 gap-2"}>
        <label className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
          <select
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            value={value}
            disabled={disabled}
            onChange={(event) => onChangeValue(event.target.value)}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showQuantity ? (
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Number
            <input
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              type="number"
              min={0}
              step={1}
              placeholder="0"
              value={quantity === 0 ? "" : quantity}
              disabled={disabled}
              onChange={(event) => onChangeQuantity?.(normalizeQuantityInput(event.target.value))}
            />
          </label>
        ) : null}
      </div>

      {canRemove ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            disabled={disabled}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

function normalizeQuantityInput(value: string): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}
