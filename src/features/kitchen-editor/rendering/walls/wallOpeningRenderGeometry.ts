import { BufferGeometry, Float32BufferAttribute } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallFaceSide, WallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";

const GEOMETRY_EPSILON = 0.000001;
const MIN_WALL_OPENING_HIT_SIZE_INCHES = 0.25;

type WallOpeningBounds = Readonly<{
  startT: number;
  endT: number;
  bottomInches: number;
  topInches: number;
}>;

export function createWallOpeningSelectedLinePoints(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  outwardOffsetInches: number;
}): readonly [number, number, number][] {
  const bounds = createOpeningBounds({
    segmentBody: args.segmentBody,
    opening: args.opening,
    paddingInches: 0,
  });

  if (bounds === null) {
    return [];
  }

  return [
    getSidePoint(args.segmentBody, args.opening.faceSide, bounds.startT, bounds.bottomInches, args.outwardOffsetInches),
    getSidePoint(args.segmentBody, args.opening.faceSide, bounds.endT, bounds.bottomInches, args.outwardOffsetInches),
    getSidePoint(args.segmentBody, args.opening.faceSide, bounds.endT, bounds.topInches, args.outwardOffsetInches),
    getSidePoint(args.segmentBody, args.opening.faceSide, bounds.startT, bounds.topInches, args.outwardOffsetInches),
  ].map((pointInches) => [
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
  const bounds = createOpeningBounds({
    segmentBody: args.segmentBody,
    opening: args.opening,
    paddingInches: args.paddingInches,
  });

  if (bounds === null) {
    return null;
  }

  const sideAStartBottom = getSidePoint(args.segmentBody, "side-a", bounds.startT, bounds.bottomInches, args.depthPaddingInches);
  const sideAEndBottom = getSidePoint(args.segmentBody, "side-a", bounds.endT, bounds.bottomInches, args.depthPaddingInches);
  const sideAEndTop = getSidePoint(args.segmentBody, "side-a", bounds.endT, bounds.topInches, args.depthPaddingInches);
  const sideAStartTop = getSidePoint(args.segmentBody, "side-a", bounds.startT, bounds.topInches, args.depthPaddingInches);
  const sideBStartBottom = getSidePoint(args.segmentBody, "side-b", bounds.startT, bounds.bottomInches, args.depthPaddingInches);
  const sideBEndBottom = getSidePoint(args.segmentBody, "side-b", bounds.endT, bounds.bottomInches, args.depthPaddingInches);
  const sideBEndTop = getSidePoint(args.segmentBody, "side-b", bounds.endT, bounds.topInches, args.depthPaddingInches);
  const sideBStartTop = getSidePoint(args.segmentBody, "side-b", bounds.startT, bounds.topInches, args.depthPaddingInches);
  const triangles: number[] = [];

  addQuad(triangles, sideAStartBottom, sideAEndBottom, sideAEndTop, sideAStartTop);
  addQuad(triangles, sideBEndBottom, sideBStartBottom, sideBStartTop, sideBEndTop);
  addQuad(triangles, sideAStartBottom, sideBStartBottom, sideBEndBottom, sideAEndBottom);
  addQuad(triangles, sideAStartTop, sideAEndTop, sideBEndTop, sideBStartTop);
  addQuad(triangles, sideAStartBottom, sideAStartTop, sideBStartTop, sideBStartBottom);
  addQuad(triangles, sideAEndBottom, sideBEndBottom, sideBEndTop, sideAEndTop);

  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(triangles), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createOpeningBounds(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  paddingInches: number;
}): WallOpeningBounds | null {
  const faceLengthInches = getSideLength(args.segmentBody, args.opening.faceSide);

  if (faceLengthInches <= GEOMETRY_EPSILON) {
    return null;
  }

  const leftInchesAlongFace = clamp(
    args.opening.leftInchesAlongFace - args.paddingInches,
    0,
    faceLengthInches,
  );
  const rightInchesAlongFace = clamp(
    args.opening.leftInchesAlongFace + args.opening.widthInches + args.paddingInches,
    0,
    faceLengthInches,
  );
  const bottomInches = clamp(
    args.opening.bottomInchesFromFloor - args.paddingInches,
    0,
    args.segmentBody.heightInches,
  );
  const topInches = clamp(
    args.opening.bottomInchesFromFloor + args.opening.heightInches + args.paddingInches,
    0,
    args.segmentBody.heightInches,
  );
  const safeRightInchesAlongFace = Math.min(
    faceLengthInches,
    Math.max(rightInchesAlongFace, leftInchesAlongFace + MIN_WALL_OPENING_HIT_SIZE_INCHES),
  );
  const safeTopInches = Math.min(
    args.segmentBody.heightInches,
    Math.max(topInches, bottomInches + MIN_WALL_OPENING_HIT_SIZE_INCHES),
  );

  if (
    safeRightInchesAlongFace - leftInchesAlongFace <= GEOMETRY_EPSILON ||
    safeTopInches - bottomInches <= GEOMETRY_EPSILON
  ) {
    return null;
  }

  return {
    startT: leftInchesAlongFace / faceLengthInches,
    endT: safeRightInchesAlongFace / faceLengthInches,
    bottomInches,
    topInches: safeTopInches,
  };
}

function getSidePoint(
  segmentBody: BuiltWallSegmentBody,
  side: WallFaceSide,
  t: number,
  zInches: number,
  outwardOffsetInches = 0,
): Point3DInches {
  const startPointInches = side === "side-a"
    ? segmentBody.start.sideAPointInches
    : segmentBody.start.sideBPointInches;
  const endPointInches = side === "side-a"
    ? segmentBody.end.sideAPointInches
    : segmentBody.end.sideBPointInches;
  const outwardDirection = getSideOutwardDirection(segmentBody, side);

  return {
    xInches:
      startPointInches.xInches +
      (endPointInches.xInches - startPointInches.xInches) * t +
      outwardDirection.xInches * outwardOffsetInches,
    yInches:
      startPointInches.yInches +
      (endPointInches.yInches - startPointInches.yInches) * t +
      outwardDirection.yInches * outwardOffsetInches,
    zInches,
  };
}

function getSideOutwardDirection(
  segmentBody: BuiltWallSegmentBody,
  side: WallFaceSide,
): Readonly<{ xInches: number; yInches: number }> {
  const sideStartPointInches = side === "side-a"
    ? segmentBody.start.sideAPointInches
    : segmentBody.start.sideBPointInches;
  const centerStartPointInches = segmentBody.start.centerPointInches;
  const xInches = sideStartPointInches.xInches - centerStartPointInches.xInches;
  const yInches = sideStartPointInches.yInches - centerStartPointInches.yInches;
  const lengthInches = Math.hypot(xInches, yInches);

  if (lengthInches <= GEOMETRY_EPSILON) {
    return { xInches: 0, yInches: 0 };
  }

  return {
    xInches: xInches / lengthInches,
    yInches: yInches / lengthInches,
  };
}

function getSideLength(segmentBody: BuiltWallSegmentBody, side: WallFaceSide): number {
  const startPointInches = side === "side-a"
    ? segmentBody.start.sideAPointInches
    : segmentBody.start.sideBPointInches;
  const endPointInches = side === "side-a"
    ? segmentBody.end.sideAPointInches
    : segmentBody.end.sideBPointInches;

  return Math.hypot(
    endPointInches.xInches - startPointInches.xInches,
    endPointInches.yInches - startPointInches.yInches,
  );
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
