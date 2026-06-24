import type { KitchenAiPostDesigned, KitchenAiPostDesignedImagePlan } from "./kitchenAiPostDesignedTypes";
import type { KitchenAiDevelopmentCatalogItem, KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

type ImagePromptEntity = Readonly<{
  id: string;
  entityKind: string;
  definitionId?: string;
  semanticRole?: string;
  label: string;
}>;

export function buildKitchenAiImagePromptObjectManifest(args: {
  preDesigned: KitchenAiPreDesigned;
  postDesigned: KitchenAiPostDesigned;
  imagePlan: KitchenAiPostDesignedImagePlan;
}): string {
  const entitiesById = collectEntitiesById(args.preDesigned, args.postDesigned);
  const visibleEntities = args.imagePlan.includedSceneEntityIds.flatMap((entityId) => {
    const entity = entitiesById.get(entityId);
    return entity ? [entity] : [];
  });
  const groupedCounts = countVisibleEntities(visibleEntities);
  const objectLines = visibleEntities.length > 0
    ? visibleEntities.map((entity) => `- ${entity.label} (${entity.id})`)
    : ["- No specific scene entities are listed for this view; keep the wall/corner context simple and do not invent extra objects."];

  return [
    "Visible object manifest for this single image:",
    ...objectLines,
    "",
    "Strict visual counts for this image:",
    `- Windows: exactly ${groupedCounts.windows}`,
    `- Doors: exactly ${groupedCounts.doors}`,
    `- Refrigerators: exactly ${groupedCounts.refrigerators}`,
    `- Dishwashers: exactly ${groupedCounts.dishwashers}`,
    `- Sinks: exactly ${groupedCounts.sinks}`,
    `- Faucets: exactly ${groupedCounts.faucets}`,
    `- Cabinets or cabinet-like units: exactly ${groupedCounts.cabinets}`,
    "Do not add any extra windows, doors, appliances, fixtures, cabinets, wall art, or other objects beyond this manifest unless they are plain wall/floor/ceiling finishes needed to make the room realistic.",
  ].join("\n");
}

function collectEntitiesById(
  preDesigned: KitchenAiPreDesigned,
  postDesigned: KitchenAiPostDesigned,
): Map<string, ImagePromptEntity> {
  const catalogItemsByDefinitionId = new Map(preDesigned.catalog.map((item) => [item.definitionId, item]));
  const entitiesById = new Map<string, ImagePromptEntity>();

  for (const entity of preDesigned.existingSceneEntities) {
    entitiesById.set(entity.id, {
      id: entity.id,
      entityKind: entity.entityKind,
      definitionId: entity.definitionId,
      semanticRole: entity.semanticRole,
      label: getEntityLabel({ definitionId: entity.definitionId, semanticRole: entity.semanticRole, catalogItemsByDefinitionId }),
    });
  }

  for (const entity of [...postDesigned.scenePatch.addSceneEntities, ...postDesigned.scenePatch.updateSceneEntities]) {
    const definitionId = entity.entityKind === "placed-assembly" ? entity.definitionId : undefined;
    const semanticRole = entity.entityKind === "placed-assembly" ? entity.semanticRole : entity.reservedFor;

    entitiesById.set(entity.id, {
      id: entity.id,
      entityKind: entity.entityKind,
      definitionId,
      semanticRole,
      label: getEntityLabel({ definitionId, semanticRole, catalogItemsByDefinitionId }),
    });
  }

  return entitiesById;
}

function getEntityLabel(args: {
  definitionId?: string;
  semanticRole?: string;
  catalogItemsByDefinitionId: ReadonlyMap<string, KitchenAiDevelopmentCatalogItem>;
}): string {
  if (args.definitionId) {
    const catalogLabel = args.catalogItemsByDefinitionId.get(args.definitionId)?.label;

    if (catalogLabel) {
      return catalogLabel;
    }
  }

  return humanize(args.semanticRole ?? args.definitionId ?? "scene object");
}

function countVisibleEntities(entities: readonly ImagePromptEntity[]): {
  windows: number;
  doors: number;
  refrigerators: number;
  dishwashers: number;
  sinks: number;
  faucets: number;
  cabinets: number;
} {
  return entities.reduce(
    (counts, entity) => {
      const searchable = `${entity.definitionId ?? ""} ${entity.semanticRole ?? ""} ${entity.label}`.toLowerCase();

      if (searchable.includes("window")) counts.windows += 1;
      if (searchable.includes("door") && !searchable.includes("two-door") && !searchable.includes("one-door")) counts.doors += 1;
      if (searchable.includes("refrigerator")) counts.refrigerators += 1;
      if (searchable.includes("dishwasher")) counts.dishwashers += 1;
      if (searchable.includes("sink")) counts.sinks += 1;
      if (searchable.includes("faucet")) counts.faucets += 1;
      if (searchable.includes("cabinet") || searchable.includes("pantry")) counts.cabinets += 1;

      return counts;
    },
    { windows: 0, doors: 0, refrigerators: 0, dishwashers: 0, sinks: 0, faucets: 0, cabinets: 0 },
  );
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}
