"use client";

import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";

type AssemblyCatalogCardProps = Readonly<{
  definition: AssemblyDefinition;
  onSelect: (definition: AssemblyDefinition) => void;
}>;

export function AssemblyCatalogCard({ definition, onSelect }: AssemblyCatalogCardProps) {
  const defaultSizeInches = {
    widthInches: definition.dimensions.widthInches.defaultValueInches,
    depthInches: definition.dimensions.depthInches.defaultValueInches,
    heightInches: definition.dimensions.heightInches.defaultValueInches,
  };

  return (
    <button
      type="button"
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
      onClick={() => onSelect(definition)}
    >
      <div className="text-sm font-semibold text-slate-950">{definition.name}</div>
      <div className="mt-1 text-xs text-slate-500">{definition.catalogCategoryId}</div>
      <div className="mt-3 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
        {defaultSizeInches.widthInches}w × {defaultSizeInches.depthInches}d × {defaultSizeInches.heightInches}h
      </div>
    </button>
  );
}
