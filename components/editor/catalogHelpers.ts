import type { CabinetImage, OvenCabinetProductLayout } from "./types";

export function getDefaultBottomDrawerProductLayout(
  image?: CabinetImage
): OvenCabinetProductLayout | undefined {
  if (image === "base-oven-bottom-drawer") return "single-oven";
  if (image === "base-microwave-bottom-drawer") return "single-microwave";
  return undefined;
}
