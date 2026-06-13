import type { Point2DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { CountertopOpening, CountertopOpeningShape } from "./countertopOpeningTypes";

const MIN_POLYGON_AREA_INCHES = 0.01;

export type CountertopOpeningBoundsInches = Readonly<{
  leftInches: number;
  rightInches: number;
  backInches: number;
  frontInches: number;
}>;

export function createCountertopOpeningRequestedPolygon(
  opening: CountertopOpening,
): readonly Point2DInches[] {
  return createCountertopOpeningShapePolygon({
    localCenterInches: opening.localCenterInches,
    localRotationDegrees: opening.localRotationDegrees,
    shape: opening.shape,
  });
}

export function createCountertopOpeningShapePolygon(args: {
  localCenterInches: Point2DInches;
  localRotationDegrees: number;
  shape: CountertopOpeningShape;
}): readonly Point2DInches[] {
  return createRectanglePolygon(args);
}

export function createCountertopOpeningClippedPolygon(
  opening: CountertopOpening,
  countertopSizeInches: Size3DInches,
): readonly Point2DInches[] {
  return clipCountertopOpeningPolygonToHost(
    createCountertopOpeningRequestedPolygon(opening),
    countertopSizeInches,
  );
}

export function clipCountertopOpeningPolygonToHost(
  polygonInches: readonly Point2DInches[],
  countertopSizeInches: Size3DInches,
): readonly Point2DInches[] {
  const clippedPolygonInches = clipPolygonAgainstCountertopBounds(
    polygonInches,
    createCountertopBounds(countertopSizeInches),
  );

  return getPolygonAreaInches(clippedPolygonInches) > MIN_POLYGON_AREA_INCHES
    ? clippedPolygonInches
    : [];
}

export function clipPolygonAgainstCountertopBounds(
  polygonInches: readonly Point2DInches[],
  bounds: CountertopOpeningBoundsInches,
): readonly Point2DInches[] {
  return clipPolygonAgainstEdge(
    clipPolygonAgainstEdge(
      clipPolygonAgainstEdge(
        clipPolygonAgainstEdge(
          polygonInches,
          (point) => point.xInches >= bounds.leftInches,
          (start, end) => intersectVerticalLine(start, end, bounds.leftInches),
        ),
        (point) => point.xInches <= bounds.rightInches,
        (start, end) => intersectVerticalLine(start, end, bounds.rightInches),
      ),
      (point) => point.yInches >= bounds.backInches,
      (start, end) => intersectHorizontalLine(start, end, bounds.backInches),
    ),
    (point) => point.yInches <= bounds.frontInches,
    (start, end) => intersectHorizontalLine(start, end, bounds.frontInches),
  );
}

export function createCountertopBounds(
  countertopSizeInches: Size3DInches,
): CountertopOpeningBoundsInches {
  const halfWidthInches = countertopSizeInches.widthInches / 2;
  const halfDepthInches = countertopSizeInches.depthInches / 2;

  return {
    leftInches: -halfWidthInches,
    rightInches: halfWidthInches,
    backInches: -halfDepthInches,
    frontInches: halfDepthInches,
  };
}

export function getCountertopOpeningPolygonBounds(
  polygonInches: readonly Point2DInches[],
): CountertopOpeningBoundsInches | null {
  if (polygonInches.length === 0) {
    return null;
  }

  return polygonInches.reduce<CountertopOpeningBoundsInches>(
    (bounds, pointInches) => ({
      leftInches: Math.min(bounds.leftInches, pointInches.xInches),
      rightInches: Math.max(bounds.rightInches, pointInches.xInches),
      backInches: Math.min(bounds.backInches, pointInches.yInches),
      frontInches: Math.max(bounds.frontInches, pointInches.yInches),
    }),
    {
      leftInches: polygonInches[0].xInches,
      rightInches: polygonInches[0].xInches,
      backInches: polygonInches[0].yInches,
      frontInches: polygonInches[0].yInches,
    },
  );
}

export function getCountertopOpeningShapeBounds(
  shape: CountertopOpeningShape,
): CountertopOpeningBoundsInches {
  return {
    leftInches: -shape.widthInches / 2,
    rightInches: shape.widthInches / 2,
    backInches: -shape.depthInches / 2,
    frontInches: shape.depthInches / 2,
  };
}

export function getCountertopOpeningShapeSize(shape: CountertopOpeningShape): Readonly<{
  widthInches: number;
  depthInches: number;
}> {
  return {
    widthInches: shape.widthInches,
    depthInches: shape.depthInches,
  };
}

export function getPolygonAreaInches(polygonInches: readonly Point2DInches[]): number {
  if (polygonInches.length < 3) {
    return 0;
  }

  let doubledAreaInches = 0;

  polygonInches.forEach((pointInches, pointIndex) => {
    const nextPointInches = polygonInches[(pointIndex + 1) % polygonInches.length];
    doubledAreaInches +=
      pointInches.xInches * nextPointInches.yInches -
      nextPointInches.xInches * pointInches.yInches;
  });

  return Math.abs(doubledAreaInches) / 2;
}

function createRectanglePolygon(args: {
  localCenterInches: Point2DInches;
  localRotationDegrees: number;
  shape: CountertopOpeningShape;
}): readonly Point2DInches[] {
  const halfWidthInches = args.shape.widthInches / 2;
  const halfDepthInches = args.shape.depthInches / 2;

  return [
    rotateOpeningPoint(args.localCenterInches, args.localRotationDegrees, -halfWidthInches, -halfDepthInches),
    rotateOpeningPoint(args.localCenterInches, args.localRotationDegrees, halfWidthInches, -halfDepthInches),
    rotateOpeningPoint(args.localCenterInches, args.localRotationDegrees, halfWidthInches, halfDepthInches),
    rotateOpeningPoint(args.localCenterInches, args.localRotationDegrees, -halfWidthInches, halfDepthInches),
  ];
}

function rotateOpeningPoint(
  localCenterInches: Point2DInches,
  localRotationDegrees: number,
  localXInches: number,
  localYInches: number,
): Point2DInches {
  const radians = (-localRotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xInches: localCenterInches.xInches + localXInches * cos - localYInches * sin,
    yInches: localCenterInches.yInches + localXInches * sin + localYInches * cos,
  };
}

function clipPolygonAgainstEdge(
  polygonInches: readonly Point2DInches[],
  isInside: (pointInches: Point2DInches) => boolean,
  findIntersection: (startInches: Point2DInches, endInches: Point2DInches) => Point2DInches,
): readonly Point2DInches[] {
  if (polygonInches.length === 0) {
    return [];
  }

  const clippedPolygonInches: Point2DInches[] = [];
  let previousPointInches = polygonInches[polygonInches.length - 1];
  let previousPointInside = isInside(previousPointInches);

  polygonInches.forEach((currentPointInches) => {
    const currentPointInside = isInside(currentPointInches);

    if (currentPointInside) {
      if (!previousPointInside) {
        clippedPolygonInches.push(findIntersection(previousPointInches, currentPointInches));
      }

      clippedPolygonInches.push(currentPointInches);
    } else if (previousPointInside) {
      clippedPolygonInches.push(findIntersection(previousPointInches, currentPointInches));
    }

    previousPointInches = currentPointInches;
    previousPointInside = currentPointInside;
  });

  return clippedPolygonInches;
}

function intersectVerticalLine(
  startInches: Point2DInches,
  endInches: Point2DInches,
  xInches: number,
): Point2DInches {
  const deltaXInches = endInches.xInches - startInches.xInches;
  const ratio = deltaXInches === 0 ? 0 : (xInches - startInches.xInches) / deltaXInches;

  return {
    xInches,
    yInches: startInches.yInches + (endInches.yInches - startInches.yInches) * ratio,
  };
}

function intersectHorizontalLine(
  startInches: Point2DInches,
  endInches: Point2DInches,
  yInches: number,
): Point2DInches {
  const deltaYInches = endInches.yInches - startInches.yInches;
  const ratio = deltaYInches === 0 ? 0 : (yInches - startInches.yInches) / deltaYInches;

  return {
    xInches: startInches.xInches + (endInches.xInches - startInches.xInches) * ratio,
    yInches,
  };
}
