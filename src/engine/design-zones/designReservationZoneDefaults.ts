import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { DesignReservationZonePurpose } from "./designReservationZoneTypes";

export const DEFAULT_DESIGN_RESERVATION_ZONE_PURPOSE: DesignReservationZonePurpose = "island";


export const defaultDesignReservationZoneDimensions = {
  island: {
    widthInches: 72,
    depthInches: 36,
    heightInches: 34.5,
  },
  peninsula: {
    widthInches: 72,
    depthInches: 36,
    heightInches: 34.5,
  },
  "tall-pantry": {
    widthInches: 36,
    depthInches: 24,
    heightInches: 84,
  },
} satisfies Record<DesignReservationZonePurpose, Size3DInches>;

export function getDefaultDesignReservationZoneDimensions(
  purpose: DesignReservationZonePurpose,
): Size3DInches {
  return defaultDesignReservationZoneDimensions[purpose];
}

