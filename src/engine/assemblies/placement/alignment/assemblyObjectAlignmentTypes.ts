import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type {
  AssemblyObjectAlignmentGuide,
  AssemblyPlacementFootprint,
} from "../assemblyPlacementTypes";
import type { PlanVector2DInches } from "../assemblyPlacementPlanGeometry";

export type AlignmentLineKind = "edge" | "center";

export type ObjectAlignmentLine = Readonly<{
  id: string;
  lineKind: AlignmentLineKind;
  pointInches: Point3DInches;
  directionInches: PlanVector2DInches;
  normalInches: PlanVector2DInches;
}>;

export type ObjectAlignmentFootprint = Readonly<{
  assemblyId: string;
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
}>;

export function combineObjectAlignmentCandidateDeltas(
  candidates: readonly Readonly<{ deltaInches: ObjectAlignmentDeltaInches }>[],
): ObjectAlignmentDeltaInches {
  return candidates.reduce<ObjectAlignmentDeltaInches>((combinedDeltaInches, candidate) => ({
    xInches: combinedDeltaInches.xInches + candidate.deltaInches.xInches,
    yInches: combinedDeltaInches.yInches + candidate.deltaInches.yInches,
    zInches: (combinedDeltaInches.zInches ?? 0) + (candidate.deltaInches.zInches ?? 0),
  }), { xInches: 0, yInches: 0, zInches: 0 });
}

export function createEmptyObjectAlignmentResult(placedAssembly: PlacedAssembly): AssemblyObjectAlignmentResult {
  return {
    placedAssembly,
    objectAlignmentGuides: [],
  };
}
