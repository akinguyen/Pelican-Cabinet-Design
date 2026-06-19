import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallSegment } from "./placedWallSegmentTypes";

export type PlacedWallNode = Readonly<{
  id: string;
  positionInches: Point3DInches;
}>;

export type PlacedWallGraph = Readonly<{
  id: string;
  name: string;
  nodes: readonly PlacedWallNode[];
  segments: readonly PlacedWallSegment[];
}>;

export type WallSegmentReference = Readonly<{
  wallGraphId: string;
  wallSegmentId: string;
}>;
