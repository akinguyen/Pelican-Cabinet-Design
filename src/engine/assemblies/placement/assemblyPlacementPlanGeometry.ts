import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyPlacementEdge } from "./assemblyPlacementTypes";

const MIN_VECTOR_LENGTH_INCHES = 0.000001;

export type PlanVector2DInches = Readonly<{
  xInches: number;
  yInches: number;
}>;

export type PlanLineSegmentInches = Readonly<{
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>;

export type PlanProjectionSpanInches = Readonly<{
  minInches: number;
  maxInches: number;
}>;

export type PlanSegmentOverlapInches = Readonly<{
  minInches: number;
  maxInches: number;
}>;

export function getPlacementEdgePlanSegment(edge: AssemblyPlacementEdge): PlanLineSegmentInches {
  return {
    startPointInches: edge.startPointInches,
    endPointInches: edge.endPointInches,
  };
}

export function getPlanVectorLength(vectorInches: PlanVector2DInches): number {
  return Math.hypot(vectorInches.xInches, vectorInches.yInches);
}

export function normalizePlanVector(vectorInches: PlanVector2DInches): PlanVector2DInches | null {
  const lengthInches = getPlanVectorLength(vectorInches);

  if (lengthInches <= MIN_VECTOR_LENGTH_INCHES) {
    return null;
  }

  return {
    xInches: vectorInches.xInches / lengthInches,
    yInches: vectorInches.yInches / lengthInches,
  };
}

export function getPlanDotProduct(
  firstVectorInches: PlanVector2DInches,
  secondVectorInches: PlanVector2DInches,
): number {
  return (
    firstVectorInches.xInches * secondVectorInches.xInches +
    firstVectorInches.yInches * secondVectorInches.yInches
  );
}

export function getPlanPerpendicularVector(vectorInches: PlanVector2DInches): PlanVector2DInches {
  return {
    xInches: -vectorInches.yInches,
    yInches: vectorInches.xInches,
  };
}

export function arePlanDirectionsParallel(args: {
  firstDirectionInches: PlanVector2DInches;
  secondDirectionInches: PlanVector2DInches;
  angleToleranceDegrees: number;
}): boolean {
  const firstDirectionInches = normalizePlanVector(args.firstDirectionInches);
  const secondDirectionInches = normalizePlanVector(args.secondDirectionInches);

  if (firstDirectionInches === null || secondDirectionInches === null) {
    return false;
  }

  const absoluteDot = Math.abs(getPlanDotProduct(firstDirectionInches, secondDirectionInches));
  const minParallelDot = Math.cos((args.angleToleranceDegrees * Math.PI) / 180);

  return absoluteDot >= minParallelDot;
}

export function projectPointOntoPlanDirection(args: {
  pointInches: Point3DInches;
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): number {
  return getPlanDotProduct(
    {
      xInches: args.pointInches.xInches - args.originInches.xInches,
      yInches: args.pointInches.yInches - args.originInches.yInches,
    },
    args.directionInches,
  );
}

export function getProjectedSegmentSpan(args: {
  segment: PlanLineSegmentInches;
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): PlanProjectionSpanInches {
  const startProjectionInches = projectPointOntoPlanDirection({
    pointInches: args.segment.startPointInches,
    originInches: args.originInches,
    directionInches: args.directionInches,
  });
  const endProjectionInches = projectPointOntoPlanDirection({
    pointInches: args.segment.endPointInches,
    originInches: args.originInches,
    directionInches: args.directionInches,
  });

  return {
    minInches: Math.min(startProjectionInches, endProjectionInches),
    maxInches: Math.max(startProjectionInches, endProjectionInches),
  };
}

export function getProjectedSegmentOverlap(args: {
  firstSpanInches: PlanProjectionSpanInches;
  secondSpanInches: PlanProjectionSpanInches;
  toleranceInches?: number;
}): PlanSegmentOverlapInches | null {
  const toleranceInches = args.toleranceInches ?? 0;
  const minInches = Math.max(args.firstSpanInches.minInches, args.secondSpanInches.minInches);
  const maxInches = Math.min(args.firstSpanInches.maxInches, args.secondSpanInches.maxInches);

  if (maxInches < minInches - toleranceInches) {
    return null;
  }

  return {
    minInches: Math.min(minInches, maxInches),
    maxInches: Math.max(minInches, maxInches),
  };
}

export function getPlanPointAtProjection(args: {
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
  projectionInches: number;
  zInches?: number;
}): Point3DInches {
  return {
    xInches: args.originInches.xInches + args.directionInches.xInches * args.projectionInches,
    yInches: args.originInches.yInches + args.directionInches.yInches * args.projectionInches,
    zInches: args.zInches ?? args.originInches.zInches,
  };
}

export function getPlanSignedDistanceToLine(args: {
  pointInches: Point3DInches;
  linePointInches: Point3DInches;
  lineNormalInches: PlanVector2DInches;
}): number {
  return getPlanDotProduct(
    {
      xInches: args.pointInches.xInches - args.linePointInches.xInches,
      yInches: args.pointInches.yInches - args.linePointInches.yInches,
    },
    args.lineNormalInches,
  );
}

export function translatePlanPoint(args: {
  pointInches: Point3DInches;
  deltaInches: PlanVector2DInches;
}): Point3DInches {
  return {
    ...args.pointInches,
    xInches: args.pointInches.xInches + args.deltaInches.xInches,
    yInches: args.pointInches.yInches + args.deltaInches.yInches,
  };
}
