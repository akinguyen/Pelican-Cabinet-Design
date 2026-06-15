import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildConnectedWallGeometry } from "./buildConnectedWallGeometry";
import type { BuiltWallSegmentBody, WallSegmentFace } from "./connectedWallGeometryTypes";
import type { PlacedWallGraph } from "./placedWallGraphTypes";
import { getActiveWallSegmentElevationFace } from "./wallSegmentElevation";
import type { WallElevationTarget } from "./wallSegmentElevationTypes";

export const WALL_ELEVATION_VIEW_DEPTH_INCHES = 40;
export const WALL_ELEVATION_NEAR_PADDING_INCHES = 1;
export const WALL_ELEVATION_FAR_PADDING_INCHES = 1;

export type WallElevationViewZone = Readonly<{
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallSegmentFace["side"];
  faceStartInches: Point3DInches;
  faceEndInches: Point3DInches;
  faceCenterInches: Point3DInches;
  faceLengthInches: number;
  faceDirectionInches: Readonly<{
    xInches: number;
    yInches: number;
  }>;
  wallHeightInches: number;
  outwardDirectionInches: Readonly<{
    xInches: number;
    yInches: number;
  }>;
  depthInches: number;
  behindFaceDepthInches: number;
  viewFrameLeftInches: number;
  viewFrameRightInches: number;
  viewFrameTopInches: number;
  viewFrameBottomInches: number;
  floorPlanPolygonInches: readonly Point3DInches[];
}>;

type WallElevationFaceAndBody = Readonly<{
  face: WallSegmentFace;
  segmentBody: BuiltWallSegmentBody | null;
}>;

export function getWallElevationViewZoneForTarget(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
  depthInches?: number;
}): WallElevationViewZone | null {
  const activeFaceAndBody = getWallElevationFaceAndBodyForTarget({
    placedWallGraphs: args.placedWallGraphs,
    activeWallElevationTarget: args.activeWallElevationTarget,
  });

  if (activeFaceAndBody === null) {
    return null;
  }

  return buildWallElevationViewZone({
    face: activeFaceAndBody.face,
    segmentBody: activeFaceAndBody.segmentBody,
    depthInches: args.depthInches ?? WALL_ELEVATION_VIEW_DEPTH_INCHES,
  });
}

export function getWallElevationFaceForTarget(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
}): WallSegmentFace | null {
  return getWallElevationFaceAndBodyForTarget(args)?.face ?? null;
}

function getWallElevationFaceAndBodyForTarget(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
}): WallElevationFaceAndBody | null {
  if (args.placedWallGraphs.length === 0) {
    return null;
  }

  const targetGraph = args.activeWallElevationTarget === null
    ? args.placedWallGraphs[0]
    : args.placedWallGraphs.find((wallGraph) => wallGraph.id === args.activeWallElevationTarget?.wallGraphId)
      ?? args.placedWallGraphs[0];
  const topology = buildConnectedWallGeometry(targetGraph);
  const face = getActiveWallSegmentElevationFace({
    topology,
    activeWallElevationTarget: args.activeWallElevationTarget,
  });

  if (face === null) {
    return null;
  }

  return {
    face,
    segmentBody: topology.segmentBodies.find((body) => body.wallSegmentId === face.wallSegmentId) ?? null,
  };
}

export function buildWallElevationViewZone(args: {
  face: WallSegmentFace;
  segmentBody?: BuiltWallSegmentBody | null;
  depthInches?: number;
}): WallElevationViewZone {
  const depthInches = args.depthInches ?? WALL_ELEVATION_VIEW_DEPTH_INCHES;
  const faceCenterInches = {
    xInches: (args.face.startPointInches.xInches + args.face.endPointInches.xInches) / 2,
    yInches: (args.face.startPointInches.yInches + args.face.endPointInches.yInches) / 2,
    zInches: 0,
  };
  const faceDirectionInches = createPlanDirection(
    args.face.startPointInches,
    args.face.endPointInches,
  );
  const planProjectionBounds = getWallElevationPlanProjectionBounds({
    faceCenterInches,
    faceDirectionInches,
    outwardDirectionInches: args.face.normalInches,
    face: args.face,
    segmentBody: args.segmentBody ?? null,
    depthInches,
  });

  return {
    wallGraphId: args.face.wallGraphId,
    wallSegmentId: args.face.wallSegmentId,
    faceSide: args.face.side,
    faceStartInches: args.face.startPointInches,
    faceEndInches: args.face.endPointInches,
    faceCenterInches,
    faceLengthInches: args.face.lengthInches,
    faceDirectionInches,
    wallHeightInches: args.face.heightInches,
    outwardDirectionInches: args.face.normalInches,
    depthInches,
    behindFaceDepthInches: planProjectionBounds.behindFaceDepthInches,
    viewFrameLeftInches: planProjectionBounds.minUInches,
    viewFrameRightInches: planProjectionBounds.maxUInches,
    viewFrameTopInches: args.face.heightInches / 2,
    viewFrameBottomInches: -args.face.heightInches / 2,
    floorPlanPolygonInches: [
      createProjectedPlanPoint({
        originInches: faceCenterInches,
        faceDirectionInches,
        outwardDirectionInches: args.face.normalInches,
        uInches: planProjectionBounds.minUInches,
        depthInches: planProjectionBounds.minDepthInches,
      }),
      createProjectedPlanPoint({
        originInches: faceCenterInches,
        faceDirectionInches,
        outwardDirectionInches: args.face.normalInches,
        uInches: planProjectionBounds.maxUInches,
        depthInches: planProjectionBounds.minDepthInches,
      }),
      createProjectedPlanPoint({
        originInches: faceCenterInches,
        faceDirectionInches,
        outwardDirectionInches: args.face.normalInches,
        uInches: planProjectionBounds.maxUInches,
        depthInches: planProjectionBounds.maxDepthInches,
      }),
      createProjectedPlanPoint({
        originInches: faceCenterInches,
        faceDirectionInches,
        outwardDirectionInches: args.face.normalInches,
        uInches: planProjectionBounds.minUInches,
        depthInches: planProjectionBounds.maxDepthInches,
      }),
    ],
  };
}

type WallElevationPlanProjectionBounds = Readonly<{
  minUInches: number;
  maxUInches: number;
  minDepthInches: number;
  maxDepthInches: number;
  behindFaceDepthInches: number;
}>;

function getWallElevationPlanProjectionBounds(args: {
  faceCenterInches: Point3DInches;
  faceDirectionInches: Readonly<{ xInches: number; yInches: number }>;
  outwardDirectionInches: Readonly<{ xInches: number; yInches: number }>;
  face: WallSegmentFace;
  segmentBody: BuiltWallSegmentBody | null;
  depthInches: number;
}): WallElevationPlanProjectionBounds {
  const projectedFaceStartUInches = projectPlanPointOntoDirection({
    pointInches: args.face.startPointInches,
    originInches: args.faceCenterInches,
    directionInches: args.faceDirectionInches,
  });
  const projectedFaceEndUInches = projectPlanPointOntoDirection({
    pointInches: args.face.endPointInches,
    originInches: args.faceCenterInches,
    directionInches: args.faceDirectionInches,
  });
  const projectedWallBodyPoints = args.segmentBody?.footprintPolygonInches.map((pointInches) => ({
    uInches: projectPlanPointOntoDirection({
      pointInches,
      originInches: args.faceCenterInches,
      directionInches: args.faceDirectionInches,
    }),
    depthInches: projectPlanPointOntoDirection({
      pointInches,
      originInches: args.faceCenterInches,
      directionInches: args.outwardDirectionInches,
    }),
  })) ?? [];
  const uValuesInches = [
    projectedFaceStartUInches,
    projectedFaceEndUInches,
  ];
  const wallBodyDepthValuesInches = [
    0,
    ...projectedWallBodyPoints.map((point) => point.depthInches),
  ];
  const minDepthInches = Math.min(...wallBodyDepthValuesInches);

  return {
    minUInches: Math.min(...uValuesInches),
    maxUInches: Math.max(...uValuesInches),
    minDepthInches,
    maxDepthInches: args.depthInches,
    behindFaceDepthInches: Math.max(0, -minDepthInches),
  };
}

function createProjectedPlanPoint(args: {
  originInches: Point3DInches;
  faceDirectionInches: Readonly<{ xInches: number; yInches: number }>;
  outwardDirectionInches: Readonly<{ xInches: number; yInches: number }>;
  uInches: number;
  depthInches: number;
}): Point3DInches {
  return {
    xInches:
      args.originInches.xInches +
      args.faceDirectionInches.xInches * args.uInches +
      args.outwardDirectionInches.xInches * args.depthInches,
    yInches:
      args.originInches.yInches +
      args.faceDirectionInches.yInches * args.uInches +
      args.outwardDirectionInches.yInches * args.depthInches,
    zInches: args.originInches.zInches,
  };
}

function projectPlanPointOntoDirection(args: {
  pointInches: Point3DInches;
  originInches: Point3DInches;
  directionInches: Readonly<{ xInches: number; yInches: number }>;
}): number {
  return (
    (args.pointInches.xInches - args.originInches.xInches) * args.directionInches.xInches +
    (args.pointInches.yInches - args.originInches.yInches) * args.directionInches.yInches
  );
}

function createPlanDirection(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): Readonly<{ xInches: number; yInches: number }> {
  const deltaXInches = endPointInches.xInches - startPointInches.xInches;
  const deltaYInches = endPointInches.yInches - startPointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);

  if (lengthInches <= 0) {
    return { xInches: 1, yInches: 0 };
  }

  return {
    xInches: deltaXInches / lengthInches,
    yInches: deltaYInches / lengthInches,
  };
}
