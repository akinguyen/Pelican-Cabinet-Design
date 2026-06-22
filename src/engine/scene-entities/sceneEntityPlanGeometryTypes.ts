import type { Point3DInches } from "@/core/geometry/pointTypes";

export type SceneEntityPlanFootprintEdge = Readonly<{
  index: number;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  midpointInches: Point3DInches;
  lengthInches: number;
}>;

export type SceneEntityPlanFootprint = Readonly<{
  centerPointInches: Point3DInches;
  cornerPointsInches: readonly Point3DInches[];
  edges: readonly SceneEntityPlanFootprintEdge[];
}>;

export type SceneEntityMovementSource = "perspective" | "floor-plan" | "elevation";

export type SceneEntityElevationViewZoneFrame = Readonly<{
  originInches: Point3DInches;
  leftInches: number;
  rightInches: number;
  nearDepthInches: number;
  farDepthInches: number;
  bottomInches: number;
  topInches: number;
}>;

export type SceneEntityElevationWallFaceFrame = Readonly<{
  faceStartInches: Point3DInches;
  faceEndInches: Point3DInches;
  faceCenterInches: Point3DInches;
  wallHeightInches: number;
}>;

export type SceneEntityElevationFrame = Readonly<{
  faceDirectionInches: Point3DInches;
  outwardDirectionInches: Point3DInches;
  planeOriginInches: Point3DInches;
  wallFaceInches: SceneEntityElevationWallFaceFrame;
  viewZoneInches?: SceneEntityElevationViewZoneFrame;
}>;
