import { createPlacedAssemblyPlanFootprint } from "./placedAssemblyPlanFootprint";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneEntityBounds } from "./sceneEntityBoundsTypes";

export function createPlacedAssemblySceneEntityBounds(placedAssembly: PlacedAssembly): SceneEntityBounds {
  const footprint = createPlacedAssemblyPlanFootprint(placedAssembly);
  const halfHeightInches = placedAssembly.configuration.sizeInches.heightInches / 2;
  const minZInches = placedAssembly.worldPositionInches.zInches - halfHeightInches;
  const maxZInches = placedAssembly.worldPositionInches.zInches + halfHeightInches;
  return {
    entityId: placedAssembly.id,
    entityKind: "placed-assembly",
    centerPointInches: placedAssembly.worldPositionInches,
    sizeInches: placedAssembly.configuration.sizeInches,
    rotationDegrees: placedAssembly.rotationDegrees,
    footprint,
    footprintCornersInches: footprint.cornerPointsInches.map((point) => ({ ...point, zInches: minZInches })),
    topCornersInches: footprint.cornerPointsInches.map((point) => ({ ...point, zInches: maxZInches })),
    heightRangeInches: { minZInches, maxZInches },
  };
}
