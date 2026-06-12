import type { WallFaceSide } from "./placedWallSegmentTypes";

export type WallElevationTarget = Readonly<{
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
}>;
