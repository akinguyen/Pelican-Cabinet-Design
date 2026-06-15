import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PrimitiveEdgeSegmentInches } from "@/engine/primitive-geometry/edge-segments/primitiveEdgeSegmentTypes";
import { createOrthogonalWallOpeningCutFootprint } from "@/engine/walls/openings/wallOpeningCutGeometry";
import { createWallOpeningFaceAxes } from "@/engine/walls/openings/wallOpeningFaceAxes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import type { WallOpening } from "@/engine/walls/placedWallSegmentTypes";

const GEOMETRY_EPSILON = 0.000001;
const WALL_OPENING_EDGE_OFFSET_INCHES = 0.12;

type WallSegmentGeometryResult = Readonly<{
  geometry: BufferGeometry | ExtrudeGeometry;
  openingEdgeSegmentsInches: readonly PrimitiveEdgeSegmentInches[];
}>;

type WallDirectionInches = Readonly<{
  xInches: number;
  yInches: number;
}>;

type WallGridAxesInches = Readonly<{
  originInches: Point3DInches;
  wallDirectionInches: WallDirectionInches;
  normalDirectionInches: WallDirectionInches;
}>;

type NormalizedWallOpening = Readonly<{
  startUInches: number;
  endUInches: number;
  bottomInches: number;
  topInches: number;
}>;

type WallCrossSection = Readonly<{
  uInches: number;
  lowNormalPointInches: Point3DInches;
  highNormalPointInches: Point3DInches;
}>;

type WallCellGrid = Readonly<{
  uCoordinatesInches: readonly number[];
  zCoordinatesInches: readonly number[];
  crossSections: readonly WallCrossSection[];
  removedCells: readonly (readonly boolean[])[];
  normalDirectionInches: WallDirectionInches;
}>;

type WallGridCell = Readonly<{
  uIndex: number;
  zIndex: number;
  startUInches: number;
  endUInches: number;
  bottomInches: number;
  topInches: number;
}>;

export function createWallSegmentGeometry(args: {
  segmentBody: BuiltWallSegmentBody;
  openings: readonly WallOpening[];
  edgeSegmentOpenings?: readonly WallOpening[];
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

  return createWallSegmentGeometryWithOpenings({
    segmentBody: args.segmentBody,
    openings: args.openings,
    edgeSegmentOpenings: args.edgeSegmentOpenings ?? args.openings,
  });
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

function createWallSegmentGeometryWithOpenings(args: {
  segmentBody: BuiltWallSegmentBody;
  openings: readonly WallOpening[];
  edgeSegmentOpenings: readonly WallOpening[];
}): WallSegmentGeometryResult {
  const { segmentBody, openings } = args;
  const wallGridAxesInches = createWallOpeningGridAxes(segmentBody, openings);

  if (wallGridAxesInches === null) {
    return {
      geometry: createExtrudedWallGeometry(
        segmentBody.footprintPolygonInches,
        segmentBody.heightInches,
      ),
      openingEdgeSegmentsInches: [],
    };
  }

  const normalizedOpenings = openings
    .map((opening) => normalizeOpening({
      segmentBody,
      opening,
      originInches: wallGridAxesInches.originInches,
      wallDirectionInches: wallGridAxesInches.wallDirectionInches,
    }))
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
    segmentBody,
    wallHeightInches: segmentBody.heightInches,
    originInches: wallGridAxesInches.originInches,
    wallDirectionInches: wallGridAxesInches.wallDirectionInches,
    normalDirectionInches: wallGridAxesInches.normalDirectionInches,
    openings: normalizedOpenings,
  });

  if (cellGrid === null) {
    return {
      geometry: createExtrudedWallGeometry(
        segmentBody.footprintPolygonInches,
        segmentBody.heightInches,
      ),
      openingEdgeSegmentsInches: [],
    };
  }

  const triangles: number[] = [];

  for (let uIndex = 0; uIndex < cellGrid.uCoordinatesInches.length - 1; uIndex += 1) {
    for (let zIndex = 0; zIndex < cellGrid.zCoordinatesInches.length - 1; zIndex += 1) {
      if (isRemovedCell(cellGrid, uIndex, zIndex)) {
        continue;
      }

      addSolidCellFaces({
        cellGrid,
        cell: createWallGridCell(cellGrid, uIndex, zIndex),
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
    openingEdgeSegmentsInches: createManualOpeningBoundaryEdgeSegments({
      segmentBody,
      openings: args.edgeSegmentOpenings,
      originInches: wallGridAxesInches.originInches,
      wallDirectionInches: wallGridAxesInches.wallDirectionInches,
    }),
  };
}

function normalizeOpening(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: WallOpening;
  originInches: Point3DInches;
  wallDirectionInches: WallDirectionInches;
}): NormalizedWallOpening | null {
  const cutFootprint = createOrthogonalWallOpeningCutFootprint({
    segmentBody: args.segmentBody,
    opening: args.opening,
  });

  if (cutFootprint === null) {
    return null;
  }

  const frontLeftUInches = projectPointOntoDirection({
    pointInches: cutFootprint.frontLeftInches,
    originInches: args.originInches,
    directionInches: args.wallDirectionInches,
  });
  const frontRightUInches = projectPointOntoDirection({
    pointInches: cutFootprint.frontRightInches,
    originInches: args.originInches,
    directionInches: args.wallDirectionInches,
  });
  const startUInches = Math.min(frontLeftUInches, frontRightUInches);
  const endUInches = Math.max(frontLeftUInches, frontRightUInches);

  if (
    endUInches - startUInches <= GEOMETRY_EPSILON ||
    cutFootprint.topInches - cutFootprint.bottomInches <= GEOMETRY_EPSILON
  ) {
    return null;
  }

  return {
    startUInches,
    endUInches,
    bottomInches: cutFootprint.bottomInches,
    topInches: cutFootprint.topInches,
  };
}

function isNormalizedWallOpening(opening: NormalizedWallOpening | null): opening is NormalizedWallOpening {
  return opening !== null;
}

function createWallOpeningGridAxes(
  segmentBody: BuiltWallSegmentBody,
  openings: readonly WallOpening[],
): WallGridAxesInches | null {
  const firstOpening = openings[0];

  if (firstOpening !== undefined) {
    const faceAxes = createWallOpeningFaceAxes({
      segmentBody,
      faceSide: firstOpening.faceSide,
    });

    if (faceAxes !== null) {
      return {
        originInches: faceAxes.sideStartPointInches,
        wallDirectionInches: faceAxes.faceDirectionInches,
        normalDirectionInches: faceAxes.inwardDirectionInches,
      };
    }
  }

  const wallDirectionInches = createWallDirection(segmentBody);

  if (wallDirectionInches === null) {
    return null;
  }

  return {
    originInches: segmentBody.start.centerPointInches,
    wallDirectionInches,
    normalDirectionInches: createPerpendicularDirection(wallDirectionInches),
  };
}

function createWallCellGrid(args: {
  segmentBody: BuiltWallSegmentBody;
  wallHeightInches: number;
  originInches: Point3DInches;
  wallDirectionInches: WallDirectionInches;
  normalDirectionInches: WallDirectionInches;
  openings: readonly NormalizedWallOpening[];
}): WallCellGrid | null {
  const footprintCoordinatesInches = args.segmentBody.footprintPolygonInches.map((pointInches) => (
    projectPointOntoDirection({
      pointInches,
      originInches: args.originInches,
      directionInches: args.wallDirectionInches,
    })
  ));
  const uCoordinatesInches = createSortedUniqueCoordinates([
    ...footprintCoordinatesInches,
    ...args.openings.flatMap((opening) => [opening.startUInches, opening.endUInches]),
  ]);

  if (uCoordinatesInches.length < 2) {
    return null;
  }

  const crossSections = uCoordinatesInches.map((uInches) => createWallCrossSection({
    segmentBody: args.segmentBody,
    originInches: args.originInches,
    wallDirectionInches: args.wallDirectionInches,
    normalDirectionInches: args.normalDirectionInches,
    uInches,
  }));

  if (crossSections.some((crossSection) => crossSection === null)) {
    return null;
  }

  const safeCrossSections = crossSections.filter(isWallCrossSection);
  const zCoordinatesInches = createSortedUniqueCoordinates([
    0,
    args.wallHeightInches,
    ...args.openings.flatMap((opening) => [opening.bottomInches, opening.topInches]),
  ]);
  const removedCells = uCoordinatesInches.slice(0, -1).map((startUInches, uIndex) => {
    const endUInches = uCoordinatesInches[uIndex + 1];

    return zCoordinatesInches.slice(0, -1).map((bottomInches, zIndex) => {
      const topInches = zCoordinatesInches[zIndex + 1];

      if (endUInches - startUInches <= GEOMETRY_EPSILON || topInches - bottomInches <= GEOMETRY_EPSILON) {
        return true;
      }

      return isCellInsideAnyOpening({
        startUInches,
        endUInches,
        bottomInches,
        topInches,
        openings: args.openings,
      });
    });
  });

  return {
    uCoordinatesInches,
    zCoordinatesInches,
    crossSections: safeCrossSections,
    removedCells,
    normalDirectionInches: args.normalDirectionInches,
  };
}

function createWallGridCell(
  cellGrid: WallCellGrid,
  uIndex: number,
  zIndex: number,
): WallGridCell {
  return {
    uIndex,
    zIndex,
    startUInches: cellGrid.uCoordinatesInches[uIndex],
    endUInches: cellGrid.uCoordinatesInches[uIndex + 1],
    bottomInches: cellGrid.zCoordinatesInches[zIndex],
    topInches: cellGrid.zCoordinatesInches[zIndex + 1],
  };
}

function isRemovedCell(cellGrid: WallCellGrid, uIndex: number, zIndex: number): boolean {
  return cellGrid.removedCells[uIndex]?.[zIndex] ?? true;
}

function isSolidCell(cellGrid: WallCellGrid, uIndex: number, zIndex: number): boolean {
  return !isRemovedCell(cellGrid, uIndex, zIndex);
}

function isCellInsideAnyOpening(args: {
  startUInches: number;
  endUInches: number;
  bottomInches: number;
  topInches: number;
  openings: readonly NormalizedWallOpening[];
}): boolean {
  const centerUInches = (args.startUInches + args.endUInches) / 2;
  const centerZInches = (args.bottomInches + args.topInches) / 2;

  return args.openings.some((opening) => (
    centerUInches > opening.startUInches + GEOMETRY_EPSILON &&
    centerUInches < opening.endUInches - GEOMETRY_EPSILON &&
    centerZInches > opening.bottomInches + GEOMETRY_EPSILON &&
    centerZInches < opening.topInches - GEOMETRY_EPSILON
  ));
}

function addSolidCellFaces(args: {
  cellGrid: WallCellGrid;
  cell: WallGridCell;
  triangles: number[];
}): void {
  const startSection = args.cellGrid.crossSections[args.cell.uIndex];
  const endSection = args.cellGrid.crossSections[args.cell.uIndex + 1];

  const lowStartBottom = createLowNormalPoint(startSection, args.cell.bottomInches);
  const lowEndBottom = createLowNormalPoint(endSection, args.cell.bottomInches);
  const lowEndTop = createLowNormalPoint(endSection, args.cell.topInches);
  const lowStartTop = createLowNormalPoint(startSection, args.cell.topInches);
  const highStartBottom = createHighNormalPoint(startSection, args.cell.bottomInches);
  const highEndBottom = createHighNormalPoint(endSection, args.cell.bottomInches);
  const highEndTop = createHighNormalPoint(endSection, args.cell.topInches);
  const highStartTop = createHighNormalPoint(startSection, args.cell.topInches);

  addQuad(args.triangles, lowStartBottom, lowEndBottom, lowEndTop, lowStartTop);
  addQuad(args.triangles, highEndBottom, highStartBottom, highStartTop, highEndTop);

  if (!isSolidCell(args.cellGrid, args.cell.uIndex, args.cell.zIndex - 1)) {
    addQuad(args.triangles, lowStartBottom, highStartBottom, highEndBottom, lowEndBottom);
  }

  if (!isSolidCell(args.cellGrid, args.cell.uIndex, args.cell.zIndex + 1)) {
    addQuad(args.triangles, lowStartTop, lowEndTop, highEndTop, highStartTop);
  }

  if (!isSolidCell(args.cellGrid, args.cell.uIndex - 1, args.cell.zIndex)) {
    addQuad(args.triangles, lowStartBottom, lowStartTop, highStartTop, highStartBottom);
  }

  if (!isSolidCell(args.cellGrid, args.cell.uIndex + 1, args.cell.zIndex)) {
    addQuad(args.triangles, lowEndBottom, highEndBottom, highEndTop, lowEndTop);
  }
}


function createManualOpeningBoundaryEdgeSegments(args: {
  segmentBody: BuiltWallSegmentBody;
  openings: readonly WallOpening[];
  originInches: Point3DInches;
  wallDirectionInches: WallDirectionInches;
}): readonly PrimitiveEdgeSegmentInches[] {
  if (args.openings.length === 0) {
    return [];
  }

  const normalizedOpenings = args.openings
    .map((opening) => normalizeOpening({
      segmentBody: args.segmentBody,
      opening,
      originInches: args.originInches,
      wallDirectionInches: args.wallDirectionInches,
    }))
    .filter(isNormalizedWallOpening);

  if (normalizedOpenings.length === 0) {
    return [];
  }

  const cellGrid = createWallCellGrid({
    segmentBody: args.segmentBody,
    wallHeightInches: args.segmentBody.heightInches,
    originInches: args.originInches,
    wallDirectionInches: args.wallDirectionInches,
    normalDirectionInches: createPerpendicularDirection(args.wallDirectionInches),
    openings: normalizedOpenings,
  });

  return cellGrid === null ? [] : createOpeningBoundaryEdgeSegments({ cellGrid });
}

function createOpeningBoundaryEdgeSegments(args: {
  cellGrid: WallCellGrid;
}): readonly PrimitiveEdgeSegmentInches[] {
  const edgeSegments: PrimitiveEdgeSegmentInches[] = [];

  for (let uIndex = 0; uIndex < args.cellGrid.uCoordinatesInches.length - 1; uIndex += 1) {
    for (let zIndex = 0; zIndex < args.cellGrid.zCoordinatesInches.length - 1; zIndex += 1) {
      if (!isRemovedCell(args.cellGrid, uIndex, zIndex)) {
        continue;
      }

      const cell = createWallGridCell(args.cellGrid, uIndex, zIndex);

      if (isSolidCell(args.cellGrid, uIndex, zIndex - 1)) {
        addOpeningBoundaryForBothFaces({
          cellGrid: args.cellGrid,
          startUIndex: cell.uIndex,
          endUIndex: cell.uIndex + 1,
          zInches: cell.bottomInches,
          edgeSegments,
        });
      }

      if (isSolidCell(args.cellGrid, uIndex, zIndex + 1)) {
        addOpeningBoundaryForBothFaces({
          cellGrid: args.cellGrid,
          startUIndex: cell.uIndex,
          endUIndex: cell.uIndex + 1,
          zInches: cell.topInches,
          edgeSegments,
        });
      }

      if (isSolidCell(args.cellGrid, uIndex - 1, zIndex)) {
        addOpeningVerticalBoundaryForBothFaces({
          cellGrid: args.cellGrid,
          uIndex: cell.uIndex,
          bottomInches: cell.bottomInches,
          topInches: cell.topInches,
          edgeSegments,
        });
      }

      if (isSolidCell(args.cellGrid, uIndex + 1, zIndex)) {
        addOpeningVerticalBoundaryForBothFaces({
          cellGrid: args.cellGrid,
          uIndex: cell.uIndex + 1,
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
  cellGrid: WallCellGrid;
  startUIndex: number;
  endUIndex: number;
  zInches: number;
  edgeSegments: PrimitiveEdgeSegmentInches[];
}): void {
  const startSection = args.cellGrid.crossSections[args.startUIndex];
  const endSection = args.cellGrid.crossSections[args.endUIndex];

  args.edgeSegments.push({
    startInches: offsetLowNormalPoint(startSection, args.cellGrid.normalDirectionInches, args.zInches),
    endInches: offsetLowNormalPoint(endSection, args.cellGrid.normalDirectionInches, args.zInches),
  });
  args.edgeSegments.push({
    startInches: offsetHighNormalPoint(endSection, args.cellGrid.normalDirectionInches, args.zInches),
    endInches: offsetHighNormalPoint(startSection, args.cellGrid.normalDirectionInches, args.zInches),
  });
}

function addOpeningVerticalBoundaryForBothFaces(args: {
  cellGrid: WallCellGrid;
  uIndex: number;
  bottomInches: number;
  topInches: number;
  edgeSegments: PrimitiveEdgeSegmentInches[];
}): void {
  const section = args.cellGrid.crossSections[args.uIndex];

  args.edgeSegments.push({
    startInches: offsetLowNormalPoint(section, args.cellGrid.normalDirectionInches, args.bottomInches),
    endInches: offsetLowNormalPoint(section, args.cellGrid.normalDirectionInches, args.topInches),
  });
  args.edgeSegments.push({
    startInches: offsetHighNormalPoint(section, args.cellGrid.normalDirectionInches, args.topInches),
    endInches: offsetHighNormalPoint(section, args.cellGrid.normalDirectionInches, args.bottomInches),
  });
}

function createWallDirection(segmentBody: BuiltWallSegmentBody): WallDirectionInches | null {
  return normalizeVector({
    xInches: segmentBody.end.centerPointInches.xInches - segmentBody.start.centerPointInches.xInches,
    yInches: segmentBody.end.centerPointInches.yInches - segmentBody.start.centerPointInches.yInches,
  }) ?? normalizeVector({
    xInches: segmentBody.end.sideAPointInches.xInches - segmentBody.start.sideAPointInches.xInches,
    yInches: segmentBody.end.sideAPointInches.yInches - segmentBody.start.sideAPointInches.yInches,
  });
}

function createWallCrossSection(args: {
  segmentBody: BuiltWallSegmentBody;
  originInches: Point3DInches;
  wallDirectionInches: WallDirectionInches;
  normalDirectionInches: WallDirectionInches;
  uInches: number;
}): WallCrossSection | null {
  const linePointInches = {
    xInches: args.originInches.xInches + args.wallDirectionInches.xInches * args.uInches,
    yInches: args.originInches.yInches + args.wallDirectionInches.yInches * args.uInches,
    zInches: 0,
  };
  const intersectionPoints = collectLinePolygonIntersectionPoints({
    linePointInches,
    lineDirectionInches: args.normalDirectionInches,
    polygonInches: args.segmentBody.footprintPolygonInches,
  });

  if (intersectionPoints.length === 0) {
    return null;
  }

  const sortedPoints = intersectionPoints.sort((firstPoint, secondPoint) => (
    projectPointOntoDirection({
      pointInches: firstPoint,
      originInches: linePointInches,
      directionInches: args.normalDirectionInches,
    }) -
    projectPointOntoDirection({
      pointInches: secondPoint,
      originInches: linePointInches,
      directionInches: args.normalDirectionInches,
    })
  ));
  const lowNormalPointInches = sortedPoints[0];
  const highNormalPointInches = sortedPoints[sortedPoints.length - 1];

  return {
    uInches: args.uInches,
    lowNormalPointInches,
    highNormalPointInches,
  };
}

function collectLinePolygonIntersectionPoints(args: {
  linePointInches: Point3DInches;
  lineDirectionInches: WallDirectionInches;
  polygonInches: readonly Point3DInches[];
}): Point3DInches[] {
  const pointsInches: Point3DInches[] = [];

  args.polygonInches.forEach((edgeStartInches, pointIndex) => {
    const edgeEndInches = args.polygonInches[(pointIndex + 1) % args.polygonInches.length];
    const edgeVectorInches = {
      xInches: edgeEndInches.xInches - edgeStartInches.xInches,
      yInches: edgeEndInches.yInches - edgeStartInches.yInches,
    };
    const denominator = cross(args.lineDirectionInches, edgeVectorInches);
    const lineToEdgeInches = {
      xInches: edgeStartInches.xInches - args.linePointInches.xInches,
      yInches: edgeStartInches.yInches - args.linePointInches.yInches,
    };

    if (Math.abs(denominator) <= GEOMETRY_EPSILON) {
      if (Math.abs(cross(lineToEdgeInches, args.lineDirectionInches)) <= GEOMETRY_EPSILON) {
        addUniquePoint(pointsInches, edgeStartInches);
        addUniquePoint(pointsInches, edgeEndInches);
      }
      return;
    }

    const lineDistanceInches = cross(lineToEdgeInches, edgeVectorInches) / denominator;
    const segmentRatio = cross(lineToEdgeInches, args.lineDirectionInches) / denominator;

    if (segmentRatio < -GEOMETRY_EPSILON || segmentRatio > 1 + GEOMETRY_EPSILON) {
      return;
    }

    addUniquePoint(pointsInches, {
      xInches: args.linePointInches.xInches + args.lineDirectionInches.xInches * lineDistanceInches,
      yInches: args.linePointInches.yInches + args.lineDirectionInches.yInches * lineDistanceInches,
      zInches: 0,
    });
  });

  return pointsInches;
}

function isWallCrossSection(crossSection: WallCrossSection | null): crossSection is WallCrossSection {
  return crossSection !== null;
}

function createLowNormalPoint(section: WallCrossSection, zInches: number): Point3DInches {
  return {
    xInches: section.lowNormalPointInches.xInches,
    yInches: section.lowNormalPointInches.yInches,
    zInches,
  };
}

function createHighNormalPoint(section: WallCrossSection, zInches: number): Point3DInches {
  return {
    xInches: section.highNormalPointInches.xInches,
    yInches: section.highNormalPointInches.yInches,
    zInches,
  };
}

function offsetLowNormalPoint(
  section: WallCrossSection,
  normalDirectionInches: WallDirectionInches,
  zInches: number,
): Point3DInches {
  return {
    xInches: section.lowNormalPointInches.xInches - normalDirectionInches.xInches * WALL_OPENING_EDGE_OFFSET_INCHES,
    yInches: section.lowNormalPointInches.yInches - normalDirectionInches.yInches * WALL_OPENING_EDGE_OFFSET_INCHES,
    zInches,
  };
}

function offsetHighNormalPoint(
  section: WallCrossSection,
  normalDirectionInches: WallDirectionInches,
  zInches: number,
): Point3DInches {
  return {
    xInches: section.highNormalPointInches.xInches + normalDirectionInches.xInches * WALL_OPENING_EDGE_OFFSET_INCHES,
    yInches: section.highNormalPointInches.yInches + normalDirectionInches.yInches * WALL_OPENING_EDGE_OFFSET_INCHES,
    zInches,
  };
}

function projectPointOntoDirection(args: {
  pointInches: Point3DInches;
  originInches: Point3DInches;
  directionInches: WallDirectionInches;
}): number {
  return (
    (args.pointInches.xInches - args.originInches.xInches) * args.directionInches.xInches +
    (args.pointInches.yInches - args.originInches.yInches) * args.directionInches.yInches
  );
}

function createPerpendicularDirection(directionInches: WallDirectionInches): WallDirectionInches {
  return {
    xInches: -directionInches.yInches,
    yInches: directionInches.xInches,
  };
}

function normalizeVector(vectorInches: WallDirectionInches): WallDirectionInches | null {
  const lengthInches = Math.hypot(vectorInches.xInches, vectorInches.yInches);

  if (lengthInches <= GEOMETRY_EPSILON) {
    return null;
  }

  return {
    xInches: vectorInches.xInches / lengthInches,
    yInches: vectorInches.yInches / lengthInches,
  };
}

function addUniquePoint(pointsInches: Point3DInches[], pointInches: Point3DInches): void {
  if (pointsInches.some((existingPointInches) => arePointsEqual(existingPointInches, pointInches))) {
    return;
  }

  pointsInches.push({
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches: 0,
  });
}

function arePointsEqual(firstPointInches: Point3DInches, secondPointInches: Point3DInches): boolean {
  return (
    Math.abs(firstPointInches.xInches - secondPointInches.xInches) <= GEOMETRY_EPSILON &&
    Math.abs(firstPointInches.yInches - secondPointInches.yInches) <= GEOMETRY_EPSILON
  );
}

function cross(first: WallDirectionInches, second: WallDirectionInches): number {
  return first.xInches * second.yInches - first.yInches * second.xInches;
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
