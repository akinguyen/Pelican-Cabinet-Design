import { CABINET_TOE_KICK_HEIGHT_INCHES, OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES, OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES } from "../constants/placementConstants";
import { getPlacementCategoryForImage } from "../engine/placementClassification";
import { clamp, pixelsToInches } from "../engine/geometry";
import type { PlacementCatalogItem, PlacementCategory, PlacementElement, PlacementImage, OvenCabinetProductLayout } from "../types/editorTypes";

export function parseDimensionOptionList(value: string) {
  return value
    .trim()
    .split(/\s*,\s*|\s+/)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

export const BASE_WIDE_WIDTH_OPTIONS = parseDimensionOptionList("24 27 30 33 36 39 42 45 48");

export const BASE_NARROW_WIDTH_OPTIONS = parseDimensionOptionList("9 12 15 18 21 24");

export const BASE_SINK_WIDTH_OPTIONS = parseDimensionOptionList("24 27 30 33 36 39 42");

export const BASE_FARM_SINK_WIDTH_OPTIONS = parseDimensionOptionList("30 33 36 39 42");

export const BASE_THREE_DRAWER_WIDTH_OPTIONS = parseDimensionOptionList("12 15 18 21 24 30 33 36");

export const BASE_TWO_DRAWER_WIDTH_OPTIONS = parseDimensionOptionList("15 18 21 24 30 33 36");

export const BASE_SPICE_RACK_WIDTH_OPTIONS = parseDimensionOptionList("6 9 12 15");

export const BASE_TRASH_CAN_WIDTH_OPTIONS = parseDimensionOptionList("12 15 18 21 24 29");

export const BASE_BLIND_WIDTH_OPTIONS = parseDimensionOptionList("36 37 38 39 42 43 44 45");

export const BASE_OVEN_WIDTH_OPTIONS = parseDimensionOptionList("30 33 36 39 42");

export const BASE_MICROWAVE_WIDTH_OPTIONS = parseDimensionOptionList("24 30");

export const BASE_ONE_DOOR_PANTRY_WIDTH_OPTIONS = parseDimensionOptionList("9 12 15 18 21 24");

export const BASE_TWO_DOOR_PANTRY_WIDTH_OPTIONS = parseDimensionOptionList("24 27 30 33 36 39 42 45 48");

export const BASE_STANDARD_HEIGHT_OPTIONS = parseDimensionOptionList("34.5");

export const BASE_STANDARD_DEPTH_OPTIONS = parseDimensionOptionList("24");

export const BASE_OVEN_HEIGHT_OPTIONS = parseDimensionOptionList("69");

export const BASE_OVEN_DEPTH_OPTIONS = parseDimensionOptionList("24 26");

export const BASE_MICROWAVE_HEIGHT_OPTIONS = parseDimensionOptionList("34.5");

export const BASE_MICROWAVE_DEPTH_OPTIONS = parseDimensionOptionList("24 26");

export const BASE_PANTRY_HEIGHT_OPTIONS = parseDimensionOptionList("54 57");

export const BASE_PANTRY_DEPTH_OPTIONS = parseDimensionOptionList("24 26");

export const WALL_ONE_DOOR_WIDTH_OPTIONS = parseDimensionOptionList("9 12 15 18 21 24");

export const WALL_TWO_DOOR_WIDTH_OPTIONS = parseDimensionOptionList("24 27 30 33 36 39 42 45 48");

export const WALL_STANDARD_HEIGHT_OPTIONS = parseDimensionOptionList("12 15 18 24 30 36 42");

export const WALL_PANTRY_HEIGHT_OPTIONS = parseDimensionOptionList("12 15 18 24 30 36 39 42 45");

export const WALL_STANDARD_DEPTH_OPTIONS = parseDimensionOptionList("12 14 15 16");

export const WALL_PANTRY_DEPTH_OPTIONS = parseDimensionOptionList("24 26");

export function isOvenLikeBottomDrawerCabinetImage(image?: PlacementImage) {
  return image === "base-oven-bottom-drawer" || image === "base-microwave-bottom-drawer";
}

export function isBlindCabinetImage(image?: PlacementImage) {
  return Boolean(
    image === "base-blind-left" ||
      image === "base-blind-right" ||
      image === "wall-blind-left" ||
      image === "wall-blind-right" ||
      image === "base-blind-left-one-drawer" ||
      image === "base-blind-right-one-drawer"
  );
}

export function getBlindCabinetSide(image?: PlacementImage): "left" | "right" | null {
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

export function isBuiltInSinkCabinetImage(image?: PlacementImage) {
  return image === "base-sink-cabinet" || image === "base-farm-sink-cabinet";
}

export function isFarmSinkCabinetImage(image?: PlacementImage) {
  return image === "base-farm-sink-cabinet";
}

export function isSpiceRackCabinetImage(image?: PlacementImage) {
  return image === "base-spice-rack";
}

export function isTrashCanCabinetImage(image?: PlacementImage) {
  return image === "base-trash-can";
}

export function canHaveBaseTopFixtureControls(image?: PlacementImage) {
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

export function getDefaultBlindCabinetDoorWidthInches(
  widthInches: number,
  category: PlacementCategory
) {
  if (category === "wall") {
    return widthInches < 42 ? 21 : 27;
  }
  return widthInches < 42 ? 12 : 18;
}

export function getBlindCabinetWidthSegments(
  placement: Pick<
    PlacementElement,
    "image" | "category" | "width" | "blindDoorWidthInches" | "blindFillerWidthInches"
  >
) {
  const widthInches = Math.max(0, pixelsToInches(placement.width));
  const category =
    placement.category ??
    (placement.image ? getPlacementCategoryForImage(placement.image) : "base");
  const minimumBlindWidthInches = 3;
  const fillerWidthInches = clamp(
    placement.blindFillerWidthInches ?? 3,
    0,
    Math.max(0, widthInches - minimumBlindWidthInches)
  );
  const doorWidthInches = clamp(
    placement.blindDoorWidthInches ??
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
    side: getBlindCabinetSide(placement.image),
  };
}

export function normalizeBlindCabinetSettings(placement: PlacementElement) {
  if (!isBlindCabinetImage(placement.image)) return placement;

  const { doorWidthInches, fillerWidthInches } =
    getBlindCabinetWidthSegments(placement);

  return {
    ...placement,
    blindDoorWidthInches: doorWidthInches,
    blindFillerWidthInches: fillerWidthInches,
  };
}

export function getDefaultOvenCabinetProductHeightInches(totalHeightInches: number) {
  const availablePlacementBodyHeightInches = Math.max(
    0,
    totalHeightInches - CABINET_TOE_KICK_HEIGHT_INCHES
  );
  return Math.max(
    0,
    availablePlacementBodyHeightInches -
      OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES -
      OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES
  );
}

export function getOvenCabinetHeightSegments(
  placement: Pick<
    PlacementElement,
    | "heightInches"
    | "ovenCabinetProductHeightInches"
    | "ovenCabinetFillerHeightInches"
    | "ovenCabinetBottomDrawerHeightInches"
  >
) {
  const totalHeightInches = Math.max(
    0,
    (placement.heightInches ?? 36) - CABINET_TOE_KICK_HEIGHT_INCHES
  );
  const bottomDrawerHeightInches = clamp(
    placement.ovenCabinetBottomDrawerHeightInches ??
      OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES,
    0,
    totalHeightInches
  );
  const defaultProductHeightInches = getDefaultOvenCabinetProductHeightInches(
    totalHeightInches
  );
  const productHeightInches = clamp(
    placement.ovenCabinetProductHeightInches ?? defaultProductHeightInches,
    0,
    Math.max(0, totalHeightInches - bottomDrawerHeightInches)
  );
  const fillerFallbackHeightInches =
    placement.ovenCabinetFillerHeightInches ??
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

export function normalizeOvenCabinetHeightSegments(placement: PlacementElement) {
  if (!isOvenLikeBottomDrawerCabinetImage(placement.image)) return placement;

  const {
    productHeightInches,
    fillerHeightInches,
    bottomDrawerHeightInches,
  } = getOvenCabinetHeightSegments(placement);

  return {
    ...placement,
    ovenCabinetProductHeightInches: productHeightInches,
    ovenCabinetFillerHeightInches: fillerHeightInches,
    ovenCabinetBottomDrawerHeightInches: bottomDrawerHeightInches,
  };
}

export function normalizeSpecialCabinetState(placement: PlacementElement) {
  return normalizeBlindCabinetSettings(normalizeOvenCabinetHeightSegments(placement));
}

export function getDefaultBottomDrawerProductLayout(
  image?: PlacementImage
): OvenCabinetProductLayout | undefined {
  if (image === "base-oven-bottom-drawer") return "single-oven";
  if (image === "base-microwave-bottom-drawer") return "single-microwave";
  return undefined;
}

export const PLACEMENT_CATALOG: PlacementCatalogItem[] = [
  {
    id: "base-corner-cabinet",
    category: "base",
    title: "L-Shaped Corner Base Cabinet",
    subtitle: '36" W x 36" H x 36" D',
    widthInches: 36,
    heightInches: 36,
    depthInches: 36,
    image: "base-corner",
  },
  {
    id: "product-dishwasher",
    category: "base",
    title: "Dishwashing Machine",
    subtitle: '24" W x 34" H x 24" D',
    widthInches: 24,
    heightInches: 34,
    depthInches: 24,
    image: "base-dishwasher",
    productCategory: "base",
  },
  {
    id: "product-refrigerator",
    category: "base",
    title: "Refrigerator",
    subtitle: '36" W x 84" H x 30" D',
    widthInches: 36,
    heightInches: 84,
    depthInches: 30,
    image: "base-refrigerator",
    productCategory: "base",
  },
  {
    id: "product-range",
    category: "base",
    title: "Range",
    subtitle: '30" W x 36" H x 24" D',
    widthInches: 30,
    heightInches: 36,
    depthInches: 24,
    image: "base-range",
    productCategory: "base",
  },
  {
    id: "base-two-door-cabinet",
    category: "base",
    title: "2 Door Base Cabinet",
    subtitle: '24" W x 34.5" H x 24" D',
    widthInches: 24,
    heightInches: 34.5,
    depthInches: 24,
    image: "base",
    standardWidthOptions: BASE_WIDE_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-one-door-cabinet",
    category: "base",
    title: "1 Door Base Cabinet",
    subtitle: '9" W x 34.5" H x 24" D',
    widthInches: 9,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-one-door",
    standardWidthOptions: BASE_NARROW_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-drawer-cabinet",
    category: "base",
    title: "3 Drawers Base Cabinet",
    subtitle: '9" W x 34.5" H x 24" D',
    widthInches: 9,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-drawer",
    standardWidthOptions: BASE_THREE_DRAWER_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-sink-cabinet",
    category: "base",
    title: "Sink Base Cabinet",
    subtitle: '24" W x 34.5" H x 24" D',
    widthInches: 24,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-sink-cabinet",
    standardWidthOptions: BASE_SINK_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-farm-sink-cabinet",
    category: "base",
    title: "Sink Farm Base Cabinet",
    subtitle: '30" W x 34.5" H x 24" D',
    widthInches: 30,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-farm-sink-cabinet",
    standardWidthOptions: BASE_FARM_SINK_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-blind-left-cabinet",
    category: "base",
    title: "1 Door Blind (Left) Base Cabinet",
    subtitle: '36" W x 34.5" H x 24" D',
    widthInches: 36,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-blind-left",
    standardWidthOptions: BASE_BLIND_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-blind-right-cabinet",
    category: "base",
    title: "1 Door Blind (Right) Base Cabinet",
    subtitle: '36" W x 34.5" H x 24" D',
    widthInches: 36,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-blind-right",
    standardWidthOptions: BASE_BLIND_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-two-door-one-drawer-cabinet",
    category: "base",
    title: "1 Top Drawer, 2 Doors Base Cabinet",
    subtitle: '24" W x 34.5" H x 24" D',
    widthInches: 24,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-two-door-one-drawer",
    standardWidthOptions: BASE_WIDE_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-one-door-one-drawer-cabinet",
    category: "base",
    title: "1 Top Drawer, 1 Door Base Cabinet",
    subtitle: '9" W x 34.5" H x 24" D',
    widthInches: 9,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-one-door-one-drawer",
    standardWidthOptions: BASE_NARROW_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-two-door-two-drawer-cabinet",
    category: "base",
    title: "2 Top Drawers, 2 Doors Base Cabinet",
    subtitle: '24" W x 34.5" H x 24" D',
    widthInches: 24,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-two-door-two-drawer",
    standardWidthOptions: BASE_WIDE_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-two-drawer-cabinet",
    category: "base",
    title: "2 Drawer Base Cabinet",
    subtitle: '9" W x 34.5" H x 24" D',
    widthInches: 9,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-two-drawer",
    standardWidthOptions: BASE_TWO_DRAWER_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-spice-rack-cabinet",
    category: "base",
    title: "Spice Rack Base Cabinet",
    subtitle: '6" W x 34.5" H x 24" D',
    widthInches: 6,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-spice-rack",
    standardWidthOptions: BASE_SPICE_RACK_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-trash-can-cabinet",
    category: "base",
    title: "Trash Can Base Cabinet",
    subtitle: '12" W x 34.5" H x 24" D',
    widthInches: 12,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-trash-can",
    standardWidthOptions: BASE_TRASH_CAN_WIDTH_OPTIONS,
    standardHeightOptions: BASE_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "base-oven-bottom-drawer-cabinet",
    category: "base",
    title: "Oven with 1 Bottom Drawer Base Cabinet",
    subtitle: '30" W x 69" H x 26" D',
    widthInches: 30,
    heightInches: 69,
    depthInches: 26,
    image: "base-oven-bottom-drawer",
    standardWidthOptions: BASE_OVEN_WIDTH_OPTIONS,
    standardHeightOptions: BASE_OVEN_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_OVEN_DEPTH_OPTIONS,
  },
  {
    id: "base-microwave-bottom-drawer-cabinet",
    category: "base",
    title: "Microwave with 1 Bottom Drawer Base Cabinet",
    subtitle: '24" W x 34.5" H x 24" D',
    widthInches: 24,
    heightInches: 34.5,
    depthInches: 24,
    image: "base-microwave-bottom-drawer",
    standardWidthOptions: BASE_MICROWAVE_WIDTH_OPTIONS,
    standardHeightOptions: BASE_MICROWAVE_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_MICROWAVE_DEPTH_OPTIONS,
  },
  {
    id: "base-pantry-one-door-cabinet",
    category: "base",
    title: "1 Door Pantry Cabinet (Base)",
    subtitle: '9" W x 54" H x 24" D',
    widthInches: 9,
    heightInches: 54,
    depthInches: 24,
    image: "pantry-one-door",
    standardWidthOptions: BASE_ONE_DOOR_PANTRY_WIDTH_OPTIONS,
    standardHeightOptions: BASE_PANTRY_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_PANTRY_DEPTH_OPTIONS,
  },
  {
    id: "base-pantry-two-door-cabinet",
    category: "base",
    title: "2 Door Pantry Cabinet (Base)",
    subtitle: '24" W x 54" H x 24" D',
    widthInches: 24,
    heightInches: 54,
    depthInches: 24,
    image: "pantry-two-door",
    standardWidthOptions: BASE_TWO_DOOR_PANTRY_WIDTH_OPTIONS,
    standardHeightOptions: BASE_PANTRY_HEIGHT_OPTIONS,
    standardDepthOptions: BASE_PANTRY_DEPTH_OPTIONS,
  },
  {
    id: "wall-two-door-cabinet",
    category: "wall",
    title: "2 Door Wall Cabinet",
    subtitle: '24" W x 12" H x 12" D',
    widthInches: 24,
    heightInches: 12,
    depthInches: 12,
    image: "wall-two-doors",
    standardWidthOptions: WALL_TWO_DOOR_WIDTH_OPTIONS,
    standardHeightOptions: WALL_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: WALL_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "wall-one-door-cabinet",
    category: "wall",
    title: "1 Door Wall Cabinet",
    subtitle: '9" W x 12" H x 12" D',
    widthInches: 9,
    heightInches: 12,
    depthInches: 12,
    image: "wall-one-door",
    standardWidthOptions: WALL_ONE_DOOR_WIDTH_OPTIONS,
    standardHeightOptions: WALL_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: WALL_STANDARD_DEPTH_OPTIONS,
  },
  {
    id: "wall-blind-left-cabinet",
    category: "wall",
    title: "1 Door Blind (Left) Wall Cabinet",
    subtitle: '36" W x 12" H x 12" D',
    widthInches: 36,
    heightInches: 12,
    depthInches: 12,
    image: "wall-blind-left",
    standardWidthOptions: BASE_BLIND_WIDTH_OPTIONS,
    standardHeightOptions: WALL_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: WALL_STANDARD_DEPTH_OPTIONS,
    defaultDistanceFromFloorInches: 54,
  },
  {
    id: "wall-blind-right-cabinet",
    category: "wall",
    title: "1 Door Blind (Right) Wall Cabinet",
    subtitle: '36" W x 12" H x 12" D',
    widthInches: 36,
    heightInches: 12,
    depthInches: 12,
    image: "wall-blind-right",
    standardWidthOptions: BASE_BLIND_WIDTH_OPTIONS,
    standardHeightOptions: WALL_STANDARD_HEIGHT_OPTIONS,
    standardDepthOptions: WALL_STANDARD_DEPTH_OPTIONS,
    defaultDistanceFromFloorInches: 54,
  },
  {
    id: "wall-pantry-one-door-cabinet",
    category: "wall",
    title: "1 Door Pantry Cabinet (Wall)",
    subtitle: '9" W x 12" H x 24" D',
    widthInches: 9,
    heightInches: 12,
    depthInches: 24,
    image: "pantry-one-door",
    standardWidthOptions: WALL_ONE_DOOR_WIDTH_OPTIONS,
    standardHeightOptions: WALL_PANTRY_HEIGHT_OPTIONS,
    standardDepthOptions: WALL_PANTRY_DEPTH_OPTIONS,
    defaultDistanceFromFloorInches: 54,
  },
  {
    id: "wall-pantry-two-door-cabinet",
    category: "wall",
    title: "2 Doors Pantry Cabinet (Wall)",
    subtitle: '24" W x 12" H x 24" D',
    widthInches: 24,
    heightInches: 12,
    depthInches: 24,
    image: "pantry-two-door",
    standardWidthOptions: WALL_TWO_DOOR_WIDTH_OPTIONS,
    standardHeightOptions: WALL_PANTRY_HEIGHT_OPTIONS,
    standardDepthOptions: WALL_PANTRY_DEPTH_OPTIONS,
    defaultDistanceFromFloorInches: 54,
  },
  {
    id: "product-wall-hood",
    category: "wall",
    title: "Hood",
    subtitle: '30" W x 24" H x 12" D',
    widthInches: 30,
    heightInches: 24,
    depthInches: 12,
    image: "wall-hood",
    productCategory: "wall",
    defaultDistanceFromFloorInches: 60,
  },
  {
    id: "product-wall-microwave",
    category: "wall",
    title: "Microwave",
    subtitle: '30" W x 18" H x 15" D',
    widthInches: 30,
    heightInches: 18,
    depthInches: 15,
    image: "wall-microwave",
    productCategory: "wall",
    defaultDistanceFromFloorInches: 54,
  },
  {
    id: "product-wall-oven",
    category: "wall",
    title: "Single Oven",
    subtitle: '30" W x 30" H x 24" D',
    widthInches: 30,
    heightInches: 30,
    depthInches: 24,
    image: "wall-oven",
    productCategory: "wall",
    defaultDistanceFromFloorInches: 42,
  },
  {
    id: "product-wall-double-oven",
    category: "wall",
    title: "Double Oven",
    subtitle: '30" W x 54" H x 24" D',
    widthInches: 30,
    heightInches: 54,
    depthInches: 24,
    image: "wall-double-oven",
    productCategory: "wall",
    defaultDistanceFromFloorInches: 18,
  },
  {
    id: "accessory-base-filler",
    category: "base",
    title: "Base Filler",
    subtitle: '4" W x 34.5" H x 24" D',
    widthInches: 4,
    heightInches: 34.5,
    depthInches: 24,
    image: "accessory-base-filler",
  },
  {
    id: "accessory-wall-filler",
    category: "wall",
    title: "Wall Filler (Vertical)",
    subtitle: '4" W x 30" H x 12" D',
    widthInches: 4,
    heightInches: 30,
    depthInches: 12,
    image: "accessory-wall-filler",
    defaultDistanceFromFloorInches: 54,
  },
  {
    id: "accessory-wall-filler-horizontal",
    category: "wall",
    title: "Wall Filler (Horizontal)",
    subtitle: '36" W x 3" H x 24" D',
    widthInches: 36,
    heightInches: 3,
    depthInches: 24,
    image: "accessory-wall-filler-horizontal",
    defaultDistanceFromFloorInches: 54,
  },
  {
    id: "accessory-base-end-panel",
    category: "base",
    title: "Base End Panel",
    subtitle: '4" W x 34.5" H x 36" D',
    widthInches: 4,
    heightInches: 34.5,
    depthInches: 36,
    image: "accessory-base-end-panel",
  },
  {
    id: "accessory-wall-end-panel",
    category: "wall",
    title: "Wall End Panel",
    subtitle: '4" W x 30" H x 12" D',
    widthInches: 4,
    heightInches: 30,
    depthInches: 12,
    image: "accessory-wall-end-panel",
    defaultDistanceFromFloorInches: 54,
  },
 ];
