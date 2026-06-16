import type { Point3DInches } from "@/core/geometry/pointTypes";

export type WallSegmentDrawAnchor =
  | Readonly<{
    kind: "empty-point";
    pointInches: Point3DInches;
  }>
  | Readonly<{
    kind: "existing-node";
    wallGraphId: string;
    wallNodeId: string;
    pointInches: Point3DInches;
  }>
  | Readonly<{
    kind: "segment-body";
    wallGraphId: string;
    wallSegmentId: string;
    pointInches: Point3DInches;
  }>;

export type WallSegmentDrawingGuide =
  | Readonly<{
    kind: "horizontal";
    yInches: number;
    startXInches: number;
    endXInches: number;
  }>
  | Readonly<{
    kind: "vertical";
    xInches: number;
    startYInches: number;
    endYInches: number;
  }>;

export type WallSegmentDraft = Readonly<{
  activeStartAnchor: WallSegmentDrawAnchor | null;
  hoverAnchor: WallSegmentDrawAnchor | null;
  activeGuides: readonly WallSegmentDrawingGuide[];
  heightInches: number;
  thicknessInches: number;
}>;
