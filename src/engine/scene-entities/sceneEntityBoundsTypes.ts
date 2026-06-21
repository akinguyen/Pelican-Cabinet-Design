import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityPlanFootprint } from "./sceneEntityPlanGeometryTypes";
import type { SceneEntityKind } from "./sceneEntityTypes";

export type SceneEntityBoundsKind = SceneEntityKind;

export type SceneEntityBounds = Readonly<{
  entityId: string;
  entityKind: SceneEntityBoundsKind;
  centerPointInches: Point3DInches;
  sizeInches: Size3DInches;
  rotationDegrees: Readonly<{ zDegrees: number }>;
  footprint: SceneEntityPlanFootprint;
  footprintCornersInches: readonly Point3DInches[];
  topCornersInches: readonly Point3DInches[];
  heightRangeInches: Readonly<{ minZInches: number; maxZInches: number }>;
}>;
