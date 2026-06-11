import type { Point2DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import { createCountertopSolidAreaLoops } from "@/engine/countertops/countertopRemovedAreaGeometry";
import type { PrimitiveCountertopSlabGeometry } from "../primitiveGeometryTypes";
import type { PrimitiveEdgeSegmentInches } from "./primitiveEdgeSegmentTypes";

const COUNTERTOP_EDGE_Z_OFFSET_INCHES = 0.035;
const BOUNDS_TOUCH_EPSILON_INCHES = 0.001;
const BOUNDARY_CORNER_EPSILON_INCHES = 0.0001;

export function createCountertopSlabEdgeSegments(args: {
  geometry: PrimitiveCountertopSlabGeometry;
  sizeInches: Size3DInches;
}): readonly PrimitiveEdgeSegmentInches[] {
  const removedPolygonsInches = args.geometry.openingsInches
    .map((openingInches) => openingInches.clippedPolygonInches)
    .filter((polygonInches) => polygonInches.length >= 3);
  const solidAreaLoopsInches = createCountertopSolidAreaLoops({
    countertopSizeInches: args.sizeInches,
    removedPolygonsInches,
  });

  return solidAreaLoopsInches.flatMap((loopInches) =>
    doesLoopTouchCountertopBounds(loopInches, args.sizeInches)
      ? createTopBottomAndVerticalCornerLoopSegments(loopInches, args.sizeInches.heightInches)
      : createTopLoopSegments(loopInches, args.sizeInches.heightInches),
  );
}

function createTopBottomAndVerticalCornerLoopSegments(
  loopInches: readonly Point2DInches[],
  heightInches: number,
): readonly PrimitiveEdgeSegmentInches[] {
  if (loopInches.length < 2) {
    return [];
  }

  const topZInches = heightInches / 2 + COUNTERTOP_EDGE_Z_OFFSET_INCHES;
  const bottomZInches = -heightInches / 2 - COUNTERTOP_EDGE_Z_OFFSET_INCHES;
  const edgeSegments: PrimitiveEdgeSegmentInches[] = [];

  loopInches.forEach((startPointInches, pointIndex) => {
    const endPointInches = loopInches[(pointIndex + 1) % loopInches.length];

    edgeSegments.push(
      createSegment(startPointInches, topZInches, endPointInches, topZInches),
      createSegment(startPointInches, bottomZInches, endPointInches, bottomZInches),
    );

    if (isBoundaryCorner(loopInches, pointIndex)) {
      edgeSegments.push(createSegment(startPointInches, bottomZInches, startPointInches, topZInches));
    }
  });

  return edgeSegments;
}

function createTopLoopSegments(
  loopInches: readonly Point2DInches[],
  heightInches: number,
): readonly PrimitiveEdgeSegmentInches[] {
  if (loopInches.length < 2) {
    return [];
  }

  const topZInches = heightInches / 2 + COUNTERTOP_EDGE_Z_OFFSET_INCHES;

  return loopInches.map((startPointInches, pointIndex) =>
    createSegment(startPointInches, topZInches, loopInches[(pointIndex + 1) % loopInches.length], topZInches),
  );
}

function createSegment(
  startPointInches: Point2DInches,
  startZInches: number,
  endPointInches: Point2DInches,
  endZInches: number,
): PrimitiveEdgeSegmentInches {
  return {
    startInches: {
      xInches: startPointInches.xInches,
      yInches: startPointInches.yInches,
      zInches: startZInches,
    },
    endInches: {
      xInches: endPointInches.xInches,
      yInches: endPointInches.yInches,
      zInches: endZInches,
    },
  };
}

function doesLoopTouchCountertopBounds(
  loopInches: readonly Point2DInches[],
  countertopSizeInches: Size3DInches,
): boolean {
  const halfWidthInches = countertopSizeInches.widthInches / 2;
  const halfDepthInches = countertopSizeInches.depthInches / 2;

  return loopInches.some(
    (pointInches) =>
      Math.abs(pointInches.xInches + halfWidthInches) <= BOUNDS_TOUCH_EPSILON_INCHES ||
      Math.abs(pointInches.xInches - halfWidthInches) <= BOUNDS_TOUCH_EPSILON_INCHES ||
      Math.abs(pointInches.yInches + halfDepthInches) <= BOUNDS_TOUCH_EPSILON_INCHES ||
      Math.abs(pointInches.yInches - halfDepthInches) <= BOUNDS_TOUCH_EPSILON_INCHES,
  );
}

function isBoundaryCorner(loopInches: readonly Point2DInches[], pointIndex: number): boolean {
  if (loopInches.length < 3) {
    return false;
  }

  const previousPointInches = loopInches[(pointIndex - 1 + loopInches.length) % loopInches.length];
  const currentPointInches = loopInches[pointIndex];
  const nextPointInches = loopInches[(pointIndex + 1) % loopInches.length];

  const incomingXInches = currentPointInches.xInches - previousPointInches.xInches;
  const incomingYInches = currentPointInches.yInches - previousPointInches.yInches;
  const outgoingXInches = nextPointInches.xInches - currentPointInches.xInches;
  const outgoingYInches = nextPointInches.yInches - currentPointInches.yInches;
  const incomingLengthInches = Math.hypot(incomingXInches, incomingYInches);
  const outgoingLengthInches = Math.hypot(outgoingXInches, outgoingYInches);

  if (
    incomingLengthInches <= BOUNDARY_CORNER_EPSILON_INCHES ||
    outgoingLengthInches <= BOUNDARY_CORNER_EPSILON_INCHES
  ) {
    return false;
  }

  const normalizedCross = Math.abs(
    (incomingXInches * outgoingYInches - incomingYInches * outgoingXInches) /
      (incomingLengthInches * outgoingLengthInches),
  );
  const dot = incomingXInches * outgoingXInches + incomingYInches * outgoingYInches;

  return normalizedCross > BOUNDARY_CORNER_EPSILON_INCHES || dot < 0;
}
