import { createId } from "@/core/ids/createId";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import type { SceneEntitySelectionRef } from "../sceneSelectionTypes";
import { createSceneSelectionFromSceneEntities, getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

const DUPLICATE_OFFSET_INCHES = 12;

export function createSceneEntityEditingActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "deleteSelectedSceneEntities" | "duplicateSelectedSceneEntities"> {
  return {
    deleteSelectedSceneEntities() {
      const selectedSceneEntities = getSceneEntityRefsFromSelection(get().designScene.activeSelection);

      if (selectedSceneEntities.length === 0) {
        return;
      }

      const selectedAssemblyIds = new Set(
        selectedSceneEntities
          .filter((sceneEntity) => sceneEntity.entityKind === "placed-assembly")
          .map((sceneEntity) => sceneEntity.entityId),
      );
      const selectedZoneIds = new Set(
        selectedSceneEntities
          .filter((sceneEntity) => sceneEntity.entityKind === "design-reservation-zone")
          .map((sceneEntity) => sceneEntity.entityId),
      );
      const selectedAssemblyCount = selectedAssemblyIds.size;
      const selectedZoneCount = selectedZoneIds.size;

      if (selectedAssemblyCount === 0 && selectedZoneCount === 0) {
        return;
      }

      recordDesignSceneHistoryEntry({
        get,
        set,
        label: createDeleteSelectedSceneEntitiesHistoryLabel({ selectedAssemblyCount, selectedZoneCount }),
      });

      set((state) => ({
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          placedAssemblies: state.designScene.placedAssemblies.filter((assembly) => !selectedAssemblyIds.has(assembly.id)),
          designReservationZones: state.designScene.designReservationZones.filter((zone) => !selectedZoneIds.has(zone.id)),
          activeSelection: null,
        },
      }));
    },

    duplicateSelectedSceneEntities() {
      const selectedSceneEntities = getSceneEntityRefsFromSelection(get().designScene.activeSelection);

      if (selectedSceneEntities.length === 0) {
        return;
      }

      const selectedAssemblyIds = new Set(
        selectedSceneEntities
          .filter((sceneEntity) => sceneEntity.entityKind === "placed-assembly")
          .map((sceneEntity) => sceneEntity.entityId),
      );
      const selectedZoneIds = new Set(
        selectedSceneEntities
          .filter((sceneEntity) => sceneEntity.entityKind === "design-reservation-zone")
          .map((sceneEntity) => sceneEntity.entityId),
      );
      const duplicatedAssemblies: PlacedAssembly[] = [];
      const duplicatedZones: DesignReservationZone[] = [];
      const duplicatedSceneEntities: SceneEntitySelectionRef[] = [];

      get().designScene.placedAssemblies.forEach((assembly) => {
        if (!selectedAssemblyIds.has(assembly.id)) {
          return;
        }

        const duplicatedAssemblyId = createId();
        duplicatedAssemblies.push({
          ...assembly,
          id: duplicatedAssemblyId,
          worldPositionInches: {
            ...assembly.worldPositionInches,
            xInches: assembly.worldPositionInches.xInches + DUPLICATE_OFFSET_INCHES,
            yInches: assembly.worldPositionInches.yInches + DUPLICATE_OFFSET_INCHES,
          },
        });
        duplicatedSceneEntities.push({
          entityKind: "placed-assembly",
          entityId: duplicatedAssemblyId,
        });
      });

      get().designScene.designReservationZones.forEach((zone) => {
        if (!selectedZoneIds.has(zone.id)) {
          return;
        }

        const duplicatedZoneId = createId();
        duplicatedZones.push({
          ...zone,
          id: duplicatedZoneId,
          baseCenterPointInches: {
            ...zone.baseCenterPointInches,
            xInches: zone.baseCenterPointInches.xInches + DUPLICATE_OFFSET_INCHES,
            yInches: zone.baseCenterPointInches.yInches + DUPLICATE_OFFSET_INCHES,
          },
        });
        duplicatedSceneEntities.push({
          entityKind: "design-reservation-zone",
          entityId: duplicatedZoneId,
        });
      });

      if (duplicatedSceneEntities.length === 0) {
        return;
      }

      recordDesignSceneHistoryEntry({
        get,
        set,
        label: createDuplicateSelectedSceneEntitiesHistoryLabel({
          selectedAssemblyCount: duplicatedAssemblies.length,
          selectedZoneCount: duplicatedZones.length,
        }),
      });

      set((state) => ({
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
        designScene: {
          ...state.designScene,
          placedAssemblies: [...state.designScene.placedAssemblies, ...duplicatedAssemblies],
          designReservationZones: [...state.designScene.designReservationZones, ...duplicatedZones],
          activeSelection: createSceneSelectionFromSceneEntities(duplicatedSceneEntities),
        },
      }));
    },
  };
}

function createDeleteSelectedSceneEntitiesHistoryLabel(args: {
  selectedAssemblyCount: number;
  selectedZoneCount: number;
}): string {
  const selectedTotal = args.selectedAssemblyCount + args.selectedZoneCount;

  if (selectedTotal === 1 && args.selectedAssemblyCount === 1) {
    return "Delete assembly";
  }

  if (selectedTotal === 1 && args.selectedZoneCount === 1) {
    return "Delete design reservation zone";
  }

  if (args.selectedAssemblyCount > 0 && args.selectedZoneCount === 0) {
    return "Delete selected assemblies";
  }

  if (args.selectedZoneCount > 0 && args.selectedAssemblyCount === 0) {
    return "Delete selected design reservation zones";
  }

  return "Delete selected scene entities";
}

function createDuplicateSelectedSceneEntitiesHistoryLabel(args: {
  selectedAssemblyCount: number;
  selectedZoneCount: number;
}): string {
  const selectedTotal = args.selectedAssemblyCount + args.selectedZoneCount;

  if (selectedTotal === 1 && args.selectedAssemblyCount === 1) {
    return "Duplicate assembly";
  }

  if (selectedTotal === 1 && args.selectedZoneCount === 1) {
    return "Duplicate design reservation zone";
  }

  if (args.selectedAssemblyCount > 0 && args.selectedZoneCount === 0) {
    return "Duplicate selected assemblies";
  }

  if (args.selectedZoneCount > 0 && args.selectedAssemblyCount === 0) {
    return "Duplicate selected design reservation zones";
  }

  return "Duplicate selected scene entities";
}
