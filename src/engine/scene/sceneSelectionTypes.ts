export type SceneSelection =
  | Readonly<{
      kind: "placed-assembly";
      placedAssemblyId: string;
    }>
  | Readonly<{
      kind: "placed-assemblies";
      placedAssemblyIds: readonly string[];
    }>
  | Readonly<{
      kind: "placed-wall-segment";
      wallGraphId: string;
      wallSegmentId: string;
    }>
  | Readonly<{
      kind: "design-reservation-zone";
      designReservationZoneId: string;
    }>;
