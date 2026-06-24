"use client";

import { useCallback } from "react";
import type { DesignReservationZone, DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import { formatDesignReservationZonePurposeLabel } from "../../formatting/kitchenEditorLabelFormatting";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";
import { SceneEntityTransformSection } from "../scene-entities/SceneEntityTransformSection";

const designReservationZonePurposeOptions: readonly Readonly<{ value: DesignReservationZonePurpose; label: string }>[] = [
  { value: "island", label: "Island" },
  { value: "peninsula", label: "Peninsula" },
  { value: "tall-pantry", label: "Tall pantry" },
  { value: "panel", label: "Panel" },
  { value: "filler", label: "Filler" },
  { value: "corner", label: "Corner" },
  { value: "clearance", label: "Clearance" },
  { value: "leftover", label: "Leftover" },
];

export function DesignReservationZonePropertiesPanel({ zone }: Readonly<{ zone: DesignReservationZone }>) {
  const handleReservedForChange = useCallback((reservedFor: DesignReservationZonePurpose) => { useDesignSceneStore.getState().updateSelectedDesignReservationZoneReservedFor(reservedFor); }, []);
  const handleWidthChange = useCallback((widthInches: number) => { useDesignSceneStore.getState().updateSelectedDesignReservationZoneWidth(widthInches); }, []);
  const handleDepthChange = useCallback((depthInches: number) => { useDesignSceneStore.getState().updateSelectedDesignReservationZoneDepth(depthInches); }, []);
  const handleHeightChange = useCallback((heightInches: number) => { useDesignSceneStore.getState().updateSelectedDesignReservationZoneHeight(heightInches); }, []);
  const handleDuplicate = useCallback(() => { useDesignSceneStore.getState().duplicateSelectedSceneEntities(); }, []);
  const handleDelete = useCallback(() => { useDesignSceneStore.getState().deleteSelectedSceneEntities(); }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Design Reservation Zone</div><div className="mt-1 font-semibold text-slate-900">{formatDesignReservationZonePurposeLabel(zone.reservedFor)}</div><div className="mt-1 break-all text-[11px] text-slate-500">{zone.id}</div></section>
      <PropertySection title="Reserved for" description="Changing this applies that reservation type's default width, depth, and height."><label className="mt-3 block text-xs text-slate-600"><span className="mb-1 block font-medium">Reserved for</span><select className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={zone.reservedFor} onChange={(event) => handleReservedForChange(event.target.value as DesignReservationZonePurpose)}>{designReservationZonePurposeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></PropertySection>
      <SceneEntityTransformSection sceneEntity={zone} />
      <PropertySection title="Dimensions"><div className="mt-3 grid grid-cols-3 gap-3"><PropertyNumberField label="Width" value={zone.sizeInches.widthInches} min={1} step={0.25} onChange={handleWidthChange} /><PropertyNumberField label="Depth" value={zone.sizeInches.depthInches} min={1} step={0.25} onChange={handleDepthChange} /><PropertyNumberField label="Height" value={zone.sizeInches.heightInches} min={1} step={0.25} onChange={handleHeightChange} /></div></PropertySection>
      <PropertySection title="Actions"><button type="button" className="mt-3 w-full rounded-md bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800" onClick={handleDuplicate}>Duplicate</button><button type="button" className="mt-2 w-full rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700" onClick={handleDelete}>Delete</button></PropertySection>
    </div>
  );
}
