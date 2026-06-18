import { alignDesignReservationZone } from "@/engine/design-zones/designReservationZoneAlignment";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { DesignReservationZoneMoveDragState } from "../sceneDragTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createDesignReservationZoneDragActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "startDesignReservationZoneDrag"
  | "updateDesignReservationZoneDrag"
  | "finishDesignReservationZoneDrag"
  | "cancelDesignReservationZoneDrag"
> {
  return {
    startDesignReservationZoneDrag({ designReservationZoneId, pointerWorldInches, sceneViewMode, elevationMoveFrame }) {
      const zone = get().designScene.designReservationZones.find((candidate) => candidate.id === designReservationZoneId);

      if (zone === undefined) {
        return;
      }

      set({
        activeDrag: {
          kind: "design-reservation-zone-move",
          designReservationZoneId,
          dragStartPointerWorldInches: pointerWorldInches,
          dragStartBaseCenterPointInches: zone.baseCenterPointInches,
          latestBaseCenterPointInches: zone.baseCenterPointInches,
          sceneViewMode,
          elevationMoveFrame,
        },
        activeObjectAlignmentGuides: [],
      });
    },

    updateDesignReservationZoneDrag(pointerWorldInches) {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-move") {
        return;
      }

      const zone = get().designScene.designReservationZones.find(
        (candidate) => candidate.id === activeDrag.designReservationZoneId,
      );

      if (zone === undefined) {
        return;
      }

      const proposedBaseCenterPointInches = createDraggedDesignReservationZoneBaseCenterPoint(
        activeDrag,
        pointerWorldInches,
      );
      const proposedZone = {
        ...zone,
        baseCenterPointInches: proposedBaseCenterPointInches,
      };
      const { designScene } = get();
      const alignmentResult = alignDesignReservationZone({
        movingZone: proposedZone,
        placedAssemblies: designScene.placedAssemblies,
        placedWallGraphs: designScene.placedWallGraphs,
        designReservationZones: designScene.designReservationZones,
        movementSource: activeDrag.sceneViewMode,
        elevationMoveFrame: activeDrag.elevationMoveFrame,
      });
      const nextBaseCenterPointInches = alignmentResult.zone.baseCenterPointInches;

      set((state) => ({
        designScene: {
          ...state.designScene,
          designReservationZones: state.designScene.designReservationZones.map((candidate) => (
            candidate.id === activeDrag.designReservationZoneId
              ? {
                  ...candidate,
                  baseCenterPointInches: nextBaseCenterPointInches,
                }
              : candidate
          )),
        },
        activeDrag: {
          ...activeDrag,
          latestBaseCenterPointInches: nextBaseCenterPointInches,
        },
        activeObjectAlignmentGuides: alignmentResult.alignmentGuides,
      }));
    },

    finishDesignReservationZoneDrag() {
      if (get().activeDrag?.kind !== "design-reservation-zone-move") {
        return;
      }

      set({ activeDrag: null, activeObjectAlignmentGuides: [] });
    },

    cancelDesignReservationZoneDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-move") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          designReservationZones: state.designScene.designReservationZones.map((zone) => (
            zone.id === activeDrag.designReservationZoneId
              ? {
                  ...zone,
                  baseCenterPointInches: activeDrag.dragStartBaseCenterPointInches,
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

function createDraggedDesignReservationZoneBaseCenterPoint(
  activeDrag: DesignReservationZoneMoveDragState,
  pointerWorldInches: Point3DInches,
): Point3DInches {
  if (activeDrag.sceneViewMode === "elevation" && activeDrag.elevationMoveFrame !== undefined) {
    const pointerDeltaInches = {
      xInches: pointerWorldInches.xInches - activeDrag.dragStartPointerWorldInches.xInches,
      yInches: pointerWorldInches.yInches - activeDrag.dragStartPointerWorldInches.yInches,
      zInches: pointerWorldInches.zInches - activeDrag.dragStartPointerWorldInches.zInches,
    };
    const deltaAlongFaceInches =
      pointerDeltaInches.xInches * activeDrag.elevationMoveFrame.faceDirectionInches.xInches +
      pointerDeltaInches.yInches * activeDrag.elevationMoveFrame.faceDirectionInches.yInches +
      pointerDeltaInches.zInches * activeDrag.elevationMoveFrame.faceDirectionInches.zInches;

    return {
      xInches:
        activeDrag.dragStartBaseCenterPointInches.xInches +
        activeDrag.elevationMoveFrame.faceDirectionInches.xInches * deltaAlongFaceInches,
      yInches:
        activeDrag.dragStartBaseCenterPointInches.yInches +
        activeDrag.elevationMoveFrame.faceDirectionInches.yInches * deltaAlongFaceInches,
      zInches: Math.max(0, activeDrag.dragStartBaseCenterPointInches.zInches + pointerDeltaInches.zInches),
    };
  }

  return {
    xInches:
      activeDrag.dragStartBaseCenterPointInches.xInches +
      pointerWorldInches.xInches -
      activeDrag.dragStartPointerWorldInches.xInches,
    yInches:
      activeDrag.dragStartBaseCenterPointInches.yInches +
      pointerWorldInches.yInches -
      activeDrag.dragStartPointerWorldInches.yInches,
    zInches: activeDrag.dragStartBaseCenterPointInches.zInches,
  };
}
