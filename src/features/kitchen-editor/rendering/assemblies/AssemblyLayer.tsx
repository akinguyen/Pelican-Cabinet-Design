"use client";

import { useMemo } from "react";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import {
  buildCountertopOpeningsByHostCountertopId,
} from "@/engine/countertops/applyCountertopOpeningsToAssemblyTree";
import { deriveCountertopOpeningsFromAssemblies } from "@/engine/countertops/deriveCountertopOpeningsFromAssemblies";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { PlacedAssemblyRenderer } from "./PlacedAssemblyRenderer";
import { useAssemblyRenderItems } from "./useAssemblyRenderItems";

type AssemblyLayerProps = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  countertopOpeningAssemblies: readonly PlacedAssembly[];
  showFrontOutlineLines: boolean;
  sceneViewMode: SceneViewMode;
}>;

const EMPTY_COUNTERTOP_OPENINGS: ReturnType<typeof deriveCountertopOpeningsFromAssemblies> = [];
const EMPTY_COUNTERTOP_OPENINGS_BY_HOST_COUNTERTOP_ID: ReturnType<typeof buildCountertopOpeningsByHostCountertopId> = new Map();

export function AssemblyLayer({
  placedAssemblies,
  countertopOpeningAssemblies,
  showFrontOutlineLines,
  sceneViewMode,
}: AssemblyLayerProps) {
  const derivedCountertopOpenings = useMemo(() => (
    countertopOpeningAssemblies.length === 0
      ? EMPTY_COUNTERTOP_OPENINGS
      : deriveCountertopOpeningsFromAssemblies({
        placedAssemblies: countertopOpeningAssemblies,
        registry: kitchenEditorCatalogRegistry,
      })
  ), [countertopOpeningAssemblies]);
  const derivedCountertopOpeningsByHostCountertopId = useMemo(
    () => derivedCountertopOpenings.length === 0
      ? EMPTY_COUNTERTOP_OPENINGS_BY_HOST_COUNTERTOP_ID
      : buildCountertopOpeningsByHostCountertopId(derivedCountertopOpenings),
    [derivedCountertopOpenings],
  );
  const assemblyRenderItems = useAssemblyRenderItems(
    placedAssemblies,
    derivedCountertopOpeningsByHostCountertopId,
  );
  return (
    <group>
      {assemblyRenderItems.map((assemblyRenderItem) => (
        <PlacedAssemblyRenderer
          key={assemblyRenderItem.placedAssembly.id}
          placedAssembly={assemblyRenderItem.placedAssembly}
          builtAssemblyTree={assemblyRenderItem.builtAssemblyTree}
          showFrontOutlineLines={showFrontOutlineLines}
          sceneViewMode={sceneViewMode}
        />
      ))}
    </group>
  );
}
