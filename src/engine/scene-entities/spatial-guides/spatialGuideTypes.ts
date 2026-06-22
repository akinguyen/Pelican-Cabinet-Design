import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneEntityAlignmentGuide, SceneEntityAlignmentTargetKind } from "@/engine/scene-entities/alignment/sceneEntityAlignmentTypes";

export type SpatialGuideFrameKind = "floor-plane" | "wall-face-plane";
export type SpatialGuideAxis = "u" | "v";
export type SpatialGuideAnchorRole = "min" | "center" | "max";

export type SpatialGuideBounds = Readonly<{
  minUInches: number;
  centerUInches: number;
  maxUInches: number;
  minVInches: number;
  centerVInches: number;
  maxVInches: number;
  minNInches: number;
  maxNInches: number;
}>;

export type SpatialGuideAnchor = Readonly<{
  id: string;
  axis: SpatialGuideAxis;
  role: SpatialGuideAnchorRole;
  valueInches: number;
}>;

export type SpatialGuideSubject = Readonly<{
  id: string;
  targetKind: SceneEntityAlignmentTargetKind;
  bounds: SpatialGuideBounds;
  guideBounds: SpatialGuideBounds;
  uAnchors: readonly SpatialGuideAnchor[];
  vAnchors: readonly SpatialGuideAnchor[];
}>;

export type SpatialAlignmentCandidate = Readonly<{
  axis: SpatialGuideAxis;
  movingAnchor: SpatialGuideAnchor;
  targetAnchor: SpatialGuideAnchor;
  targetSubject: SpatialGuideSubject;
  deltaInches: number;
  distanceInches: number;
}>;

export type SceneEntityWallMeasurementGuide = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
  labelPointInches: Point3DInches;
  labelRotationDegrees: number;
  renderOffsetMode?: "world-z" | "pre-offset";
}>;

export type SceneEntitySpatialGuideResult = Readonly<{
  sceneEntity: SceneEntity;
  alignmentGuides: readonly SceneEntityAlignmentGuide[];
}>;

export type SceneEntityGroupSpatialGuideResult = Readonly<{
  sceneEntities: readonly SceneEntity[];
  alignmentGuides: readonly SceneEntityAlignmentGuide[];
}>;
