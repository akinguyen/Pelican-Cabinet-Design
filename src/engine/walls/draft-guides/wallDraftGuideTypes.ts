import type { Point3DInches } from "@/core/geometry/pointTypes";

export type WallReferenceGuides = Readonly<{
  horizontalGuide: number | null;
  verticalGuide: number | null;
}>;

export type WallAngleGuide = Readonly<{
  centerPointInches: Point3DInches;
  angleDegrees: number;
  referenceDirectionDegrees: number;
  directionDegrees: number;
}>;
