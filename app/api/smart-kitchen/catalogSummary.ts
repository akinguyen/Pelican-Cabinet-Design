import type { AiRoomInput } from "@/lib/ai/types";

export function summarizeCatalog(room: AiRoomInput) {
  return room.catalog.map((item) => {
    const catalogItem = item as typeof item & {
      heightInches?: number;
      isAccessory?: boolean;
      accessoryKind?: string;
      isProduct?: boolean;
      standardWidthOptions?: number[];
      standardHeightOptions?: number[];
      standardDepthOptions?: number[];
    };
    const type = catalogItem.isAccessory
      ? "accessory"
      : catalogItem.isProduct
        ? "product"
        : "cabinet";
    const isBlindCabinet =
      type === "cabinet" &&
      (item.id === "base-blind-left-cabinet" ||
        item.id === "base-blind-right-cabinet" ||
        item.id === "wall-blind-left-cabinet" ||
        item.id === "wall-blind-right-cabinet");

    return {
      id: item.id,
      category: item.category,
      type,
      title: item.title,
      standardWidthOptions: type === "accessory"
        ? []
        : catalogItem.standardWidthOptions ?? [item.widthInches],
      standardHeightOptions:
        type === "accessory"
          ? []
          : catalogItem.standardHeightOptions ??
            (typeof catalogItem.heightInches === "number"
              ? [catalogItem.heightInches]
              : []),
      standardDepthOptions:
        type === "accessory"
          ? []
          : catalogItem.standardDepthOptions ?? [item.depthInches],
      builtInFillerWidth: isBlindCabinet ? 3 : null,
    };
  });
}
