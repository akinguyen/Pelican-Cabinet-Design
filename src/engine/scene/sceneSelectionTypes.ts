export type SceneSelection =
  | Readonly<{
      kind: "placed-assembly";
      placedAssemblyId: string;
    }>
  | Readonly<{
      kind: "placed-wall-segment";
      wallGraphId: string;
      wallSegmentId: string;
    }>
  | Readonly<{
      kind: "countertop-opening";
      countertopOpeningId: string;
    }>;
