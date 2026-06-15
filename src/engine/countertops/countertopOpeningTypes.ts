import type { Point2DInches } from "@/core/geometry/pointTypes";

export type DerivedCountertopOpeningShape = Readonly<{
  kind: "rectangle";
  widthInches: number;
  depthInches: number;
}>;

export type DerivedCountertopOpening = Readonly<{
  id: string;
  hostCountertopId: string;
  localCenterInches: Point2DInches;
  localRotationDegrees: number;
  shape: DerivedCountertopOpeningShape;
}>;
