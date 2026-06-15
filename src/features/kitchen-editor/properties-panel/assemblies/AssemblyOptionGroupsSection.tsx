"use client";

import { useCallback } from "react";
import { formatNumberInputValue } from "../shared/propertyPanelFormatting";
import { PropertySection } from "../shared/PropertySection";
import type { AssemblyOptionDefinition, AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

type AssemblyOptionGroupsSectionProps = Readonly<{
  placedAssembly: PlacedAssembly;
  definition: AssemblyDefinition;
}>;

export function AssemblyOptionGroupsSection({
  placedAssembly,
  definition,
}: AssemblyOptionGroupsSectionProps) {
  const handleOptionChange = useCallback((optionId: string, value: AssemblyOptionValue) => {
    useDesignSceneStore.getState().updateSelectedAssemblyOptionValue(optionId, value);
  }, []);

  if (definition.optionGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {definition.optionGroups.map((optionGroup) => (
        <PropertySection key={optionGroup.id} title={optionGroup.label}>
          <div className="mt-3 space-y-3">
            {optionGroup.options.map((option) => (
              <OptionField
                key={option.id}
                option={option}
                value={placedAssembly.configuration.optionValues[option.id] ?? option.defaultValue}
                onChange={handleOptionChange}
              />
            ))}
          </div>
        </PropertySection>
      ))}
    </div>
  );
}

type OptionFieldProps = Readonly<{
  option: AssemblyOptionDefinition;
  value: AssemblyOptionValue;
  onChange: (optionId: string, value: AssemblyOptionValue) => void;
}>;

function OptionField({ option, value, onChange }: OptionFieldProps) {
  if (option.control === "checkbox") {
    return (
      <label className="flex items-center justify-between gap-3 text-xs text-slate-700">
        <span className="font-medium">{option.label}</span>
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          checked={value === true}
          onChange={(event) => onChange(option.id, event.target.checked)}
        />
      </label>
    );
  }

  if (option.control === "select" && option.choices !== undefined) {
    return (
      <label className="block text-xs text-slate-600">
        <span className="mb-1 block font-medium">{option.label}</span>
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={String(value)}
          onChange={(event) => onChange(option.id, parseOptionValue(option, event.target.value))}
        >
          {option.choices.map((choice) => (
            <option key={String(choice.value)} value={String(choice.value)}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block text-xs text-slate-600">
      <span className="mb-1 block font-medium">{option.label}</span>
      <input
        type="number"
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        value={typeof value === "number" ? formatNumberInputValue(value) : ""}
        min={option.minValue}
        max={option.maxValue}
        step={option.step ?? 1}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isFinite(nextValue)) {
            onChange(option.id, nextValue);
          }
        }}
      />
    </label>
  );
}

function parseOptionValue(
  option: AssemblyOptionDefinition,
  value: string,
): AssemblyOptionValue {
  if (option.valueType === "number") {
    return Number(value);
  }

  if (option.valueType === "boolean") {
    return value === "true";
  }

  return value;
}
