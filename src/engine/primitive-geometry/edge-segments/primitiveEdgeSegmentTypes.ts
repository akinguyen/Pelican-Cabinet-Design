import type { Point3DInches } from "@/core/geometry/pointTypes";

export type PrimitiveEdgeSegmentInches = Readonly<{
  startInches: Point3DInches;
  endInches: Point3DInches;
}>;

export function createPrimitiveEdgeLoopSegments(
  loopInches: readonly Point3DInches[],
): readonly PrimitiveEdgeSegmentInches[] {
  return loopInches.map((startInches, pointIndex) => ({
    startInches,
    endInches: loopInches[(pointIndex + 1) % loopInches.length],
  }));
}
