import type { WallFaceSide } from "./placedWallSegmentTypes";

export const DEFAULT_WALL_ELEVATION_FACE_SIDE: WallFaceSide = "side-b";

export type WallElevationFaceSideBySegmentKey = Readonly<Record<string, WallFaceSide>>;

export function createWallElevationSegmentKey(args: {
  wallGraphId: string;
  wallSegmentId: string;
}): string {
  return `${args.wallGraphId}:${args.wallSegmentId}`;
}

export function getWallElevationFaceSideForSegment(args: {
  faceSideBySegmentKey: WallElevationFaceSideBySegmentKey;
  wallGraphId: string;
  wallSegmentId: string;
}): WallFaceSide {
  return args.faceSideBySegmentKey[createWallElevationSegmentKey(args)] ?? DEFAULT_WALL_ELEVATION_FACE_SIDE;
}

export function rememberWallElevationFaceSide(args: {
  faceSideBySegmentKey: WallElevationFaceSideBySegmentKey;
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
}): WallElevationFaceSideBySegmentKey {
  return {
    ...args.faceSideBySegmentKey,
    [createWallElevationSegmentKey(args)]: args.faceSide,
  };
}
