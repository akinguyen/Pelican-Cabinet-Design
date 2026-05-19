import { FLOOR_SUPPORTED_PANTRY_MIN_HEIGHT_INCHES } from "../constants/placementConstants";
import { pixelsToInches } from "./geometry";
import type { AccessoryElement, PlacementCatalogItem, PlacementCategory, CabinetElement, PlacementElement, PlacementElementKind, PlacementImage, PlacementSelectionDetail, ObjectSupportType, ProductElement } from "../types/editorTypes";

export function getSupportTypeForCategory(
  category: PlacementCategory,
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

export function getDefaultPlacementImageForCategory(category: PlacementCategory): PlacementImage {
  if (category === "pantry") return "pantry-two-door";
  if (category === "wall") return "wall-two-doors";
  return "base";
}

export function getPlacementImage(placementItem: Partial<Pick<PlacementElement, "image" | "category">>): PlacementImage {
  return placementItem.image ?? getDefaultPlacementImageForCategory(placementItem.category ?? "base");
}

export function getPlacementCategoryForImage(image: PlacementImage): PlacementCategory {
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

export function isProductPlacementImage(image?: PlacementImage) {
  return Boolean(
    image === "base-dishwasher" ||
      image === "base-refrigerator" ||
      image === "base-range" ||
      image === "wall-hood" ||
      image === "wall-microwave" ||
      image === "wall-oven" ||
      image === "wall-double-oven"
  );
}

export function isAccessoryPlacementImage(image?: PlacementImage) {
  return Boolean(
    image === "accessory-base-filler" ||
      image === "accessory-wall-filler" ||
      image === "accessory-wall-filler-horizontal" ||
      image === "accessory-filler" ||
      image === "accessory-base-end-panel" ||
      image === "accessory-wall-end-panel"
  );
}

export function getPlacementElementTypeForImage(image?: PlacementImage): PlacementElementKind {
  if (isAccessoryPlacementImage(image)) return "accessory";
  if (isProductPlacementImage(image)) return "product";
  return "cabinet";
}

export function getPlacementElementTypeForCatalogItem(
  catalogItem: Pick<PlacementCatalogItem, "id" | "image" | "productCategory">
): PlacementElementKind {
  if (catalogItem.id.startsWith("accessory-") || isAccessoryPlacementImage(catalogItem.image)) {
    return "accessory";
  }

  if (catalogItem.productCategory || catalogItem.id.startsWith("product-") || isProductPlacementImage(catalogItem.image)) {
    return "product";
  }

  return "cabinet";
}

export function getPlacementElementType(
  element: Pick<PlacementElement, "placementType" | "image" | "catalogId" | "productCategory">
): PlacementElementKind {
  if (element.placementType) return element.placementType;

  if (element.catalogId?.startsWith("accessory-")) return "accessory";
  if (element.catalogId?.startsWith("product-")) return "product";
  if (element.productCategory) return "product";

  return getPlacementElementTypeForImage(element.image);
}

export function withPlacementElementType<T extends PlacementElement>(element: T): T {
  return {
    ...element,
    placementType: element.placementType ?? getPlacementElementType(element),
  };
}

export function isCabinetElement(element: PlacementElement): element is CabinetElement {
  return getPlacementElementType(element) === "cabinet";
}

export function isProductElement(element: PlacementElement): element is ProductElement {
  return getPlacementElementType(element) === "product";
}

export function isAccessoryElement(element: PlacementElement): element is AccessoryElement {
  return getPlacementElementType(element) === "accessory";
}

export function getPlacementSupportType(
  placementItem: Partial<
    Pick<PlacementElement, "category" | "width" | "image" | "heightInches"> &
      Pick<PlacementSelectionDetail, "widthInches" | "heightInches">
  >
): ObjectSupportType {
  const category =
    placementItem.category ??
    (placementItem.image ? getPlacementCategoryForImage(placementItem.image) : "base");
  const widthInches =
    typeof placementItem.widthInches === "number"
      ? placementItem.widthInches
      : typeof placementItem.width === "number"
        ? pixelsToInches(placementItem.width)
        : undefined;
  const heightInches =
    typeof placementItem.heightInches === "number"
      ? placementItem.heightInches
      : undefined;

  return getSupportTypeForCategory(category, widthInches, heightInches);
}

export function isFloorStandingPlacement(
  placementItem: Partial<
    Pick<PlacementElement, "category" | "width" | "image" | "heightInches"> &
      Pick<PlacementSelectionDetail, "widthInches" | "heightInches">
  >
) {
  return getPlacementSupportType(placementItem) === "floor-supported";
}

export function isElevationFloatingPlacement(
  placementItem: Partial<
    Pick<PlacementElement, "category" | "width" | "image" | "heightInches"> &
      Pick<PlacementSelectionDetail, "widthInches" | "heightInches">
  >
) {
  return getPlacementSupportType(placementItem) === "elevated-supported";
}

export function placementHasToeKick(
  placementItem: Partial<
    Pick<PlacementElement, "category" | "width" | "image" | "heightInches"> &
      Pick<PlacementSelectionDetail, "widthInches" | "heightInches">
  >
) {
  const category =
    placementItem.category ??
    (placementItem.image ? getPlacementCategoryForImage(placementItem.image) : "base");

  if (isProductPlacementImage(placementItem.image) || isAccessoryPlacementImage(placementItem.image)) {
    return false;
  }

  return (
    (category === "base" || category === "pantry") &&
    isFloorStandingPlacement(placementItem)
  );
}

export function isStandaloneBaseProductElevationImage(image?: PlacementImage) {
  return image === "base-dishwasher" || image === "base-refrigerator" || image === "base-range";
}

export function isFillerAccessoryPlacementImage(image?: PlacementImage) {
  return Boolean(
    image === "accessory-base-filler" ||
      image === "accessory-wall-filler" ||
      image === "accessory-wall-filler-horizontal" ||
      image === "accessory-filler"
  );
}
