import type { WallElevationTarget } from "./wallSegmentElevationTypes";
import type { BuiltWallSegmentTopology, WallSegmentFace } from "./wallSegmentTopologyTypes";

export function getWallSegmentElevationFaces(
  topology: BuiltWallSegmentTopology,
): readonly WallSegmentFace[] {
  return topology.faces;
}

export function getActiveWallSegmentElevationFace(args: {
  topology: BuiltWallSegmentTopology;
  activeWallElevationTarget: WallElevationTarget | null;
}): WallSegmentFace | null {
  const faces = getWallSegmentElevationFaces(args.topology);

  if (faces.length === 0) {
    return null;
  }

  if (args.activeWallElevationTarget === null) {
    return faces[0];
  }

  return faces.find((face) => (
    face.wallGraphId === args.activeWallElevationTarget?.wallGraphId &&
    face.wallSegmentId === args.activeWallElevationTarget.wallSegmentId &&
    face.side === args.activeWallElevationTarget.faceSide
  )) ?? faces[0];
}

export function createWallSegmentElevationViewKey(
  face: WallSegmentFace,
): string {
  return `${face.wallGraphId}-${face.wallSegmentId}-${face.side}`;
}

export function createWallElevationTargetFromFace(
  face: WallSegmentFace,
): WallElevationTarget {
  return {
    wallGraphId: face.wallGraphId,
    wallSegmentId: face.wallSegmentId,
    faceSide: face.side,
  };
}
