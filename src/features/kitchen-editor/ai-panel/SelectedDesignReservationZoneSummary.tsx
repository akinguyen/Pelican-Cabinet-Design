"use client";

import type { DesignReservationZone, DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import { formatInchesLabel } from "../shared/formatInchesLabel";

type SelectedDesignReservationZoneSummaryProps = Readonly<{
  zone: DesignReservationZone;
}>;

export function SelectedDesignReservationZoneSummary({
  zone,
}: SelectedDesignReservationZoneSummaryProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Selected Reservation Zone
        </p>
        <h2 className="mt-1 text-sm font-semibold text-slate-950">{formatPurposeLabel(zone.reservedFor)}</h2>
        <p className="mt-0.5 break-all text-xs text-slate-500">{zone.id}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <SummaryField
          label="Size"
          value={`${formatInchesLabel(zone.sizeInches.widthInches)} W × ${formatInchesLabel(zone.sizeInches.depthInches)} D × ${formatInchesLabel(zone.sizeInches.heightInches)} H`}
        />
        <SummaryField label="X" value={formatInchesLabel(zone.baseCenterPointInches.xInches)} />
        <SummaryField label="Y" value={formatInchesLabel(zone.baseCenterPointInches.yInches)} />
        <SummaryField label="Distance from floor" value={formatInchesLabel(zone.baseCenterPointInches.zInches)} />
        <SummaryField label="Rotation" value={`${zone.rotationDegrees.zDegrees}°`} />
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

function formatPurposeLabel(purpose: DesignReservationZonePurpose): string {
  switch (purpose) {
    case "island":
      return "Island";
    case "peninsula":
      return "Peninsula";
    case "tall-pantry":
      return "Tall pantry";
  }
}
