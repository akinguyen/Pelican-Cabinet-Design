import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementTypes";

export type SceneEntityBoundsKind = "placed-assembly" | "design-reservation-zone";

export type SceneEntityBounds = Readonly<{
  entityId: string;
  entityKind: SceneEntityBoundsKind;
  baseCenterPointInches: Point3DInches;
  centerPointInches: Point3DInches;
  sizeInches: Size3DInches;
  rotationDegrees: Readonly<{ zDegrees: number }>;
  footprint: AssemblyPlacementFootprint;
  footprintCornersInches: readonly Point3DInches[];
  topCornersInches: readonly Point3DInches[];
  heightRangeInches: Readonly<{
    minZInches: number;
    maxZInches: number;
  }>;
}>;
