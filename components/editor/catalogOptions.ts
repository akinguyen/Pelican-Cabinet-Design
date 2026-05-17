function parseDimensionOptionList(value: string) {
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
