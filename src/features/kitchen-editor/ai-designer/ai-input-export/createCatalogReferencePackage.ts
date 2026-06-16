import type {
  AssemblyDefinition,
  AssemblyDimensionDefinition,
  AssemblyOptionGroup,
} from "@/engine/assemblies/assemblyDefinitionTypes";
import type { AssemblyCutoutBehavior } from "@/engine/assemblies/assemblyCutoutBehaviorTypes";
import {
  kitchenEditorAssemblyCatalogEntries,
  kitchenEditorDefinitions,
} from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "../../catalogs/registry/kitchenEditorCatalogConfig";

export type AiCatalogReferencePackage = Readonly<{
  packageName: "catalog-reference";
  packageIndex: 3;
  description: string;
  definitions: readonly AiCatalogDefinitionReference[];
}>;

export type AiCatalogDefinitionReference = Readonly<{
  definitionId: string;
  name: string;
  catalogCategoryId: string;
  catalogId: KitchenEditorCatalogId | null;
  categoryId: KitchenEditorCatalogCategoryId | null;
  internalOnly: boolean;
  defaultDistanceFromFloorInches: number | null;
  dimensions: AssemblyDimensionDefinition;
  optionGroups: readonly AssemblyOptionGroup[];
  cutoutBehavior: AssemblyCutoutBehavior | null;
}>;

export function createCatalogReferencePackage(): AiCatalogReferencePackage {
  const visibleCatalogEntriesByDefinitionId = new Map(
    kitchenEditorAssemblyCatalogEntries.map((entry) => [entry.definition.id, entry]),
  );

  return {
    packageName: "catalog-reference",
    packageIndex: 3,
    description: "Allowed Kitchen Editor catalog definitions for AI scene generation. Use only these definition ids, dimensions, and option values.",
    definitions: kitchenEditorDefinitions
      .map((definition) => createDefinitionReference({
        definition,
        visibleCatalogEntry: visibleCatalogEntriesByDefinitionId.get(definition.id) ?? null,
      }))
      .sort((firstDefinition, secondDefinition) => firstDefinition.definitionId.localeCompare(secondDefinition.definitionId)),
  };
}

function createDefinitionReference(args: {
  definition: AssemblyDefinition;
  visibleCatalogEntry: (typeof kitchenEditorAssemblyCatalogEntries)[number] | null;
}): AiCatalogDefinitionReference {
  return {
    definitionId: args.definition.id,
    name: args.definition.name,
    catalogCategoryId: args.definition.catalogCategoryId,
    catalogId: args.visibleCatalogEntry?.catalogId ?? null,
    categoryId: args.visibleCatalogEntry?.categoryId ?? null,
    internalOnly: args.visibleCatalogEntry === null,
    defaultDistanceFromFloorInches: args.definition.defaultDistanceFromFloorInches ?? null,
    dimensions: args.definition.dimensions,
    optionGroups: args.definition.optionGroups,
    cutoutBehavior: args.definition.cutoutBehavior ?? null,
  };
}
