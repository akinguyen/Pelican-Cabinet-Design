import { getDefaultDesignReservationZoneDimensions } from "@/engine/design-zones/designReservationZoneDefaults";
import type { DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

const MIN_DESIGN_RESERVATION_ZONE_DIMENSION_INCHES = 1;

export function createDesignReservationZoneEditingActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "updateSelectedDesignReservationZoneReservedFor"
  | "updateSelectedDesignReservationZoneWidth"
  | "updateSelectedDesignReservationZoneDepth"
  | "updateSelectedDesignReservationZoneHeight"
  | "updateSelectedDesignReservationZonePositionX"
  | "updateSelectedDesignReservationZonePositionY"
  | "updateSelectedDesignReservationZoneDistanceFromFloor"
  | "updateSelectedDesignReservationZoneRotationZ"
  | "deleteSelectedDesignReservationZone"
> {
  return {
    updateSelectedDesignReservationZoneReservedFor(reservedFor) {
      updateSelectedZone(set, get, (zone) => ({
        ...zone,
        reservedFor,
        sizeInches: { ...getDefaultDesignReservationZoneDimensions(reservedFor) },
      }));
    },

    updateSelectedDesignReservationZoneWidth(widthInches) {
      updateSelectedZone(set, get, (zone) => ({
        ...zone,
        sizeInches: {
          ...zone.sizeInches,
          widthInches: Math.max(MIN_DESIGN_RESERVATION_ZONE_DIMENSION_INCHES, widthInches),
        },
      }));
    },

    updateSelectedDesignReservationZoneDepth(depthInches) {
      updateSelectedZone(set, get, (zone) => ({
        ...zone,
        sizeInches: {
          ...zone.sizeInches,
          depthInches: Math.max(MIN_DESIGN_RESERVATION_ZONE_DIMENSION_INCHES, depthInches),
        },
      }));
    },

    updateSelectedDesignReservationZoneHeight(heightInches) {
      updateSelectedZone(set, get, (zone) => ({
        ...zone,
        sizeInches: {
          ...zone.sizeInches,
          heightInches: Math.max(MIN_DESIGN_RESERVATION_ZONE_DIMENSION_INCHES, heightInches),
        },
      }));
    },

    updateSelectedDesignReservationZonePositionX(xInches) {
      updateSelectedZone(set, get, (zone) => ({
        ...zone,
        baseCenterPointInches: {
          ...zone.baseCenterPointInches,
          xInches,
        },
      }));
    },

    updateSelectedDesignReservationZonePositionY(yInches) {
      updateSelectedZone(set, get, (zone) => ({
        ...zone,
        baseCenterPointInches: {
          ...zone.baseCenterPointInches,
          yInches,
        },
      }));
    },

    updateSelectedDesignReservationZoneDistanceFromFloor(distanceFromFloorInches) {
      updateSelectedZone(set, get, (zone) => ({
        ...zone,
        baseCenterPointInches: {
          ...zone.baseCenterPointInches,
          zInches: Math.max(0, distanceFromFloorInches),
        },
      }));
    },

    updateSelectedDesignReservationZoneRotationZ(zDegrees) {
      updateSelectedZone(set, get, (zone) => ({
        ...zone,
        rotationDegrees: { zDegrees },
      }));
    },

    deleteSelectedDesignReservationZone() {
      const selectedZoneId = getSelectedDesignReservationZoneId(get());

      if (selectedZoneId === null) {
        return;
      }

      set((state) => ({
        activeObjectAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          designReservationZones: state.designScene.designReservationZones.filter((zone) => zone.id !== selectedZoneId),
          activeSelection: state.designScene.activeSelection?.kind === "design-reservation-zone" &&
            state.designScene.activeSelection.designReservationZoneId === selectedZoneId
              ? null
              : state.designScene.activeSelection,
        },
      }));
    },

  };
}

function updateSelectedZone(
  set: DesignSceneStoreSetter,
  get: DesignSceneStoreGetter,
  update: (zone: DesignSceneStore["designScene"]["designReservationZones"][number]) => DesignSceneStore["designScene"]["designReservationZones"][number],
) {
  const selectedZoneId = getSelectedDesignReservationZoneId(get());

  if (selectedZoneId === null) {
    return;
  }

  set((state) => ({
    activeObjectAlignmentGuides: [],
    designScene: {
      ...state.designScene,
      designReservationZones: state.designScene.designReservationZones.map((zone) => (
        zone.id === selectedZoneId ? update(zone) : zone
      )),
    },
  }));
}

function getSelectedDesignReservationZoneId(state: DesignSceneStore): string | null {
  return state.designScene.activeSelection?.kind === "design-reservation-zone"
    ? state.designScene.activeSelection.designReservationZoneId
    : null;
}

export function formatDesignReservationZonePurposeLabel(purpose: DesignReservationZonePurpose): string {
  switch (purpose) {
    case "island":
      return "Island";
    case "peninsula":
      return "Peninsula";
    case "tall-pantry":
      return "Tall pantry";
  }
}
