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

export type CountertopCutoutDraftShapeKind = "rectangle";

export type CountertopCutoutDraft = Readonly<{
  kind: "countertop-cutout-draft";
  hostCountertopId: string;
  shapeKind: CountertopCutoutDraftShapeKind;
  startLocalInches: Point2DInches;
  currentLocalInches: Point2DInches;
}>;

export type CountertopOpeningDrag = Readonly<{
  kind: "countertop-opening-drag";
  countertopOpeningId: string;
  grabOffsetInches: Point2DInches;
}>;
