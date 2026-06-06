import type { Point3DInches } from "@/core/geometry/pointTypes";

export type WallFootprint = Readonly<{
  boundaryPointsInches: readonly Point3DInches[];
}>;

export type WallEdgeMeasurement = Readonly<{
  id: string;
  edgeIndex: number;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
}>;

export type BuiltWall = Readonly<{
  id: string;
  placedWallId: string;
  footprint: WallFootprint;
  heightInches: number;
  viewableEdgeIndices: readonly number[];
  edgeMeasurements: readonly WallEdgeMeasurement[];
}>;
