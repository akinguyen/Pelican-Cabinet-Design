import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneEntityBounds } from "../sceneEntityBoundsTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import type { SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";

const MIN_MEASUREMENT_LENGTH_INCHES = 3;
const AXIS_ALIGNED_FACE_DOT_THRESHOLD = 0.985;
const OVERLAP_TOLERANCE_INCHES = 0.5;


export type SceneEntityWallMeasurementGuide = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
  labelPointInches: Point3DInches;
  labelRotationDegrees: number;
}>;

export function buildSceneEntityWallMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly SceneEntityWallMeasurementGuide[] {
  return buildSceneEntityWallMeasurementGuidesFromFootprint({
    footprint: args.bounds.footprint,
    placedWallGraphs: args.placedWallGraphs,
  });
}

export function buildSceneEntityWallMeasurementGuidesFromFootprint(args: {
  footprint: SceneEntityPlanFootprint;
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly SceneEntityWallMeasurementGuide[] {
  const wallFaces = args.placedWallGraphs.flatMap((placedWallGraph) => (
    buildConnectedWallGeometry(placedWallGraph).segmentBodies.flatMap(createAxisAlignedWallFaces)
  ));
  const bounds = getFootprintPlanBounds(args.footprint);
  const verticalWallFaces = wallFaces.filter((face) => face.orientation === "vertical");
  const horizontalWallFaces = wallFaces.filter((face) => face.orientation === "horizontal");

  return [
    findNearestLeftMeasurementGuide({ bounds, wallFaces: verticalWallFaces }),
    findNearestRightMeasurementGuide({ bounds, wallFaces: verticalWallFaces }),
    findNearestBottomMeasurementGuide({ bounds, wallFaces: horizontalWallFaces }),
    findNearestTopMeasurementGuide({ bounds, wallFaces: horizontalWallFaces }),
  ].filter(isSceneEntityWallMeasurementGuide);
}

type FootprintPlanBounds = Readonly<{
  minXInches: number;
  maxXInches: number;
  minYInches: number;
  maxYInches: number;
  centerXInches: number;
  centerYInches: number;
}>;

type AxisAlignedWallFace = Readonly<{
  id: string;
  orientation: "horizontal" | "vertical";
  fixedCoordinateInches: number;
  minRangeInches: number;
  maxRangeInches: number;
}>;

function createAxisAlignedWallFaces(segmentBody: BuiltWallSegmentBody): readonly AxisAlignedWallFace[] {
  const sideAFace = createAxisAlignedWallFace({
    id: `${segmentBody.id}:side-a`,
    startPointInches: segmentBody.start.sideAPointInches,
    endPointInches: segmentBody.end.sideAPointInches,
  });
  const sideBFace = createAxisAlignedWallFace({
    id: `${segmentBody.id}:side-b`,
    startPointInches: segmentBody.start.sideBPointInches,
    endPointInches: segmentBody.end.sideBPointInches,
  });

  return [sideAFace, sideBFace].filter(isAxisAlignedWallFace);
}

function createAxisAlignedWallFace(args: {
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}): AxisAlignedWallFace | null {
  const deltaXInches = args.endPointInches.xInches - args.startPointInches.xInches;
  const deltaYInches = args.endPointInches.yInches - args.startPointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);

  if (lengthInches <= MIN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const absoluteXDot = Math.abs(deltaXInches / lengthInches);
  const absoluteYDot = Math.abs(deltaYInches / lengthInches);

  if (absoluteXDot >= AXIS_ALIGNED_FACE_DOT_THRESHOLD) {
    return {
      id: args.id,
      orientation: "horizontal",
      fixedCoordinateInches: (args.startPointInches.yInches + args.endPointInches.yInches) / 2,
      minRangeInches: Math.min(args.startPointInches.xInches, args.endPointInches.xInches),
      maxRangeInches: Math.max(args.startPointInches.xInches, args.endPointInches.xInches),
    };
  }

  if (absoluteYDot >= AXIS_ALIGNED_FACE_DOT_THRESHOLD) {
    return {
      id: args.id,
      orientation: "vertical",
      fixedCoordinateInches: (args.startPointInches.xInches + args.endPointInches.xInches) / 2,
      minRangeInches: Math.min(args.startPointInches.yInches, args.endPointInches.yInches),
      maxRangeInches: Math.max(args.startPointInches.yInches, args.endPointInches.yInches),
    };
  }

  return null;
}

function getFootprintPlanBounds(footprint: SceneEntityPlanFootprint): FootprintPlanBounds {
  const bounds = footprint.cornerPointsInches.reduce(
    (currentBounds, cornerPointInches) => ({
      minXInches: Math.min(currentBounds.minXInches, cornerPointInches.xInches),
      maxXInches: Math.max(currentBounds.maxXInches, cornerPointInches.xInches),
      minYInches: Math.min(currentBounds.minYInches, cornerPointInches.yInches),
      maxYInches: Math.max(currentBounds.maxYInches, cornerPointInches.yInches),
    }),
    {
      minXInches: Number.POSITIVE_INFINITY,
      maxXInches: Number.NEGATIVE_INFINITY,
      minYInches: Number.POSITIVE_INFINITY,
      maxYInches: Number.NEGATIVE_INFINITY,
    },
  );

  return {
    ...bounds,
    centerXInches: (bounds.minXInches + bounds.maxXInches) / 2,
    centerYInches: (bounds.minYInches + bounds.maxYInches) / 2,
  };
}

function findNearestLeftMeasurementGuide(args: {
  bounds: FootprintPlanBounds;
  wallFaces: readonly AxisAlignedWallFace[];
}): SceneEntityWallMeasurementGuide | null {
  return findNearestMeasurementGuide({
    wallFaces: args.wallFaces,
    createGuide: (wallFace) => {
      if (wallFace.fixedCoordinateInches >= args.bounds.minXInches) {
        return null;
      }

      return createHorizontalGuide({
        id: `scene-entity-wall-measurement:left:${wallFace.id}`,
        startXInches: wallFace.fixedCoordinateInches,
        endXInches: args.bounds.minXInches,
        yInches: clamp(args.bounds.centerYInches, wallFace.minRangeInches, wallFace.maxRangeInches),
      });
    },
    rangesOverlap: (wallFace) => rangesOverlap({
      firstMinInches: args.bounds.minYInches,
      firstMaxInches: args.bounds.maxYInches,
      secondMinInches: wallFace.minRangeInches,
      secondMaxInches: wallFace.maxRangeInches,
    }),
  });
}

function findNearestRightMeasurementGuide(args: {
  bounds: FootprintPlanBounds;
  wallFaces: readonly AxisAlignedWallFace[];
}): SceneEntityWallMeasurementGuide | null {
  return findNearestMeasurementGuide({
    wallFaces: args.wallFaces,
    createGuide: (wallFace) => {
      if (wallFace.fixedCoordinateInches <= args.bounds.maxXInches) {
        return null;
      }

      return createHorizontalGuide({
        id: `scene-entity-wall-measurement:right:${wallFace.id}`,
        startXInches: args.bounds.maxXInches,
        endXInches: wallFace.fixedCoordinateInches,
        yInches: clamp(args.bounds.centerYInches, wallFace.minRangeInches, wallFace.maxRangeInches),
      });
    },
    rangesOverlap: (wallFace) => rangesOverlap({
      firstMinInches: args.bounds.minYInches,
      firstMaxInches: args.bounds.maxYInches,
      secondMinInches: wallFace.minRangeInches,
      secondMaxInches: wallFace.maxRangeInches,
    }),
  });
}

function findNearestBottomMeasurementGuide(args: {
  bounds: FootprintPlanBounds;
  wallFaces: readonly AxisAlignedWallFace[];
}): SceneEntityWallMeasurementGuide | null {
  return findNearestMeasurementGuide({
    wallFaces: args.wallFaces,
    createGuide: (wallFace) => {
      if (wallFace.fixedCoordinateInches >= args.bounds.minYInches) {
        return null;
      }

      return createVerticalGuide({
        id: `scene-entity-wall-measurement:bottom:${wallFace.id}`,
        startYInches: wallFace.fixedCoordinateInches,
        endYInches: args.bounds.minYInches,
        xInches: clamp(args.bounds.centerXInches, wallFace.minRangeInches, wallFace.maxRangeInches),
      });
    },
    rangesOverlap: (wallFace) => rangesOverlap({
      firstMinInches: args.bounds.minXInches,
      firstMaxInches: args.bounds.maxXInches,
      secondMinInches: wallFace.minRangeInches,
      secondMaxInches: wallFace.maxRangeInches,
    }),
  });
}

function findNearestTopMeasurementGuide(args: {
  bounds: FootprintPlanBounds;
  wallFaces: readonly AxisAlignedWallFace[];
}): SceneEntityWallMeasurementGuide | null {
  return findNearestMeasurementGuide({
    wallFaces: args.wallFaces,
    createGuide: (wallFace) => {
      if (wallFace.fixedCoordinateInches <= args.bounds.maxYInches) {
        return null;
      }

      return createVerticalGuide({
        id: `scene-entity-wall-measurement:top:${wallFace.id}`,
        startYInches: args.bounds.maxYInches,
        endYInches: wallFace.fixedCoordinateInches,
        xInches: clamp(args.bounds.centerXInches, wallFace.minRangeInches, wallFace.maxRangeInches),
      });
    },
    rangesOverlap: (wallFace) => rangesOverlap({
      firstMinInches: args.bounds.minXInches,
      firstMaxInches: args.bounds.maxXInches,
      secondMinInches: wallFace.minRangeInches,
      secondMaxInches: wallFace.maxRangeInches,
    }),
  });
}

function findNearestMeasurementGuide(args: {
  wallFaces: readonly AxisAlignedWallFace[];
  rangesOverlap: (wallFace: AxisAlignedWallFace) => boolean;
  createGuide: (wallFace: AxisAlignedWallFace) => SceneEntityWallMeasurementGuide | null;
}): SceneEntityWallMeasurementGuide | null {
  const candidates = args.wallFaces
    .filter(args.rangesOverlap)
    .map(args.createGuide)
    .filter(isSceneEntityWallMeasurementGuide)
    .sort((firstGuide, secondGuide) => firstGuide.lengthInches - secondGuide.lengthInches);

  return candidates[0] ?? null;
}

function createHorizontalGuide(args: {
  id: string;
  startXInches: number;
  endXInches: number;
  yInches: number;
}): SceneEntityWallMeasurementGuide | null {
  const lengthInches = Math.abs(args.endXInches - args.startXInches);

  if (lengthInches < MIN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const startPointInches = createPoint(args.startXInches, args.yInches);
  const endPointInches = createPoint(args.endXInches, args.yInches);

  return {
    id: args.id,
    startPointInches,
    endPointInches,
    lengthInches,
    labelPointInches: createPoint((args.startXInches + args.endXInches) / 2, args.yInches),
    labelRotationDegrees: 0,
  };
}

function createVerticalGuide(args: {
  id: string;
  startYInches: number;
  endYInches: number;
  xInches: number;
}): SceneEntityWallMeasurementGuide | null {
  const lengthInches = Math.abs(args.endYInches - args.startYInches);

  if (lengthInches < MIN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const startPointInches = createPoint(args.xInches, args.startYInches);
  const endPointInches = createPoint(args.xInches, args.endYInches);

  return {
    id: args.id,
    startPointInches,
    endPointInches,
    lengthInches,
    labelPointInches: createPoint(args.xInches, (args.startYInches + args.endYInches) / 2),
    labelRotationDegrees: 90,
  };
}

function rangesOverlap(args: {
  firstMinInches: number;
  firstMaxInches: number;
  secondMinInches: number;
  secondMaxInches: number;
}): boolean {
  return args.firstMaxInches >= args.secondMinInches - OVERLAP_TOLERANCE_INCHES &&
    args.secondMaxInches >= args.firstMinInches - OVERLAP_TOLERANCE_INCHES;
}




function createPoint(xInches: number, yInches: number): Point3DInches {
  return { xInches, yInches, zInches: 0 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isAxisAlignedWallFace(wallFace: AxisAlignedWallFace | null): wallFace is AxisAlignedWallFace {
  return wallFace !== null;
}

function isSceneEntityWallMeasurementGuide(
  measurementGuide: SceneEntityWallMeasurementGuide | null,
): measurementGuide is SceneEntityWallMeasurementGuide {
  return measurementGuide !== null;
}
