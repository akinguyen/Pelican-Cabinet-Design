import { DEFAULT_WALL_SEGMENT_PREFERRED_VIEW_FACE_SIDE } from "./placedWallSegmentTypes";
import type { WallElevationTarget } from "./wallSegmentElevationTypes";
import type { BuiltConnectedWallGeometry, WallSegmentFace } from "./connectedWallGeometryTypes";

export function getWallSegmentElevationFaces(
  topology: BuiltConnectedWallGeometry,
): readonly WallSegmentFace[] {
  return topology.faces;
}

export function getActiveWallSegmentElevationFace(args: {
  topology: BuiltConnectedWallGeometry;
  activeWallElevationTarget: WallElevationTarget | null;
}): WallSegmentFace | null {
  const faces = getWallSegmentElevationFaces(args.topology);

  if (faces.length === 0) {
    return null;
  }

  if (args.activeWallElevationTarget === null) {
    return faces.find((face) => face.side === DEFAULT_WALL_SEGMENT_PREFERRED_VIEW_FACE_SIDE) ?? faces[0];
  }

  return faces.find((face) => (
    face.wallGraphId === args.activeWallElevationTarget?.wallGraphId &&
    face.wallSegmentId === args.activeWallElevationTarget.wallSegmentId &&
    face.side === args.activeWallElevationTarget.faceSide
  )) ?? faces[0];
}


