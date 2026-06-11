export type SceneSelection =
  | Readonly<{
      kind: "placed-assembly";
      placedAssemblyId: string;
    }>
  | Readonly<{
      kind: "placed-wall";
      placedWallId: string;
    }>
  | Readonly<{
      kind: "countertop-opening";
      countertopOpeningId: string;
    }>;
