"use client";

import { useMemo, useRef } from "react";
import { buildAssemblyTree, type BuiltAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import {
  applyHostCountertopOpeningsToAssemblyTree,
} from "@/engine/countertops/applyCountertopOpeningsToAssemblyTree";
import type { DerivedCountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";

export type AssemblyRenderItem = Readonly<{
  placedAssembly: PlacedAssembly;
  builtAssemblyTree: BuiltAssemblyTree;
}>;

type AssemblyTreeRenderCacheEntry = Readonly<{
  placedAssembly: PlacedAssembly;
  hostCountertopOpenings: readonly DerivedCountertopOpening[];
  baseBuiltAssemblyTree: BuiltAssemblyTree;
  builtAssemblyTree: BuiltAssemblyTree;
}>;

const EMPTY_COUNTERTOP_OPENINGS: readonly DerivedCountertopOpening[] = [];

export function useAssemblyRenderItems(
  placedAssemblies: readonly PlacedAssembly[],
  countertopOpeningsByHostCountertopId: ReadonlyMap<string, readonly DerivedCountertopOpening[]>,
): readonly AssemblyRenderItem[] {
  const assemblyTreeRenderCacheRef = useRef<ReadonlyMap<string, AssemblyTreeRenderCacheEntry>>(
    new Map(),
  );

  return useMemo(() => {
    const previousCache = assemblyTreeRenderCacheRef.current;
    const nextCache = new Map<string, AssemblyTreeRenderCacheEntry>();
    const assemblyRenderItems = placedAssemblies.map((placedAssembly) => {
      const hostCountertopOpenings = countertopOpeningsByHostCountertopId.get(placedAssembly.id)
        ?? EMPTY_COUNTERTOP_OPENINGS;
      const previousEntry = previousCache.get(placedAssembly.id);
      const baseBuiltAssemblyTree = previousEntry?.placedAssembly === placedAssembly
        ? previousEntry.baseBuiltAssemblyTree
        : buildAssemblyTree(placedAssembly, kitchenEditorCatalogRegistry);
      const builtAssemblyTree = previousEntry?.placedAssembly === placedAssembly
        && previousEntry.hostCountertopOpenings === hostCountertopOpenings
        ? previousEntry.builtAssemblyTree
        : applyHostCountertopOpeningsToAssemblyTree(baseBuiltAssemblyTree, hostCountertopOpenings);

      nextCache.set(placedAssembly.id, {
        placedAssembly,
        hostCountertopOpenings,
        baseBuiltAssemblyTree,
        builtAssemblyTree,
      });

      return {
        placedAssembly,
        builtAssemblyTree,
      };
    });

    assemblyTreeRenderCacheRef.current = nextCache;
    return assemblyRenderItems;
  }, [countertopOpeningsByHostCountertopId, placedAssemblies]);
}
