import { getDefaultDesignReservationZoneDimensions } from "@/engine/design-zones/designReservationZoneDefaults";
import { getSceneEntitiesByRefs, replaceSceneEntity } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import { createSceneEntityWithDistanceFromFloor, getSceneEntityDistanceFromFloorInches } from "@/engine/scene-entities/sceneEntityTransforms";
import { getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createDesignReservationZoneEditingActions(get: DesignSceneStoreGetter, set: DesignSceneStoreSetter): Pick<DesignSceneStore, "updateSelectedDesignReservationZoneReservedFor" | "updateSelectedDesignReservationZoneWidth" | "updateSelectedDesignReservationZoneDepth" | "updateSelectedDesignReservationZoneHeight"> {
  function updateSelected(label: string, update: (zone: NonNullable<ReturnType<typeof getSelectedZone>>) => NonNullable<ReturnType<typeof getSelectedZone>>) {
    const zone = getSelectedZone(get);
    if (zone === null) return;
    recordDesignSceneHistoryEntry({ get, set, label });
    set((state) => ({ designScene: { ...state.designScene, sceneEntities: replaceSceneEntity(state.designScene.sceneEntities, update(zone)) } }));
  }
  return {
    updateSelectedDesignReservationZoneReservedFor(reservedFor) {
      updateSelected("Update reservation zone purpose", (zone) => {
        const distanceFromFloor = getSceneEntityDistanceFromFloorInches(zone);
        return createSceneEntityWithDistanceFromFloor({ ...zone, reservedFor, sizeInches: getDefaultDesignReservationZoneDimensions(reservedFor) }, distanceFromFloor);
      });
    },
    updateSelectedDesignReservationZoneWidth(widthInches) { updateSelected("Update reservation zone width", (zone) => ({ ...zone, sizeInches: { ...zone.sizeInches, widthInches } })); },
    updateSelectedDesignReservationZoneDepth(depthInches) { updateSelected("Update reservation zone depth", (zone) => ({ ...zone, sizeInches: { ...zone.sizeInches, depthInches } })); },
    updateSelectedDesignReservationZoneHeight(heightInches) { updateSelected("Update reservation zone height", (zone) => createSceneEntityWithDistanceFromFloor({ ...zone, sizeInches: { ...zone.sizeInches, heightInches } }, getSceneEntityDistanceFromFloorInches(zone))); },
  };
}

function getSelectedZone(get: DesignSceneStoreGetter) {
  const refs = getSceneEntityRefsFromSelection(get().designScene.activeSelection).filter((ref) => ref.entityKind === "design-reservation-zone");
  if (refs.length !== 1) return null;
  const entity = getSceneEntitiesByRefs(get().designScene.sceneEntities, refs)[0];
  return entity?.entityKind === "design-reservation-zone" ? entity : null;
}
