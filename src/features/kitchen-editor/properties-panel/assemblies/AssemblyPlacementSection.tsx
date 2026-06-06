"use client";

import { getAssemblyDistanceFromFloorInches } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";

type AssemblyPlacementSectionProps = Readonly<{
  placedAssembly: PlacedAssembly;
}>;

export function AssemblyPlacementSection({ placedAssembly }: AssemblyPlacementSectionProps) {
  const updateSelectedAssemblyWorldPositionX = useDesignSceneStore(
    (state) => state.updateSelectedAssemblyWorldPositionX,
  );
  const updateSelectedAssemblyWorldPositionY = useDesignSceneStore(
    (state) => state.updateSelectedAssemblyWorldPositionY,
  );
  const updateSelectedAssemblyDistanceFromFloor = useDesignSceneStore(
    (state) => state.updateSelectedAssemblyDistanceFromFloor,
  );
  const updateSelectedAssemblyRotationZ = useDesignSceneStore(
    (state) => state.updateSelectedAssemblyRotationZ,
  );

  return (
    <PropertySection title="Placement">
      <div className="mt-3 grid grid-cols-2 gap-3">
        <PropertyNumberField
          label="X position"
          value={placedAssembly.worldPositionInches.xInches}
          step={0.25}
          onChange={updateSelectedAssemblyWorldPositionX}
        />
        <PropertyNumberField
          label="Y position"
          value={placedAssembly.worldPositionInches.yInches}
          step={0.25}
          onChange={updateSelectedAssemblyWorldPositionY}
        />
        <PropertyNumberField
          label="Distance from floor"
          value={getAssemblyDistanceFromFloorInches(placedAssembly)}
          min={0}
          step={0.25}
          onChange={updateSelectedAssemblyDistanceFromFloor}
        />
        <PropertyNumberField
          label="Rotation Z"
          value={placedAssembly.rotationDegrees.zDegrees}
          step={1}
          onChange={updateSelectedAssemblyRotationZ}
        />
      </div>
    </PropertySection>
  );
}
