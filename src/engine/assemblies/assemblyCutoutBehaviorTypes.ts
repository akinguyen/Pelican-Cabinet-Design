export type AssemblyCutoutBehavior = Readonly<{
  countertop?: AssemblyCountertopCutoutBehavior;
  wall?: AssemblyWallCutoutBehavior;
}>;

export type AssemblyCountertopCutoutBehavior = Readonly<{
  source: "cutout-body-rectangle";
  widthInches: number;
  depthInches: number;
  localOffsetInches?: AssemblyCountertopCutoutLocalOffsetInches;
}>;

export type AssemblyCountertopCutoutLocalOffsetInches = Readonly<{
  xInches: number;
  yInches: number;
}>;

export type AssemblyWallCutoutBehavior = Readonly<{
  source: "elevation-projection";
  insetInches?: number;
}>;
