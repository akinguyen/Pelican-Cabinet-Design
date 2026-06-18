import { createAssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneEntityBounds } from "./sceneEntityBoundsTypes";

export function createPlacedAssemblySceneEntityBounds(
  placedAssembly: PlacedAssembly,
): SceneEntityBounds {
  const footprint = createAssemblyPlacementFootprint(placedAssembly);
  const halfHeightInches = placedAssembly.configuration.sizeInches.heightInches / 2;
  const minZInches = placedAssembly.worldPositionInches.zInches - halfHeightInches;
  const maxZInches = placedAssembly.worldPositionInches.zInches + halfHeightInches;
  const topCornersInches = footprint.cornerPointsInches.map((cornerPointInches) => ({
    ...cornerPointInches,
    zInches: maxZInches,
  }));

  return {
    entityId: placedAssembly.id,
    entityKind: "placed-assembly",
    baseCenterPointInches: {
      xInches: placedAssembly.worldPositionInches.xInches,
      yInches: placedAssembly.worldPositionInches.yInches,
      zInches: minZInches,
    },
    centerPointInches: placedAssembly.worldPositionInches,
    sizeInches: placedAssembly.configuration.sizeInches,
    rotationDegrees: placedAssembly.rotationDegrees,
    footprint,
    footprintCornersInches: footprint.cornerPointsInches,
    topCornersInches,
    heightRangeInches: {
      minZInches,
      maxZInches,
    },
  };
}
