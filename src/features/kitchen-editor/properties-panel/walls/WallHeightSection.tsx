"use client";

import type { PlacedWall } from "@/engine/walls/wallTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";

type WallHeightSectionProps = Readonly<{
  placedWall: PlacedWall;
}>;

export function WallHeightSection({ placedWall }: WallHeightSectionProps) {
  const updateSelectedPlacedWallHeight = useDesignSceneStore(
    (state) => state.updateSelectedPlacedWallHeight,
  );

  return (
    <PropertySection title="Wall">
      <div className="mt-3">
        <PropertyNumberField
          label="Height"
          value={placedWall.heightInches}
          min={1}
          step={1}
          onChange={updateSelectedPlacedWallHeight}
        />
      </div>
    </PropertySection>
  );
}
