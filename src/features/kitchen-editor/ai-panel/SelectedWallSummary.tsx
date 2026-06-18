"use client";

import type {
  CabinetPlacementRequirement,
  PlacedWallSegment,
  WallFaceSide,
} from "@/engine/walls/placedWallSegmentTypes";
import type { PlacedWallNode } from "@/engine/walls/placedWallNodeTypes";
import {
  getPlanDistanceInches,
  getWallSegmentEndpointPoint,
} from "@/engine/walls/wallSegmentGeometry";
import { formatInchesLabel } from "../shared/formatInchesLabel";

type SelectedWallSummaryProps = Readonly<{
  wallSegment: PlacedWallSegment;
  wallGraphNodes: readonly PlacedWallNode[];
}>;

export function SelectedWallSummary({ wallSegment, wallGraphNodes }: SelectedWallSummaryProps) {
  const startPointInches = getWallSegmentEndpointPoint(wallGraphNodes, wallSegment.startNodeId);
  const endPointInches = getWallSegmentEndpointPoint(wallGraphNodes, wallSegment.endNodeId);
  const lengthInches = startPointInches !== null && endPointInches !== null
    ? getPlanDistanceInches(startPointInches, endPointInches)
    : 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selected Wall Segment</p>
        <h2 className="mt-1 text-sm font-semibold text-slate-950">{wallSegment.name}</h2>
        <p className="mt-0.5 break-all text-xs text-slate-500">{wallSegment.id}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <SummaryField label="Length" value={formatInchesLabel(lengthInches)} />
        <SummaryField label="Height" value={formatInchesLabel(wallSegment.heightInches)} />
        <SummaryField label="Thickness" value={formatInchesLabel(wallSegment.thicknessInches)} />
        <SummaryField label="View side" value={formatFaceSideLabel(wallSegment.preferredViewFaceSide)} />
        <SummaryField
          label="Cabinet A"
          value={formatCabinetPlacementRequirement(wallSegment.cabinetPlacementFacePolicies["side-a"])}
        />
        <SummaryField
          label="Cabinet B"
          value={formatCabinetPlacementRequirement(wallSegment.cabinetPlacementFacePolicies["side-b"])}
        />
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

function formatFaceSideLabel(faceSide: WallFaceSide): string {
  return faceSide === "side-a" ? "Side A" : "Side B";
}


function formatCabinetPlacementRequirement(requirement: CabinetPlacementRequirement): string {
  switch (requirement) {
    case "required":
      return "Required";
    case "optional":
      return "Optional";
    case "none":
      return "No cabinets";
  }
}
