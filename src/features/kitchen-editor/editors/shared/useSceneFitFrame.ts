"use client";

import { useMemo } from "react";
import { combineBounds3DInches } from "@/core/geometry/boxBounds";
import { measurePlacedAssembliesBounds } from "@/engine/assemblies/assemblyBounds";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { measurePlacedWallsBounds } from "@/engine/walls/wallBounds";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { createSceneFitFrame } from "./cameraFit";

export function useSceneFitFrame() {
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);

  return useMemo(
    () =>
      createSceneFitFrame(
        combineBounds3DInches(
          measurePlacedAssembliesBounds(placedAssemblies, kitchenEditorCatalogRegistry),
          measurePlacedWallsBounds(placedWalls),
        ),
      ),
    [placedAssemblies, placedWalls],
  );
}
