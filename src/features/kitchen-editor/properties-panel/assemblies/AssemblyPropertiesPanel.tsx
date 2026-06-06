"use client";

import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { AssemblyDimensionSection } from "./AssemblyDimensionSection";
import { AssemblyOptionGroupsSection } from "./AssemblyOptionGroupsSection";
import { AssemblyPlacementSection } from "./AssemblyPlacementSection";

type AssemblyPropertiesPanelProps = Readonly<{
  placedAssembly: PlacedAssembly;
  definition: AssemblyDefinition;
  onDelete: () => void;
}>;

export function AssemblyPropertiesPanel({
  placedAssembly,
  definition,
  onDelete,
}: AssemblyPropertiesPanelProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
          Selected Assembly
        </div>
        <div className="mt-1 font-semibold text-slate-900">{definition.name}</div>
        <div className="mt-1 break-all text-[11px] text-slate-500">{placedAssembly.id}</div>
      </section>

      <AssemblyPlacementSection placedAssembly={placedAssembly} />
      <AssemblyDimensionSection placedAssembly={placedAssembly} definition={definition} />
      <AssemblyOptionGroupsSection placedAssembly={placedAssembly} definition={definition} />

      <section className="rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
          Actions
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
          onClick={onDelete}
        >
          Delete assembly
        </button>
      </section>
    </div>
  );
}
