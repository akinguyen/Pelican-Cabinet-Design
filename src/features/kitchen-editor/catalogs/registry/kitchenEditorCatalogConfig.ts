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
      { id: "corner-base-cabinets", label: "Corner Base Cabinets" },
      { id: "sink-base-cabinets", label: "Sink Base Cabinets" },
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
      { id: "blind-wall-cabinets", label: "Blind Wall Cabinets" },
    ],
  },
  {
    id: "pantry-cabinets",
    label: "Pantry Cabinets",
    iconId: "pantry-cabinets",
    categories: [
      { id: "all", label: "All" },
      { id: "base-pantry-cabinets", label: "Base Pantry Cabinets" },
      { id: "wall-pantry-cabinets", label: "Wall Pantry Cabinets" },
    ],
  },
  {
    id: "built-in-cabinets",
    label: "Built-in Cabinets",
    iconId: "built-in-cabinets",
    categories: [
      { id: "all", label: "All" },
      { id: "oven-cabinets", label: "Oven Cabinets" },
      { id: "microwave-cabinets", label: "Microwave Cabinets" },
    ],
  },

  {
    id: "surfaces",
    label: "Surfaces",
    iconId: "surfaces",
    categories: [
      { id: "all", label: "All" },
      { id: "countertops", label: "Countertops" },
    ],
  },
  {
    id: "appliances",
    label: "Appliances",
    iconId: "appliances",
    categories: [
      { id: "all", label: "All" },
      { id: "cooking", label: "Cooking" },
      { id: "dishwashers", label: "Dishwashers" },
      { id: "cooktops", label: "Cooktops" },
      { id: "refrigeration", label: "Refrigeration" },
      { id: "ventilation", label: "Ventilation" },
    ],
  },
  {
    id: "fixtures",
    label: "Fixtures",
    iconId: "fixtures",
    categories: [
      { id: "all", label: "All" },
      { id: "sinks", label: "Sinks" },
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
