import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import type { WallAngleGuide, WallReferenceGuides } from "../draft-guides/wallDraftGuideTypes";
import { createWallAngleGuide, getDirectionDegrees, normalizeAngleDegrees } from "../draft-guides/wallDraftGuides";
import type { WallFootprintDraft } from "./wallFootprintDraftTypes";
import { getActiveWallFootprintDraftPoint } from "./wallFootprintDraftSelectors";

const WALL_FOOTPRINT_DRAFT_REFERENCE_SNAP_THRESHOLD_INCHES = 2.5;
const WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_DEGREES = 45;
const WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_THRESHOLD_DEGREES = 5;

export function snapToHorizontalVerticalGuides(args: {
  pointInches: Point3DInches;
  snapPointsInches: readonly Point3DInches[];
}): Readonly<{
  pointInches: Point3DInches;
  referenceGuides: WallReferenceGuides;
}> | null {
  let verticalGuide: number | null = null;
  let horizontalGuide: number | null = null;
  let nearestVerticalDistanceInches = Number.POSITIVE_INFINITY;
  let nearestHorizontalDistanceInches = Number.POSITIVE_INFINITY;

  args.snapPointsInches.forEach((snapPointInches) => {
    const deltaXInches = Math.abs(args.pointInches.xInches - snapPointInches.xInches);
    const deltaYInches = Math.abs(args.pointInches.yInches - snapPointInches.yInches);

    if (
      deltaXInches <= WALL_FOOTPRINT_DRAFT_REFERENCE_SNAP_THRESHOLD_INCHES &&
      deltaXInches < nearestVerticalDistanceInches
    ) {
      nearestVerticalDistanceInches = deltaXInches;
      verticalGuide = snapPointInches.xInches;
    }

    if (
      deltaYInches <= WALL_FOOTPRINT_DRAFT_REFERENCE_SNAP_THRESHOLD_INCHES &&
      deltaYInches < nearestHorizontalDistanceInches
    ) {
      nearestHorizontalDistanceInches = deltaYInches;
      horizontalGuide = snapPointInches.yInches;
    }
  });

  if (verticalGuide === null && horizontalGuide === null) {
    return null;
  }

  return {
    pointInches: {
      xInches: verticalGuide ?? args.pointInches.xInches,
      yInches: horizontalGuide ?? args.pointInches.yInches,
      zInches: 0,
    },
    referenceGuides: {
      horizontalGuide,
      verticalGuide,
    },
  };
}

export function snapToAngleGuide(args: {
  pointInches: Point3DInches;
  activePointInches: Point3DInches;
  referencePointInches: Point3DInches | null;
}): Readonly<{
  pointInches: Point3DInches;
  angleGuide: WallAngleGuide;
}> | null {
  if (args.referencePointInches === null) {
    return null;
  }

  const previewDirectionDegrees = getDirectionDegrees(args.activePointInches, args.pointInches);
  const referenceDirectionDegrees = getDirectionDegrees(args.activePointInches, args.referencePointInches);

  if (previewDirectionDegrees === null || referenceDirectionDegrees === null) {
    return null;
  }

  const deltaXInches = args.pointInches.xInches - args.activePointInches.xInches;
  const deltaYInches = args.pointInches.yInches - args.activePointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);
  const rawAngleDegrees = normalizeAngleDegrees(previewDirectionDegrees - referenceDirectionDegrees);
  const snappedAngleDegrees = Math.round(rawAngleDegrees / WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_DEGREES) * WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_DEGREES;
  const angleDifferenceDegrees = Math.abs(normalizeAngleDegrees(rawAngleDegrees - snappedAngleDegrees));

  if (angleDifferenceDegrees > WALL_FOOTPRINT_DRAFT_ANGLE_SNAP_THRESHOLD_DEGREES) {
    return null;
  }

  const snappedDirectionDegrees = referenceDirectionDegrees + snappedAngleDegrees;
  const snappedDirectionRadians = (snappedDirectionDegrees * Math.PI) / 180;
  const pointInches = {
    xInches: args.activePointInches.xInches + Math.cos(snappedDirectionRadians) * lengthInches,
    yInches: args.activePointInches.yInches + Math.sin(snappedDirectionRadians) * lengthInches,
    zInches: 0,
  };
  const angleGuide = createWallAngleGuide({
    activePointInches: args.activePointInches,
    pointInches,
    referencePointInches: args.referencePointInches,
  });

  if (angleGuide === null) {
    return null;
  }

  return {
    pointInches,
    angleGuide,
  };
}

export function getWallFootprintDraftReferencePointInches(
  draft: WallFootprintDraft,
): Point3DInches | null {
  const activePoint = getActiveWallFootprintDraftPoint(draft);

  if (activePoint === null || draft.points.length < 2) {
    return null;
  }

  const activePointIndex = draft.points.findIndex((point) => point.id === activePoint.id);
  const previousPoint = activePointIndex > 0 ? draft.points[activePointIndex - 1] : null;

  return previousPoint?.pointInches ?? null;
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
