import type { DesignScene } from "@/engine/scene/designSceneTypes";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import { getDesignReservationZonesFromSceneEntities, getPlacedAssembliesFromSceneEntities } from "@/engine/scene-entities/sceneEntityCollectionEditing";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { PlacedWallSegment } from "@/engine/walls/placedWallSegmentTypes";

export function buildPlacedAssemblyById(placedAssemblies: readonly PlacedAssembly[]): ReadonlyMap<string, PlacedAssembly> {
  return new Map(placedAssemblies.map((assembly) => [assembly.id, assembly]));
}

export function buildDesignReservationZoneById(zones: readonly DesignReservationZone[]): ReadonlyMap<string, DesignReservationZone> {
  return new Map(zones.map((zone) => [zone.id, zone]));
}

export function getSelectedPlacedAssembly(args: { activeSelection: SceneSelection | null; placedAssemblyById: ReadonlyMap<string, PlacedAssembly> }): PlacedAssembly | null {
  return args.activeSelection?.kind === "scene-entity" && args.activeSelection.sceneEntity.entityKind === "placed-assembly"
    ? args.placedAssemblyById.get(args.activeSelection.sceneEntity.entityId) ?? null
    : null;
}

export function getSelectedPlacedAssemblyFromScene(designScene: DesignScene): PlacedAssembly | null {
  return getSelectedPlacedAssembly({ activeSelection: designScene.activeSelection, placedAssemblyById: buildPlacedAssemblyById(getPlacedAssembliesFromSceneEntities(designScene.sceneEntities)) });
}

export function getSelectedPlacedAssemblies(args: { activeSelection: SceneSelection | null; placedAssemblyById: ReadonlyMap<string, PlacedAssembly> }): readonly PlacedAssembly[] {
  const refs = args.activeSelection?.kind === "scene-entities" ? args.activeSelection.sceneEntities : args.activeSelection?.kind === "scene-entity" ? [args.activeSelection.sceneEntity] : [];
  return refs.filter((ref) => ref.entityKind === "placed-assembly").map((ref) => args.placedAssemblyById.get(ref.entityId)).filter(isPlacedAssembly);
}


export function getSelectedDesignReservationZone(args: { activeSelection: SceneSelection | null; designReservationZoneById: ReadonlyMap<string, DesignReservationZone> }): DesignReservationZone | null {
  return args.activeSelection?.kind === "scene-entity" && args.activeSelection.sceneEntity.entityKind === "design-reservation-zone"
    ? args.designReservationZoneById.get(args.activeSelection.sceneEntity.entityId) ?? null
    : null;
}

export function getSelectedDesignReservationZoneFromScene(designScene: DesignScene): DesignReservationZone | null {
  const byId = buildDesignReservationZoneById(getDesignReservationZonesFromSceneEntities(designScene.sceneEntities));
  return designScene.activeSelection?.kind === "scene-entity" && designScene.activeSelection.sceneEntity.entityKind === "design-reservation-zone"
    ? byId.get(designScene.activeSelection.sceneEntity.entityId) ?? null
    : null;
}

export function getSelectedDesignReservationZones(args: { activeSelection: SceneSelection | null; designReservationZoneById: ReadonlyMap<string, DesignReservationZone> }): readonly DesignReservationZone[] {
  const refs = args.activeSelection?.kind === "scene-entities" ? args.activeSelection.sceneEntities : args.activeSelection?.kind === "scene-entity" ? [args.activeSelection.sceneEntity] : [];
  return refs.filter((ref) => ref.entityKind === "design-reservation-zone").map((ref) => args.designReservationZoneById.get(ref.entityId)).filter(isDesignReservationZone);
}

export function getSelectedWallSegment(args: { activeSelection: SceneSelection | null; placedWallGraphs: readonly PlacedWallGraph[] }): { wallGraph: PlacedWallGraph; wallSegment: PlacedWallSegment } | null {
  if (args.activeSelection?.kind !== "placed-wall-segment") return null;
  const selection = args.activeSelection;
  const wallGraph = args.placedWallGraphs.find((candidate) => candidate.id === selection.wallGraphId);
  const wallSegment = wallGraph?.segments.find((candidate) => candidate.id === selection.wallSegmentId);
  return wallGraph !== undefined && wallSegment !== undefined ? { wallGraph, wallSegment } : null;
}

export function getSelectedWallSegmentFromScene(designScene: DesignScene): { wallGraph: PlacedWallGraph; wallSegment: PlacedWallSegment } | null {
  return getSelectedWallSegment({ activeSelection: designScene.activeSelection, placedWallGraphs: designScene.placedWallGraphs });
}

export function getSelectedWallGraphNodesFromScene(designScene: DesignScene): readonly PlacedWallGraph["nodes"][number][] {
  const selected = getSelectedWallSegmentFromScene(designScene);
  return selected?.wallGraph.nodes ?? [];
}

export function getSelectedSceneEntityRefs(activeSelection: SceneSelection | null) {
  return activeSelection?.kind === "scene-entity" ? [activeSelection.sceneEntity] : activeSelection?.kind === "scene-entities" ? activeSelection.sceneEntities : [];
}

function isPlacedAssembly(value: PlacedAssembly | undefined): value is PlacedAssembly { return value !== undefined; }
function isDesignReservationZone(value: DesignReservationZone | undefined): value is DesignReservationZone { return value !== undefined; }
