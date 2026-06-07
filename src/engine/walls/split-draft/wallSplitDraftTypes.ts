import type { Point3DInches } from "@/core/geometry/pointTypes";

export type WallSplitAnchor = Readonly<{
  placedWallId: string;
  pointInches: Point3DInches;
  edgeStartIndex: number;
  edgeEndIndex: number;
  pointKind: "vertex" | "edge-body";
  edgeStartPointInches: Point3DInches;
  edgeEndPointInches: Point3DInches;
  splitStartLengthInches: number;
  splitEndLengthInches: number;
}>;

export type WallSplitDraft =
  | Readonly<{
      phase: "waiting-for-target-wall";
    }>
  | Readonly<{
      phase: "choosing-start";
      targetPlacedWallId: string;
      hoverAnchor: WallSplitAnchor | null;
    }>
  | Readonly<{
      phase: "choosing-end";
      targetPlacedWallId: string;
      startAnchor: WallSplitAnchor;
      hoverAnchor: WallSplitAnchor | null;
    }>;
