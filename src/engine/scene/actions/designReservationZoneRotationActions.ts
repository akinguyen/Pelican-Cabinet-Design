import type { Point3DInches } from "@/core/geometry/pointTypes";
import { snapAssemblyRotationDegrees } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

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

      const pointerAngleDegrees = getPointerAngleDegrees(centerPointInches, pointerWorldInches);

      set({
        activeDrag: {
          kind: "design-reservation-zone-rotation",
          designReservationZoneId,
          centerPointInches,
          startPointerAngleDegrees: pointerAngleDegrees,
          startRotationDegrees: zone.rotationDegrees.zDegrees,
          latestRotationDegrees: zone.rotationDegrees.zDegrees,
        },
        activeObjectAlignmentGuides: [],
      });
    },

    updateDesignReservationZoneRotationDrag(pointerWorldInches) {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-rotation") {
        return;
      }

      const pointerAngleDegrees = getPointerAngleDegrees(activeDrag.centerPointInches, pointerWorldInches);
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
        activeDrag: {
          ...activeDrag,
          latestRotationDegrees: snapResult.rotationDegrees,
        },
        activeObjectAlignmentGuides: [],
      }));
    },

    finishDesignReservationZoneRotationDrag() {
      if (get().activeDrag?.kind !== "design-reservation-zone-rotation") {
        return;
      }

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

function getPointerAngleDegrees(
  centerPointInches: Point3DInches,
  pointerWorldInches: Point3DInches,
): number {
  return (
    Math.atan2(
      pointerWorldInches.yInches - centerPointInches.yInches,
      pointerWorldInches.xInches - centerPointInches.xInches,
    ) *
    180
  ) / Math.PI;
}
