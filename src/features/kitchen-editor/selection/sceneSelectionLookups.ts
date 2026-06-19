import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { SceneEntitySelectionRef, SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import { getSceneEntityRefsFromSelection } from "@/engine/scene/sceneSelectionTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import type { PlacedWallGraph, PlacedWallNode } from "@/engine/walls/placedWallGraphTypes";
import type { PlacedWallSegment } from "@/engine/walls/placedWallSegmentTypes";

export function buildPlacedAssemblyById(
  placedAssemblies: readonly PlacedAssembly[],
): ReadonlyMap<string, PlacedAssembly> {
  return new Map(placedAssemblies.map((placedAssembly) => [placedAssembly.id, placedAssembly]));
}

export function buildDesignReservationZoneById(
  designReservationZones: readonly DesignReservationZone[],
): ReadonlyMap<string, DesignReservationZone> {
  return new Map(designReservationZones.map((zone) => [zone.id, zone]));
}

export function getSelectedSceneEntityRefs(
  activeSelection: SceneSelection | null,
): readonly SceneEntitySelectionRef[] {
  return getSceneEntityRefsFromSelection(activeSelection);
}

export function getSelectedPlacedAssembly(args: {
  activeSelection: SceneSelection | null;
  placedAssemblyById: ReadonlyMap<string, PlacedAssembly>;
}): PlacedAssembly | null {
  const selectedAssemblies = getSelectedPlacedAssemblies(args);
  return selectedAssemblies.length === 1 && getSelectedDesignReservationZoneRefs(args.activeSelection).length === 0
    ? selectedAssemblies[0]
    : null;
}

export function getSelectedPlacedAssemblies(args: {
  activeSelection: SceneSelection | null;
  placedAssemblyById: ReadonlyMap<string, PlacedAssembly>;
}): readonly PlacedAssembly[] {
  return getSelectedPlacedAssemblyRefs(args.activeSelection)
    .map((sceneEntity) => args.placedAssemblyById.get(sceneEntity.entityId))
    .filter(isPlacedAssembly);
}

export function getSelectedDesignReservationZones(args: {
  activeSelection: SceneSelection | null;
  designReservationZoneById: ReadonlyMap<string, DesignReservationZone>;
}): readonly DesignReservationZone[] {
  return getSelectedDesignReservationZoneRefs(args.activeSelection)
    .map((sceneEntity) => args.designReservationZoneById.get(sceneEntity.entityId))
    .filter(isDesignReservationZone);
}

export function getSelectedDesignReservationZoneFromScene(
  designScene: DesignScene,
): DesignReservationZone | null {
  const selectedZoneRef = getSingleSelectedSceneEntityRef(designScene.activeSelection, "design-reservation-zone");

  if (selectedZoneRef === null) {
    return null;
  }

  return designScene.designReservationZones.find(
    (zone) => zone.id === selectedZoneRef.entityId,
  ) ?? null;
}

export function getSelectedPlacedAssemblyFromScene(
  designScene: DesignScene,
): PlacedAssembly | null {
  const selectedAssemblyRef = getSingleSelectedSceneEntityRef(designScene.activeSelection, "placed-assembly");

  if (selectedAssemblyRef === null) {
    return null;
  }

  return designScene.placedAssemblies.find(
    (placedAssembly) => placedAssembly.id === selectedAssemblyRef.entityId,
  ) ?? null;
}

export function getSelectedWallSegmentFromScene(
  designScene: DesignScene,
): PlacedWallSegment | null {
  const { activeSelection } = designScene;
  const selectedWallGraph = getSelectedWallGraphFromScene(designScene);

  if (selectedWallGraph === null || activeSelection?.kind !== "placed-wall-segment") {
    return null;
  }

  return selectedWallGraph.segments.find(
    (wallSegment) => wallSegment.id === activeSelection.wallSegmentId,
  ) ?? null;
}

export function getSelectedWallGraphNodesFromScene(
  designScene: DesignScene,
): readonly PlacedWallNode[] | null {
  return getSelectedWallGraphFromScene(designScene)?.nodes ?? null;
}

function getSelectedWallGraphFromScene(
  designScene: DesignScene,
): PlacedWallGraph | null {
  const { activeSelection } = designScene;

  if (activeSelection?.kind !== "placed-wall-segment") {
    return null;
  }

  return designScene.placedWallGraphs.find(
    (wallGraph) => wallGraph.id === activeSelection.wallGraphId,
  ) ?? null;
}

function getSingleSelectedSceneEntityRef(
  activeSelection: SceneSelection | null,
  entityKind: SceneEntitySelectionRef["entityKind"],
): SceneEntitySelectionRef | null {
  const sceneEntities = getSceneEntityRefsFromSelection(activeSelection);
  return sceneEntities.length === 1 && sceneEntities[0].entityKind === entityKind ? sceneEntities[0] : null;
}

function getSelectedPlacedAssemblyRefs(activeSelection: SceneSelection | null): readonly SceneEntitySelectionRef[] {
  return getSceneEntityRefsFromSelection(activeSelection).filter((sceneEntity) => sceneEntity.entityKind === "placed-assembly");
}

function getSelectedDesignReservationZoneRefs(activeSelection: SceneSelection | null): readonly SceneEntitySelectionRef[] {
  return getSceneEntityRefsFromSelection(activeSelection).filter((sceneEntity) => sceneEntity.entityKind === "design-reservation-zone");
}

function isPlacedAssembly(placedAssembly: PlacedAssembly | undefined): placedAssembly is PlacedAssembly {
  return placedAssembly !== undefined;
}

function isDesignReservationZone(zone: DesignReservationZone | undefined): zone is DesignReservationZone {
  return zone !== undefined;
}
