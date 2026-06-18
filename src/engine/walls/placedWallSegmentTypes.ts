export type WallFaceSide = "side-a" | "side-b";

export const WALL_FACE_SIDES: readonly WallFaceSide[] = ["side-a", "side-b"];
export const DEFAULT_WALL_SEGMENT_PREFERRED_VIEW_FACE_SIDE: WallFaceSide = "side-b";

export type CabinetPlacementRequirement = "none" | "optional" | "required";

export type CabinetPlacementFacePolicies = Readonly<{
  "side-a": CabinetPlacementRequirement;
  "side-b": CabinetPlacementRequirement;
}>;

export const DEFAULT_WALL_SEGMENT_CABINET_PLACEMENT_FACE_POLICIES: CabinetPlacementFacePolicies = {
  "side-a": "none",
  "side-b": "required",
};

export function getDefaultWallSegmentCabinetPlacementFacePolicies(): CabinetPlacementFacePolicies {
  return { ...DEFAULT_WALL_SEGMENT_CABINET_PLACEMENT_FACE_POLICIES };
}

export type PlacedWallSegment = Readonly<{
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  thicknessInches: number;
  heightInches: number;
  preferredViewFaceSide: WallFaceSide;
  cabinetPlacementFacePolicies: CabinetPlacementFacePolicies;
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
