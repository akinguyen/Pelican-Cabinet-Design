"use client";

import { useState } from "react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { createPlacedAssemblyFromDefinition } from "@/engine/assemblies/assemblyConfigurationFactory";
import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
  KitchenEditorCatalogSelectorItemId,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import {
  getDefaultKitchenEditorCabinetCatalogId,
  getDefaultKitchenEditorCatalogCategoryId,
  getKitchenEditorCatalog,
  isKitchenEditorCabinetCatalogId,
  kitchenEditorCatalogs,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import { AssemblyCatalogCategorySelect } from "./AssemblyCatalogCategorySelect";
import { AssemblyCatalogGrid } from "./AssemblyCatalogGrid";
import { AssemblyCatalogHeader } from "./AssemblyCatalogHeader";
import { AssemblyCatalogSelector } from "./AssemblyCatalogSelector";
import { AssemblyCatalogTypeSelect } from "./AssemblyCatalogTypeSelect";

const initialAssemblyCandidatePositionInches: Point3DInches = {
  xInches: 0,
  yInches: 0,
  zInches: 0,
};

const defaultCatalogId = kitchenEditorCatalogs[0].id;

export function AssemblyCatalogPanel() {
  const startSceneEntityPlacementCandidate = useDesignSceneStore((state) => state.startSceneEntityPlacementCandidate);
  const [activeCatalogId, setActiveCatalogId] = useState<KitchenEditorCatalogId>(defaultCatalogId);
  const [activeCategoryId, setActiveCategoryId] = useState<KitchenEditorCatalogCategoryId>(
    getDefaultKitchenEditorCatalogCategoryId(defaultCatalogId),
  );
  const activeCatalog = getKitchenEditorCatalog(activeCatalogId);

  function handleSelectCatalog(catalogId: KitchenEditorCatalogId) {
    setActiveCatalogId(catalogId);
    setActiveCategoryId(getDefaultKitchenEditorCatalogCategoryId(catalogId));
  }

  function handleSelectCatalogGroup(selectorItemId: KitchenEditorCatalogSelectorItemId) {
    if (selectorItemId === "cabinets") {
      handleSelectCatalog(getDefaultKitchenEditorCabinetCatalogId());
      return;
    }

    handleSelectCatalog(selectorItemId as KitchenEditorCatalogId);
  }

  function handleSelectAssemblyDefinition(definition: AssemblyDefinition) {
    startSceneEntityPlacementCandidate(
      createPlacedAssemblyFromDefinition(definition, initialAssemblyCandidatePositionInches),
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="shrink-0 space-y-3 pb-3">
          <AssemblyCatalogHeader catalog={activeCatalog} />
          {isKitchenEditorCabinetCatalogId(activeCatalogId) ? (
            <AssemblyCatalogTypeSelect
              activeCatalogId={activeCatalogId}
              onSelectCatalogType={handleSelectCatalog}
            />
          ) : null}
          <AssemblyCatalogCategorySelect
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
      <AssemblyCatalogSelector activeCatalogId={activeCatalogId} onSelectCatalogGroup={handleSelectCatalogGroup} />
    </div>
  );
}
