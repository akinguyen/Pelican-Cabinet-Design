import { buildAssemblyWallMeasurementGuides } from "@/engine/assemblies/placement/assemblyWallMeasurementGuides";
import type { AssemblyWallMeasurementGuide } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneEntityBounds } from "../sceneEntityBoundsTypes";

export type SceneEntityWallMeasurementGuide = AssemblyWallMeasurementGuide;

export function buildSceneEntityWallMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly SceneEntityWallMeasurementGuide[] {
  return buildAssemblyWallMeasurementGuides({
    footprint: args.bounds.footprint,
    placedWallGraphs: args.placedWallGraphs,
  });
}
