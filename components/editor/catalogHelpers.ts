import { CABINET_CATALOG } from "./catalog";
import { FLOOR_SUPPORTED_PANTRY_MIN_HEIGHT_INCHES } from "./constants";
import { pixelsToInches } from "./measurements";
import type {
  CabinetCategory,
  CabinetElement,
  CabinetImage,
  CabinetSelectionDetail,
  ObjectSupportType,
  OvenCabinetProductLayout,
} from "./types";

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

export function getSupportTypeForCategory(
  category: CabinetCategory,
  _widthInches?: number,
  heightInches?: number
): ObjectSupportType {
  if (category === "wall") return "elevated-supported";
  if (category === "pantry") {
    return (heightInches ?? 0) >= FLOOR_SUPPORTED_PANTRY_MIN_HEIGHT_INCHES
      ? "floor-supported"
      : "elevated-supported";
  }
  return "floor-supported";
}

export function getCabinetCategoryForImage(image: CabinetImage): CabinetCategory {
  if (
    image === "accessory-wall-filler" ||
    image === "accessory-wall-filler-horizontal" ||
    image === "accessory-wall-end-panel"
  ) return "wall";
  if (image === "accessory-base-filler" || image === "accessory-filler" || image === "accessory-base-end-panel") return "base";
  if (image === "pantry-one-door" || image === "pantry-two-door") return "pantry";
  if (
    image === "wall-two-doors" ||
    image === "wall-one-door" ||
    image === "wall-blind-left" ||
    image === "wall-blind-right" ||
    image === "wall-hood" ||
    image === "wall-microwave" ||
    image === "wall-oven" ||
    image === "wall-double-oven" ||
    image === "wall-microwave-one-door" ||
    image === "wall-hood-one-door"
  ) return "wall";
  return "base";
}

export function getCabinetSupportType(
  cabinetItem: Partial<
    Pick<CabinetElement, "category" | "width" | "image" | "heightInches"> &
      Pick<CabinetSelectionDetail, "widthInches" | "heightInches">
  >
): ObjectSupportType {
  const category =
    cabinetItem.category ??
    (cabinetItem.image ? getCabinetCategoryForImage(cabinetItem.image) : "base");
  const widthInches =
    typeof cabinetItem.widthInches === "number"
      ? cabinetItem.widthInches
      : typeof cabinetItem.width === "number"
        ? pixelsToInches(cabinetItem.width)
        : undefined;
  const heightInches =
    typeof cabinetItem.heightInches === "number"
      ? cabinetItem.heightInches
      : undefined;

  return getSupportTypeForCategory(category, widthInches, heightInches);
}

export function isFloorStandingCabinet(
  cabinetItem: Partial<
    Pick<CabinetElement, "category" | "width" | "image" | "heightInches"> &
      Pick<CabinetSelectionDetail, "widthInches" | "heightInches">
  >
) {
  return getCabinetSupportType(cabinetItem) === "floor-supported";
}

export function isElevationFloatingCabinet(
  cabinetItem: Partial<
    Pick<CabinetElement, "category" | "width" | "image" | "heightInches"> &
      Pick<CabinetSelectionDetail, "widthInches" | "heightInches">
  >
) {
  return getCabinetSupportType(cabinetItem) === "elevated-supported";
}

export function cabinetHasToeKick(
  cabinetItem: Partial<
    Pick<CabinetElement, "category" | "width" | "image" | "heightInches"> &
      Pick<CabinetSelectionDetail, "widthInches" | "heightInches">
  >
) {
  const category =
    cabinetItem.category ??
    (cabinetItem.image ? getCabinetCategoryForImage(cabinetItem.image) : "base");

  if (
    cabinetItem.image === "base-dishwasher" ||
    cabinetItem.image === "base-refrigerator" ||
    cabinetItem.image === "base-range" ||
    cabinetItem.image === "wall-hood" ||
    cabinetItem.image === "wall-microwave" ||
    cabinetItem.image === "wall-oven" ||
    cabinetItem.image === "wall-double-oven" ||
    cabinetItem.image === "accessory-base-filler" ||
    cabinetItem.image === "accessory-wall-filler" ||
    cabinetItem.image === "accessory-wall-filler-horizontal" ||
    cabinetItem.image === "accessory-filler" ||
    cabinetItem.image === "accessory-base-end-panel" ||
    cabinetItem.image === "accessory-wall-end-panel"
  ) {
    return false;
  }

  return (
    (category === "base" || category === "pantry") &&
    isFloorStandingCabinet(cabinetItem)
  );
}
