import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { WallParallelGuide } from "../draft-guides/wallDraftGuideTypes";
import { getDirectionDegrees, normalizeAngleDegrees } from "../draft-guides/wallDraftGuides";
import type { WallFootprintDraft } from "./wallFootprintDraftTypes";
import { getActiveWallFootprintDraftPoint } from "./wallFootprintDraftSelectors";

const WALL_FOOTPRINT_DRAFT_PARALLEL_SNAP_THRESHOLD_INCHES = 5;
const WALL_FOOTPRINT_DRAFT_PARALLEL_SNAP_THRESHOLD_DEGREES = 6;
const MIN_PARALLEL_REFERENCE_EDGE_LENGTH_INCHES = 0.5;
const MIN_PARALLEL_PREVIEW_EDGE_LENGTH_INCHES = 0.5;

export function snapToParallelDraftEdge(args: {
  pointInches: Point3DInches;
  draft: WallFootprintDraft;
}): Readonly<{
  pointInches: Point3DInches;
  parallelGuide: WallParallelGuide;
}> | null {
  const activePoint = getActiveWallFootprintDraftPoint(args.draft);

  if (activePoint === null) {
    return null;
  }

  const previewLengthInches = getPoint3DDistanceInches(activePoint.pointInches, args.pointInches);

  if (previewLengthInches < MIN_PARALLEL_PREVIEW_EDGE_LENGTH_INCHES) {
    return null;
  }

  const previewDirectionDegrees = getDirectionDegrees(activePoint.pointInches, args.pointInches);

  if (previewDirectionDegrees === null) {
    return null;
  }

  let bestSnap: Readonly<{
    pointInches: Point3DInches;
    parallelGuide: WallParallelGuide;
    scoreInches: number;
  }> | null = null;

  for (const referenceEdge of getParallelReferenceDraftEdges(args.draft)) {
    const referenceDirectionDegrees = getDirectionDegrees(
      referenceEdge.startPointInches,
      referenceEdge.endPointInches,
    );

    if (referenceDirectionDegrees === null) {
      continue;
    }

    const angleDifferenceDegrees = getParallelAngleDifferenceDegrees(
      previewDirectionDegrees,
      referenceDirectionDegrees,
    );

    if (angleDifferenceDegrees > WALL_FOOTPRINT_DRAFT_PARALLEL_SNAP_THRESHOLD_DEGREES) {
      continue;
    }

    const snappedPointInches = projectPointToParallelLine({
      pointInches: args.pointInches,
      lineStartPointInches: activePoint.pointInches,
      referenceStartPointInches: referenceEdge.startPointInches,
      referenceEndPointInches: referenceEdge.endPointInches,
    });
    const snapDistanceInches = getPoint3DDistanceInches(args.pointInches, snappedPointInches);

    if (snapDistanceInches > WALL_FOOTPRINT_DRAFT_PARALLEL_SNAP_THRESHOLD_INCHES) {
      continue;
    }

    if (bestSnap !== null && snapDistanceInches >= bestSnap.scoreInches) {
      continue;
    }

    bestSnap = {
      pointInches: snappedPointInches,
      scoreInches: snapDistanceInches,
      parallelGuide: {
        referenceStartPointInches: referenceEdge.startPointInches,
        referenceEndPointInches: referenceEdge.endPointInches,
        previewStartPointInches: activePoint.pointInches,
        previewEndPointInches: snappedPointInches,
      },
    };
  }

  if (bestSnap === null) {
    return null;
  }

  return {
    pointInches: bestSnap.pointInches,
    parallelGuide: bestSnap.parallelGuide,
  };
}

function getParallelReferenceDraftEdges(
  draft: WallFootprintDraft,
): readonly Readonly<{
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>[] {
  const activePoint = getActiveWallFootprintDraftPoint(draft);

  if (activePoint === null || draft.points.length < 3) {
    return [];
  }

  const activePointIndex = draft.points.findIndex((point) => point.id === activePoint.id);

  if (activePointIndex < 0) {
    return [];
  }

  return draft.points.slice(0, -1).flatMap((point, pointIndex) => {
    const nextPoint = draft.points[pointIndex + 1];

    if (nextPoint === undefined) {
      return [];
    }

    if (point.id === activePoint.id || nextPoint.id === activePoint.id) {
      return [];
    }

    if (pointIndex === activePointIndex - 1) {
      return [];
    }

    const lengthInches = getPoint3DDistanceInches(point.pointInches, nextPoint.pointInches);

    if (lengthInches < MIN_PARALLEL_REFERENCE_EDGE_LENGTH_INCHES) {
      return [];
    }

    return [{
      startPointInches: point.pointInches,
      endPointInches: nextPoint.pointInches,
    }];
  });
}

function getParallelAngleDifferenceDegrees(
  firstDirectionDegrees: number,
  secondDirectionDegrees: number,
): number {
  const sameDirectionDifferenceDegrees = Math.abs(
    normalizeAngleDegrees(firstDirectionDegrees - secondDirectionDegrees),
  );
  const oppositeDirectionDifferenceDegrees = Math.abs(
    normalizeAngleDegrees(firstDirectionDegrees - secondDirectionDegrees + 180),
  );

  return Math.min(sameDirectionDifferenceDegrees, oppositeDirectionDifferenceDegrees);
}

function projectPointToParallelLine(args: {
  pointInches: Point3DInches;
  lineStartPointInches: Point3DInches;
  referenceStartPointInches: Point3DInches;
  referenceEndPointInches: Point3DInches;
}): Point3DInches {
  const referenceDeltaXInches = args.referenceEndPointInches.xInches - args.referenceStartPointInches.xInches;
  const referenceDeltaYInches = args.referenceEndPointInches.yInches - args.referenceStartPointInches.yInches;
  const referenceLengthInches = Math.hypot(referenceDeltaXInches, referenceDeltaYInches);
  const unitX = referenceDeltaXInches / referenceLengthInches;
  const unitY = referenceDeltaYInches / referenceLengthInches;
  const pointDeltaXInches = args.pointInches.xInches - args.lineStartPointInches.xInches;
  const pointDeltaYInches = args.pointInches.yInches - args.lineStartPointInches.yInches;
  const projectedLengthInches = pointDeltaXInches * unitX + pointDeltaYInches * unitY;

  return {
    xInches: args.lineStartPointInches.xInches + unitX * projectedLengthInches,
    yInches: args.lineStartPointInches.yInches + unitY * projectedLengthInches,
    zInches: 0,
  };
}
