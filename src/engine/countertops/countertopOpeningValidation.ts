import type { Point2DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { CountertopOpening, CountertopOpeningShape } from "./countertopOpeningTypes";
import { MIN_COUNTERTOP_OPENING_SIZE_INCHES } from "./countertopOpeningFactory";
import {
  clipCountertopOpeningPolygonToHost,
  createCountertopBounds,
  createCountertopOpeningRequestedPolygon,
  getCountertopOpeningShapeBounds,
} from "./countertopOpeningGeometry";

export function doesCountertopOpeningIntersectHost(
  opening: CountertopOpening,
  countertopSizeInches: Size3DInches,
): boolean {
  return clipCountertopOpeningPolygonToHost(
    createCountertopOpeningRequestedPolygon(opening),
    countertopSizeInches,
  ).length >= 3;
}

export function clampCountertopOpeningToHost(
  opening: CountertopOpening,
  countertopSizeInches: Size3DInches,
): CountertopOpening {
  const shape = clampCountertopOpeningShapeToHostFromCenter(opening, countertopSizeInches);

  return {
    ...opening,
    shape,
    localCenterInches: clampCountertopOpeningCenterForShape(
      opening.localCenterInches,
      shape,
      countertopSizeInches,
    ),
  };
}

export function clampCountertopOpeningCenterToHost(
  opening: CountertopOpening,
  countertopSizeInches: Size3DInches,
): CountertopOpening {
  return {
    ...opening,
    localCenterInches: clampCountertopOpeningCenterForShape(
      opening.localCenterInches,
      opening.shape,
      countertopSizeInches,
    ),
  };
}

export function clampCountertopOpeningCenterForShape(
  pointInches: Point2DInches,
  shape: CountertopOpeningShape,
  countertopSizeInches: Size3DInches,
): Point2DInches {
  const hostBounds = createCountertopBounds(countertopSizeInches);
  const shapeBounds = getCountertopOpeningShapeBounds(shape);
  const minXInches = hostBounds.leftInches - shapeBounds.leftInches;
  const maxXInches = hostBounds.rightInches - shapeBounds.rightInches;
  const minYInches = hostBounds.backInches - shapeBounds.backInches;
  const maxYInches = hostBounds.frontInches - shapeBounds.frontInches;

  return {
    xInches: clampNumber(pointInches.xInches, minXInches, maxXInches),
    yInches: clampNumber(pointInches.yInches, minYInches, maxYInches),
  };
}

export function clampPointToCountertopFootprint(
  pointInches: Point2DInches,
  countertopSizeInches: Size3DInches,
): Point2DInches {
  const hostBounds = createCountertopBounds(countertopSizeInches);

  return {
    xInches: clampNumber(pointInches.xInches, hostBounds.leftInches, hostBounds.rightInches),
    yInches: clampNumber(pointInches.yInches, hostBounds.backInches, hostBounds.frontInches),
  };
}

export function clampRectangleSizeToHostFromCenter(args: {
  centerInches: Point2DInches;
  widthInches: number;
  depthInches: number;
  countertopSizeInches: Size3DInches;
}): Readonly<{ widthInches: number; depthInches: number }> {
  const hostBounds = createCountertopBounds(args.countertopSizeInches);
  const maxWidthInches = Math.max(
    MIN_COUNTERTOP_OPENING_SIZE_INCHES,
    2 * Math.min(
      args.centerInches.xInches - hostBounds.leftInches,
      hostBounds.rightInches - args.centerInches.xInches,
    ),
  );
  const maxDepthInches = Math.max(
    MIN_COUNTERTOP_OPENING_SIZE_INCHES,
    2 * Math.min(
      args.centerInches.yInches - hostBounds.backInches,
      hostBounds.frontInches - args.centerInches.yInches,
    ),
  );

  return {
    widthInches: clampNumber(
      args.widthInches,
      MIN_COUNTERTOP_OPENING_SIZE_INCHES,
      maxWidthInches,
    ),
    depthInches: clampNumber(
      args.depthInches,
      MIN_COUNTERTOP_OPENING_SIZE_INCHES,
      maxDepthInches,
    ),
  };
}

function clampCountertopOpeningShapeToHostFromCenter(
  opening: CountertopOpening,
  countertopSizeInches: Size3DInches,
): CountertopOpeningShape {
  const fittedSizeInches = clampRectangleSizeToHostFromCenter({
    centerInches: opening.localCenterInches,
    widthInches: opening.shape.widthInches,
    depthInches: opening.shape.depthInches,
    countertopSizeInches,
  });

  return {
    kind: "rectangle",
    widthInches: fittedSizeInches.widthInches,
    depthInches: fittedSizeInches.depthInches,
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (min > max) {
    return (min + max) / 2;
  }

  return Math.min(Math.max(value, min), max);
}
