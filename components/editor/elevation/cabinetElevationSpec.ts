import { getCabinetSupportType } from "../catalogHelpers";
import type { CabinetCategory, CabinetElement } from "../types";

export function getCabinetElevationSpec(cabinetItem: CabinetElement, category: CabinetCategory) {
  // This is the cabinet BODY size only. Accessories like the front-control
  // cooktop are drawn as an add-on block above the cabinet body, so editing
  // cooktopFrontHeightInches never changes/stretches the cabinet itself.
  const supportType = getCabinetSupportType(cabinetItem);
  const defaultHeightInches =
    category === "pantry" ? 84 : category === "wall" ? 30 : 36;
  const heightInches = cabinetItem.heightInches ?? defaultHeightInches;

  if (supportType === "floor-supported") {
    return {
      heightInches,
      distanceFromFloorInches: 0,
    };
  }

  if (cabinetItem.heightInches !== undefined || cabinetItem.distanceFromFloorInches !== undefined) {
    return {
      heightInches,
      distanceFromFloorInches: cabinetItem.distanceFromFloorInches ?? (category === "wall" ? 54 : 0),
    };
  }

  if (category === "pantry") {
    return {
      heightInches,
      distanceFromFloorInches: 0,
    };
  }

  if (category === "wall") {
    return {
      heightInches,
      distanceFromFloorInches: 54,
    };
  }

  return {
    heightInches,
    distanceFromFloorInches: 0,
  };
}
