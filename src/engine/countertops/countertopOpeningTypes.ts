import type { Point2DInches } from "@/core/geometry/pointTypes";

export type CountertopOpeningShape = "rectangle" | "rounded-rectangle";

export type CountertopOpening = Readonly<{
  id: string;
  hostCountertopId: string;
  localCenterInches: Point2DInches;
  localRotationDegrees: number;
  shape: CountertopOpeningShape;
  widthInches: number;
  depthInches: number;
  cornerRadiusInches: number;
  edgeClearanceInches: number;
}>;
