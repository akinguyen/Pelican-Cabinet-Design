"use client";

import { useCallback } from "react";
import { getAssemblyDistanceFromFloorInches } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";

type AssemblyPlacementSectionProps = Readonly<{
  placedAssembly: PlacedAssembly;
}>;

export function AssemblyPlacementSection({ placedAssembly }: AssemblyPlacementSectionProps) {
  const handleWorldPositionXChange = useCallback((xInches: number) => {
    useDesignSceneStore.getState().updateSelectedAssemblyWorldPositionX(xInches);
  }, []);
  const handleWorldPositionYChange = useCallback((yInches: number) => {
    useDesignSceneStore.getState().updateSelectedAssemblyWorldPositionY(yInches);
  }, []);
  const handleDistanceFromFloorChange = useCallback((distanceFromFloorInches: number) => {
    useDesignSceneStore.getState().updateSelectedAssemblyDistanceFromFloor(distanceFromFloorInches);
  }, []);
  const handleRotationZChange = useCallback((zDegrees: number) => {
    useDesignSceneStore.getState().updateSelectedAssemblyRotationZ(zDegrees);
  }, []);

  return (
    <PropertySection title="Placement">
      <div className="mt-3 grid grid-cols-2 gap-3">
        <PropertyNumberField
          label="X position"
          value={placedAssembly.worldPositionInches.xInches}
          step={0.25}
          onChange={handleWorldPositionXChange}
        />
        <PropertyNumberField
          label="Y position"
          value={placedAssembly.worldPositionInches.yInches}
          step={0.25}
          onChange={handleWorldPositionYChange}
        />
        <PropertyNumberField
          label="Distance from floor"
          value={getAssemblyDistanceFromFloorInches(placedAssembly)}
          min={0}
          step={0.25}
          onChange={handleDistanceFromFloorChange}
        />
        <PropertyNumberField
          label="Rotation Z"
          value={placedAssembly.rotationDegrees.zDegrees}
          step={1}
          onChange={handleRotationZChange}
        />
      </div>
    </PropertySection>
  );
}
