import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type {
  AssemblyObjectAlignmentGuide,
  AssemblyPlacementFootprint,
  AssemblyPlacementSnapTarget,
} from "../assemblyPlacementTypes";
import type { PlanLineSegmentInches, PlanVector2DInches } from "../assemblyPlacementPlanGeometry";

export type AlignmentLineKind = "edge" | "center";

export type ObjectAlignmentLine = Readonly<{
  id: string;
  lineKind: AlignmentLineKind;
  axisIndex: number;
  pointInches: Point3DInches;
  directionInches: PlanVector2DInches;
  normalInches: PlanVector2DInches;
  segmentInches: PlanLineSegmentInches;
}>;

export type ObjectAlignmentTargetKind =
  | "assembly"
  | "countertop-opening"
  | "wall-opening"
  | "wall-face"
  | "wall-centerline"
  | "design-reservation-zone";

export type ObjectAlignmentFootprint = Readonly<{
  assemblyId: string;
  targetKind: ObjectAlignmentTargetKind;
  targetPriority: number;
  snapDistanceInches: number;
  footprint: AssemblyPlacementFootprint;
  lines: readonly ObjectAlignmentLine[];
}>;

export type ObjectAlignmentDeltaInches = Readonly<{
  xInches: number;
  yInches: number;
  zInches?: number;
}>;

export type ObjectAlignmentCandidate = Readonly<{
  targetAssemblyId: string;
  movingLine: ObjectAlignmentLine;
  targetLine: ObjectAlignmentLine;
  deltaInches: ObjectAlignmentDeltaInches;
  distanceInches: number;
  remainingDistanceInches: number;
  priority: number;
  targetPriority: number;
}>;

export type AssemblyObjectAlignmentConstraint = Readonly<{
  lockedNormalInches?: PlanVector2DInches;
}>;

export type ElevationAlignmentAxis = "u" | "z";

export type ElevationAlignmentAnchorRole = "min-edge" | "center-line" | "max-edge";

export type ProjectedElevationBounds = Readonly<{
  leftInches: number;
  rightInches: number;
  bottomInches: number;
  topInches: number;
  nearDepthInches: number;
  farDepthInches: number;
}>;

export type ElevationAlignmentBox = Readonly<{
  assemblyId: string;
  targetPriority: number;
  snapDistanceInches: number;
  leftInches: number;
  centerInches: number;
  rightInches: number;
  bottomInches: number;
  middleInches: number;
  topInches: number;
  depthInches: number;
  viewZoneBoundsInches?: ProjectedElevationBounds;
}>;

export type ElevationAlignmentAnchor = Readonly<{
  axis: ElevationAlignmentAxis;
  anchorRole: ElevationAlignmentAnchorRole;
  valueInches: number;
}>;

export type ElevationAlignmentCandidate = Readonly<{
  targetAssemblyId: string;
  axis: ElevationAlignmentAxis;
  movingAnchor: ElevationAlignmentAnchor;
  targetAnchor: ElevationAlignmentAnchor;
  deltaInches: ObjectAlignmentDeltaInches;
  distanceInches: number;
  priority: number;
  targetPriority: number;
}>;

export type AssemblyObjectAlignmentResult = Readonly<{
  placedAssembly: PlacedAssembly;
  objectAlignmentGuides: readonly AssemblyObjectAlignmentGuide[];
  snapTarget: AssemblyPlacementSnapTarget | null;
}>;
