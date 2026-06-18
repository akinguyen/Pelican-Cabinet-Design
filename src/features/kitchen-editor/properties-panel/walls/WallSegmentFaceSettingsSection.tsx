"use client";

import { useCallback } from "react";
import type {
  CabinetPlacementRequirement,
  PlacedWallSegment,
  WallFaceSide,
} from "@/engine/walls/placedWallSegmentTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertySection } from "../shared/PropertySection";

type WallSegmentFaceSettingsSectionProps = Readonly<{
  wallSegment: PlacedWallSegment;
}>;

export function WallSegmentFaceSettingsSection({ wallSegment }: WallSegmentFaceSettingsSectionProps) {
  const handlePreferredViewFaceSideChange = useCallback((preferredViewFaceSide: WallFaceSide) => {
    useDesignSceneStore.getState().updateSelectedWallSegmentPreferredViewFaceSide(preferredViewFaceSide);
  }, []);
  const handleCabinetPlacementRequirementChange = useCallback((
    faceSide: WallFaceSide,
    requirement: CabinetPlacementRequirement,
  ) => {
    useDesignSceneStore.getState().updateSelectedWallSegmentCabinetPlacementFacePolicy(faceSide, requirement);
  }, []);

  return (
    <PropertySection
      title="Wall Face Settings"
      description="Preferred view side is used by the elevation navigator. Cabinet placement requirement controls which faces the AI must use, may use, or must leave clear."
    >
      <div className="mt-3 space-y-3">
        <label className="block text-xs text-slate-600">
          <span className="mb-1 block font-medium">Preferred view side</span>
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={wallSegment.preferredViewFaceSide}
            onChange={(event) => handlePreferredViewFaceSideChange(event.target.value as WallFaceSide)}
          >
            <option value="side-a">Side A</option>
            <option value="side-b">Side B</option>
          </select>
        </label>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-xs font-medium text-slate-700">Cabinet placement requirement</div>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Required means AI must place kitchen objects on that face. Optional means AI may use it. No cabinets means AI must leave it clear.
          </p>
          <div className="mt-2 space-y-2">
            <CabinetPlacementRequirementSelect
              label="Side A"
              value={wallSegment.cabinetPlacementFacePolicies["side-a"]}
              onChange={(requirement) => handleCabinetPlacementRequirementChange("side-a", requirement)}
            />
            <CabinetPlacementRequirementSelect
              label="Side B"
              value={wallSegment.cabinetPlacementFacePolicies["side-b"]}
              onChange={(requirement) => handleCabinetPlacementRequirementChange("side-b", requirement)}
            />
          </div>
        </div>
      </div>
    </PropertySection>
  );
}

function CabinetPlacementRequirementSelect({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: CabinetPlacementRequirement;
  onChange: (requirement: CabinetPlacementRequirement) => void;
}>) {
  return (
    <label className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 text-xs text-slate-600">
      <span className="font-medium">{label}</span>
      <select
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        value={value}
        onChange={(event) => onChange(event.target.value as CabinetPlacementRequirement)}
      >
        <option value="none">No cabinets</option>
        <option value="optional">Optional</option>
        <option value="required">Required</option>
      </select>
    </label>
  );
}
