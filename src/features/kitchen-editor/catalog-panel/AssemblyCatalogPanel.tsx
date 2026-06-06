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
    <div className="flex min-h-full -m-4">
      <div className="min-w-0 flex-1 p-4">
        <div className="mb-4">
          <AssemblyCatalogCategoryTabs
            activeCatalogId={activeCatalogId}
            activeCategoryId={activeCategoryId}
            onSelectCategory={setActiveCategoryId}
          />
        </div>
        <AssemblyCatalogGrid
          activeCatalogId={activeCatalogId}
          activeCategoryId={activeCategoryId}
          onSelectAssemblyDefinition={handleSelectAssemblyDefinition}
        />
      </div>
      <AssemblyCatalogSelector activeCatalogId={activeCatalogId} onSelectCatalog={handleSelectCatalog} />
    </div>
  );
}
