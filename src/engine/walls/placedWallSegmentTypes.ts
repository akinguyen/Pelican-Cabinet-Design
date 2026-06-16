export type WallFaceSide = "side-a" | "side-b";

export const WALL_FACE_SIDES: readonly WallFaceSide[] = ["side-a", "side-b"];
export const DEFAULT_WALL_SEGMENT_PREFERRED_VIEW_FACE_SIDE: WallFaceSide = "side-b";
export const DEFAULT_WALL_SEGMENT_CABINET_PLACEMENT_FACE_SIDES: readonly WallFaceSide[] = [
  DEFAULT_WALL_SEGMENT_PREFERRED_VIEW_FACE_SIDE,
];

export function getDefaultWallSegmentCabinetPlacementFaceSides(): readonly WallFaceSide[] {
  return [...DEFAULT_WALL_SEGMENT_CABINET_PLACEMENT_FACE_SIDES];
}

export type PlacedWallSegment = Readonly<{
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  thicknessInches: number;
  heightInches: number;
  preferredViewFaceSide: WallFaceSide;
  cabinetPlacementFaceSides: readonly WallFaceSide[];
}>;

export type DerivedWallOpening = Readonly<{
  id: string;
  sourceAssemblyId: string;
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
