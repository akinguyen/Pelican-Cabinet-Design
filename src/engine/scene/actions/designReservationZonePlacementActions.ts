import { createId } from "@/core/ids/createId";
import { createDesignReservationZoneAtPointer } from "@/engine/design-zones/designReservationZoneGeometry";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

const INITIAL_ZONE_POSITION = { xInches: 0, yInches: 0, zInches: 0 };

export function createDesignReservationZonePlacementActions(get: DesignSceneStoreGetter, _set: DesignSceneStoreSetter): Pick<DesignSceneStore, "startDesignReservationZonePlacementCandidate"> {
  return {
    startDesignReservationZonePlacementCandidate() {
      const state = get();
      get().startSceneEntityPlacementCandidate(createDesignReservationZoneAtPointer({
        id: createId(),
        reservedFor: "island",
        pointInches: INITIAL_ZONE_POSITION,
        sceneViewMode: state.activeSceneViewMode,
      }));
    },
  };
}
