import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import type { WallAngleGuide, WallReferenceGuides } from "../draft-guides/wallDraftGuideTypes";
import { getDirectionDegrees, normalizeAngleDegrees } from "../draft-guides/wallDraftGuides";
import type { WallFootprintDraft } from "./wallFootprintDraftTypes";
import { getActiveWallFootprintDraftPoint } from "./wallFootprintDraftSelectors";

const WALL_FOOTPRINT_DRAFT_REFERENCE_SNAP_THRESHOLD_INCHES = 2.5;
const WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_DEGREES = 45;
const WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_THRESHOLD_DEGREES = 5;

export function snapToHorizontalVerticalGuides(args: {
  pointInches: Point3DInches;
  activePointInches: Point3DInches;
  snapPointsInches: readonly Point3DInches[];
}): Readonly<{
  pointInches: Point3DInches;
  referenceGuides: WallReferenceGuides;
}> | null {
  let snappedPointInches: Point3DInches | null = null;
  let referenceGuides: WallReferenceGuides | null = null;
  let bestDistanceInches = Number.POSITIVE_INFINITY;

  args.snapPointsInches.forEach((snapPointInches) => {
    const deltaXInches = Math.abs(args.pointInches.xInches - snapPointInches.xInches);
    const deltaYInches = Math.abs(args.pointInches.yInches - snapPointInches.yInches);

    if (deltaXInches <= WALL_FOOTPRINT_DRAFT_REFERENCE_SNAP_THRESHOLD_INCHES && deltaXInches < bestDistanceInches) {
      bestDistanceInches = deltaXInches;
      snappedPointInches = {
        ...args.pointInches,
        xInches: snapPointInches.xInches,
      };
      referenceGuides = {
        horizontalGuide: null,
        verticalGuide: snapPointInches.xInches,
      };
    }

    if (deltaYInches <= WALL_FOOTPRINT_DRAFT_REFERENCE_SNAP_THRESHOLD_INCHES && deltaYInches < bestDistanceInches) {
      bestDistanceInches = deltaYInches;
      snappedPointInches = {
        ...args.pointInches,
        yInches: snapPointInches.yInches,
      };
      referenceGuides = {
        horizontalGuide: snapPointInches.yInches,
        verticalGuide: null,
      };
    }
  });

  if (snappedPointInches === null || referenceGuides === null) {
    return null;
  }

  return {
    pointInches: snappedPointInches,
    referenceGuides,
  };
}

export function snapToAngleGuide(args: {
  pointInches: Point3DInches;
  activePointInches: Point3DInches;
  referenceDirectionDegrees: number;
}): Readonly<{
  pointInches: Point3DInches;
  angleGuide: WallAngleGuide;
}> | null {
  const rawDirectionDegrees = getDirectionDegrees(args.activePointInches, args.pointInches);

  if (rawDirectionDegrees === null) {
    return null;
  }

  const deltaXInches = args.pointInches.xInches - args.activePointInches.xInches;
  const deltaYInches = args.pointInches.yInches - args.activePointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);
  const rawAngleDegrees = normalizeAngleDegrees(rawDirectionDegrees - args.referenceDirectionDegrees);
  const snappedAngleDegrees = Math.round(rawAngleDegrees / WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_DEGREES) * WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_DEGREES;
  const angleDifferenceDegrees = Math.abs(normalizeAngleDegrees(rawAngleDegrees - snappedAngleDegrees));

  if (angleDifferenceDegrees > WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_THRESHOLD_DEGREES) {
    return null;
  }

  const directionDegrees = args.referenceDirectionDegrees + snappedAngleDegrees;
  const directionRadians = (directionDegrees * Math.PI) / 180;
  const pointInches = {
    xInches: args.activePointInches.xInches + Math.cos(directionRadians) * lengthInches,
    yInches: args.activePointInches.yInches + Math.sin(directionRadians) * lengthInches,
    zInches: 0,
  };

  return {
    pointInches,
    angleGuide: {
      centerPointInches: args.activePointInches,
      angleDegrees: Math.abs(normalizeAngleDegrees(snappedAngleDegrees)),
      referenceDirectionDegrees: args.referenceDirectionDegrees,
      directionDegrees,
    },
  };
}

export function getWallFootprintDraftReferenceDirectionDegrees(draft: WallFootprintDraft): number {
  const activePoint = getActiveWallFootprintDraftPoint(draft);

  if (activePoint === null || draft.points.length < 2) {
    return 0;
  }

  const activePointIndex = draft.points.findIndex((point) => point.id === activePoint.id);
  const previousPoint = activePointIndex > 0 ? draft.points[activePointIndex - 1] : null;

  if (previousPoint === null) {
    return 0;
  }

  return getDirectionDegrees(previousPoint.pointInches, activePoint.pointInches) ?? 0;
}

export function getWallFootprintDraftReferenceSnapPoints(args: {
  draft: WallFootprintDraft;
  placedWalls: readonly PlacedWall[];
}): readonly Point3DInches[] {
  const activePoint = getActiveWallFootprintDraftPoint(args.draft);
  const pointsInches: Point3DInches[] = [];

  if (activePoint !== null) {
    pointsInches.push(activePoint.pointInches);
  }

  args.draft.points.forEach((draftPoint) => {
    if (draftPoint.id !== activePoint?.id) {
      pointsInches.push(draftPoint.pointInches);
    }
  });

  args.placedWalls.forEach((placedWall) => {
    pointsInches.push(...placedWall.footprint.boundaryPointsInches);
  });

  return pointsInches;
}
