import type { CabinetCatalogItem } from "./types";
import { roundToQuarter } from "./measurements";

export function formatDimensionOptionNumber(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

export function getCatalogDimensionOptions(catalogItem: CabinetCatalogItem | null | undefined) {
  if (!catalogItem) {
    return {
      widths: [] as number[],
      heights: [] as number[],
      depths: [] as number[],
    };
  }

  const uniqueSorted = (values: number[]) =>
    Array.from(new Set(values.map((value) => roundToQuarter(value)))).sort(
      (left, right) => left - right
    );

  return {
    widths: uniqueSorted(
      catalogItem.standardWidthOptions?.length
        ? catalogItem.standardWidthOptions
        : [catalogItem.widthInches]
    ),
    heights: uniqueSorted(
      catalogItem.standardHeightOptions?.length
        ? catalogItem.standardHeightOptions
        : [catalogItem.heightInches]
    ),
    depths: uniqueSorted(
      catalogItem.standardDepthOptions?.length
        ? catalogItem.standardDepthOptions
        : [catalogItem.depthInches]
    ),
  };
}

export function matchesDimensionOption(options: number[], value: number) {
  return options.some((option) => Math.abs(option - value) < 0.01);
}

export function getDefaultDimensionFromOptions(
  catalogItem: CabinetCatalogItem | null | undefined,
  axis: "width" | "height" | "depth"
) {
  if (!catalogItem) return 0;
  const options = getCatalogDimensionOptions(catalogItem);
  const axisOptions =
    axis === "width" ? options.widths : axis === "height" ? options.heights : options.depths;
  const currentValue =
    axis === "width"
      ? catalogItem.widthInches
      : axis === "height"
        ? catalogItem.heightInches
        : catalogItem.depthInches;

  if (matchesDimensionOption(axisOptions, currentValue)) return currentValue;
  return axisOptions[0] ?? currentValue;
}
