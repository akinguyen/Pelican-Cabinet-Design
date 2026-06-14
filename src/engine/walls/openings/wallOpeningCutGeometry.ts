import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallOpening } from "../placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "../wallSegmentTopologyTypes";
import { createWallOpeningFaceAxes } from "./wallOpeningFaceAxes";

const GEOMETRY_EPSILON = 0.000001;
const MIN_WALL_OPENING_HIT_SIZE_INCHES = 0.25;

export type WallOpeningCutFootprintInches = Readonly<{
  frontLeftInches: Point3DInches;
  frontRightInches: Point3DInches;
  backRightInches: Point3DInches;
  backLeftInches: Point3DInches;
  bottomInches: number;
  topInches: number;
  outwardDirectionInches: Readonly<{ xInches: number; yInches: number }>;
  inwardDirectionInches: Readonly<{ xInches: number; yInches: number }>;
}>;

export function createOrthogonalWallOpeningCutFootprint(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  paddingInches?: number;
  depthPaddingInches?: number;
}): WallOpeningCutFootprintInches | null {
  const paddingInches = args.paddingInches ?? 0;
  const depthPaddingInches = args.depthPaddingInches ?? 0;
  const faceAxes = createWallOpeningFaceAxes({
    segmentBody: args.segmentBody,
    faceSide: args.opening.faceSide,
  });

  if (faceAxes === null) {
    return null;
  }

  const leftInchesAlongFace = clamp(
    args.opening.leftInchesAlongFace - paddingInches,
    0,
    faceAxes.faceLengthInches,
  );
  const rawRightInchesAlongFace = clamp(
    args.opening.leftInchesAlongFace + args.opening.widthInches + paddingInches,
    0,
    faceAxes.faceLengthInches,
  );
  const rightInchesAlongFace = Math.min(
    faceAxes.faceLengthInches,
    Math.max(rawRightInchesAlongFace, leftInchesAlongFace + MIN_WALL_OPENING_HIT_SIZE_INCHES),
  );
  const bottomInches = clamp(
    args.opening.bottomInchesFromFloor - paddingInches,
    0,
    args.segmentBody.heightInches,
  );
  const rawTopInches = clamp(
    args.opening.bottomInchesFromFloor + args.opening.heightInches + paddingInches,
    0,
    args.segmentBody.heightInches,
  );
  const topInches = Math.min(
    args.segmentBody.heightInches,
    Math.max(rawTopInches, bottomInches + MIN_WALL_OPENING_HIT_SIZE_INCHES),
  );

  if (
    rightInchesAlongFace - leftInchesAlongFace <= GEOMETRY_EPSILON ||
    topInches - bottomInches <= GEOMETRY_EPSILON
  ) {
    return null;
  }

  const frontLeftOnFaceInches = createFacePoint({
    sideStartPointInches: faceAxes.sideStartPointInches,
    faceDirectionInches: faceAxes.faceDirectionInches,
    distanceInchesAlongFace: leftInchesAlongFace,
  });
  const frontRightOnFaceInches = createFacePoint({
    sideStartPointInches: faceAxes.sideStartPointInches,
    faceDirectionInches: faceAxes.faceDirectionInches,
    distanceInchesAlongFace: rightInchesAlongFace,
  });
  const outwardDirectionInches = faceAxes.outwardDirectionInches;
  const inwardDirectionInches = faceAxes.inwardDirectionInches;
  const backLeftOnFootprintInches = findRayExitPointFromFootprint({
    startPointInches: frontLeftOnFaceInches,
    directionInches: inwardDirectionInches,
    footprintPolygonInches: args.segmentBody.footprintPolygonInches,
    defaultProjectionDistanceInches: args.segmentBody.thicknessInches,
  });
  const backRightOnFootprintInches = findRayExitPointFromFootprint({
    startPointInches: frontRightOnFaceInches,
    directionInches: inwardDirectionInches,
    footprintPolygonInches: args.segmentBody.footprintPolygonInches,
    defaultProjectionDistanceInches: args.segmentBody.thicknessInches,
  });
  const frontLeftInches = offsetPoint(frontLeftOnFaceInches, outwardDirectionInches, depthPaddingInches);
  const frontRightInches = offsetPoint(frontRightOnFaceInches, outwardDirectionInches, depthPaddingInches);
  const backLeftInches = offsetPoint(backLeftOnFootprintInches, inwardDirectionInches, depthPaddingInches);
  const backRightInches = offsetPoint(backRightOnFootprintInches, inwardDirectionInches, depthPaddingInches);

  return {
    frontLeftInches: { ...frontLeftInches, zInches: 0 },
    frontRightInches: { ...frontRightInches, zInches: 0 },
    backRightInches: { ...backRightInches, zInches: 0 },
    backLeftInches: { ...backLeftInches, zInches: 0 },
    bottomInches,
    topInches,
    outwardDirectionInches,
    inwardDirectionInches,
  };
}

export function createWallOpeningFaceRectanglePointsInches(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  outwardOffsetInches: number;
}): readonly Point3DInches[] {
  const footprint = createOrthogonalWallOpeningCutFootprint({
    segmentBody: args.segmentBody,
    opening: args.opening,
  });

  if (footprint === null) {
    return [];
  }

  const frontLeftInches = offsetPoint(
    footprint.frontLeftInches,
    footprint.outwardDirectionInches,
    args.outwardOffsetInches,
  );
  const frontRightInches = offsetPoint(
    footprint.frontRightInches,
    footprint.outwardDirectionInches,
    args.outwardOffsetInches,
  );

  return [
    { ...frontLeftInches, zInches: footprint.bottomInches },
    { ...frontRightInches, zInches: footprint.bottomInches },
    { ...frontRightInches, zInches: footprint.topInches },
    { ...frontLeftInches, zInches: footprint.topInches },
  ];
}

function createFacePoint(args: {
  sideStartPointInches: Point3DInches;
  faceDirectionInches: Readonly<{ xInches: number; yInches: number }>;
  distanceInchesAlongFace: number;
}): Point3DInches {
  return {
    xInches:
      args.sideStartPointInches.xInches +
      args.faceDirectionInches.xInches * args.distanceInchesAlongFace,
    yInches:
      args.sideStartPointInches.yInches +
      args.faceDirectionInches.yInches * args.distanceInchesAlongFace,
    zInches: 0,
  };
}

function findRayExitPointFromFootprint(args: {
  startPointInches: Point3DInches;
  directionInches: Readonly<{ xInches: number; yInches: number }>;
  footprintPolygonInches: readonly Point3DInches[];
  defaultProjectionDistanceInches: number;
}): Point3DInches {
  const distancesInches: number[] = [];

  args.footprintPolygonInches.forEach((edgeStartInches, pointIndex) => {
    const edgeEndInches = args.footprintPolygonInches[(pointIndex + 1) % args.footprintPolygonInches.length];
    const intersectionDistanceInches = findRaySegmentIntersectionDistance({
      rayStartInches: args.startPointInches,
      rayDirectionInches: args.directionInches,
      segmentStartInches: edgeStartInches,
      segmentEndInches: edgeEndInches,
    });

    if (intersectionDistanceInches !== null && intersectionDistanceInches > GEOMETRY_EPSILON) {
      distancesInches.push(intersectionDistanceInches);
    }
  });

  const exitDistanceInches = distancesInches.length > 0
    ? Math.min(...distancesInches)
    : args.defaultProjectionDistanceInches;

  return {
    xInches: args.startPointInches.xInches + args.directionInches.xInches * exitDistanceInches,
    yInches: args.startPointInches.yInches + args.directionInches.yInches * exitDistanceInches,
    zInches: 0,
  };
}

function findRaySegmentIntersectionDistance(args: {
  rayStartInches: Point3DInches;
  rayDirectionInches: Readonly<{ xInches: number; yInches: number }>;
  segmentStartInches: Point3DInches;
  segmentEndInches: Point3DInches;
}): number | null {
  const segmentVectorInches = {
    xInches: args.segmentEndInches.xInches - args.segmentStartInches.xInches,
    yInches: args.segmentEndInches.yInches - args.segmentStartInches.yInches,
  };
  const denominator = cross(args.rayDirectionInches, segmentVectorInches);

  if (Math.abs(denominator) <= GEOMETRY_EPSILON) {
    return null;
  }

  const startToSegmentInches = {
    xInches: args.segmentStartInches.xInches - args.rayStartInches.xInches,
    yInches: args.segmentStartInches.yInches - args.rayStartInches.yInches,
  };
  const rayDistanceInches = cross(startToSegmentInches, segmentVectorInches) / denominator;
  const segmentRatio = cross(startToSegmentInches, args.rayDirectionInches) / denominator;

  if (
    rayDistanceInches < -GEOMETRY_EPSILON ||
    segmentRatio < -GEOMETRY_EPSILON ||
    segmentRatio > 1 + GEOMETRY_EPSILON
  ) {
    return null;
  }

  return rayDistanceInches;
}

function offsetPoint(
  pointInches: Point3DInches,
  directionInches: Readonly<{ xInches: number; yInches: number }>,
  distanceInches: number,
): Point3DInches {
  return {
    xInches: pointInches.xInches + directionInches.xInches * distanceInches,
    yInches: pointInches.yInches + directionInches.yInches * distanceInches,
    zInches: pointInches.zInches,
  };
}

function cross(
  first: Readonly<{ xInches: number; yInches: number }>,
  second: Readonly<{ xInches: number; yInches: number }>,
): number {
  return first.xInches * second.yInches - first.yInches * second.xInches;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
