import { buildConnectedWallGeometry } from "./buildConnectedWallGeometry";
import type { PlacedWallGraph } from "./placedWallGraphTypes";
import type { WallFaceSide } from "./placedWallSegmentTypes";
import type { WallElevationTarget } from "./wallSegmentElevationTypes";
import { getWallSegmentElevationFaces } from "./wallSegmentElevation";
import type { WallSegmentFace } from "./connectedWallGeometryTypes";

export type WallElevationSegmentNavigationItem = Readonly<{
  wallGraphId: string;
  wallSegmentId: string;
  segmentIndex: number;
  totalSegmentCount: number;
  sideAFace: WallSegmentFace;
  sideBFace: WallSegmentFace;
}>;

export function getWallElevationSegmentNavigationItems(
  placedWallGraphs: readonly PlacedWallGraph[],
): readonly WallElevationSegmentNavigationItem[] {
  const segmentFaces = placedWallGraphs.flatMap((wallGraph) => (
    getWallSegmentElevationFaces(buildConnectedWallGeometry(wallGraph))
  ));
  const segmentKeys: string[] = [];
  const facesBySegmentKey = new Map<string, Partial<Record<WallFaceSide, WallSegmentFace>>>();

  segmentFaces.forEach((face) => {
    const segmentKey = createWallSegmentKey(face);
    const segmentFacesBySide = facesBySegmentKey.get(segmentKey) ?? {};

    if (!facesBySegmentKey.has(segmentKey)) {
      segmentKeys.push(segmentKey);
    }

    facesBySegmentKey.set(segmentKey, {
      ...segmentFacesBySide,
      [face.side]: face,
    });
  });

  const totalSegmentCount = segmentKeys.length;

  return segmentKeys.flatMap((segmentKey, segmentIndex) => {
    const segmentFacesBySide = facesBySegmentKey.get(segmentKey);
    const sideAFace = segmentFacesBySide?.["side-a"];
    const sideBFace = segmentFacesBySide?.["side-b"];

    if (sideAFace === undefined || sideBFace === undefined) {
      return [];
    }

    return [{
      wallGraphId: sideAFace.wallGraphId,
      wallSegmentId: sideAFace.wallSegmentId,
      segmentIndex,
      totalSegmentCount,
      sideAFace,
      sideBFace,
    }];
  });
}

export function getActiveWallElevationSegmentNavigationItem(args: {
  items: readonly WallElevationSegmentNavigationItem[];
  activeWallElevationTarget: WallElevationTarget | null;
}): WallElevationSegmentNavigationItem | null {
  if (args.items.length === 0) {
    return null;
  }

  if (args.activeWallElevationTarget === null) {
    return args.items[0];
  }

  return args.items.find((item) => (
    item.wallGraphId === args.activeWallElevationTarget?.wallGraphId &&
    item.wallSegmentId === args.activeWallElevationTarget.wallSegmentId
  )) ?? args.items[0];
}

export function getWallElevationSegmentFace(
  item: WallElevationSegmentNavigationItem,
  faceSide: WallFaceSide,
): WallSegmentFace {
  return faceSide === "side-a" ? item.sideAFace : item.sideBFace;
}

export function createWallElevationTargetFromNavigationItem(args: {
  item: WallElevationSegmentNavigationItem;
  faceSide: WallFaceSide;
}): WallElevationTarget {
  return {
    wallGraphId: args.item.wallGraphId,
    wallSegmentId: args.item.wallSegmentId,
    faceSide: args.faceSide,
  };
}

export function toggleWallElevationFaceSide(faceSide: WallFaceSide): WallFaceSide {
  return faceSide === "side-a" ? "side-b" : "side-a";
}

function createWallSegmentKey(face: WallSegmentFace): string {
  return `${face.wallGraphId}:${face.wallSegmentId}`;
}
