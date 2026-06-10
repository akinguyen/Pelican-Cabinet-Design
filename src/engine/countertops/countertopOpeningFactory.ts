import { createId } from "@/core/ids/createId";
import type { CountertopOpening } from "./countertopOpeningTypes";

export function createCountertopOpening(hostCountertopId: string): CountertopOpening {
  return {
    id: createId(),
    hostCountertopId,
    localCenterInches: {
      xInches: 0,
      yInches: 0,
    },
    localRotationDegrees: 0,
    shape: "rounded-rectangle",
    widthInches: 28,
    depthInches: 18,
    cornerRadiusInches: 1,
    edgeClearanceInches: 2,
  };
}
