"use client";

import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import {
  getAssemblyDistanceFromFloorInches,
  type PlacedAssembly,
} from "@/engine/assemblies/placedAssemblyTypes";
import { formatInchesLabel } from "../shared/formatInchesLabel";
import { SelectedSummaryField } from "./SelectedSummaryField";

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
        <SelectedSummaryField label="Definition" value={definition.id} />
        <SelectedSummaryField
          label="Size"
          value={`${formatInchesLabel(widthInches)} W × ${formatInchesLabel(depthInches)} D × ${formatInchesLabel(heightInches)} H`}
        />
        <SelectedSummaryField label="X" value={formatInchesLabel(placedAssembly.worldPositionInches.xInches)} />
        <SelectedSummaryField label="Y" value={formatInchesLabel(placedAssembly.worldPositionInches.yInches)} />
        <SelectedSummaryField label="Distance from floor" value={formatInchesLabel(distanceFromFloorInches)} />
        <SelectedSummaryField label="Rotation" value={`${placedAssembly.rotationDegrees.zDegrees}°`} />
      </dl>
    </section>
  );
}
