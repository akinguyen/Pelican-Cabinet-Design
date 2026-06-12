import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallFaceSide } from "./placedWallSegmentTypes";

export type BuiltWallSegmentEndpointVertices = Readonly<{
  sideAPointInches: Point3DInches;
  centerPointInches: Point3DInches;
  sideBPointInches: Point3DInches;
}>;

export type BuiltWallSegmentBody = Readonly<{
  id: string;
  wallGraphId: string;
  wallSegmentId: string;
  startNodeId: string;
  endNodeId: string;
  start: BuiltWallSegmentEndpointVertices;
  end: BuiltWallSegmentEndpointVertices;
  footprintPolygonInches: readonly Point3DInches[];
  heightInches: number;
  thicknessInches: number;
}>;

export type WallSegmentFace = Readonly<{
  id: string;
  wallGraphId: string;
  wallSegmentId: string;
  side: WallFaceSide;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  normalInches: Readonly<{
    xInches: number;
    yInches: number;
  }>;
  lengthInches: number;
  heightInches: number;
}>;

export type BuiltConnectedWallGeometry = Readonly<{
  wallGraphId: string;
  segmentBodies: readonly BuiltWallSegmentBody[];
  faces: readonly WallSegmentFace[];
  footprintPolygonsInches: readonly (readonly Point3DInches[])[];
}>;
