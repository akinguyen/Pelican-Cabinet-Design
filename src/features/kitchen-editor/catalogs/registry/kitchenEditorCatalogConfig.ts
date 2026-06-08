export const kitchenEditorCatalogs = [
  {
    id: "basic-units",
    label: "Basic Units",
    iconId: "basic-units",
    categories: [
      { id: "all", label: "All" },
      { id: "doors", label: "Doors" },
      { id: "drawers", label: "Drawers" },
      { id: "panels", label: "Panels" },
    ],
  },
  {
    id: "base-cabinets",
    label: "Base Cabinets",
    iconId: "base-cabinets",
    categories: [
      { id: "all", label: "All" },
      { id: "standard-base-cabinets", label: "Standard Base Cabinets" },
      { id: "drawer-base-cabinets", label: "Drawer Base Cabinets" },
      { id: "blind-base-cabinets", label: "Blind Base Cabinets" },
      { id: "sink-base-cabinets", label: "Sink Base Cabinets" },
      { id: "cooktop-base-cabinets", label: "Cooktop Base Cabinets" },
      { id: "pullout-rack-base-cabinets", label: "Pullout Rack Base Cabinets" },
    ],
  },
  {
    id: "wall-cabinets",
    label: "Wall Cabinets",
    iconId: "wall-cabinets",
    categories: [
      { id: "all", label: "All" },
      { id: "standard-wall-cabinets", label: "Standard Wall Cabinets" },
    ],
  },
  {
    id: "pantry-cabinets",
    label: "Pantry Cabinets",
    iconId: "pantry-cabinets",
    categories: [
      { id: "all", label: "All" },
      { id: "standard-pantry-cabinets", label: "Standard Pantry Cabinets" },
    ],
  },
  {
    id: "appliances",
    label: "Appliances",
    iconId: "appliances",
    categories: [
      { id: "all", label: "All" },
      { id: "cooking", label: "Cooking" },
      { id: "refrigeration", label: "Refrigeration" },
      { id: "ventilation", label: "Ventilation" },
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
