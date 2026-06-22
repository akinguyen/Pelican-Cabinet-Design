import type { SpatialAlignmentCandidate, SpatialGuideAnchor, SpatialGuideAxis, SpatialGuideSubject } from "../spatialGuideTypes";
import type { SpatialGuideFrame } from "../spatialGuideFrame";
import type { SceneEntityAlignmentTargetKind } from "@/engine/scene-entities/alignment/sceneEntityAlignmentTypes";
import {
  SCENE_ENTITY_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
  SCENE_ENTITY_PLAN_ALIGNMENT_SNAP_DISTANCE_INCHES,
} from "@/engine/scene-entities/alignment/sceneEntityAlignmentConstants";

export type SpatialAlignmentSolveResult = Readonly<{
  deltaUInches: number;
  deltaVInches: number;
  uCandidate: SpatialAlignmentCandidate | null;
  vCandidate: SpatialAlignmentCandidate | null;
}>;

export function solveSpatialAlignment(args: {
  movingSubject: SpatialGuideSubject;
  targetSubjects: readonly SpatialGuideSubject[];
  frame: SpatialGuideFrame;
}): SpatialAlignmentSolveResult {
  const uCandidate = selectSpatialAlignmentCandidate({
    axis: "u",
    movingAnchors: args.movingSubject.uAnchors,
    targetSubjects: args.targetSubjects,
    frame: args.frame,
  });
  const vCandidate = selectSpatialAlignmentCandidate({
    axis: "v",
    movingAnchors: args.movingSubject.vAnchors,
    targetSubjects: args.targetSubjects,
    frame: args.frame,
  });

  return {
    deltaUInches: uCandidate?.deltaInches ?? 0,
    deltaVInches: vCandidate?.deltaInches ?? 0,
    uCandidate,
    vCandidate,
  };
}

function selectSpatialAlignmentCandidate(args: {
  axis: SpatialGuideAxis;
  movingAnchors: readonly SpatialGuideAnchor[];
  targetSubjects: readonly SpatialGuideSubject[];
  frame: SpatialGuideFrame;
}): SpatialAlignmentCandidate | null {
  const snapDistanceInches = args.frame.kind === "wall-face-plane"
    ? SCENE_ENTITY_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES
    : SCENE_ENTITY_PLAN_ALIGNMENT_SNAP_DISTANCE_INCHES;
  const candidates = args.movingAnchors.flatMap((movingAnchor) => args.targetSubjects.flatMap((targetSubject) => {
    const targetAnchors = args.axis === "u" ? targetSubject.uAnchors : targetSubject.vAnchors;
    return targetAnchors.map((targetAnchor): SpatialAlignmentCandidate => {
      const deltaInches = targetAnchor.valueInches - movingAnchor.valueInches;
      return {
        axis: args.axis,
        movingAnchor,
        targetAnchor,
        targetSubject,
        deltaInches,
        distanceInches: Math.abs(deltaInches),
      };
    });
  })).filter((candidate) => candidate.distanceInches <= snapDistanceInches);

  return candidates.sort(compareSpatialAlignmentCandidates)[0] ?? null;
}

function compareSpatialAlignmentCandidates(
  first: SpatialAlignmentCandidate,
  second: SpatialAlignmentCandidate,
): number {
  const distanceDeltaInches = first.distanceInches - second.distanceInches;

  if (Math.abs(distanceDeltaInches) > 0.001) {
    return distanceDeltaInches;
  }

  return getAlignmentTargetPriority(first.targetSubject.targetKind) -
    getAlignmentTargetPriority(second.targetSubject.targetKind);
}

function getAlignmentTargetPriority(targetKind: SceneEntityAlignmentTargetKind): number {
  switch (targetKind) {
    case "scene-entity":
      return 0;
    case "wall-face":
      return 1;
    case "wall-centerline":
      return 2;
    case "floor-line":
      return 3;
  }
}
