import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { PlacedWallNode } from "@/engine/walls/placedWallNodeTypes";
import type { PlacedWallSegment } from "@/engine/walls/placedWallSegmentTypes";

export type SelectedWallSegment = Readonly<{
  wallGraph: PlacedWallGraph;
  wallSegment: PlacedWallSegment;
}>;

export function buildPlacedAssemblyById(
  placedAssemblies: readonly PlacedAssembly[],
): ReadonlyMap<string, PlacedAssembly> {
  return new Map(placedAssemblies.map((placedAssembly) => [placedAssembly.id, placedAssembly]));
}

export function buildPlacedWallGraphById(
  placedWallGraphs: readonly PlacedWallGraph[],
): ReadonlyMap<string, PlacedWallGraph> {
  return new Map(placedWallGraphs.map((placedWallGraph) => [placedWallGraph.id, placedWallGraph]));
}

export function getSelectedPlacedAssembly(args: {
  activeSelection: SceneSelection | null;
  placedAssemblyById: ReadonlyMap<string, PlacedAssembly>;
}): PlacedAssembly | null {
  return args.activeSelection?.kind === "placed-assembly"
    ? args.placedAssemblyById.get(args.activeSelection.placedAssemblyId) ?? null
    : null;
}

export function getSelectedWallSegment(args: {
  activeSelection: SceneSelection | null;
  placedWallGraphById: ReadonlyMap<string, PlacedWallGraph>;
}): SelectedWallSegment | null {
  if (args.activeSelection?.kind !== "placed-wall-segment") {
    return null;
  }

  const { wallGraphId, wallSegmentId } = args.activeSelection;
  const wallGraph = args.placedWallGraphById.get(wallGraphId);

  if (wallGraph === undefined) {
    return null;
  }

  const wallSegment = wallGraph.segments.find(
    (candidate) => candidate.id === wallSegmentId,
  );

  return wallSegment === undefined ? null : { wallGraph, wallSegment };
}

export function getSelectedPlacedAssemblyFromScene(
  designScene: DesignScene,
): PlacedAssembly | null {
  const { activeSelection } = designScene;

  if (activeSelection?.kind !== "placed-assembly") {
    return null;
  }

  return designScene.placedAssemblies.find(
    (placedAssembly) => placedAssembly.id === activeSelection.placedAssemblyId,
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
