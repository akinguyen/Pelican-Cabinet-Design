import { combineBounds3DInches } from "@/core/geometry/boxBounds";
import { measurePlacedAssembliesVisualBounds } from "@/engine/assemblies/assemblyBounds";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { measurePlacedWallGraphsBounds } from "@/engine/walls/wallBounds";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { kitchenEditorCatalogRegistry } from "../../../catalogs/registry/kitchenEditorCatalogRegistry";
import type { SceneFitFrame } from "./cameraFit";
import { createSceneFitFrame } from "./cameraFit";

export function createSceneFitFrameForScene(args: {
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
}): SceneFitFrame {
  return createSceneFitFrame(
    combineBounds3DInches(
      measurePlacedAssembliesVisualBounds(args.placedAssemblies, kitchenEditorCatalogRegistry),
      measurePlacedWallGraphsBounds({ placedWallGraphs: args.placedWallGraphs }),
    ),
  );
}

export function getCurrentSceneFitFrame(): SceneFitFrame {
  const { designScene } = useDesignSceneStore.getState();

  return createSceneFitFrameForScene({
    placedAssemblies: designScene.placedAssemblies,
    placedWallGraphs: designScene.placedWallGraphs,
  });
}
