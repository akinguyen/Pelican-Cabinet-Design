import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyConfiguration } from "./assemblyConfiguration";

export type PlacedAssembly = Readonly<{
  id: string;
  definitionId: string;
  configuration: AssemblyConfiguration;
  worldPositionInches: Point3DInches;
  rotationDegrees: Readonly<{
    zDegrees: number;
  }>;
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
