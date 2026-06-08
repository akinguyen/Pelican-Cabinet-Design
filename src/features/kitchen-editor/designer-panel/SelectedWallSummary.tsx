"use client";

import type { PlacedWall } from "@/engine/walls/wallTypes";
import { getWallFootprintEdgeMeasurements } from "@/engine/walls/footprint/wallFootprintMeasurements";
import { formatInchesLabel } from "../shared/formatInchesLabel";
import { SelectedSummaryField } from "./SelectedSummaryField";

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
        <SelectedSummaryField label="Height" value={formatInchesLabel(placedWall.heightInches)} />
        <SelectedSummaryField label="Edges" value={`${edgeMeasurements.length}`} />
        <SelectedSummaryField label="Viewable edges" value={viewableEdgeLabel} />
      </dl>
    </section>
  );
}
