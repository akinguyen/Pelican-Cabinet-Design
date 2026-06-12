import type { Point3DInches } from "@/core/geometry/pointTypes";

export type PlacedWallNode = Readonly<{
  id: string;
  positionInches: Point3DInches;
}>;
