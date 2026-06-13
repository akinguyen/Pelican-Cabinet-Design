import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PrimitiveEdgeSegmentInches } from "@/engine/primitive-geometry/edge-segments/primitiveEdgeSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import type { WallFaceSide, WallOpening } from "@/engine/walls/placedWallSegmentTypes";

const GEOMETRY_EPSILON = 0.000001;
const WALL_OPENING_EDGE_OFFSET_INCHES = 0.12;

type WallSegmentGeometryResult = Readonly<{
  geometry: BufferGeometry | ExtrudeGeometry;
  openingEdgeSegmentsInches: readonly PrimitiveEdgeSegmentInches[];
}>;

export function createWallSegmentGeometry(args: {
  segmentBody: BuiltWallSegmentBody;
  openings: readonly WallOpening[];
}): WallSegmentGeometryResult {
  if (args.openings.length === 0) {
    return {
      geometry: createExtrudedWallGeometry(
        args.segmentBody.footprintPolygonInches,
        args.segmentBody.heightInches,
      ),
      openingEdgeSegmentsInches: [],
    };
  }

  return createWallSegmentGeometryWithOpenings(args.segmentBody, args.openings);
}

export function createExtrudedWallGeometry(
  polygonInches: readonly Point3DInches[],
  heightInches: number,
): ExtrudeGeometry {
  const shape = createWallShape(polygonInches);

  return new ExtrudeGeometry(shape, {
    depth: heightInches,
    bevelEnabled: false,
  });
}

type NormalizedWallOpening = Readonly<{
  startT: number;
  endT: number;
  bottomInches: number;
  topInches: number;
}>;

type WallCellGrid = Readonly<{
  tCoordinates: readonly number[];
  zCoordinates: readonly number[];
  removedCells: readonly (readonly boolean[])[];
}>;

type WallGridCell = Readonly<{
  tIndex: number;
  zIndex: number;
  startT: number;
  endT: number;
  bottomInches: number;
  topInches: number;
}>;

function createWallSegmentGeometryWithOpenings(
  segmentBody: BuiltWallSegmentBody,
  openings: readonly WallOpening[],
): WallSegmentGeometryResult {
  const normalizedOpenings = openings
    .map((opening) => normalizeOpening({ segmentBody, opening }))
    .filter(isNormalizedWallOpening);

  if (normalizedOpenings.length === 0) {
    return {
      geometry: createExtrudedWallGeometry(
        segmentBody.footprintPolygonInches,
        segmentBody.heightInches,
      ),
      openingEdgeSegmentsInches: [],
    };
  }

  const cellGrid = createWallCellGrid({
    wallHeightInches: segmentBody.heightInches,
    openings: normalizedOpenings,
  });
  const triangles: number[] = [];

  for (let tIndex = 0; tIndex < cellGrid.tCoordinates.length - 1; tIndex += 1) {
    for (let zIndex = 0; zIndex < cellGrid.zCoordinates.length - 1; zIndex += 1) {
      if (isRemovedCell(cellGrid, tIndex, zIndex)) {
        continue;
      }

      addSolidCellFaces({
        segmentBody,
        cellGrid,
        cell: createWallGridCell(cellGrid, tIndex, zIndex),
        triangles,
      });
    }
  }

  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(triangles), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return {
    geometry,
    openingEdgeSegmentsInches: createOpeningBoundaryEdgeSegments({ segmentBody, cellGrid }),
  };
}

function normalizeOpening(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
}): NormalizedWallOpening | null {
  const faceLengthInches = getSideLength(args.segmentBody, args.opening.faceSide);

  if (faceLengthInches <= GEOMETRY_EPSILON) {
    return null;
  }

  const startT = clamp01(args.opening.leftInchesAlongFace / faceLengthInches);
  const endT = clamp01((args.opening.leftInchesAlongFace + args.opening.widthInches) / faceLengthInches);
  const bottomInches = clamp(args.opening.bottomInchesFromFloor, 0, args.segmentBody.heightInches);
  const topInches = clamp(args.opening.bottomInchesFromFloor + args.opening.heightInches, 0, args.segmentBody.heightInches);

  if (endT - startT <= GEOMETRY_EPSILON || topInches - bottomInches <= GEOMETRY_EPSILON) {
    return null;
  }

  return {
    startT,
    endT,
    bottomInches,
    topInches,
  };
}

function isNormalizedWallOpening(opening: NormalizedWallOpening | null): opening is NormalizedWallOpening {
  return opening !== null;
}

function createWallCellGrid(args: {
  wallHeightInches: number;
  openings: readonly NormalizedWallOpening[];
}): WallCellGrid {
  const tCoordinates = createSortedUniqueCoordinates([
    0,
    1,
    ...args.openings.flatMap((opening) => [opening.startT, opening.endT]),
  ]);
  const zCoordinates = createSortedUniqueCoordinates([
    0,
    args.wallHeightInches,
    ...args.openings.flatMap((opening) => [opening.bottomInches, opening.topInches]),
  ]);
  const removedCells = tCoordinates.slice(0, -1).map((startT, tIndex) => {
    const endT = tCoordinates[tIndex + 1];

    return zCoordinates.slice(0, -1).map((bottomInches, zIndex) => {
      const topInches = zCoordinates[zIndex + 1];

      if (endT - startT <= GEOMETRY_EPSILON || topInches - bottomInches <= GEOMETRY_EPSILON) {
        return true;
      }

      return isCellInsideAnyOpening({
        startT,
        endT,
        bottomInches,
        topInches,
        openings: args.openings,
      });
    });
  });

  return {
    tCoordinates,
    zCoordinates,
    removedCells,
  };
}

function createWallGridCell(
  cellGrid: WallCellGrid,
  tIndex: number,
  zIndex: number,
): WallGridCell {
  return {
    tIndex,
    zIndex,
    startT: cellGrid.tCoordinates[tIndex],
    endT: cellGrid.tCoordinates[tIndex + 1],
    bottomInches: cellGrid.zCoordinates[zIndex],
    topInches: cellGrid.zCoordinates[zIndex + 1],
  };
}

function isRemovedCell(cellGrid: WallCellGrid, tIndex: number, zIndex: number): boolean {
  return cellGrid.removedCells[tIndex]?.[zIndex] ?? true;
}

function isSolidCell(cellGrid: WallCellGrid, tIndex: number, zIndex: number): boolean {
  return !isRemovedCell(cellGrid, tIndex, zIndex);
}

function isCellInsideAnyOpening(args: {
  startT: number;
  endT: number;
  bottomInches: number;
  topInches: number;
  openings: readonly NormalizedWallOpening[];
}): boolean {
  const centerT = (args.startT + args.endT) / 2;
  const centerZInches = (args.bottomInches + args.topInches) / 2;

  return args.openings.some((opening) => (
    centerT > opening.startT + GEOMETRY_EPSILON &&
    centerT < opening.endT - GEOMETRY_EPSILON &&
    centerZInches > opening.bottomInches + GEOMETRY_EPSILON &&
    centerZInches < opening.topInches - GEOMETRY_EPSILON
  ));
}

function addSolidCellFaces(args: {
  segmentBody: BuiltWallSegmentBody;
  cellGrid: WallCellGrid;
  cell: WallGridCell;
  triangles: number[];
}): void {
  const sideAStartBottom = getSidePoint(args.segmentBody, "side-a", args.cell.startT, args.cell.bottomInches);
  const sideAEndBottom = getSidePoint(args.segmentBody, "side-a", args.cell.endT, args.cell.bottomInches);
  const sideAEndTop = getSidePoint(args.segmentBody, "side-a", args.cell.endT, args.cell.topInches);
  const sideAStartTop = getSidePoint(args.segmentBody, "side-a", args.cell.startT, args.cell.topInches);
  const sideBStartBottom = getSidePoint(args.segmentBody, "side-b", args.cell.startT, args.cell.bottomInches);
  const sideBEndBottom = getSidePoint(args.segmentBody, "side-b", args.cell.endT, args.cell.bottomInches);
  const sideBEndTop = getSidePoint(args.segmentBody, "side-b", args.cell.endT, args.cell.topInches);
  const sideBStartTop = getSidePoint(args.segmentBody, "side-b", args.cell.startT, args.cell.topInches);

  addQuad(args.triangles, sideAStartBottom, sideAEndBottom, sideAEndTop, sideAStartTop);
  addQuad(args.triangles, sideBEndBottom, sideBStartBottom, sideBStartTop, sideBEndTop);

  if (!isSolidCell(args.cellGrid, args.cell.tIndex, args.cell.zIndex - 1)) {
    addQuad(args.triangles, sideAStartBottom, sideBStartBottom, sideBEndBottom, sideAEndBottom);
  }

  if (!isSolidCell(args.cellGrid, args.cell.tIndex, args.cell.zIndex + 1)) {
    addQuad(args.triangles, sideAStartTop, sideAEndTop, sideBEndTop, sideBStartTop);
  }

  if (!isSolidCell(args.cellGrid, args.cell.tIndex - 1, args.cell.zIndex)) {
    addQuad(args.triangles, sideAStartBottom, sideAStartTop, sideBStartTop, sideBStartBottom);
  }

  if (!isSolidCell(args.cellGrid, args.cell.tIndex + 1, args.cell.zIndex)) {
    addQuad(args.triangles, sideAEndBottom, sideBEndBottom, sideBEndTop, sideAEndTop);
  }
}

function createOpeningBoundaryEdgeSegments(args: {
  segmentBody: BuiltWallSegmentBody;
  cellGrid: WallCellGrid;
}): readonly PrimitiveEdgeSegmentInches[] {
  const edgeSegments: PrimitiveEdgeSegmentInches[] = [];

  for (let tIndex = 0; tIndex < args.cellGrid.tCoordinates.length - 1; tIndex += 1) {
    for (let zIndex = 0; zIndex < args.cellGrid.zCoordinates.length - 1; zIndex += 1) {
      if (!isRemovedCell(args.cellGrid, tIndex, zIndex)) {
        continue;
      }

      const cell = createWallGridCell(args.cellGrid, tIndex, zIndex);

      if (isSolidCell(args.cellGrid, tIndex, zIndex - 1)) {
        addOpeningBoundaryForBothFaces({
          segmentBody: args.segmentBody,
          startT: cell.startT,
          endT: cell.endT,
          zInches: cell.bottomInches,
          edgeSegments,
        });
      }

      if (isSolidCell(args.cellGrid, tIndex, zIndex + 1)) {
        addOpeningBoundaryForBothFaces({
          segmentBody: args.segmentBody,
          startT: cell.startT,
          endT: cell.endT,
          zInches: cell.topInches,
          edgeSegments,
        });
      }

      if (isSolidCell(args.cellGrid, tIndex - 1, zIndex)) {
        addOpeningVerticalBoundaryForBothFaces({
          segmentBody: args.segmentBody,
          t: cell.startT,
          bottomInches: cell.bottomInches,
          topInches: cell.topInches,
          edgeSegments,
        });
      }

      if (isSolidCell(args.cellGrid, tIndex + 1, zIndex)) {
        addOpeningVerticalBoundaryForBothFaces({
          segmentBody: args.segmentBody,
          t: cell.endT,
          bottomInches: cell.bottomInches,
          topInches: cell.topInches,
          edgeSegments,
        });
      }
    }
  }

  return edgeSegments;
}

function addOpeningBoundaryForBothFaces(args: {
  segmentBody: BuiltWallSegmentBody;
  startT: number;
  endT: number;
  zInches: number;
  edgeSegments: PrimitiveEdgeSegmentInches[];
}): void {
  addOpeningEdgeSegment({
    segmentBody: args.segmentBody,
    side: "side-a",
    startPoint: { t: args.startT, zInches: args.zInches },
    endPoint: { t: args.endT, zInches: args.zInches },
    edgeSegments: args.edgeSegments,
  });
  addOpeningEdgeSegment({
    segmentBody: args.segmentBody,
    side: "side-b",
    startPoint: { t: args.endT, zInches: args.zInches },
    endPoint: { t: args.startT, zInches: args.zInches },
    edgeSegments: args.edgeSegments,
  });
}

function addOpeningVerticalBoundaryForBothFaces(args: {
  segmentBody: BuiltWallSegmentBody;
  t: number;
  bottomInches: number;
  topInches: number;
  edgeSegments: PrimitiveEdgeSegmentInches[];
}): void {
  addOpeningEdgeSegment({
    segmentBody: args.segmentBody,
    side: "side-a",
    startPoint: { t: args.t, zInches: args.bottomInches },
    endPoint: { t: args.t, zInches: args.topInches },
    edgeSegments: args.edgeSegments,
  });
  addOpeningEdgeSegment({
    segmentBody: args.segmentBody,
    side: "side-b",
    startPoint: { t: args.t, zInches: args.topInches },
    endPoint: { t: args.t, zInches: args.bottomInches },
    edgeSegments: args.edgeSegments,
  });
}

function addOpeningEdgeSegment(args: {
  segmentBody: BuiltWallSegmentBody;
  side: WallFaceSide;
  startPoint: { t: number; zInches: number };
  endPoint: { t: number; zInches: number };
  edgeSegments: PrimitiveEdgeSegmentInches[];
}): void {
  args.edgeSegments.push({
    startInches: getSidePoint(
      args.segmentBody,
      args.side,
      args.startPoint.t,
      args.startPoint.zInches,
      WALL_OPENING_EDGE_OFFSET_INCHES,
    ),
    endInches: getSidePoint(
      args.segmentBody,
      args.side,
      args.endPoint.t,
      args.endPoint.zInches,
      WALL_OPENING_EDGE_OFFSET_INCHES,
    ),
  });
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

function createSortedUniqueCoordinates(coordinates: readonly number[]): readonly number[] {
  return [...new Set(coordinates.map((coordinate) => Number(coordinate.toFixed(6))))]
    .sort((firstCoordinate, secondCoordinate) => firstCoordinate - secondCoordinate);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function createWallShape(polygonInches: readonly Point3DInches[]): Shape {
  const shape = new Shape();
  polygonInches.forEach((pointInches, pointIndex) => {
    if (pointIndex === 0) {
      shape.moveTo(pointInches.xInches, pointInches.yInches);
    } else {
      shape.lineTo(pointInches.xInches, pointInches.yInches);
    }
  });
  shape.closePath();
  return shape;
}
