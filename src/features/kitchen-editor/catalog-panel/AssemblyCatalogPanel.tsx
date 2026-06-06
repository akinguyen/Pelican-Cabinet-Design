"use client";

import { useState } from "react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { createPlacedAssemblyFromDefinition } from "@/engine/assemblies/assemblyConfigurationFactory";
import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import {
  getDefaultKitchenEditorCatalogCategoryId,
  kitchenEditorCatalogs,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import { AssemblyCatalogCategoryTabs } from "./AssemblyCatalogCategoryTabs";
import { AssemblyCatalogGrid } from "./AssemblyCatalogGrid";
import { AssemblyCatalogSelector } from "./AssemblyCatalogSelector";

const initialAssemblyCandidatePositionInches: Point3DInches = {
  xInches: 0,
  yInches: 0,
  zInches: 0,
};

const defaultCatalogId = kitchenEditorCatalogs[0].id;

export function AssemblyCatalogPanel() {
  const startAssemblyPlacementCandidate = useDesignSceneStore((state) => state.startAssemblyPlacementCandidate);
  const [activeCatalogId, setActiveCatalogId] = useState<KitchenEditorCatalogId>(defaultCatalogId);
  const [activeCategoryId, setActiveCategoryId] = useState<KitchenEditorCatalogCategoryId>(
    getDefaultKitchenEditorCatalogCategoryId(defaultCatalogId),
  );

  function handleSelectCatalog(catalogId: KitchenEditorCatalogId) {
    setActiveCatalogId(catalogId);
    setActiveCategoryId(getDefaultKitchenEditorCatalogCategoryId(catalogId));
  }

  function handleSelectAssemblyDefinition(definition: AssemblyDefinition) {
    startAssemblyPlacementCandidate(
      createPlacedAssemblyFromDefinition(definition, initialAssemblyCandidatePositionInches),
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="shrink-0 pb-3">
          <AssemblyCatalogCategoryTabs
            activeCatalogId={activeCatalogId}
            activeCategoryId={activeCategoryId}
            onSelectCategory={setActiveCategoryId}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <AssemblyCatalogGrid
            activeCatalogId={activeCatalogId}
            activeCategoryId={activeCategoryId}
            onSelectAssemblyDefinition={handleSelectAssemblyDefinition}
          />
        </div>
      </div>
      <AssemblyCatalogSelector activeCatalogId={activeCatalogId} onSelectCatalog={handleSelectCatalog} />
    </div>
  );
}
