import { getCabinetCategoryForImage } from "./catalogHelpers";
import { isOvenLikeBottomDrawerCabinetImage } from "./specialCabinetHelpers";
import type { CabinetCategory, CabinetElement, CabinetImage } from "./types";

export function getDefaultCabinetImageForCategory(category: CabinetCategory): CabinetImage {
  if (category === "pantry") return "pantry-two-door";
  if (category === "wall") return "wall-two-doors";
  return "base";
}

export function getCabinetImage(
  cabinetItem: Partial<Pick<CabinetElement, "image" | "category">>
): CabinetImage {
  return cabinetItem.image ?? getDefaultCabinetImageForCategory(cabinetItem.category ?? "base");
}

export function isProductCabinetImage(image?: CabinetImage) {
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

export function isAccessoryCabinetImage(image?: CabinetImage) {
  return Boolean(
    image === "accessory-base-filler" ||
      image === "accessory-wall-filler" ||
      image === "accessory-wall-filler-horizontal" ||
      image === "accessory-filler" ||
      image === "accessory-base-end-panel" ||
      image === "accessory-wall-end-panel"
  );
}

export function isBuiltInSinkCabinetImage(image?: CabinetImage) {
  return image === "base-sink-cabinet" || image === "base-farm-sink-cabinet";
}

export function isFarmSinkCabinetImage(image?: CabinetImage) {
  return image === "base-farm-sink-cabinet";
}

export function isSpiceRackCabinetImage(image?: CabinetImage) {
  return image === "base-spice-rack";
}

export function isTrashCanCabinetImage(image?: CabinetImage) {
  return image === "base-trash-can";
}

export function getCabinetPlanBodyFill(
  cabinetItem: Pick<CabinetElement, "image">,
  preview = false,
  invalid = false
) {
  if (invalid) return "#fee2e2";
  if (preview) return "#d9f8fd";

  const image = getCabinetImage(cabinetItem);

  if (
    image === "base-dishwasher" ||
    image === "base-refrigerator" ||
    image === "wall-microwave" ||
    image === "wall-oven" ||
    image === "wall-double-oven"
  ) {
    return "#d1d5db";
  }

  if (image === "base-range" || image === "wall-hood") {
    return "#e5e7eb";
  }

  return "#f1ede4";
}

export function isStandaloneBaseProductElevationImage(image?: CabinetImage) {
  return image === "base-dishwasher" || image === "base-refrigerator" || image === "base-range";
}

export function isFillerAccessoryCabinetImage(image?: CabinetImage) {
  return Boolean(
    image === "accessory-base-filler" ||
      image === "accessory-wall-filler" ||
      image === "accessory-wall-filler-horizontal" ||
      image === "accessory-filler"
  );
}

export function canHaveBaseTopFixtureControls(image?: CabinetImage) {
  return Boolean(
    image &&
      !isBuiltInSinkCabinetImage(image) &&
      !isSpiceRackCabinetImage(image) &&
      !isTrashCanCabinetImage(image) &&
      image !== "pantry-one-door" &&
      image !== "pantry-two-door" &&
      !isOvenLikeBottomDrawerCabinetImage(image)
  );
}

export function getCabinetCatalogPreviewFrame(image: CabinetImage, categoryOverride?: CabinetCategory) {
  const category = categoryOverride ?? getCabinetCategoryForImage(image);

  if (image === "accessory-wall-filler-horizontal") {
    return { x: 24, y: 52, width: 82, height: 14, category };
  }

  if (isAccessoryCabinetImage(image)) {
    return { x: 58, y: 24, width: 14, height: 62, category };
  }

  if (image === "base-refrigerator") {
    return { x: 28, y: 6, width: 74, height: 94, category };
  }

  if (category === "pantry") {
    const isSingleDoorPantry = image === "pantry-one-door";
    return { x: isSingleDoorPantry ? 42 : 28, y: 8, width: isSingleDoorPantry ? 46 : 74, height: 90, category };
  }

  if (image === "wall-hood") {
    return { x: 24, y: 22, width: 82, height: 64, category };
  }

  if (image === "wall-double-oven") {
    return { x: 36, y: 10, width: 58, height: 80, category };
  }

  if (image === "wall-microwave") {
    return { x: 34, y: 28, width: 62, height: 40, category };
  }

  if (image === "wall-oven") {
    return { x: 34, y: 24, width: 62, height: 48, category };
  }

  if (category === "wall") {
    return { x: 28, y: 28, width: 74, height: 52, category };
  }

  const narrowBaseImages: CabinetImage[] = [
    "base-one-door",
    "base-one-door-one-drawer",
    "base-two-drawer",
    "base-four-drawer",
    "base-spice-rack",
    "base-trash-can",
  ];
  const wideBaseImages: CabinetImage[] = [
    "base-refrigerator",
    "base-corner",
    "base-blind-left",
    "base-blind-right",
    "base-sink-cabinet",
    "base-farm-sink-cabinet",
  ];

  if (wideBaseImages.includes(image)) {
    return { x: 18, y: 28, width: 94, height: 50, category };
  }

  if (narrowBaseImages.includes(image)) {
    return { x: 42, y: 28, width: 46, height: 50, category };
  }

  return { x: 28, y: 28, width: 74, height: 50, category };
}
