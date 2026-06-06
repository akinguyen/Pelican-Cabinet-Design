import type { WallFootprint } from "./footprint/wallFootprintTypes";

export type PlacedWall = Readonly<{
  id: string;
  footprint: WallFootprint;
  heightInches: number;
  viewableEdgeIndices: readonly number[];
}>;

export type WallSettings = Readonly<{
  defaultHeightInches: number;
}>;

export const defaultWallSettings: WallSettings = {
  defaultHeightInches: 96,
};
