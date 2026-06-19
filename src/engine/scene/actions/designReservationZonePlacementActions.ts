import { createId } from "@/core/ids/createId";
import { DEFAULT_DESIGN_RESERVATION_ZONE_PURPOSE } from "@/engine/design-zones/designReservationZoneDefaults";
import { alignDesignReservationZone } from "@/engine/design-zones/designReservationZoneAlignment";
import { createDesignReservationZoneAtPointer } from "@/engine/design-zones/designReservationZoneGeometry";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyElevationMoveFrame } from "../sceneDragTypes";
import type { SceneViewMode } from "../sceneViewModeTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createDesignReservationZonePlacementActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "startDesignReservationZonePlacementCandidate"
  | "updateDesignReservationZonePlacementCandidate"
  | "commitDesignReservationZonePlacementCandidate"
  | "cancelDesignReservationZonePlacementCandidate"
> {
  return {
    startDesignReservationZonePlacementCandidate() {
      const candidateZone = createDesignReservationZoneAtPointer({
        id: createId(),
        reservedFor: DEFAULT_DESIGN_RESERVATION_ZONE_PURPOSE,
        pointInches: { xInches: 0, yInches: 0, zInches: 0 },
        sceneViewMode: get().activeSceneViewMode,
      });

      set((state) => ({
        activeToolbarTool: "draw-design-reservation-zone",
        activeObjectAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          activeSelection: null,
          activeSceneOperation: {
            kind: "design-reservation-zone-placement",
            candidate: {
              zone: candidateZone,
              placementState: "waiting-for-pointer",
              sceneViewMode: state.activeSceneViewMode,
            },
          },
        },
      }));
    },

    updateDesignReservationZonePlacementCandidate(
      pointInches: Point3DInches,
      sceneViewMode: SceneViewMode,
      elevationMoveFrame?: AssemblyElevationMoveFrame,
    ) {
      const { designScene } = get();
      const activeSceneOperation = designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "design-reservation-zone-placement") {
        return;
      }

      const proposedZone = createDesignReservationZoneAtPointer({
        id: activeSceneOperation.candidate.zone.id,
        reservedFor: activeSceneOperation.candidate.zone.reservedFor,
        pointInches,
        sceneViewMode,
        elevationMoveFrame,
      });
      const alignmentResult = alignDesignReservationZone({
        movingZone: proposedZone,
        placedAssemblies: designScene.placedAssemblies,
        placedWallGraphs: designScene.placedWallGraphs,
        designReservationZones: designScene.designReservationZones,
        movementSource: sceneViewMode,
        elevationMoveFrame,
      });

      set((state) => ({
        activeObjectAlignmentGuides: alignmentResult.alignmentGuides,
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            kind: "design-reservation-zone-placement",
            candidate: {
              zone: alignmentResult.zone,
              placementState: "positioned",
              sceneViewMode,
              elevationMoveFrame,
            },
          },
        },
      }));
    },

    commitDesignReservationZonePlacementCandidate() {
      const { designScene } = get();
      const activeSceneOperation = designScene.activeSceneOperation;

      if (
        activeSceneOperation?.kind !== "design-reservation-zone-placement" ||
        activeSceneOperation.candidate.placementState !== "positioned"
      ) {
        return;
      }

      const newZone = activeSceneOperation.candidate.zone;

      recordDesignSceneHistoryEntry({ get, set, label: "Place design reservation zone" });

      set((state) => ({
        activeToolbarTool: null,
        activeObjectAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          designReservationZones: [...state.designScene.designReservationZones, newZone],
          activeSceneOperation: null,
          activeSelection: {
            kind: "scene-entity",
            sceneEntity: {
              entityKind: "design-reservation-zone",
              entityId: newZone.id,
            },
          },
        },
      }));
    },

    cancelDesignReservationZonePlacementCandidate() {
      set((state) => ({
        activeToolbarTool: state.activeToolbarTool === "draw-design-reservation-zone"
          ? null
          : state.activeToolbarTool,
        activeObjectAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          activeSceneOperation: state.designScene.activeSceneOperation?.kind === "design-reservation-zone-placement"
            ? null
            : state.designScene.activeSceneOperation,
        },
      }));
    },
  };
}
