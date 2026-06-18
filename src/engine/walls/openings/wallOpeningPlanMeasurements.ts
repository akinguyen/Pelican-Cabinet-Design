import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { DerivedWallOpening } from "../placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "../wallSegmentTopologyTypes";
import { createDerivedWallOpeningFaceAxes } from "./wallOpeningFaceAxes";

const WALL_OPENING_MEASUREMENT_OFFSET_INCHES = 18;
const MIN_WALL_OPENING_MEASUREMENT_LENGTH_INCHES = 3;
const MEASUREMENT_BOUNDARY_TOLERANCE_INCHES = 0.001;

export type WallOpeningPlanMeasurementGuide = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  labelPointInches: Point3DInches;
  labelRotationDegrees: number;
  lengthInches: number;
}>;

export function buildDerivedWallOpeningPlanMeasurementGuides(args: {
  activeSourceAssemblyId: string;
  segmentBodies: readonly BuiltWallSegmentBody[];
  derivedWallOpenings: readonly DerivedWallOpening[];
}): readonly WallOpeningPlanMeasurementGuide[] {
  return args.derivedWallOpenings
    .filter((opening) => opening.sourceAssemblyId === args.activeSourceAssemblyId)
    .flatMap((opening) => {
      const segmentBody = args.segmentBodies.find((body) => body.wallSegmentId === opening.wallSegmentId);

      return segmentBody === undefined
        ? []
        : createMeasurementGuidesForOpening({
          segmentBody,
          activeOpening: opening,
          openingsOnSameWallFace: args.derivedWallOpenings.filter((candidateOpening) => (
            candidateOpening.wallSegmentId === opening.wallSegmentId &&
            candidateOpening.faceSide === opening.faceSide
          )),
        });
    });
}

function createMeasurementGuidesForOpening(args: {
  segmentBody: BuiltWallSegmentBody;
  activeOpening: DerivedWallOpening;
  openingsOnSameWallFace: readonly DerivedWallOpening[];
}): readonly WallOpeningPlanMeasurementGuide[] {
  const faceAxes = createDerivedWallOpeningFaceAxes({
    segmentBody: args.segmentBody,
    faceSide: args.activeOpening.faceSide,
  });

  if (faceAxes === null) {
    return [];
  }

  const boundariesInches = createOpeningMeasurementBoundaries({
    faceLengthInches: faceAxes.faceLengthInches,
    openingsOnSameWallFace: args.openingsOnSameWallFace,
  });
  const intervals = boundariesInches.slice(0, -1).map((startInches, boundaryIndex) => ({
    id: `${args.activeOpening.id}:interval-${boundaryIndex}`,
    startInches,
    endInches: boundariesInches[boundaryIndex + 1],
  }));

  return intervals
    .map((interval) => createMeasurementGuide({
      id: interval.id,
      startInches: interval.startInches,
      endInches: interval.endInches,
      sideStartPointInches: faceAxes.sideStartPointInches,
      faceDirectionInches: faceAxes.faceDirectionInches,
      outwardDirectionInches: faceAxes.outwardDirectionInches,
    }))
    .filter(isWallOpeningPlanMeasurementGuide);
}

function createOpeningMeasurementBoundaries(args: {
  faceLengthInches: number;
  openingsOnSameWallFace: readonly DerivedWallOpening[];
}): readonly number[] {
  const boundariesInches = [0, args.faceLengthInches];

  for (const opening of args.openingsOnSameWallFace) {
    boundariesInches.push(
      clamp(opening.leftInchesAlongFace, 0, args.faceLengthInches),
      clamp(opening.leftInchesAlongFace + opening.widthInches, 0, args.faceLengthInches),
    );
  }

  return boundariesInches
    .sort((firstBoundary, secondBoundary) => firstBoundary - secondBoundary)
    .filter((boundaryInches, boundaryIndex, sortedBoundaries) => (
      boundaryIndex === 0 ||
      Math.abs(boundaryInches - sortedBoundaries[boundaryIndex - 1]) > MEASUREMENT_BOUNDARY_TOLERANCE_INCHES
    ));
}

function createMeasurementGuide(args: {
  id: string;
  startInches: number;
  endInches: number;
  sideStartPointInches: Point3DInches;
  faceDirectionInches: Readonly<{ xInches: number; yInches: number }>;
  outwardDirectionInches: Readonly<{ xInches: number; yInches: number }>;
}): WallOpeningPlanMeasurementGuide | null {
  const lengthInches = args.endInches - args.startInches;

  if (lengthInches < MIN_WALL_OPENING_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const startPointInches = offsetPoint(
    pointOnFace(args.sideStartPointInches, args.faceDirectionInches, args.startInches),
    args.outwardDirectionInches,
    WALL_OPENING_MEASUREMENT_OFFSET_INCHES,
  );
  const endPointInches = offsetPoint(
    pointOnFace(args.sideStartPointInches, args.faceDirectionInches, args.endInches),
    args.outwardDirectionInches,
    WALL_OPENING_MEASUREMENT_OFFSET_INCHES,
  );

  return {
    id: args.id,
    startPointInches,
    endPointInches,
    labelPointInches: {
      xInches: (startPointInches.xInches + endPointInches.xInches) / 2,
      yInches: (startPointInches.yInches + endPointInches.yInches) / 2,
      zInches: 0,
    },
    labelRotationDegrees: getReadableAngleDegrees(Math.atan2(
      endPointInches.yInches - startPointInches.yInches,
      endPointInches.xInches - startPointInches.xInches,
    ) * 180 / Math.PI),
    lengthInches,
  };
}

function pointOnFace(
  startPointInches: Point3DInches,
  directionInches: Readonly<{ xInches: number; yInches: number }>,
  distanceInches: number,
): Point3DInches {
  return {
    xInches: startPointInches.xInches + directionInches.xInches * distanceInches,
    yInches: startPointInches.yInches + directionInches.yInches * distanceInches,
    zInches: 0,
  };
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

function getReadableAngleDegrees(rotationDegrees: number): number {
  const normalizedDegrees = ((rotationDegrees % 360) + 360) % 360;
  const readableDegrees = normalizedDegrees > 90 && normalizedDegrees <= 270
    ? normalizedDegrees + 180
    : normalizedDegrees;
  const normalizedReadableDegrees = ((readableDegrees % 360) + 360) % 360;

  return normalizedReadableDegrees > 180 ? normalizedReadableDegrees - 360 : normalizedReadableDegrees;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isWallOpeningPlanMeasurementGuide(
  measurementGuide: WallOpeningPlanMeasurementGuide | null,
): measurementGuide is WallOpeningPlanMeasurementGuide {
  return measurementGuide !== null;
}
