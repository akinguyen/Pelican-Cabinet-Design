import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallFaceSide } from "../placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "../wallSegmentTopologyTypes";

const GEOMETRY_EPSILON = 0.000001;

export type DerivedWallOpeningFaceDirectionInches = Readonly<{
  xInches: number;
  yInches: number;
}>;

export type DerivedWallOpeningFaceAxesInches = Readonly<{
  sideStartPointInches: Point3DInches;
  sideEndPointInches: Point3DInches;
  faceLengthInches: number;
  faceDirectionInches: DerivedWallOpeningFaceDirectionInches;
  outwardDirectionInches: DerivedWallOpeningFaceDirectionInches;
  inwardDirectionInches: DerivedWallOpeningFaceDirectionInches;
}>;

export function createDerivedWallOpeningFaceAxes(args: {
  segmentBody: BuiltWallSegmentBody;
  faceSide: WallFaceSide;
}): DerivedWallOpeningFaceAxesInches | null {
  const sideStartPointInches = getSideStartPoint(args.segmentBody, args.faceSide);
  const sideEndPointInches = getSideEndPoint(args.segmentBody, args.faceSide);
  const faceVectorInches = {
    xInches: sideEndPointInches.xInches - sideStartPointInches.xInches,
    yInches: sideEndPointInches.yInches - sideStartPointInches.yInches,
  };
  const faceLengthInches = Math.hypot(faceVectorInches.xInches, faceVectorInches.yInches);

  if (faceLengthInches <= GEOMETRY_EPSILON) {
    return null;
  }

  const faceDirectionInches = {
    xInches: faceVectorInches.xInches / faceLengthInches,
    yInches: faceVectorInches.yInches / faceLengthInches,
  };
  const outwardDirectionInches = createOutwardDirection({
    segmentBody: args.segmentBody,
    faceSide: args.faceSide,
    sideStartPointInches,
    faceDirectionInches,
  });
  const inwardDirectionInches = {
    xInches: -outwardDirectionInches.xInches,
    yInches: -outwardDirectionInches.yInches,
  };

  return {
    sideStartPointInches,
    sideEndPointInches,
    faceLengthInches,
    faceDirectionInches,
    outwardDirectionInches,
    inwardDirectionInches,
  };
}

function createOutwardDirection(args: {
  segmentBody: BuiltWallSegmentBody;
  faceSide: WallFaceSide;
  sideStartPointInches: Point3DInches;
  faceDirectionInches: DerivedWallOpeningFaceDirectionInches;
}): DerivedWallOpeningFaceDirectionInches {
  const firstPerpendicularInches = {
    xInches: -args.faceDirectionInches.yInches,
    yInches: args.faceDirectionInches.xInches,
  };
  const secondPerpendicularInches = {
    xInches: -firstPerpendicularInches.xInches,
    yInches: -firstPerpendicularInches.yInches,
  };
  const centerStartPointInches = args.segmentBody.start.centerPointInches;
  const sideReferenceVectorInches = {
    xInches: args.sideStartPointInches.xInches - centerStartPointInches.xInches,
    yInches: args.sideStartPointInches.yInches - centerStartPointInches.yInches,
  };

  return dot(firstPerpendicularInches, sideReferenceVectorInches) >=
    dot(secondPerpendicularInches, sideReferenceVectorInches)
    ? firstPerpendicularInches
    : secondPerpendicularInches;
}

function getSideStartPoint(segmentBody: BuiltWallSegmentBody, side: WallFaceSide): Point3DInches {
  return side === "side-a"
    ? segmentBody.start.sideAPointInches
    : segmentBody.start.sideBPointInches;
}

function getSideEndPoint(segmentBody: BuiltWallSegmentBody, side: WallFaceSide): Point3DInches {
  return side === "side-a"
    ? segmentBody.end.sideAPointInches
    : segmentBody.end.sideBPointInches;
}

function dot(
  firstInches: DerivedWallOpeningFaceDirectionInches,
  secondInches: DerivedWallOpeningFaceDirectionInches,
): number {
  return firstInches.xInches * secondInches.xInches + firstInches.yInches * secondInches.yInches;
}
