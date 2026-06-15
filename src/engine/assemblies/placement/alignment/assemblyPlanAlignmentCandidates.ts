import {
  arePlanDirectionsParallel,
  getPlanDotProduct,
  getPlanSignedDistanceToLine,
  getPlanVectorLength,
  normalizePlanVector,
  translatePlanPoint,
  type PlanVector2DInches,
} from "../assemblyPlacementPlanGeometry";
import {
  OBJECT_ALIGNMENT_MAX_GUIDES,
  OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
  OBJECT_ALIGNMENT_REMAINING_DISTANCE_TOLERANCE_INCHES,
  OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
} from "./assemblyObjectAlignmentConstants";
import type {
  AssemblyObjectAlignmentConstraint,
  ObjectAlignmentCandidate,
  ObjectAlignmentDeltaInches,
  ObjectAlignmentFootprint,
  ObjectAlignmentLine,
} from "./assemblyObjectAlignmentTypes";
import type { AssemblyPlacementSnapTarget } from "../assemblyPlacementTypes";

export function findObjectAlignmentCandidates(args: {
  movingAlignmentFootprint: ObjectAlignmentFootprint;
  targetAlignmentFootprints: readonly ObjectAlignmentFootprint[];
  constraint?: AssemblyObjectAlignmentConstraint;
}): readonly ObjectAlignmentCandidate[] {
  return args.targetAlignmentFootprints.flatMap((targetAlignmentFootprint) => (
    args.movingAlignmentFootprint.lines.flatMap((movingLine) => (
      targetAlignmentFootprint.lines
        .map((targetLine) => createObjectAlignmentCandidate({
          movingLine,
          targetLine,
          targetAlignmentFootprint,
          constraint: args.constraint,
        }))
        .filter(isObjectAlignmentCandidate)
    ))
  )).sort(compareObjectAlignmentCandidates);
}

export function selectCompatibleAlignmentCandidates(
  candidates: readonly ObjectAlignmentCandidate[],
): readonly ObjectAlignmentCandidate[] {
  const firstCandidate = candidates[0];

  if (firstCandidate === undefined) {
    return [];
  }

  const secondAxisCandidate = candidates.find((candidate) => (
    candidate !== firstCandidate &&
    !arePlanDirectionsParallel({
      firstDirectionInches: firstCandidate.targetLine.normalInches,
      secondDirectionInches: candidate.targetLine.normalInches,
      angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
    }) &&
    getPlanVectorLength(candidate.deltaInches) <= OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES
  ));

  return secondAxisCandidate === undefined
    ? [firstCandidate]
    : [firstCandidate, secondAxisCandidate].slice(0, OBJECT_ALIGNMENT_MAX_GUIDES);
}

export function combineAlignmentCandidateDeltas(
  candidates: readonly ObjectAlignmentCandidate[],
): ObjectAlignmentDeltaInches {
  return candidates.reduce<ObjectAlignmentDeltaInches>((combinedDeltaInches, candidate) => ({
    xInches: combinedDeltaInches.xInches + candidate.deltaInches.xInches,
    yInches: combinedDeltaInches.yInches + candidate.deltaInches.yInches,
    zInches: (combinedDeltaInches.zInches ?? 0) + (candidate.deltaInches.zInches ?? 0),
  }), { xInches: 0, yInches: 0, zInches: 0 });
}

export function createAlignmentSnapTarget(
  selectedCandidates: readonly ObjectAlignmentCandidate[],
): AssemblyPlacementSnapTarget | null {
  const firstCandidate = selectedCandidates[0];

  if (firstCandidate === undefined) {
    return null;
  }

  return {
    kind: "object-alignment",
    alignmentKind: selectedCandidates.length > 1
      ? "corner"
      : firstCandidate.movingLine.lineKind === "center" || firstCandidate.targetLine.lineKind === "center"
        ? "center-line"
        : "edge-line",
    targetAssemblyId: firstCandidate.targetAssemblyId,
    distanceInches: firstCandidate.distanceInches,
  };
}

function createObjectAlignmentCandidate(args: {
  movingLine: ObjectAlignmentLine;
  targetLine: ObjectAlignmentLine;
  targetAlignmentFootprint: ObjectAlignmentFootprint;
  constraint?: AssemblyObjectAlignmentConstraint;
}): ObjectAlignmentCandidate | null {
  if (!arePlanDirectionsParallel({
    firstDirectionInches: args.movingLine.directionInches,
    secondDirectionInches: args.targetLine.directionInches,
    angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
  })) {
    return null;
  }

  const signedDistanceInches = getPlanSignedDistanceToLine({
    pointInches: args.movingLine.pointInches,
    linePointInches: args.targetLine.pointInches,
    lineNormalInches: args.targetLine.normalInches,
  });
  const requestedDeltaInches = {
    xInches: -args.targetLine.normalInches.xInches * signedDistanceInches,
    yInches: -args.targetLine.normalInches.yInches * signedDistanceInches,
  };
  const constrainedDeltaInches = applyAlignmentConstraint({
    deltaInches: requestedDeltaInches,
    constraint: args.constraint,
  });
  const remainingDistanceInches = Math.abs(getPlanSignedDistanceToLine({
    pointInches: translatePlanPoint({
      pointInches: args.movingLine.pointInches,
      deltaInches: constrainedDeltaInches,
    }),
    linePointInches: args.targetLine.pointInches,
    lineNormalInches: args.targetLine.normalInches,
  }));

  if (remainingDistanceInches > OBJECT_ALIGNMENT_REMAINING_DISTANCE_TOLERANCE_INCHES) {
    return null;
  }

  const distanceInches = getPlanVectorLength(constrainedDeltaInches);

  if (distanceInches > args.targetAlignmentFootprint.snapDistanceInches) {
    return null;
  }

  return {
    targetAssemblyId: args.targetAlignmentFootprint.assemblyId,
    movingLine: args.movingLine,
    targetLine: args.targetLine,
    deltaInches: constrainedDeltaInches,
    distanceInches,
    remainingDistanceInches,
    priority: getAlignmentPriority(args.movingLine, args.targetLine),
    targetPriority: args.targetAlignmentFootprint.targetPriority,
  };
}

function applyAlignmentConstraint(args: {
  deltaInches: ObjectAlignmentDeltaInches;
  constraint?: AssemblyObjectAlignmentConstraint;
}): PlanVector2DInches {
  const lockedNormalInches = args.constraint?.lockedNormalInches === undefined
    ? null
    : normalizePlanVector(args.constraint.lockedNormalInches);

  if (lockedNormalInches === null) {
    return args.deltaInches;
  }

  const lockedNormalComponentInches = getPlanDotProduct(args.deltaInches, lockedNormalInches);

  return {
    xInches: args.deltaInches.xInches - lockedNormalInches.xInches * lockedNormalComponentInches,
    yInches: args.deltaInches.yInches - lockedNormalInches.yInches * lockedNormalComponentInches,
  };
}

function getAlignmentPriority(
  movingLine: ObjectAlignmentLine,
  targetLine: ObjectAlignmentLine,
): number {
  if (movingLine.lineKind === "center" && targetLine.lineKind === "center") {
    return 0;
  }

  if (movingLine.lineKind === "edge" && targetLine.lineKind === "edge") {
    return 1;
  }

  return 2;
}

function compareObjectAlignmentCandidates(
  firstCandidate: ObjectAlignmentCandidate,
  secondCandidate: ObjectAlignmentCandidate,
): number {
  if (firstCandidate.targetPriority !== secondCandidate.targetPriority) {
    return firstCandidate.targetPriority - secondCandidate.targetPriority;
  }

  const firstScore = getObjectAlignmentCandidateScore(firstCandidate);
  const secondScore = getObjectAlignmentCandidateScore(secondCandidate);

  if (firstScore !== secondScore) {
    return firstScore - secondScore;
  }

  return firstCandidate.priority - secondCandidate.priority;
}

function getObjectAlignmentCandidateScore(candidate: ObjectAlignmentCandidate): number {
  return candidate.distanceInches + candidate.priority * 0.25;
}

function isObjectAlignmentCandidate(candidate: ObjectAlignmentCandidate | null): candidate is ObjectAlignmentCandidate {
  return candidate !== null;
}
