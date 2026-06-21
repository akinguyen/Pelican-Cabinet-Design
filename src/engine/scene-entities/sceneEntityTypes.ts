import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";

export type SceneEntityKind = "placed-assembly" | "design-reservation-zone";

export type SceneEntityBase<TKind extends SceneEntityKind> = Readonly<{
  id: string;
  entityKind: TKind;
  worldPositionInches: Point3DInches;
  rotationDegrees: Readonly<{ zDegrees: number }>;
}>;

export type SceneEntity = PlacedAssembly | DesignReservationZone;

export type SceneEntityRef = Readonly<{
  entityKind: SceneEntityKind;
  entityId: string;
}>;
