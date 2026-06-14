import { BufferGeometry, Float32BufferAttribute } from "three";
import type { Ray } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallOpeningDraftPointInches } from "@/engine/walls/openings/wallOpeningDraftTypes";
import {
  createOrthogonalWallOpeningCutFootprint,
  createWallOpeningFaceRectanglePointsInches,
} from "@/engine/walls/openings/wallOpeningCutGeometry";
import { createWallOpeningFaceAxes } from "@/engine/walls/openings/wallOpeningFaceAxes";
import type { WallFaceSide, WallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";

const GEOMETRY_EPSILON = 0.000001;

export function createWallOpeningFaceGeometry(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  outwardOffsetInches: number;
}): BufferGeometry | null {
  const pointsInches = createWallOpeningFaceRectanglePointsInches({
    segmentBody: args.segmentBody,
    opening: args.opening,
    outwardOffsetInches: args.outwardOffsetInches,
  });

  if (pointsInches.length < 4) {
    return null;
  }

  const triangles: number[] = [];

  addQuad(triangles, pointsInches[0], pointsInches[1], pointsInches[2], pointsInches[3]);

  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(triangles), 3));
  geometry.computeBoundingSphere();

  return geometry;
}

export function createWallOpeningFacePointFromRay(args: {
  segmentBody: BuiltWallSegmentBody;
  faceSide: WallFaceSide;
  ray: Ray;
}): WallOpeningDraftPointInches | null {
  const faceAxes = createWallOpeningFaceAxes({
    segmentBody: args.segmentBody,
    faceSide: args.faceSide,
  });

  if (faceAxes === null) {
    return null;
  }

  const denominator =
    faceAxes.outwardDirectionInches.xInches * args.ray.direction.x +
    faceAxes.outwardDirectionInches.yInches * args.ray.direction.y;

  if (Math.abs(denominator) < GEOMETRY_EPSILON) {
    return null;
  }

  const rayDistance = (
    faceAxes.outwardDirectionInches.xInches * (faceAxes.sideStartPointInches.xInches - args.ray.origin.x) +
    faceAxes.outwardDirectionInches.yInches * (faceAxes.sideStartPointInches.yInches - args.ray.origin.y)
  ) / denominator;

  if (rayDistance < 0) {
    return null;
  }

  const worldXInches = args.ray.origin.x + args.ray.direction.x * rayDistance;
  const worldYInches = args.ray.origin.y + args.ray.direction.y * rayDistance;
  const worldZInches = args.ray.origin.z + args.ray.direction.z * rayDistance;
  return {
    xInchesAlongFace:
      (worldXInches - faceAxes.sideStartPointInches.xInches) * faceAxes.faceDirectionInches.xInches +
      (worldYInches - faceAxes.sideStartPointInches.yInches) * faceAxes.faceDirectionInches.yInches,
    zInchesFromFloor: worldZInches,
  };
}

export function createWallOpeningSelectedLinePoints(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  outwardOffsetInches: number;
}): readonly [number, number, number][] {
  return createWallOpeningFaceRectanglePointsInches({
    segmentBody: args.segmentBody,
    opening: args.opening,
    outwardOffsetInches: args.outwardOffsetInches,
  }).map((pointInches) => [
    pointInches.xInches,
    pointInches.yInches,
    pointInches.zInches,
  ] as [number, number, number]);
}

export function createWallOpeningHitGeometry(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  paddingInches: number;
  depthPaddingInches: number;
}): BufferGeometry | null {
  const footprint = createOrthogonalWallOpeningCutFootprint({
    segmentBody: args.segmentBody,
    opening: args.opening,
    paddingInches: args.paddingInches,
    depthPaddingInches: args.depthPaddingInches,
  });

  if (footprint === null) {
    return null;
  }

  const frontLeftBottom = createPointAtHeight(footprint.frontLeftInches, footprint.bottomInches);
  const frontRightBottom = createPointAtHeight(footprint.frontRightInches, footprint.bottomInches);
  const backRightBottom = createPointAtHeight(footprint.backRightInches, footprint.bottomInches);
  const backLeftBottom = createPointAtHeight(footprint.backLeftInches, footprint.bottomInches);
  const frontLeftTop = createPointAtHeight(footprint.frontLeftInches, footprint.topInches);
  const frontRightTop = createPointAtHeight(footprint.frontRightInches, footprint.topInches);
  const backRightTop = createPointAtHeight(footprint.backRightInches, footprint.topInches);
  const backLeftTop = createPointAtHeight(footprint.backLeftInches, footprint.topInches);
  const triangles: number[] = [];

  addQuad(triangles, frontLeftBottom, frontRightBottom, frontRightTop, frontLeftTop);
  addQuad(triangles, backRightBottom, backLeftBottom, backLeftTop, backRightTop);
  addQuad(triangles, frontLeftBottom, backLeftBottom, backRightBottom, frontRightBottom);
  addQuad(triangles, frontLeftTop, frontRightTop, backRightTop, backLeftTop);
  addQuad(triangles, frontLeftBottom, frontLeftTop, backLeftTop, backLeftBottom);
  addQuad(triangles, frontRightBottom, backRightBottom, backRightTop, frontRightTop);

  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(triangles), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createPointAtHeight(pointInches: Point3DInches, zInches: number): Point3DInches {
  return {
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches,
  };
}

function addQuad(
  triangles: number[],
  first: Point3DInches,
  second: Point3DInches,
  third: Point3DInches,
  fourth: Point3DInches,
): void {
  addTriangle(triangles, first, second, third);
  addTriangle(triangles, first, third, fourth);
}

function addTriangle(
  triangles: number[],
  first: Point3DInches,
  second: Point3DInches,
  third: Point3DInches,
): void {
  [first, second, third].forEach((pointInches) => {
    triangles.push(pointInches.xInches, pointInches.yInches, pointInches.zInches);
  });
}
