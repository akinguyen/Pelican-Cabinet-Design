import type { BuiltConnectedWallGeometry, BuiltWallSegmentBody, WallSegmentFace } from "./connectedWallGeometryTypes";

export type BuiltWallSegmentTopology = BuiltConnectedWallGeometry;
export type { BuiltWallSegmentBody, WallSegmentFace };

export type WallSegmentJoint = Readonly<{
  id: string;
  connectedWallSegmentIds: readonly string[];
  footprintPolygonInches: readonly never[];
  heightInches: number;
}>;

export type WallSegmentCap = Readonly<{
  id: string;
  wallSegmentId: string;
  endpoint: "start" | "end";
  footprintEdgeInches: readonly never[];
  heightInches: number;
}>;
