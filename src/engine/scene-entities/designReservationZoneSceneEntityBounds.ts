import { createDesignReservationZoneFootprint } from "@/engine/design-zones/designReservationZoneGeometry";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { SceneEntityBounds } from "./sceneEntityBoundsTypes";

export function createDesignReservationZoneSceneEntityBounds(zone: DesignReservationZone): SceneEntityBounds {
  const footprint = createDesignReservationZoneFootprint(zone);
  const halfHeightInches = zone.sizeInches.heightInches / 2;
  const minZInches = zone.worldPositionInches.zInches - halfHeightInches;
  const maxZInches = zone.worldPositionInches.zInches + halfHeightInches;
  return {
    entityId: zone.id,
    entityKind: "design-reservation-zone",
    centerPointInches: zone.worldPositionInches,
    sizeInches: zone.sizeInches,
    rotationDegrees: zone.rotationDegrees,
    footprint,
    footprintCornersInches: footprint.cornerPointsInches.map((point) => ({ ...point, zInches: minZInches })),
    topCornersInches: footprint.cornerPointsInches.map((point) => ({ ...point, zInches: maxZInches })),
    heightRangeInches: { minZInches, maxZInches },
  };
}
