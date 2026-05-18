import { clamp } from "./geometry";
import { getCabinetCategoryForImage } from "./catalogHelpers";
import { pixelsToInches } from "./measurements";
import type { CabinetCategory, CabinetElement, CabinetImage, CabinetSelectionDetail } from "./types";

export function isBlindCabinetImage(image?: CabinetImage) {
  return Boolean(
    image === "base-blind-left" ||
      image === "base-blind-right" ||
      image === "wall-blind-left" ||
      image === "wall-blind-right" ||
      image === "base-blind-left-one-drawer" ||
      image === "base-blind-right-one-drawer"
  );
}

export function getBlindCabinetSide(image?: CabinetImage): "left" | "right" | null {
  if (
    image === "base-blind-left" ||
    image === "wall-blind-left" ||
    image === "base-blind-left-one-drawer"
  ) {
    return "left";
  }
  if (
    image === "base-blind-right" ||
    image === "wall-blind-right" ||
    image === "base-blind-right-one-drawer"
  ) {
    return "right";
  }
  return null;
}

export function getDefaultBlindCabinetDoorWidthInches(
  widthInches: number,
  category: CabinetCategory
) {
  if (category === "wall") {
    return widthInches < 42 ? 21 : 27;
  }
  return widthInches < 42 ? 12 : 18;
}

export function getBlindCabinetWidthSegments(
  cabinet: Pick<
    CabinetElement,
    "image" | "category" | "width" | "blindDoorWidthInches" | "blindFillerWidthInches"
  >
) {
  const widthInches = Math.max(0, pixelsToInches(cabinet.width));
  const category =
    cabinet.category ??
    (cabinet.image ? getCabinetCategoryForImage(cabinet.image) : "base");
  const minimumBlindWidthInches = 3;
  const fillerWidthInches = clamp(
    cabinet.blindFillerWidthInches ?? 3,
    0,
    Math.max(0, widthInches - minimumBlindWidthInches)
  );
  const doorWidthInches = clamp(
    cabinet.blindDoorWidthInches ??
      getDefaultBlindCabinetDoorWidthInches(widthInches, category),
    0,
    Math.max(0, widthInches - fillerWidthInches - minimumBlindWidthInches)
  );
  const blindWidthInches = Math.max(
    0,
    widthInches - doorWidthInches - fillerWidthInches
  );
  const visibleWidthInches = Math.max(0, doorWidthInches + fillerWidthInches);

  return {
    widthInches,
    doorWidthInches,
    fillerWidthInches,
    blindWidthInches,
    visibleWidthInches,
    side: getBlindCabinetSide(cabinet.image),
  };
}

export function normalizeBlindCabinetSettings(cabinet: CabinetElement) {
  if (!isBlindCabinetImage(cabinet.image)) return cabinet;

  const { doorWidthInches, fillerWidthInches } =
    getBlindCabinetWidthSegments(cabinet);

  return {
    ...cabinet,
    blindDoorWidthInches: doorWidthInches,
    blindFillerWidthInches: fillerWidthInches,
  };
}
