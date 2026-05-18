import { clamp } from "./geometry";
import { normalizeBlindCabinetSettings } from "./blindCabinetHelpers";
import { CABINET_TOE_KICK_HEIGHT_INCHES, OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES, OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES } from "./constants";
import type { CabinetElement, CabinetImage } from "./types";

export function isOvenLikeBottomDrawerCabinetImage(image?: CabinetImage) {
  return image === "base-oven-bottom-drawer" || image === "base-microwave-bottom-drawer";
}

export function getDefaultOvenCabinetProductHeightInches(totalHeightInches: number) {
  const availableCabinetBodyHeightInches = Math.max(
    0,
    totalHeightInches - CABINET_TOE_KICK_HEIGHT_INCHES
  );
  return Math.max(
    0,
    availableCabinetBodyHeightInches -
      OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES -
      OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES
  );
}

export function getOvenCabinetHeightSegments(
  cabinet: Pick<
    CabinetElement,
    | "heightInches"
    | "ovenCabinetProductHeightInches"
    | "ovenCabinetFillerHeightInches"
    | "ovenCabinetBottomDrawerHeightInches"
  >
) {
  const totalHeightInches = Math.max(
    0,
    (cabinet.heightInches ?? 36) - CABINET_TOE_KICK_HEIGHT_INCHES
  );
  const bottomDrawerHeightInches = clamp(
    cabinet.ovenCabinetBottomDrawerHeightInches ??
      OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES,
    0,
    totalHeightInches
  );
  const defaultProductHeightInches = getDefaultOvenCabinetProductHeightInches(
    totalHeightInches
  );
  const productHeightInches = clamp(
    cabinet.ovenCabinetProductHeightInches ?? defaultProductHeightInches,
    0,
    Math.max(0, totalHeightInches - bottomDrawerHeightInches)
  );
  const fillerFallbackHeightInches =
    cabinet.ovenCabinetFillerHeightInches ??
    Math.max(
      0,
      totalHeightInches - bottomDrawerHeightInches - productHeightInches
    );
  const fillerHeightInches = clamp(
    fillerFallbackHeightInches,
    0,
    Math.max(0, totalHeightInches - bottomDrawerHeightInches - productHeightInches)
  );

  return {
    totalHeightInches,
    productHeightInches,
    fillerHeightInches,
    bottomDrawerHeightInches,
  };
}

export function normalizeOvenCabinetHeightSegments(cabinet: CabinetElement) {
  if (!isOvenLikeBottomDrawerCabinetImage(cabinet.image)) return cabinet;

  const {
    productHeightInches,
    fillerHeightInches,
    bottomDrawerHeightInches,
  } = getOvenCabinetHeightSegments(cabinet);

  return {
    ...cabinet,
    ovenCabinetProductHeightInches: productHeightInches,
    ovenCabinetFillerHeightInches: fillerHeightInches,
    ovenCabinetBottomDrawerHeightInches: bottomDrawerHeightInches,
  };
}

export function normalizeSpecialCabinetState(cabinet: CabinetElement) {
  return normalizeBlindCabinetSettings(normalizeOvenCabinetHeightSegments(cabinet));
}
