import type { Point2DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import { createCountertopBounds, getPolygonAreaInches } from "./countertopOpeningGeometry";

const COORDINATE_KEY_PRECISION = 6;
const MIN_CELL_SIZE_INCHES = 0.001;
const MIN_LOOP_AREA_INCHES = 0.01;

type CountertopCellKey = string;

type CountertopGrid = Readonly<{
  xCoordinatesInches: readonly number[];
  yCoordinatesInches: readonly number[];
  removedCellKeys: ReadonlySet<CountertopCellKey>;
  solidCellKeys: ReadonlySet<CountertopCellKey>;
  columnCount: number;
  rowCount: number;
}>;

export type CountertopBoundarySegmentInches = Readonly<{
  startInches: Point2DInches;
  endInches: Point2DInches;
}>;

export function createCountertopSolidAreaLoops(args: {
  countertopSizeInches: Size3DInches;
  removedPolygonsInches: readonly (readonly Point2DInches[])[];
}): readonly (readonly Point2DInches[])[] {
  const grid = createCountertopCutoutGrid(args);
  const solidBoundaryEdges = createCellBoundaryEdges({
    cellKeys: grid.solidCellKeys,
    oppositeCellKeys: grid.removedCellKeys,
    columnCount: grid.columnCount,
    rowCount: grid.rowCount,
    xCoordinatesInches: grid.xCoordinatesInches,
    yCoordinatesInches: grid.yCoordinatesInches,
    includeOuterBoundary: true,
  });

  return createBoundaryLoops(solidBoundaryEdges);
}

export function createCountertopRemovedAreaBoundarySegments(args: {
  countertopSizeInches: Size3DInches;
  removedPolygonsInches: readonly (readonly Point2DInches[])[];
}): readonly CountertopBoundarySegmentInches[] {
  const grid = createCountertopCutoutGrid(args);
  const removedToSolidEdges = createCellBoundaryEdges({
    cellKeys: grid.removedCellKeys,
    oppositeCellKeys: grid.solidCellKeys,
    columnCount: grid.columnCount,
    rowCount: grid.rowCount,
    xCoordinatesInches: grid.xCoordinatesInches,
    yCoordinatesInches: grid.yCoordinatesInches,
    includeOuterBoundary: false,
  });

  return mergeBoundarySegments(removedToSolidEdges);
}

function createCountertopCutoutGrid(args: {
  countertopSizeInches: Size3DInches;
  removedPolygonsInches: readonly (readonly Point2DInches[])[];
}): CountertopGrid {
  const bounds = createCountertopBounds(args.countertopSizeInches);
  const validRemovedPolygonsInches = args.removedPolygonsInches.filter(
    (polygonInches) => polygonInches.length >= 3 && getPolygonAreaInches(polygonInches) > MIN_LOOP_AREA_INCHES,
  );
  const xCoordinateSet = new Set<number>([bounds.leftInches, bounds.rightInches]);
  const yCoordinateSet = new Set<number>([bounds.backInches, bounds.frontInches]);

  validRemovedPolygonsInches.forEach((polygonInches) => {
    polygonInches.forEach((pointInches) => {
      xCoordinateSet.add(clampNumber(pointInches.xInches, bounds.leftInches, bounds.rightInches));
      yCoordinateSet.add(clampNumber(pointInches.yInches, bounds.backInches, bounds.frontInches));
    });
  });

  const xCoordinatesInches = [...xCoordinateSet]
    .sort((a, b) => a - b)
    .filter((xInches, index, coordinates) => index === 0 || Math.abs(xInches - coordinates[index - 1]) > MIN_CELL_SIZE_INCHES);
  const yCoordinatesInches = [...yCoordinateSet]
    .sort((a, b) => a - b)
    .filter((yInches, index, coordinates) => index === 0 || Math.abs(yInches - coordinates[index - 1]) > MIN_CELL_SIZE_INCHES);
  const removedCellKeys = new Set<CountertopCellKey>();
  const solidCellKeys = new Set<CountertopCellKey>();
  const columnCount = Math.max(0, xCoordinatesInches.length - 1);
  const rowCount = Math.max(0, yCoordinatesInches.length - 1);

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const leftInches = xCoordinatesInches[columnIndex];
      const rightInches = xCoordinatesInches[columnIndex + 1];
      const backInches = yCoordinatesInches[rowIndex];
      const frontInches = yCoordinatesInches[rowIndex + 1];

      if (
        rightInches - leftInches <= MIN_CELL_SIZE_INCHES ||
        frontInches - backInches <= MIN_CELL_SIZE_INCHES
      ) {
        continue;
      }

      const centerInches = {
        xInches: (leftInches + rightInches) / 2,
        yInches: (backInches + frontInches) / 2,
      };
      const cellKey = createCellKey(columnIndex, rowIndex);
      const isRemoved = validRemovedPolygonsInches.some((polygonInches) =>
        isPointInsidePolygon(centerInches, polygonInches),
      );

      if (isRemoved) {
        removedCellKeys.add(cellKey);
      } else {
        solidCellKeys.add(cellKey);
      }
    }
  }

  return {
    xCoordinatesInches,
    yCoordinatesInches,
    removedCellKeys,
    solidCellKeys,
    columnCount,
    rowCount,
  };
}

function createCellBoundaryEdges(args: {
  cellKeys: ReadonlySet<CountertopCellKey>;
  oppositeCellKeys: ReadonlySet<CountertopCellKey>;
  columnCount: number;
  rowCount: number;
  xCoordinatesInches: readonly number[];
  yCoordinatesInches: readonly number[];
  includeOuterBoundary: boolean;
}): readonly CountertopBoundarySegmentInches[] {
  const boundaryEdges: CountertopBoundarySegmentInches[] = [];

  args.cellKeys.forEach((cellKey) => {
    const [columnIndex, rowIndex] = parseCellKey(cellKey);
    const leftInches = args.xCoordinatesInches[columnIndex];
    const rightInches = args.xCoordinatesInches[columnIndex + 1];
    const backInches = args.yCoordinatesInches[rowIndex];
    const frontInches = args.yCoordinatesInches[rowIndex + 1];

    if (shouldCreateBoundaryEdge(args, columnIndex, rowIndex - 1)) {
      boundaryEdges.push({
        startInches: { xInches: leftInches, yInches: backInches },
        endInches: { xInches: rightInches, yInches: backInches },
      });
    }

    if (shouldCreateBoundaryEdge(args, columnIndex + 1, rowIndex)) {
      boundaryEdges.push({
        startInches: { xInches: rightInches, yInches: backInches },
        endInches: { xInches: rightInches, yInches: frontInches },
      });
    }

    if (shouldCreateBoundaryEdge(args, columnIndex, rowIndex + 1)) {
      boundaryEdges.push({
        startInches: { xInches: rightInches, yInches: frontInches },
        endInches: { xInches: leftInches, yInches: frontInches },
      });
    }

    if (shouldCreateBoundaryEdge(args, columnIndex - 1, rowIndex)) {
      boundaryEdges.push({
        startInches: { xInches: leftInches, yInches: frontInches },
        endInches: { xInches: leftInches, yInches: backInches },
      });
    }
  });

  return boundaryEdges;
}

function shouldCreateBoundaryEdge(
  args: {
    cellKeys: ReadonlySet<CountertopCellKey>;
    oppositeCellKeys: ReadonlySet<CountertopCellKey>;
    columnCount: number;
    rowCount: number;
    includeOuterBoundary: boolean;
  },
  columnIndex: number,
  rowIndex: number,
): boolean {
  if (
    columnIndex < 0 ||
    columnIndex >= args.columnCount ||
    rowIndex < 0 ||
    rowIndex >= args.rowCount
  ) {
    return args.includeOuterBoundary;
  }

  const neighborKey = createCellKey(columnIndex, rowIndex);

  return args.oppositeCellKeys.has(neighborKey) || !args.cellKeys.has(neighborKey);
}

function createBoundaryLoops(
  boundaryEdges: readonly CountertopBoundarySegmentInches[],
): readonly (readonly Point2DInches[])[] {
  const edgesByStartKey = new Map<string, CountertopBoundarySegmentInches[]>();

  boundaryEdges.forEach((edge) => {
    const startKey = createPointKey(edge.startInches);
    const edges = edgesByStartKey.get(startKey) ?? [];
    edges.push(edge);
    edgesByStartKey.set(startKey, edges);
  });

  const loops: Point2DInches[][] = [];

  while (edgesByStartKey.size > 0) {
    const firstEntry = edgesByStartKey.entries().next().value as
      | [string, CountertopBoundarySegmentInches[]]
      | undefined;

    if (firstEntry === undefined) {
      break;
    }

    const firstEdge = firstEntry[1][0];
    const loop = [firstEdge.startInches];
    let currentEdge: CountertopBoundarySegmentInches | undefined = firstEdge;

    removeEdge(edgesByStartKey, firstEdge);

    while (currentEdge !== undefined) {
      loop.push(currentEdge.endInches);

      if (createPointKey(currentEdge.endInches) === createPointKey(loop[0])) {
        break;
      }

      const nextEdges = edgesByStartKey.get(createPointKey(currentEdge.endInches));
      currentEdge = nextEdges?.[0];

      if (currentEdge !== undefined) {
        removeEdge(edgesByStartKey, currentEdge);
      }
    }

    const closedLoop = removeDuplicatedClosingPoint(loop);

    if (closedLoop.length >= 3 && getPolygonAreaInches(closedLoop) > MIN_LOOP_AREA_INCHES) {
      loops.push([...closedLoop]);
    }
  }

  return loops;
}

function mergeBoundarySegments(
  boundarySegments: readonly CountertopBoundarySegmentInches[],
): readonly CountertopBoundarySegmentInches[] {
  const horizontalSegments = new Map<number, CountertopBoundarySegmentInches[]>();
  const verticalSegments = new Map<number, CountertopBoundarySegmentInches[]>();
  const diagonalSegments: CountertopBoundarySegmentInches[] = [];

  boundarySegments.forEach((segment) => {
    if (Math.abs(segment.startInches.yInches - segment.endInches.yInches) < MIN_CELL_SIZE_INCHES) {
      const key = roundCoordinate(segment.startInches.yInches);
      horizontalSegments.set(key, [...(horizontalSegments.get(key) ?? []), segment]);
    } else if (Math.abs(segment.startInches.xInches - segment.endInches.xInches) < MIN_CELL_SIZE_INCHES) {
      const key = roundCoordinate(segment.startInches.xInches);
      verticalSegments.set(key, [...(verticalSegments.get(key) ?? []), segment]);
    } else {
      diagonalSegments.push(segment);
    }
  });

  return [
    ...mergeAxisAlignedSegments(horizontalSegments, "horizontal"),
    ...mergeAxisAlignedSegments(verticalSegments, "vertical"),
    ...diagonalSegments,
  ];
}

function mergeAxisAlignedSegments(
  segmentGroups: ReadonlyMap<number, readonly CountertopBoundarySegmentInches[]>,
  orientation: "horizontal" | "vertical",
): readonly CountertopBoundarySegmentInches[] {
  const mergedSegments: CountertopBoundarySegmentInches[] = [];

  segmentGroups.forEach((segments, coordinate) => {
    const ranges = segments
      .map((segment) => {
        const startValue = orientation === "horizontal"
          ? segment.startInches.xInches
          : segment.startInches.yInches;
        const endValue = orientation === "horizontal"
          ? segment.endInches.xInches
          : segment.endInches.yInches;

        return {
          start: Math.min(startValue, endValue),
          end: Math.max(startValue, endValue),
        };
      })
      .sort((a, b) => a.start - b.start);

    let activeRange: { start: number; end: number } | null = null;

    ranges.forEach((range) => {
      if (activeRange === null) {
        activeRange = { ...range };
        return;
      }

      if (range.start <= activeRange.end + MIN_CELL_SIZE_INCHES) {
        activeRange.end = Math.max(activeRange.end, range.end);
        return;
      }

      mergedSegments.push(createSegmentFromRange(activeRange, coordinate, orientation));
      activeRange = { ...range };
    });

    if (activeRange !== null) {
      mergedSegments.push(createSegmentFromRange(activeRange, coordinate, orientation));
    }
  });

  return mergedSegments;
}

function createSegmentFromRange(
  range: Readonly<{ start: number; end: number }>,
  coordinate: number,
  orientation: "horizontal" | "vertical",
): CountertopBoundarySegmentInches {
  if (orientation === "horizontal") {
    return {
      startInches: { xInches: range.start, yInches: coordinate },
      endInches: { xInches: range.end, yInches: coordinate },
    };
  }

  return {
    startInches: { xInches: coordinate, yInches: range.start },
    endInches: { xInches: coordinate, yInches: range.end },
  };
}

function removeEdge(
  edgesByStartKey: Map<string, CountertopBoundarySegmentInches[]>,
  edge: CountertopBoundarySegmentInches,
): void {
  const startKey = createPointKey(edge.startInches);
  const edges = edgesByStartKey.get(startKey);

  if (edges === undefined) {
    return;
  }

  const edgeIndex = edges.indexOf(edge);

  if (edgeIndex >= 0) {
    edges.splice(edgeIndex, 1);
  }

  if (edges.length === 0) {
    edgesByStartKey.delete(startKey);
  }
}

function removeDuplicatedClosingPoint(pointsInches: readonly Point2DInches[]): readonly Point2DInches[] {
  if (pointsInches.length < 2) {
    return pointsInches;
  }

  const firstPointInches = pointsInches[0];
  const lastPointInches = pointsInches[pointsInches.length - 1];

  return createPointKey(firstPointInches) === createPointKey(lastPointInches)
    ? pointsInches.slice(0, -1)
    : pointsInches;
}

function isPointInsidePolygon(pointInches: Point2DInches, polygonInches: readonly Point2DInches[]): boolean {
  let isInside = false;

  for (let pointIndex = 0, previousIndex = polygonInches.length - 1; pointIndex < polygonInches.length; previousIndex = pointIndex, pointIndex += 1) {
    const currentPoint = polygonInches[pointIndex];
    const previousPoint = polygonInches[previousIndex];
    const intersects =
      currentPoint.yInches > pointInches.yInches !== previousPoint.yInches > pointInches.yInches &&
      pointInches.xInches <
        ((previousPoint.xInches - currentPoint.xInches) *
          (pointInches.yInches - currentPoint.yInches)) /
          (previousPoint.yInches - currentPoint.yInches) +
          currentPoint.xInches;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function createCellKey(columnIndex: number, rowIndex: number): CountertopCellKey {
  return `${columnIndex}:${rowIndex}`;
}

function parseCellKey(cellKey: CountertopCellKey): readonly [number, number] {
  const [columnIndex, rowIndex] = cellKey.split(":").map((value) => Number.parseInt(value, 10));
  return [columnIndex, rowIndex];
}

function createPointKey(pointInches: Point2DInches): string {
  return `${roundCoordinate(pointInches.xInches)}:${roundCoordinate(pointInches.yInches)}`;
}

function roundCoordinate(coordinateInches: number): number {
  return Number(coordinateInches.toFixed(COORDINATE_KEY_PRECISION));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
