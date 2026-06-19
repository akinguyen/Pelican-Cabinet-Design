import { getDefaultDesignReservationZoneDimensions } from "@/engine/design-zones/designReservationZoneDefaults";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

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
> {
  return {
    updateSelectedDesignReservationZoneReservedFor(reservedFor) {
      updateSelectedZone(set, get, "Update design reservation zone purpose", (zone) => ({
        ...zone,
        reservedFor,
        sizeInches: { ...getDefaultDesignReservationZoneDimensions(reservedFor) },
      }));
    },

    updateSelectedDesignReservationZoneWidth(widthInches) {
      updateSelectedZone(set, get, "Update design reservation zone width", (zone) => ({
        ...zone,
        sizeInches: {
          ...zone.sizeInches,
          widthInches: Math.max(MIN_DESIGN_RESERVATION_ZONE_DIMENSION_INCHES, widthInches),
        },
      }));
    },

    updateSelectedDesignReservationZoneDepth(depthInches) {
      updateSelectedZone(set, get, "Update design reservation zone depth", (zone) => ({
        ...zone,
        sizeInches: {
          ...zone.sizeInches,
          depthInches: Math.max(MIN_DESIGN_RESERVATION_ZONE_DIMENSION_INCHES, depthInches),
        },
      }));
    },

    updateSelectedDesignReservationZoneHeight(heightInches) {
      updateSelectedZone(set, get, "Update design reservation zone height", (zone) => ({
        ...zone,
        sizeInches: {
          ...zone.sizeInches,
          heightInches: Math.max(MIN_DESIGN_RESERVATION_ZONE_DIMENSION_INCHES, heightInches),
        },
      }));
    },

    updateSelectedDesignReservationZonePositionX(xInches) {
      updateSelectedZone(set, get, "Update design reservation zone position", (zone) => ({
        ...zone,
        baseCenterPointInches: {
          ...zone.baseCenterPointInches,
          xInches,
        },
      }));
    },

    updateSelectedDesignReservationZonePositionY(yInches) {
      updateSelectedZone(set, get, "Update design reservation zone position", (zone) => ({
        ...zone,
        baseCenterPointInches: {
          ...zone.baseCenterPointInches,
          yInches,
        },
      }));
    },

    updateSelectedDesignReservationZoneDistanceFromFloor(distanceFromFloorInches) {
      updateSelectedZone(set, get, "Update design reservation zone elevation", (zone) => ({
        ...zone,
        baseCenterPointInches: {
          ...zone.baseCenterPointInches,
          zInches: Math.max(0, distanceFromFloorInches),
        },
      }));
    },

    updateSelectedDesignReservationZoneRotationZ(zDegrees) {
      updateSelectedZone(set, get, "Rotate design reservation zone", (zone) => ({
        ...zone,
        rotationDegrees: { zDegrees },
      }));
    },



  };
}

function updateSelectedZone(
  set: DesignSceneStoreSetter,
  get: DesignSceneStoreGetter,
  historyLabel: string,
  update: (zone: DesignSceneStore["designScene"]["designReservationZones"][number]) => DesignSceneStore["designScene"]["designReservationZones"][number],
) {
  const selectedZoneId = getSelectedDesignReservationZoneId(get());

  if (selectedZoneId === null) {
    return;
  }

  recordDesignSceneHistoryEntry({ get, set, label: historyLabel });

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
  const selectedSceneEntities = getSceneEntityRefsFromSelection(state.designScene.activeSelection);
  return selectedSceneEntities.length === 1 && selectedSceneEntities[0].entityKind === "design-reservation-zone"
    ? selectedSceneEntities[0].entityId
    : null;
}
