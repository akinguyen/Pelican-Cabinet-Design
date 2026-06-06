import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import type { WallFootprint } from "../footprint/wallFootprintTypes";
import { createWallFootprint } from "../footprint/wallFootprintFactory";
import {
  doWallFootprintSegmentsIntersect,
  getClosedPolygonEdges,
  isPointInsidePolygon,
} from "../footprint/wallFootprintGeometry";
import type { WallSplitAnchor } from "./wallSplitDraftTypes";

const MIN_WALL_SPLIT_LENGTH_INCHES = 0.5;

export function splitWallFootprintByStraightCut(args: {
  placedWall: PlacedWall;
  startAnchor: WallSplitAnchor;
  endAnchor: WallSplitAnchor;
}): readonly [WallFootprint, WallFootprint] | null {
  if (
    getPoint3DDistanceInches(args.startAnchor.pointInches, args.endAnchor.pointInches) <
    MIN_WALL_SPLIT_LENGTH_INCHES
  ) {
    return null;
  }

  if (isCutAlongExistingBoundary(args)) {
    return null;
  }

  if (!isStraightCutInsideFootprint(args)) {
    return null;
  }

  const boundaryWithAnchors = insertSplitAnchors({
    boundaryPointsInches: args.placedWall.footprint.boundaryPointsInches,
    startAnchor: args.startAnchor,
    endAnchor: args.endAnchor,
  });

  if (boundaryWithAnchors === null || boundaryWithAnchors.startIndex === boundaryWithAnchors.endIndex) {
    return null;
  }

  const boundaryStartToEnd = getBoundaryPath({
    boundaryPointsInches: boundaryWithAnchors.boundaryPointsInches,
    startIndex: boundaryWithAnchors.startIndex,
    endIndex: boundaryWithAnchors.endIndex,
  });
  const boundaryEndToStart = getBoundaryPath({
    boundaryPointsInches: boundaryWithAnchors.boundaryPointsInches,
    startIndex: boundaryWithAnchors.endIndex,
    endIndex: boundaryWithAnchors.startIndex,
  });
  const firstFootprint = createWallFootprint(boundaryStartToEnd);
  const secondFootprint = createWallFootprint([
    args.startAnchor.pointInches,
    args.endAnchor.pointInches,
    ...boundaryEndToStart.slice(1, -1),
  ]);

  if (firstFootprint === null || secondFootprint === null) {
    return null;
  }

  return [firstFootprint, secondFootprint];
}

function isCutAlongExistingBoundary(args: {
  startAnchor: WallSplitAnchor;
  endAnchor: WallSplitAnchor;
}): boolean {
  return (
    args.startAnchor.edgeStartIndex === args.endAnchor.edgeStartIndex &&
    args.startAnchor.edgeEndIndex === args.endAnchor.edgeEndIndex
  );
}

function isStraightCutInsideFootprint(args: {
  placedWall: PlacedWall;
  startAnchor: WallSplitAnchor;
  endAnchor: WallSplitAnchor;
}): boolean {
  const midpointInches = {
    xInches: (args.startAnchor.pointInches.xInches + args.endAnchor.pointInches.xInches) / 2,
    yInches: (args.startAnchor.pointInches.yInches + args.endAnchor.pointInches.yInches) / 2,
    zInches: 0,
  };

  if (
    !isPointInsidePolygon({
      pointInches: midpointInches,
      polygonInches: args.placedWall.footprint.boundaryPointsInches,
    })
  ) {
    return false;
  }

  return !doesCutCrossBoundary(args);
}

function doesCutCrossBoundary(args: {
  placedWall: PlacedWall;
  startAnchor: WallSplitAnchor;
  endAnchor: WallSplitAnchor;
}): boolean {
  const cutEdge = {
    startPointInches: args.startAnchor.pointInches,
    endPointInches: args.endAnchor.pointInches,
  };

  return getClosedPolygonEdges(args.placedWall.footprint.boundaryPointsInches).some((edge, edgeIndex) => {
    if (edgeIndex === args.startAnchor.edgeStartIndex || edgeIndex === args.endAnchor.edgeStartIndex) {
      return false;
    }

    return doWallFootprintSegmentsIntersect(cutEdge, edge);
  });
}

function insertSplitAnchors(args: {
  boundaryPointsInches: readonly Point3DInches[];
  startAnchor: WallSplitAnchor;
  endAnchor: WallSplitAnchor;
}): Readonly<{
  boundaryPointsInches: readonly Point3DInches[];
  startIndex: number;
  endIndex: number;
}> | null {
  const insertionsByEdgeIndex = new Map<
    number,
    readonly Readonly<{
      key: "start" | "end";
      pointInches: Point3DInches;
      edgeT: number;
    }>[]
  >();
  let startIndex: number | null = null;
  let endIndex: number | null = null;

  [
    { key: "start" as const, anchor: args.startAnchor },
    { key: "end" as const, anchor: args.endAnchor },
  ].forEach(({ key, anchor }) => {
    if (anchor.pointKind === "vertex") {
      const pointIndex = anchor.edgeEndIndex;

      if (key === "start") {
        startIndex = pointIndex;
      } else {
        endIndex = pointIndex;
      }
      return;
    }

    const edgeLengthInches = getPoint3DDistanceInches(
      anchor.edgeStartPointInches,
      anchor.edgeEndPointInches,
    );
    const edgeT = edgeLengthInches <= 0
      ? 0
      : getPoint3DDistanceInches(anchor.edgeStartPointInches, anchor.pointInches) / edgeLengthInches;
    const currentInsertions = insertionsByEdgeIndex.get(anchor.edgeStartIndex) ?? [];
    insertionsByEdgeIndex.set(anchor.edgeStartIndex, [
      ...currentInsertions,
      {
        key,
        pointInches: anchor.pointInches,
        edgeT,
      },
    ]);
  });

  const boundaryPointsInches: Point3DInches[] = [];
  const originalIndexToBoundaryIndex = new Map<number, number>();

  args.boundaryPointsInches.forEach((pointInches, pointIndex) => {
    originalIndexToBoundaryIndex.set(pointIndex, boundaryPointsInches.length);
    boundaryPointsInches.push(pointInches);

    const insertions = [...(insertionsByEdgeIndex.get(pointIndex) ?? [])].sort(
      (firstInsertion, secondInsertion) => firstInsertion.edgeT - secondInsertion.edgeT,
    );

    insertions.forEach((insertion) => {
      const insertedIndex = boundaryPointsInches.length;
      boundaryPointsInches.push(insertion.pointInches);

      if (insertion.key === "start") {
        startIndex = insertedIndex;
      } else {
        endIndex = insertedIndex;
      }
    });
  });

  if (args.startAnchor.pointKind === "vertex") {
    startIndex = originalIndexToBoundaryIndex.get(args.startAnchor.edgeEndIndex) ?? null;
  }

  if (args.endAnchor.pointKind === "vertex") {
    endIndex = originalIndexToBoundaryIndex.get(args.endAnchor.edgeEndIndex) ?? null;
  }

  if (startIndex === null || endIndex === null) {
    return null;
  }

  return {
    boundaryPointsInches,
    startIndex,
    endIndex,
  };
}

function getBoundaryPath(args: {
  boundaryPointsInches: readonly Point3DInches[];
  startIndex: number;
  endIndex: number;
}): readonly Point3DInches[] {
  const pointsInches: Point3DInches[] = [];
  let pointIndex = args.startIndex;

  while (true) {
    pointsInches.push(args.boundaryPointsInches[pointIndex]);

    if (pointIndex === args.endIndex) {
      return pointsInches;
    }

    pointIndex = (pointIndex + 1) % args.boundaryPointsInches.length;
  }
}
