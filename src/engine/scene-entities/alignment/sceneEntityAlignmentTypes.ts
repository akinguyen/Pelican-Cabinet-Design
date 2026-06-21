import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";

export type SceneEntityAlignmentTargetKind = "scene-entity" | "wall-face" | "wall-centerline" | "floor-line";

export type SceneEntityAlignmentGuide = Readonly<{
  id: string;
  guidePlane: "plan" | "elevation";
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>;

export type SceneEntityAlignmentResult = Readonly<{
  sceneEntity: SceneEntity;
  alignmentGuides: readonly SceneEntityAlignmentGuide[];
}>;

export type SceneEntityGroupAlignmentResult = Readonly<{
  sceneEntities: readonly SceneEntity[];
  alignmentGuides: readonly SceneEntityAlignmentGuide[];
}>;
