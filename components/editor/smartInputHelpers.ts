import { CABINET_CATALOG } from "./catalog";
import {
  cabinetHasToeKick,
  getSupportTypeForCategory,
} from "./catalogHelpers";
import type { AiRoomInput } from "@/lib/ai/types";

export function buildSmartInputCatalog(): AiRoomInput["catalog"] {
  return CABINET_CATALOG.map((catalogItem) => ({
    ...catalogItem,
    // Keep accessory metadata on the room payload because roomExport currently
    // normalizes the catalog and can drop fields that the smart-input preview needs.
    isAccessory: catalogItem.isAccessory ?? false,
    accessoryKind: catalogItem.accessoryKind ?? undefined,
    supportType: getSupportTypeForCategory(
      catalogItem.category,
      catalogItem.widthInches,
      catalogItem.heightInches
    ),
    hasToeKick: cabinetHasToeKick({
      category: catalogItem.category,
      widthInches: catalogItem.widthInches,
      heightInches: catalogItem.heightInches,
      image: catalogItem.image,
    }),
  })) as AiRoomInput["catalog"];
}

export function withSmartInputCatalog(room: AiRoomInput): AiRoomInput {
  return {
    ...room,
    catalog: buildSmartInputCatalog(),
  };
}
