import type { AssemblyConfiguration } from "./assemblyConfiguration";
import type { SceneEntityBase } from "@/engine/scene-entities/sceneEntityTypes";

export type PlacedAssembly = SceneEntityBase<"placed-assembly"> & Readonly<{
  definitionId: string;
  configuration: AssemblyConfiguration;
}>;

export function getAssemblyDistanceFromFloorInches(
  placedAssembly: PlacedAssembly,
): number {
  return (
    placedAssembly.worldPositionInches.zInches -
    placedAssembly.configuration.sizeInches.heightInches / 2
  );
}

export function updateAssemblyDistanceFromFloor(
  placedAssembly: PlacedAssembly,
  distanceFromFloorInches: number,
): PlacedAssembly {
  return {
    ...placedAssembly,
    worldPositionInches: {
      ...placedAssembly.worldPositionInches,
      zInches:
        distanceFromFloorInches +
        placedAssembly.configuration.sizeInches.heightInches / 2,
    },
  };
}

export function updateAssemblyHeightPreservingDistanceFromFloor(
  placedAssembly: PlacedAssembly,
  heightInches: number,
): PlacedAssembly {
  const distanceFromFloorInches = getAssemblyDistanceFromFloorInches(placedAssembly);

  return {
    ...placedAssembly,
    configuration: {
      ...placedAssembly.configuration,
      sizeInches: {
        ...placedAssembly.configuration.sizeInches,
        heightInches,
      },
    },
    worldPositionInches: {
      ...placedAssembly.worldPositionInches,
      zInches: distanceFromFloorInches + heightInches / 2,
    },
  };
}
