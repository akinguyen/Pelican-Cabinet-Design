import { CABINET_CATALOG } from "./catalog";
import type { CabinetElement, CabinetImage, OvenCabinetProductLayout } from "./types";

export function getDefaultBottomDrawerProductLayout(
  image?: CabinetImage
): OvenCabinetProductLayout | undefined {
  if (image === "base-oven-bottom-drawer") return "single-oven";
  if (image === "base-microwave-bottom-drawer") return "single-microwave";
  return undefined;
}

export function getCabinetCatalogItemByIdentity(cabinetItem: {
  catalogId?: string;
  image?: CabinetImage;
}) {
  if (cabinetItem.catalogId) {
    const catalogMatch = CABINET_CATALOG.find((catalogItem) => catalogItem.id === cabinetItem.catalogId);
    if (catalogMatch) return catalogMatch;

    // Backward compatibility for drawings saved before the two-door wall cabinet ID was renamed.
    if (cabinetItem.catalogId === "wall-cabinet") {
      return CABINET_CATALOG.find((catalogItem) => catalogItem.id === "wall-two-door-cabinet") ?? null;
    }

    // Backward compatibility for drawings saved before filler was renamed to base filler.
    if (cabinetItem.catalogId === "accessory-filler") {
      return CABINET_CATALOG.find((catalogItem) => catalogItem.id === "accessory-base-filler") ?? null;
    }
  }

  if (cabinetItem.image === "accessory-filler") {
    return CABINET_CATALOG.find((catalogItem) => catalogItem.id === "accessory-base-filler") ?? null;
  }

  return cabinetItem.image
    ? CABINET_CATALOG.find((catalogItem) => catalogItem.image === cabinetItem.image) ?? null
    : null;
}

export function getEditorCabinetCatalogItem(cabinetItem: CabinetElement) {
  return getCabinetCatalogItemByIdentity(cabinetItem);
}

export function getEditorCabinetTopOption(cabinetItem: CabinetElement) {
  if (cabinetItem.sinkFixture) return "sink" as const;
  if (cabinetItem.cooktopFixture === "surface") return "surface-cooktop" as const;
  if (cabinetItem.cooktopFixture === "front") return "front-control-cooktop" as const;
  return null;
}
