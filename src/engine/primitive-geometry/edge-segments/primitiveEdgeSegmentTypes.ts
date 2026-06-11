import type { Point3DInches } from "@/core/geometry/pointTypes";

export type PrimitiveEdgeSegmentInches = Readonly<{
  startInches: Point3DInches;
  endInches: Point3DInches;
}>;
