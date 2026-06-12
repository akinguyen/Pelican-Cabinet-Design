"use client";

import { useMemo } from "react";
import { combineBounds3DInches } from "@/core/geometry/boxBounds";
import { measurePlacedAssembliesVisualBounds } from "@/engine/assemblies/assemblyBounds";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { measurePlacedWallGraphsBounds } from "@/engine/walls/wallBounds";
import { kitchenEditorCatalogRegistry } from "../../../catalogs/registry/kitchenEditorCatalogRegistry";
import { createSceneFitFrame } from "./cameraFit";

export function useSceneFitFrame() {
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);

  return useMemo(
    () =>
      createSceneFitFrame(
        combineBounds3DInches(
          measurePlacedAssembliesVisualBounds(placedAssemblies, kitchenEditorCatalogRegistry),
          measurePlacedWallGraphsBounds({ placedWallGraphs }),
        ),
      ),
    [placedAssemblies, placedWallGraphs],
  );
}
