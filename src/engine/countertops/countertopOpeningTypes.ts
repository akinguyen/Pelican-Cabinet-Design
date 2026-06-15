import type { Point2DInches } from "@/core/geometry/pointTypes";

export type CountertopOpeningShape = Readonly<{
  kind: "rectangle";
  widthInches: number;
  depthInches: number;
}>;

export type CountertopOpening = Readonly<{
  id: string;
  hostCountertopId: string;
  localCenterInches: Point2DInches;
  localRotationDegrees: number;
  shape: CountertopOpeningShape;
}>;
