import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallFootprint } from "../footprint/wallFootprintTypes";
import { getClosedPolygonEdges } from "../footprint/wallFootprintGeometry";

const MIN_DEFAULT_VIEWABLE_EDGE_LENGTH_INCHES = 12;
const OUTER_BOUNDARY_EPSILON_INCHES = 0.25;
const LONG_EDGE_RATIO = 0.8;

export function getDefaultWallViewableEdgeIndices(
  footprint: WallFootprint,
): readonly number[] {
  const edges = getClosedPolygonEdges(footprint.boundaryPointsInches).map((edge, edgeIndex) => ({
    ...edge,
    edgeIndex,
    lengthInches: getPoint3DDistanceInches(edge.startPointInches, edge.endPointInches),
  }));

  if (edges.length === 0) {
    return [];
  }

  const measurableEdges = edges.filter(
    (edge) => edge.lengthInches >= MIN_DEFAULT_VIEWABLE_EDGE_LENGTH_INCHES,
  );
  const candidateEdges = measurableEdges.length > 0 ? measurableEdges : edges;
  const bounds = getFootprintBounds(footprint.boundaryPointsInches);
  const interiorEdges = candidateEdges.filter(
    (edge) => !isEdgeOnOuterBounds({
      startPointInches: edge.startPointInches,
      endPointInches: edge.endPointInches,
      bounds,
    }),
  );

  if (interiorEdges.length > 0) {
    return interiorEdges.map((edge) => edge.edgeIndex);
  }

  const longestLengthInches = Math.max(...candidateEdges.map((edge) => edge.lengthInches));
  return candidateEdges
    .filter((edge) => edge.lengthInches >= longestLengthInches * LONG_EDGE_RATIO)
    .map((edge) => edge.edgeIndex);
}

export function getSplitWallViewableEdgeIndices(args: {
  sourceFootprint: WallFootprint;
  splitFootprint: WallFootprint;
}): readonly number[] {
  const sourceEdges = getClosedPolygonEdges(args.sourceFootprint.boundaryPointsInches);
  const sourceViewableEdgeIndices = getDefaultWallViewableEdgeIndices(args.sourceFootprint);
  const sourceViewableEdges = sourceViewableEdgeIndices.map((edgeIndex) => sourceEdges[edgeIndex]);
  const splitEdges = getClosedPolygonEdges(args.splitFootprint.boundaryPointsInches);
  const splitViewableEdgeIndices = splitEdges.flatMap((splitEdge, splitEdgeIndex) => {
    const matchesSourceViewableEdge = sourceViewableEdges.some((sourceEdge) =>
      isSegmentOnSourceEdge({
        sourceStartPointInches: sourceEdge.startPointInches,
        sourceEndPointInches: sourceEdge.endPointInches,
        splitStartPointInches: splitEdge.startPointInches,
        splitEndPointInches: splitEdge.endPointInches,
      }),
    );

    return matchesSourceViewableEdge ? [splitEdgeIndex] : [];
  });

  return splitViewableEdgeIndices.length > 0
    ? splitViewableEdgeIndices
    : getDefaultWallViewableEdgeIndices(args.splitFootprint);
}

type WallFootprintBounds = Readonly<{
  minXInches: number;
  maxXInches: number;
  minYInches: number;
  maxYInches: number;
}>;

function getFootprintBounds(pointsInches: readonly Point3DInches[]): WallFootprintBounds {
  return {
    minXInches: Math.min(...pointsInches.map((point) => point.xInches)),
    maxXInches: Math.max(...pointsInches.map((point) => point.xInches)),
    minYInches: Math.min(...pointsInches.map((point) => point.yInches)),
    maxYInches: Math.max(...pointsInches.map((point) => point.yInches)),
  };
}

function isEdgeOnOuterBounds(args: {
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  bounds: WallFootprintBounds;
}): boolean {
  return (
    areAlmostEqual(args.startPointInches.xInches, args.bounds.minXInches) &&
      areAlmostEqual(args.endPointInches.xInches, args.bounds.minXInches)
  ) || (
    areAlmostEqual(args.startPointInches.xInches, args.bounds.maxXInches) &&
      areAlmostEqual(args.endPointInches.xInches, args.bounds.maxXInches)
  ) || (
    areAlmostEqual(args.startPointInches.yInches, args.bounds.minYInches) &&
      areAlmostEqual(args.endPointInches.yInches, args.bounds.minYInches)
  ) || (
    areAlmostEqual(args.startPointInches.yInches, args.bounds.maxYInches) &&
      areAlmostEqual(args.endPointInches.yInches, args.bounds.maxYInches)
  );
}

function areAlmostEqual(firstValueInches: number, secondValueInches: number): boolean {
  return Math.abs(firstValueInches - secondValueInches) <= OUTER_BOUNDARY_EPSILON_INCHES;
}

function isSegmentOnSourceEdge(args: {
  sourceStartPointInches: Point3DInches;
  sourceEndPointInches: Point3DInches;
  splitStartPointInches: Point3DInches;
  splitEndPointInches: Point3DInches;
}): boolean {
  const sourceXInches = args.sourceEndPointInches.xInches - args.sourceStartPointInches.xInches;
  const sourceYInches = args.sourceEndPointInches.yInches - args.sourceStartPointInches.yInches;
  const sourceLengthSquaredInches = sourceXInches * sourceXInches + sourceYInches * sourceYInches;

  if (sourceLengthSquaredInches <= OUTER_BOUNDARY_EPSILON_INCHES) {
    return false;
  }

  return (
    isPointOnSourceEdge({
      pointInches: args.splitStartPointInches,
      sourceStartPointInches: args.sourceStartPointInches,
      sourceXInches,
      sourceYInches,
      sourceLengthSquaredInches,
    }) &&
    isPointOnSourceEdge({
      pointInches: args.splitEndPointInches,
      sourceStartPointInches: args.sourceStartPointInches,
      sourceXInches,
      sourceYInches,
      sourceLengthSquaredInches,
    })
  );
}

function isPointOnSourceEdge(args: {
  pointInches: Point3DInches;
  sourceStartPointInches: Point3DInches;
  sourceXInches: number;
  sourceYInches: number;
  sourceLengthSquaredInches: number;
}): boolean {
  const pointXInches = args.pointInches.xInches - args.sourceStartPointInches.xInches;
  const pointYInches = args.pointInches.yInches - args.sourceStartPointInches.yInches;
  const crossProductInches = pointXInches * args.sourceYInches - pointYInches * args.sourceXInches;

  if (Math.abs(crossProductInches) > OUTER_BOUNDARY_EPSILON_INCHES) {
    return false;
  }

  const t = (
    pointXInches * args.sourceXInches + pointYInches * args.sourceYInches
  ) / args.sourceLengthSquaredInches;

  return (
    t >= -OUTER_BOUNDARY_EPSILON_INCHES &&
    t <= 1 + OUTER_BOUNDARY_EPSILON_INCHES
  );
}
