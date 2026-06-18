import { createDesignReservationZoneVolumeGeometry } from "@/engine/design-zones/designReservationZoneGeometry";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { SceneEntityBounds } from "./sceneEntityBoundsTypes";

export function createDesignReservationZoneSceneEntityBounds(
  zone: DesignReservationZone,
): SceneEntityBounds {
  const volumeGeometry = createDesignReservationZoneVolumeGeometry(zone);
  const minZInches = zone.baseCenterPointInches.zInches;
  const maxZInches = zone.baseCenterPointInches.zInches + zone.sizeInches.heightInches;

  return {
    entityId: zone.id,
    entityKind: "design-reservation-zone",
    baseCenterPointInches: zone.baseCenterPointInches,
    centerPointInches: {
      xInches: zone.baseCenterPointInches.xInches,
      yInches: zone.baseCenterPointInches.yInches,
      zInches: minZInches + zone.sizeInches.heightInches / 2,
    },
    sizeInches: zone.sizeInches,
    rotationDegrees: zone.rotationDegrees,
    footprint: volumeGeometry.footprint,
    footprintCornersInches: volumeGeometry.baseCornerPointsInches,
    topCornersInches: volumeGeometry.topCornerPointsInches,
    heightRangeInches: {
      minZInches,
      maxZInches,
    },
  };
}
