import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallAngleGuide, WallParallelGuide, WallReferenceGuides } from "../draft-guides/wallDraftGuideTypes";

export type WallFootprintDraftPointSource =
  | Readonly<{
      kind: "free-point";
    }>
  | ExistingWallBoundaryAnchor;

export type ExistingWallBoundaryAnchor =
  | Readonly<{
      kind: "placed-wall-point";
      placedWallId: string;
      pointIndex: number;
      pointInches: Point3DInches;
    }>
  | Readonly<{
      kind: "placed-wall-edge";
      placedWallId: string;
      edgeStartIndex: number;
      edgeEndIndex: number;
      pointInches: Point3DInches;
      edgeStartPointInches: Point3DInches;
      edgeEndPointInches: Point3DInches;
      splitStartLengthInches: number;
      splitEndLengthInches: number;
    }>;

export type WallFootprintDraftPoint = Readonly<{
  id: string;
  pointInches: Point3DInches;
  source: WallFootprintDraftPointSource;
}>;

export type WallFootprintDraftEdge = Readonly<{
  id: string;
  startPointId: string;
  endPointId: string;
}>;

export type WallFootprintSnapTarget =
  | Readonly<{
      kind: "free-point";
      pointInches: Point3DInches;
    }>
  | Readonly<{
      kind: "draft-point";
      pointId: string;
      pointInches: Point3DInches;
      canCloseLoop: boolean;
    }>
  | ExistingWallBoundaryAnchor;

export type WallFootprintDraft = Readonly<{
  points: readonly WallFootprintDraftPoint[];
  edges: readonly WallFootprintDraftEdge[];
  activePointId: string | null;
  hoverPointInches: Point3DInches | null;
  snapTarget: WallFootprintSnapTarget | null;
  referenceGuides: WallReferenceGuides;
  angleGuide: WallAngleGuide | null;
  parallelGuide: WallParallelGuide | null;
  heightInches: number;
}>;
