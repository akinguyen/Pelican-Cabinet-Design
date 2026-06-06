import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import { getPolygonAreaSquareInches } from "../footprint/wallFootprintGeometry";
import { getPlacedWallViewableEdgeIndices } from "./wallViewableEdges";

const MIN_ELEVATION_CAMERA_DISTANCE_INCHES = 40;
const ELEVATION_CAMERA_DISTANCE_FACTOR = 0.5;
const ELEVATION_VIEW_PADDING_INCHES = 24;

export type PlacedWallElevationSide = Readonly<{
  placedWallId: string;
  edgeIndex: number;
  edgeCount: number;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  midpointInches: Point3DInches;
  outwardNormalInches: Readonly<{
    xInches: number;
    yInches: number;
  }>;
  lengthInches: number;
  wallHeightInches: number;
  cameraDistanceInches: number;
  cameraPositionInches: Point3DInches;
  cameraTargetInches: Point3DInches;
  viewSizeInches: number;
}>;


export type PlacedWallElevationWallView = Readonly<{
  placedWallId: string;
  wallIndex: number;
  viewableSides: readonly PlacedWallElevationSide[];
}>;

export type ActivePlacedWallElevationView = Readonly<{
  wallView: PlacedWallElevationWallView;
  side: PlacedWallElevationSide;
  sideIndex: number;
}>;

export function getPlacedWallElevationWallViews(
  placedWalls: readonly PlacedWall[],
): readonly PlacedWallElevationWallView[] {
  return placedWalls
    .map((placedWall, wallIndex) => ({
      placedWallId: placedWall.id,
      wallIndex,
      viewableSides: getPlacedWallElevationSides(placedWall),
    }))
    .filter((wallView) => wallView.viewableSides.length > 0);
}

export function getActivePlacedWallElevationView(args: {
  placedWalls: readonly PlacedWall[];
  activeWallElevationWallId: string | null;
  activeWallElevationEdgeIndex: number;
}): ActivePlacedWallElevationView | null {
  const wallViews = getPlacedWallElevationWallViews(args.placedWalls);

  if (wallViews.length === 0) {
    return null;
  }

  const wallView = wallViews.find(
    (candidateWallView) => candidateWallView.placedWallId === args.activeWallElevationWallId,
  ) ?? wallViews[0];
  const side = wallView.viewableSides.find(
    (candidateSide) => candidateSide.edgeIndex === args.activeWallElevationEdgeIndex,
  ) ?? wallView.viewableSides[0];
  const sideIndex = wallView.viewableSides.findIndex(
    (candidateSide) => candidateSide.edgeIndex === side.edgeIndex,
  );

  return {
    wallView,
    side,
    sideIndex: sideIndex >= 0 ? sideIndex : 0,
  };
}

export function createWallElevationViewKey(activeElevationSide: PlacedWallElevationSide): string {
  return `${activeElevationSide.placedWallId}:edge-${activeElevationSide.edgeIndex}`;
}

export function getPlacedWallElevationSides(
  placedWall: PlacedWall,
): readonly PlacedWallElevationSide[] {
  return getPlacedWallViewableEdgeIndices(placedWall)
    .map((edgeIndex) => getPlacedWallElevationSide(placedWall, edgeIndex))
    .filter((side): side is PlacedWallElevationSide => side !== null);
}

export function getPlacedWallActiveElevationSide(
  placedWall: PlacedWall,
  requestedEdgeIndex: number,
): PlacedWallElevationSide | null {
  const viewableEdgeIndices = getPlacedWallViewableEdgeIndices(placedWall);

  if (viewableEdgeIndices.length === 0) {
    return null;
  }

  const activeEdgeIndex = viewableEdgeIndices.includes(requestedEdgeIndex)
    ? requestedEdgeIndex
    : viewableEdgeIndices[0];

  return getPlacedWallElevationSide(placedWall, activeEdgeIndex);
}

export function getPlacedWallElevationSide(
  placedWall: PlacedWall,
  requestedEdgeIndex: number,
): PlacedWallElevationSide | null {
  const boundaryPointsInches = placedWall.footprint.boundaryPointsInches;

  if (boundaryPointsInches.length < 2) {
    return null;
  }

  const edgeCount = boundaryPointsInches.length;
  const edgeIndex = normalizeEdgeIndex(requestedEdgeIndex, edgeCount);
  const startPointInches = boundaryPointsInches[edgeIndex];
  const endPointInches = boundaryPointsInches[(edgeIndex + 1) % edgeCount];
  const lengthInches = getPoint3DDistanceInches(startPointInches, endPointInches);

  if (lengthInches <= 0) {
    return null;
  }

  const edgeDirectionXInches = (endPointInches.xInches - startPointInches.xInches) / lengthInches;
  const edgeDirectionYInches = (endPointInches.yInches - startPointInches.yInches) / lengthInches;
  const outwardNormalInches = getOutwardNormal({
    edgeDirectionXInches,
    edgeDirectionYInches,
    polygonAreaSquareInches: getPolygonAreaSquareInches(boundaryPointsInches),
  });
  const midpointInches = {
    xInches: (startPointInches.xInches + endPointInches.xInches) / 2,
    yInches: (startPointInches.yInches + endPointInches.yInches) / 2,
    zInches: 0,
  };
  const cameraDistanceInches = Math.max(
    MIN_ELEVATION_CAMERA_DISTANCE_INCHES,
    lengthInches * ELEVATION_CAMERA_DISTANCE_FACTOR,
  );
  const cameraZInches = Math.max(placedWall.heightInches / 2, 1);
  const cameraTargetInches = {
    xInches: midpointInches.xInches,
    yInches: midpointInches.yInches,
    zInches: cameraZInches,
  };
  const cameraPositionInches = {
    xInches: midpointInches.xInches + outwardNormalInches.xInches * cameraDistanceInches,
    yInches: midpointInches.yInches + outwardNormalInches.yInches * cameraDistanceInches,
    zInches: cameraZInches,
  };

  return {
    placedWallId: placedWall.id,
    edgeIndex,
    edgeCount,
    startPointInches,
    endPointInches,
    midpointInches,
    outwardNormalInches,
    lengthInches,
    wallHeightInches: placedWall.heightInches,
    cameraDistanceInches,
    cameraPositionInches,
    cameraTargetInches,
    viewSizeInches: Math.max(
      lengthInches + ELEVATION_VIEW_PADDING_INCHES * 2,
      placedWall.heightInches + ELEVATION_VIEW_PADDING_INCHES * 2,
      96,
    ),
  };
}

function normalizeEdgeIndex(edgeIndex: number, edgeCount: number): number {
  return ((edgeIndex % edgeCount) + edgeCount) % edgeCount;
}

function getOutwardNormal(args: {
  edgeDirectionXInches: number;
  edgeDirectionYInches: number;
  polygonAreaSquareInches: number;
}): Readonly<{ xInches: number; yInches: number }> {
  if (args.polygonAreaSquareInches >= 0) {
    return {
      xInches: args.edgeDirectionYInches,
      yInches: -args.edgeDirectionXInches,
    };
  }

  return {
    xInches: -args.edgeDirectionYInches,
    yInches: args.edgeDirectionXInches,
  };
}
