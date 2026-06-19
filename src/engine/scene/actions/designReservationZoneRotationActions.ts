import { getPlanPointerAngleDegrees } from "@/core/geometry/planPointGeometry";
import { snapAssemblyRotationDegrees } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import type { DesignScene } from "../designSceneTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createDesignReservationZoneRotationActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "startDesignReservationZoneRotationDrag"
  | "updateDesignReservationZoneRotationDrag"
  | "finishDesignReservationZoneRotationDrag"
  | "cancelDesignReservationZoneRotationDrag"
> {
  return {
    startDesignReservationZoneRotationDrag({ designReservationZoneId, centerPointInches, pointerWorldInches }) {
      const zone = get().designScene.designReservationZones.find((candidate) => candidate.id === designReservationZoneId);

      if (zone === undefined || get().activeSceneViewMode !== "floor-plan") {
        return;
      }

      const pointerAngleDegrees = getPlanPointerAngleDegrees(centerPointInches, pointerWorldInches);

      set({
        activeDrag: {
          kind: "design-reservation-zone-rotation",
          designReservationZoneId,
          centerPointInches,
          startPointerAngleDegrees: pointerAngleDegrees,
          startRotationDegrees: zone.rotationDegrees.zDegrees,
        },
        activeObjectAlignmentGuides: [],
      });
    },

    updateDesignReservationZoneRotationDrag(pointerWorldInches) {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-rotation") {
        return;
      }

      const pointerAngleDegrees = getPlanPointerAngleDegrees(activeDrag.centerPointInches, pointerWorldInches);
      const rotationDeltaDegrees = activeDrag.startPointerAngleDegrees - pointerAngleDegrees;
      const snapResult = snapAssemblyRotationDegrees(activeDrag.startRotationDegrees + rotationDeltaDegrees);

      set((state) => ({
        designScene: {
          ...state.designScene,
          designReservationZones: state.designScene.designReservationZones.map((zone) => (
            zone.id === activeDrag.designReservationZoneId
              ? {
                  ...zone,
                  rotationDegrees: { zDegrees: snapResult.rotationDegrees },
                }
              : zone
          )),
        },
        activeObjectAlignmentGuides: [],
      }));
    },

    finishDesignReservationZoneRotationDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-rotation") {
        return;
      }

      recordDesignSceneHistoryEntry({
        get,
        set,
        label: "Rotate design reservation zone",
        designScene: createDesignSceneWithDesignReservationZoneRotation({
          designScene: get().designScene,
          designReservationZoneId: activeDrag.designReservationZoneId,
          rotationDegrees: activeDrag.startRotationDegrees,
        }),
      });

      set({ activeDrag: null, activeObjectAlignmentGuides: [] });
    },

    cancelDesignReservationZoneRotationDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-rotation") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          designReservationZones: state.designScene.designReservationZones.map((zone) => (
            zone.id === activeDrag.designReservationZoneId
              ? {
                  ...zone,
                  rotationDegrees: { zDegrees: activeDrag.startRotationDegrees },
                }
              : zone
          )),
        },
        activeDrag: null,
        activeObjectAlignmentGuides: [],
      }));
    },
  };
}


function createDesignSceneWithDesignReservationZoneRotation(args: {
  designScene: DesignScene;
  designReservationZoneId: string;
  rotationDegrees: number;
}): DesignScene {
  return {
    ...args.designScene,
    designReservationZones: args.designScene.designReservationZones.map((zone) => (
      zone.id === args.designReservationZoneId
        ? {
            ...zone,
            rotationDegrees: { zDegrees: args.rotationDegrees },
          }
        : zone
    )),
  };
}
