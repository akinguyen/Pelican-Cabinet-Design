"use client";

import type { PlacedWall } from "@/engine/walls/wallTypes";
import { getWallFootprintEdgeMeasurements } from "@/engine/walls/footprint/wallFootprintMeasurements";
import { formatInchesLabel } from "../shared/formatInchesLabel";

type SelectedWallSummaryProps = Readonly<{
  placedWall: PlacedWall;
}>;

export function SelectedWallSummary({ placedWall }: SelectedWallSummaryProps) {
  const edgeMeasurements = getWallFootprintEdgeMeasurements(placedWall.footprint);
  const viewableEdgeLabel = placedWall.viewableEdgeIndices.length === 0
    ? "None"
    : placedWall.viewableEdgeIndices.join(", ");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selected Wall</p>
        <h2 className="mt-1 text-sm font-semibold text-slate-950">Wall</h2>
        <p className="mt-0.5 break-all text-xs text-slate-500">{placedWall.id}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <SummaryField label="Height" value={formatInchesLabel(placedWall.heightInches)} />
        <SummaryField label="Edges" value={`${edgeMeasurements.length}`} />
        <SummaryField label="Viewable edges" value={viewableEdgeLabel} />
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
