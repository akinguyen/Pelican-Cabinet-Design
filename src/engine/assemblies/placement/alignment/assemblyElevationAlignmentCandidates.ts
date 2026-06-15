import type { AssemblyPlacementElevationFrame, AssemblyPlacementSnapTarget } from "../assemblyPlacementTypes";
import {
  ELEVATION_FLOOR_ALIGNMENT_TARGET_ID,
  OBJECT_ALIGNMENT_MAX_GUIDES,
} from "./assemblyObjectAlignmentConstants";
import type {
  AlignmentLineKind,
  ElevationAlignmentAnchor,
  ElevationAlignmentBox,
  ElevationAlignmentCandidate,
  ObjectAlignmentDeltaInches,
} from "./assemblyObjectAlignmentTypes";

export function findElevationAlignmentCandidates(args: {
  movingBox: ElevationAlignmentBox;
  targetBoxes: readonly ElevationAlignmentBox[];
  elevationFrame: AssemblyPlacementElevationFrame;
}): readonly ElevationAlignmentCandidate[] {
  return args.targetBoxes.flatMap((targetBox) => (
    getElevationAlignmentAnchors(args.movingBox).flatMap((movingAnchor) => (
      getElevationAlignmentAnchors(targetBox)
        .map((targetAnchor) => createElevationAlignmentCandidate({
          movingAnchor,
          targetAnchor,
          targetBox,
          elevationFrame: args.elevationFrame,
        }))
        .filter(isElevationAlignmentCandidate)
    ))
  )).sort(compareElevationAlignmentCandidates);
}

export function selectCompatibleElevationAlignmentCandidates(
  candidates: readonly ElevationAlignmentCandidate[],
): readonly ElevationAlignmentCandidate[] {
  const bestHorizontalCandidate = candidates.find((candidate) => candidate.axis === "u");
  const bestVerticalCandidate = candidates.find((candidate) => candidate.axis === "z");

  return [bestHorizontalCandidate, bestVerticalCandidate]
    .filter(isElevationAlignmentCandidate)
    .sort(compareElevationAlignmentCandidates)
    .slice(0, OBJECT_ALIGNMENT_MAX_GUIDES);
}

export function combineElevationAlignmentCandidateDeltas(
  candidates: readonly ElevationAlignmentCandidate[],
): ObjectAlignmentDeltaInches {
  return candidates.reduce<ObjectAlignmentDeltaInches>((combinedDeltaInches, candidate) => ({
    xInches: combinedDeltaInches.xInches + candidate.deltaInches.xInches,
    yInches: combinedDeltaInches.yInches + candidate.deltaInches.yInches,
    zInches: (combinedDeltaInches.zInches ?? 0) + (candidate.deltaInches.zInches ?? 0),
  }), { xInches: 0, yInches: 0, zInches: 0 });
}

export function createElevationAlignmentSnapTarget(
  selectedCandidates: readonly ElevationAlignmentCandidate[],
): AssemblyPlacementSnapTarget | null {
  const firstCandidate = selectedCandidates[0];

  if (firstCandidate === undefined) {
    return null;
  }

  return {
    kind: "object-alignment",
    alignmentKind: selectedCandidates.length > 1 ? "corner" : getElevationGuideKind(firstCandidate),
    targetAssemblyId: firstCandidate.targetAssemblyId,
    distanceInches: firstCandidate.distanceInches,
  };
}

export function getElevationGuideKind(candidate: ElevationAlignmentCandidate): "center-line" | "edge-line" {
  return getElevationAlignmentLineKind(candidate.movingAnchor) === "center" ||
    getElevationAlignmentLineKind(candidate.targetAnchor) === "center"
    ? "center-line"
    : "edge-line";
}

function getElevationAlignmentAnchors(box: ElevationAlignmentBox): readonly ElevationAlignmentAnchor[] {
  return [
    { axis: "u", anchorRole: "min-edge", valueInches: box.leftInches },
    { axis: "u", anchorRole: "center-line", valueInches: box.centerInches },
    { axis: "u", anchorRole: "max-edge", valueInches: box.rightInches },
    { axis: "z", anchorRole: "min-edge", valueInches: box.bottomInches },
    { axis: "z", anchorRole: "center-line", valueInches: box.middleInches },
    { axis: "z", anchorRole: "max-edge", valueInches: box.topInches },
  ];
}

function createElevationAlignmentCandidate(args: {
  movingAnchor: ElevationAlignmentAnchor;
  targetAnchor: ElevationAlignmentAnchor;
  targetBox: ElevationAlignmentBox;
  elevationFrame: AssemblyPlacementElevationFrame;
}): ElevationAlignmentCandidate | null {
  if (args.movingAnchor.axis !== args.targetAnchor.axis) {
    return null;
  }

  if (
    args.targetBox.assemblyId === ELEVATION_FLOOR_ALIGNMENT_TARGET_ID &&
    (
      args.movingAnchor.axis !== "z" ||
      args.movingAnchor.anchorRole !== "min-edge" ||
      args.targetAnchor.anchorRole !== "min-edge"
    )
  ) {
    return null;
  }

  const deltaValueInches = args.targetAnchor.valueInches - args.movingAnchor.valueInches;
  const distanceInches = Math.abs(deltaValueInches);

  if (distanceInches > args.targetBox.snapDistanceInches) {
    return null;
  }

  const deltaInches = args.movingAnchor.axis === "u"
    ? {
        xInches: args.elevationFrame.faceDirectionInches.xInches * deltaValueInches,
        yInches: args.elevationFrame.faceDirectionInches.yInches * deltaValueInches,
        zInches: 0,
      }
    : {
        xInches: 0,
        yInches: 0,
        zInches: deltaValueInches,
      };

  return {
    targetAssemblyId: args.targetBox.assemblyId,
    axis: args.movingAnchor.axis,
    movingAnchor: args.movingAnchor,
    targetAnchor: args.targetAnchor,
    deltaInches,
    distanceInches,
    priority: getElevationAlignmentPriority(args.movingAnchor, args.targetAnchor),
    targetPriority: args.targetBox.targetPriority,
  };
}

function getElevationAlignmentPriority(
  movingAnchor: ElevationAlignmentAnchor,
  targetAnchor: ElevationAlignmentAnchor,
): number {
  const movingLineKind = getElevationAlignmentLineKind(movingAnchor);
  const targetLineKind = getElevationAlignmentLineKind(targetAnchor);

  if (movingLineKind === "center" && targetLineKind === "center") {
    return 0;
  }

  if (movingLineKind === "edge" && targetLineKind === "edge") {
    return 1;
  }

  return 2;
}

function getElevationAlignmentLineKind(anchor: ElevationAlignmentAnchor): AlignmentLineKind {
  return anchor.anchorRole === "center-line" ? "center" : "edge";
}

function compareElevationAlignmentCandidates(
  firstCandidate: ElevationAlignmentCandidate,
  secondCandidate: ElevationAlignmentCandidate,
): number {
  const firstScore = getElevationAlignmentCandidateScore(firstCandidate);
  const secondScore = getElevationAlignmentCandidateScore(secondCandidate);

  if (firstScore !== secondScore) {
    return firstScore - secondScore;
  }

  if (firstCandidate.priority !== secondCandidate.priority) {
    return firstCandidate.priority - secondCandidate.priority;
  }

  return firstCandidate.targetPriority - secondCandidate.targetPriority;
}

function getElevationAlignmentCandidateScore(candidate: ElevationAlignmentCandidate): number {
  return candidate.distanceInches + candidate.priority * 0.25 + candidate.targetPriority * 0.5;
}

function isElevationAlignmentCandidate(
  candidate: ElevationAlignmentCandidate | null | undefined,
): candidate is ElevationAlignmentCandidate {
  return candidate !== null && candidate !== undefined;
}
