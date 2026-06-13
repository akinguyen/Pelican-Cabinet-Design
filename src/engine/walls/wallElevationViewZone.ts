import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildConnectedWallGeometry } from "./buildConnectedWallGeometry";
import type { PlacedWallGraph } from "./placedWallGraphTypes";
import type { WallElevationTarget } from "./wallSegmentElevationTypes";
import { getActiveWallSegmentElevationFace } from "./wallSegmentElevation";
import type { WallSegmentFace } from "./connectedWallGeometryTypes";

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
  floorPlanPolygonInches: readonly Point3DInches[];
}>;

export function getWallElevationViewZoneForTarget(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
  depthInches?: number;
}): WallElevationViewZone | null {
  const activeFace = getWallElevationFaceForTarget({
    placedWallGraphs: args.placedWallGraphs,
    activeWallElevationTarget: args.activeWallElevationTarget,
  });

  if (activeFace === null) {
    return null;
  }

  return buildWallElevationViewZone({
    face: activeFace,
    depthInches: args.depthInches ?? WALL_ELEVATION_VIEW_DEPTH_INCHES,
  });
}

export function getWallElevationFaceForTarget(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
}): WallSegmentFace | null {
  if (args.placedWallGraphs.length === 0) {
    return null;
  }

  const targetGraph = args.activeWallElevationTarget === null
    ? args.placedWallGraphs[0]
    : args.placedWallGraphs.find((wallGraph) => wallGraph.id === args.activeWallElevationTarget?.wallGraphId)
      ?? args.placedWallGraphs[0];

  return getActiveWallSegmentElevationFace({
    topology: buildConnectedWallGeometry(targetGraph),
    activeWallElevationTarget: args.activeWallElevationTarget,
  });
}

export function buildWallElevationViewZone(args: {
  face: WallSegmentFace;
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
  const outwardEndPointInches = addPlanVector(
    args.face.endPointInches,
    args.face.normalInches,
    depthInches,
  );
  const outwardStartPointInches = addPlanVector(
    args.face.startPointInches,
    args.face.normalInches,
    depthInches,
  );

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
    floorPlanPolygonInches: [
      args.face.startPointInches,
      args.face.endPointInches,
      outwardEndPointInches,
      outwardStartPointInches,
    ],
  };
}

function addPlanVector(
  pointInches: Point3DInches,
  directionInches: Readonly<{ xInches: number; yInches: number }>,
  distanceInches: number,
): Point3DInches {
  return {
    xInches: pointInches.xInches + directionInches.xInches * distanceInches,
    yInches: pointInches.yInches + directionInches.yInches * distanceInches,
    zInches: pointInches.zInches,
  };
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
