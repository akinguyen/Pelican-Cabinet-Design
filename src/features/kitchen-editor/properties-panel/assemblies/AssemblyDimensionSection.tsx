"use client";

import { formatNumberInputValue } from "../shared/propertyPanelFormatting";
import { PropertySection } from "../shared/PropertySection";
import { useEffect, useState } from "react";
import type { AssemblyDefinition, AssemblyDimensionField } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

type AssemblyDimensionSectionProps = Readonly<{
  placedAssembly: PlacedAssembly;
  definition: AssemblyDefinition;
}>;

type DimensionId = "widthInches" | "depthInches" | "heightInches";

const CUSTOM_DIMENSION_SELECT_VALUE = "custom";

export function AssemblyDimensionSection({
  placedAssembly,
  definition,
}: AssemblyDimensionSectionProps) {
  const [customDimensionIds, setCustomDimensionIds] = useState<ReadonlySet<DimensionId>>(
    () => new Set(),
  );
  const updateSelectedAssemblyDimension = useDesignSceneStore(
    (state) => state.updateSelectedAssemblyDimension,
  );

  useEffect(() => {
    setCustomDimensionIds(new Set());
  }, [placedAssembly.id]);

  function setDimensionCustomMode(dimensionId: DimensionId, isCustomMode: boolean) {
    setCustomDimensionIds((currentDimensionIds) => {
      const nextDimensionIds = new Set(currentDimensionIds);

      if (isCustomMode) {
        nextDimensionIds.add(dimensionId);
      } else {
        nextDimensionIds.delete(dimensionId);
      }

      return nextDimensionIds;
    });
  }

  return (
    <PropertySection title="Dimensions">
      <div className="mt-3 grid grid-cols-3 gap-3">
        <DimensionField
          dimensionId="widthInches"
          field={definition.dimensions.widthInches}
          value={placedAssembly.configuration.sizeInches.widthInches}
          isCustomModeRequested={customDimensionIds.has("widthInches")}
          onCustomModeChange={setDimensionCustomMode}
          onChange={updateSelectedAssemblyDimension}
        />
        <DimensionField
          dimensionId="depthInches"
          field={definition.dimensions.depthInches}
          value={placedAssembly.configuration.sizeInches.depthInches}
          isCustomModeRequested={customDimensionIds.has("depthInches")}
          onCustomModeChange={setDimensionCustomMode}
          onChange={updateSelectedAssemblyDimension}
        />
        <DimensionField
          dimensionId="heightInches"
          field={definition.dimensions.heightInches}
          value={placedAssembly.configuration.sizeInches.heightInches}
          isCustomModeRequested={customDimensionIds.has("heightInches")}
          onCustomModeChange={setDimensionCustomMode}
          onChange={updateSelectedAssemblyDimension}
        />
      </div>
    </PropertySection>
  );
}

type DimensionFieldProps = Readonly<{
  dimensionId: DimensionId;
  field: AssemblyDimensionField;
  value: number;
  isCustomModeRequested: boolean;
  onCustomModeChange: (dimensionId: DimensionId, isCustomMode: boolean) => void;
  onChange: (dimensionId: DimensionId, valueInches: number) => void;
}>;

function DimensionField({
  dimensionId,
  field,
  value,
  isCustomModeRequested,
  onCustomModeChange,
  onChange,
}: DimensionFieldProps) {
  const isCustomAllowed = field.allowCustomValue === true;
  const hasStandardOptions = field.optionsInches !== undefined && field.optionsInches.length > 0;
  const isStandardValue = hasStandardOptions
    ? field.optionsInches?.some((option) => option.valueInches === value) === true
    : false;
  const isCustomMode = isCustomAllowed && (isCustomModeRequested || !isStandardValue);

  if (field.control === "select" && hasStandardOptions && !isCustomMode) {
    return (
      <label className="block text-xs text-slate-600">
        <span className="mb-1 block font-medium">{field.label}</span>
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={String(value)}
          onChange={(event) => {
            if (event.target.value === CUSTOM_DIMENSION_SELECT_VALUE) {
              onCustomModeChange(dimensionId, true);
              return;
            }

            onCustomModeChange(dimensionId, false);
            onChange(dimensionId, Number(event.target.value));
          }}
        >
          {field.optionsInches?.map((option) => (
            <option key={option.valueInches} value={option.valueInches}>
              {option.label}
            </option>
          ))}
          {isCustomAllowed ? <option value={CUSTOM_DIMENSION_SELECT_VALUE}>Custom...</option> : null}
        </select>
      </label>
    );
  }

  return (
    <label className="block text-xs text-slate-600">
      <span className="mb-1 block font-medium">{field.label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={formatNumberInputValue(value)}
          min={field.minValueInches}
          max={field.maxValueInches}
          step={field.stepInches ?? 1}
          onChange={(event) => {
            const nextValueInches = Number(event.target.value);
            if (Number.isFinite(nextValueInches)) {
              onChange(dimensionId, clampDimensionValue(nextValueInches, field));
            }
          }}
        />
        {field.control === "select" && hasStandardOptions && isCustomMode ? (
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => {
              onCustomModeChange(dimensionId, false);
              if (!isStandardValue) {
                onChange(dimensionId, field.defaultValueInches);
              }
            }}
          >
            Std
          </button>
        ) : null}
      </div>
    </label>
  );
}

function clampDimensionValue(valueInches: number, field: AssemblyDimensionField): number {
  const minValueInches = field.minValueInches ?? valueInches;
  const maxValueInches = field.maxValueInches ?? valueInches;
  return Math.min(Math.max(valueInches, minValueInches), maxValueInches);
}

