export type WallFaceSide = "side-a" | "side-b";

export type PlacedWallSegment = Readonly<{
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  thicknessInches: number;
  heightInches: number;
  openings: readonly WallOpening[];
}>;

export type WallOpening = Readonly<{
  id: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
  leftInchesAlongFace: number;
  bottomInchesFromFloor: number;
  widthInches: number;
  heightInches: number;
}>;

export type WallSettings = Readonly<{
  defaultHeightInches: number;
  defaultThicknessInches: number;
}>;

export const defaultWallSettings: WallSettings = {
  defaultHeightInches: 96,
  defaultThicknessInches: 12,
};
