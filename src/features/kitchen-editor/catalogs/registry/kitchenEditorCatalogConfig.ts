export const kitchenEditorCatalogs = [
  {
    id: "basic-units",
    label: "Basic Units",
    iconId: "basic-units",
    categories: [
      { id: "boxes", label: "Boxes" },
      { id: "doors", label: "Doors" },
      { id: "drawers", label: "Drawers" },
      { id: "panels", label: "Panels" },
    ],
  },
  {
    id: "cabinets",
    label: "Cabinets",
    iconId: "cabinets",
    categories: [
      { id: "base-cabinets", label: "Base Cabinets" },
      { id: "wall-cabinets", label: "Wall Cabinets" },
      { id: "pantry-cabinets", label: "Pantry Cabinets" },
    ],
  },
] as const;

export type KitchenEditorCatalog = (typeof kitchenEditorCatalogs)[number];
export type KitchenEditorCatalogId = KitchenEditorCatalog["id"];
export type KitchenEditorCatalogCategory = KitchenEditorCatalog["categories"][number];
export type KitchenEditorCatalogCategoryId = KitchenEditorCatalogCategory["id"];

export function getKitchenEditorCatalog(
  catalogId: KitchenEditorCatalogId,
): KitchenEditorCatalog {
  const catalog = kitchenEditorCatalogs.find((matchingCatalog) => matchingCatalog.id === catalogId);

  if (catalog === undefined) {
    throw new Error(`Unknown kitchen editor catalog "${catalogId}".`);
  }

  return catalog;
}

export function getDefaultKitchenEditorCatalogCategoryId(
  catalogId: KitchenEditorCatalogId,
): KitchenEditorCatalogCategoryId {
  return getKitchenEditorCatalog(catalogId).categories[0].id;
}
