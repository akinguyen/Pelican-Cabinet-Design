"use client";

import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import {
  getAssemblyDistanceFromFloorInches,
  type PlacedAssembly,
} from "@/engine/assemblies/placedAssemblyTypes";
import { formatInchesLabel } from "../shared/formatInchesLabel";

type SelectedAssemblySummaryProps = Readonly<{
  placedAssembly: PlacedAssembly;
  definition: AssemblyDefinition;
}>;

export function SelectedAssemblySummary({
  placedAssembly,
  definition,
}: SelectedAssemblySummaryProps) {
  const { widthInches, depthInches, heightInches } = placedAssembly.configuration.sizeInches;
  const distanceFromFloorInches = getAssemblyDistanceFromFloorInches(placedAssembly);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Selected Assembly
        </p>
        <h2 className="mt-1 text-sm font-semibold text-slate-950">{definition.name}</h2>
        <p className="mt-0.5 break-all text-xs text-slate-500">{placedAssembly.id}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <SummaryField label="Definition" value={definition.id} />
        <SummaryField
          label="Size"
          value={`${formatInchesLabel(widthInches)} W × ${formatInchesLabel(depthInches)} D × ${formatInchesLabel(heightInches)} H`}
        />
        <SummaryField label="X" value={formatInchesLabel(placedAssembly.worldPositionInches.xInches)} />
        <SummaryField label="Y" value={formatInchesLabel(placedAssembly.worldPositionInches.yInches)} />
        <SummaryField label="Distance from floor" value={formatInchesLabel(distanceFromFloorInches)} />
        <SummaryField label="Rotation" value={`${placedAssembly.rotationDegrees.zDegrees}°`} />
      </dl>
    </section>
  );
}

function SummaryField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="truncate font-medium text-slate-700" title={value}>
        {value}
      </dd>
    </div>
  );
}
