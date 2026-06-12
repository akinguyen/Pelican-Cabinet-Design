import type { PlacedWallNode } from "./placedWallNodeTypes";
import type { PlacedWallSegment } from "./placedWallSegmentTypes";

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

export type WallNodeReference = Readonly<{
  wallGraphId: string;
  wallNodeId: string;
}>;
