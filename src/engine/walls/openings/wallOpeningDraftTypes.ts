import type { WallFaceSide } from "../placedWallSegmentTypes";

export type WallOpeningDraftPointInches = Readonly<{
  xInchesAlongFace: number;
  zInchesFromFloor: number;
}>;

export type WallOpeningDraft = Readonly<{
  kind: "wall-opening-draft";
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
  startFacePointInches: WallOpeningDraftPointInches;
  currentFacePointInches: WallOpeningDraftPointInches;
}>;

export type WallOpeningDrag = Readonly<{
  kind: "wall-opening-drag";
  wallGraphId: string;
  wallSegmentId: string;
  wallOpeningId: string;
  grabOffsetInchesAlongFace: number;
  grabOffsetInchesFromFloor: number;
}>;
