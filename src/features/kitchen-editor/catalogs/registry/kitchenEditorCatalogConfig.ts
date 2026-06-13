export const kitchenEditorCatalogs = [
  {
    id: "basic-units",
    label: "Basic Units",
    iconId: "basic-units",
    categories: [
      { id: "all", label: "All" },
      { id: "panels", label: "Panels" },
      { id: "fillers", label: "Fillers" },
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
    id: "openings",
    label: "Openings",
    iconId: "openings",
    categories: [
      { id: "all", label: "All" },
      { id: "doors", label: "Doors" },
      { id: "windows", label: "Windows" },
    ],
  },
  {
    id: "fixtures",
    label: "Fixtures",
    iconId: "fixtures",
    categories: [
      { id: "all", label: "All" },
      { id: "sinks", label: "Sinks" },
      { id: "faucets", label: "Faucets" },
    ],
  },
] as const;

export const kitchenEditorCabinetCatalogIds = [
  "base-cabinets",
  "wall-cabinets",
  "pantry-cabinets",
  "built-in-cabinets",
] as const;

export const kitchenEditorCatalogSelectorItems = [
  {
    id: "basic-units",
    label: "Basic Units",
    iconId: "basic-units",
    catalogIds: ["basic-units"],
  },
  {
    id: "cabinets",
    label: "Cabinets",
    iconId: "cabinets",
    catalogIds: kitchenEditorCabinetCatalogIds,
  },
  {
    id: "surfaces",
    label: "Surfaces",
    iconId: "surfaces",
    catalogIds: ["surfaces"],
  },
  {
    id: "appliances",
    label: "Appliances",
    iconId: "appliances",
    catalogIds: ["appliances"],
  },
  {
    id: "openings",
    label: "Openings",
    iconId: "openings",
    catalogIds: ["openings"],
  },
  {
    id: "fixtures",
    label: "Fixtures",
    iconId: "fixtures",
    catalogIds: ["fixtures"],
  },
] as const;

export type KitchenEditorCatalog = (typeof kitchenEditorCatalogs)[number];
export type KitchenEditorCatalogId = KitchenEditorCatalog["id"];
export type KitchenEditorCabinetCatalogId = (typeof kitchenEditorCabinetCatalogIds)[number];
export type KitchenEditorCatalogCategory = KitchenEditorCatalog["categories"][number];
export type KitchenEditorCatalogCategoryId = KitchenEditorCatalogCategory["id"];
export type KitchenEditorCatalogSelectorItem = (typeof kitchenEditorCatalogSelectorItems)[number];
export type KitchenEditorCatalogSelectorItemId = KitchenEditorCatalogSelectorItem["id"];

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

export function isKitchenEditorCabinetCatalogId(
  catalogId: KitchenEditorCatalogId,
): catalogId is KitchenEditorCabinetCatalogId {
  return (kitchenEditorCabinetCatalogIds as readonly string[]).includes(catalogId);
}

export function getDefaultKitchenEditorCabinetCatalogId(): KitchenEditorCabinetCatalogId {
  return kitchenEditorCabinetCatalogIds[0];
}

export function getKitchenEditorCabinetCatalogs(): readonly KitchenEditorCatalog[] {
  return kitchenEditorCabinetCatalogIds.map(getKitchenEditorCatalog);
}

export function getKitchenEditorCatalogSelectorItemForCatalogId(
  catalogId: KitchenEditorCatalogId,
): KitchenEditorCatalogSelectorItem {
  const selectorItem = kitchenEditorCatalogSelectorItems.find((item) =>
    (item.catalogIds as readonly string[]).includes(catalogId),
  );

  if (selectorItem === undefined) {
    throw new Error(`Unknown kitchen editor catalog selector item for catalog "${catalogId}".`);
  }

  return selectorItem;
}
