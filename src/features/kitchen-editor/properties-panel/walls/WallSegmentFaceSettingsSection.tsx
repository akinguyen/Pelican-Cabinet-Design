"use client";

import { useCallback } from "react";
import type { PlacedWallSegment, WallFaceSide } from "@/engine/walls/placedWallSegmentTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertySection } from "../shared/PropertySection";

type CabinetPlacementFaceSideMode = "none" | "side-a" | "side-b" | "both";

type WallSegmentFaceSettingsSectionProps = Readonly<{
  wallSegment: PlacedWallSegment;
}>;

export function WallSegmentFaceSettingsSection({ wallSegment }: WallSegmentFaceSettingsSectionProps) {
  const handlePreferredViewFaceSideChange = useCallback((preferredViewFaceSide: WallFaceSide) => {
    useDesignSceneStore.getState().updateSelectedWallSegmentPreferredViewFaceSide(preferredViewFaceSide);
  }, []);
  const handleCabinetPlacementFaceSideChange = useCallback((mode: CabinetPlacementFaceSideMode) => {
    useDesignSceneStore.getState().updateSelectedWallSegmentCabinetPlacementFaceSides(
      getCabinetPlacementFaceSidesFromMode(mode),
    );
  }, []);

  return (
    <PropertySection
      title="Wall Face Settings"
      description="Preferred view side is used by the elevation navigator. Cabinet placement side controls which faces can receive AI/design objects."
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

        <label className="block text-xs text-slate-600">
          <span className="mb-1 block font-medium">Cabinet placement side</span>
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={getCabinetPlacementFaceSideMode(wallSegment.cabinetPlacementFaceSides)}
            onChange={(event) => handleCabinetPlacementFaceSideChange(event.target.value as CabinetPlacementFaceSideMode)}
          >
            <option value="none">None</option>
            <option value="side-a">Side A</option>
            <option value="side-b">Side B</option>
            <option value="both">Both sides</option>
          </select>
        </label>
      </div>
    </PropertySection>
  );
}

function getCabinetPlacementFaceSideMode(
  faceSides: readonly WallFaceSide[],
): CabinetPlacementFaceSideMode {
  const hasSideA = faceSides.includes("side-a");
  const hasSideB = faceSides.includes("side-b");

  if (hasSideA && hasSideB) {
    return "both";
  }

  if (hasSideA) {
    return "side-a";
  }

  if (hasSideB) {
    return "side-b";
  }

  return "none";
}

function getCabinetPlacementFaceSidesFromMode(
  mode: CabinetPlacementFaceSideMode,
): readonly WallFaceSide[] {
  switch (mode) {
    case "side-a":
      return ["side-a"];
    case "side-b":
      return ["side-b"];
    case "both":
      return ["side-a", "side-b"];
    case "none":
      return [];
  }
}
