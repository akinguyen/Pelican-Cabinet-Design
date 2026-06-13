import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallSegmentFace } from "@/engine/walls/wallSegmentTopologyTypes";
import { createAssemblyPlacementFootprint, updateAssemblyPlacementWorldPosition } from "./assemblyPlacementGeometry";
import type { AssemblyPlacementFootprint } from "./assemblyPlacementTypes";

const WALL_FACE_SNAP_DISTANCE_INCHES = 6;
const AXIS_ALIGNED_FACE_EPSILON_INCHES = 0.01;
const WALL_FACE_SPAN_TOLERANCE_INCHES = 6;

type PlanBoundsInches = Readonly<{
  minXInches: number;
  maxXInches: number;
  minYInches: number;
  maxYInches: number;
}>;

type WallFaceSnapCandidate = Readonly<{
  axis: "x" | "y";
  deltaInches: number;
  distanceInches: number;
}>;

type WallFaceSnapCandidatesByAxis = Readonly<{
  x: WallFaceSnapCandidate | null;
  y: WallFaceSnapCandidate | null;
}>;

export function snapAssemblyPlacementToNearbyWalls(args: {
  placedAssembly: PlacedAssembly;
  placedWallGraphs: readonly PlacedWallGraph[];
}): PlacedAssembly {
  if (args.placedWallGraphs.length === 0) {
    return args.placedAssembly;
  }

  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);
  const footprintBounds = getFootprintPlanBounds(footprint);
  const snapCandidatesByAxis = args.placedWallGraphs
    .flatMap((placedWallGraph) => buildConnectedWallGeometry(placedWallGraph).faces)
    .reduce<WallFaceSnapCandidatesByAxis>(
      (currentCandidatesByAxis, wallFace) => selectNearestSnapCandidates({
        currentCandidatesByAxis,
        wallFace,
        footprintBounds,
      }),
      { x: null, y: null },
    );

  if (snapCandidatesByAxis.x === null && snapCandidatesByAxis.y === null) {
    return args.placedAssembly;
  }

  return updateAssemblyPlacementWorldPosition(args.placedAssembly, {
    ...args.placedAssembly.worldPositionInches,
    xInches: args.placedAssembly.worldPositionInches.xInches + (snapCandidatesByAxis.x?.deltaInches ?? 0),
    yInches: args.placedAssembly.worldPositionInches.yInches + (snapCandidatesByAxis.y?.deltaInches ?? 0),
  });
}

function selectNearestSnapCandidates(args: {
  currentCandidatesByAxis: WallFaceSnapCandidatesByAxis;
  wallFace: WallSegmentFace;
  footprintBounds: PlanBoundsInches;
}): WallFaceSnapCandidatesByAxis {
  const candidate = createWallFaceSnapCandidate({
    wallFace: args.wallFace,
    footprintBounds: args.footprintBounds,
  });

  if (candidate === null) {
    return args.currentCandidatesByAxis;
  }

  const currentAxisCandidate = args.currentCandidatesByAxis[candidate.axis];

  if (currentAxisCandidate !== null && currentAxisCandidate.distanceInches <= candidate.distanceInches) {
    return args.currentCandidatesByAxis;
  }

  return {
    ...args.currentCandidatesByAxis,
    [candidate.axis]: candidate,
  };
}

function createWallFaceSnapCandidate(args: {
  wallFace: WallSegmentFace;
  footprintBounds: PlanBoundsInches;
}): WallFaceSnapCandidate | null {
  if (isHorizontalWallFace(args.wallFace)) {
    return createHorizontalWallFaceSnapCandidate(args);
  }

  if (isVerticalWallFace(args.wallFace)) {
    return createVerticalWallFaceSnapCandidate(args);
  }

  return null;
}

function createHorizontalWallFaceSnapCandidate(args: {
  wallFace: WallSegmentFace;
  footprintBounds: PlanBoundsInches;
}): WallFaceSnapCandidate | null {
  const faceMinXInches = Math.min(args.wallFace.startPointInches.xInches, args.wallFace.endPointInches.xInches);
  const faceMaxXInches = Math.max(args.wallFace.startPointInches.xInches, args.wallFace.endPointInches.xInches);

  if (!doRangesNearlyOverlap({
    firstMinInches: args.footprintBounds.minXInches,
    firstMaxInches: args.footprintBounds.maxXInches,
    secondMinInches: faceMinXInches,
    secondMaxInches: faceMaxXInches,
  })) {
    return null;
  }

  const faceYInches = (args.wallFace.startPointInches.yInches + args.wallFace.endPointInches.yInches) / 2;
  const snapToTopDistanceInches = faceYInches - args.footprintBounds.maxYInches;

  if (isValidSnapDistance(snapToTopDistanceInches)) {
    return {
      axis: "y",
      deltaInches: snapToTopDistanceInches,
      distanceInches: Math.abs(snapToTopDistanceInches),
    };
  }

  const snapToBottomDistanceInches = faceYInches - args.footprintBounds.minYInches;

  if (isValidSnapDistance(-snapToBottomDistanceInches)) {
    return {
      axis: "y",
      deltaInches: snapToBottomDistanceInches,
      distanceInches: Math.abs(snapToBottomDistanceInches),
    };
  }

  return null;
}

function createVerticalWallFaceSnapCandidate(args: {
  wallFace: WallSegmentFace;
  footprintBounds: PlanBoundsInches;
}): WallFaceSnapCandidate | null {
  const faceMinYInches = Math.min(args.wallFace.startPointInches.yInches, args.wallFace.endPointInches.yInches);
  const faceMaxYInches = Math.max(args.wallFace.startPointInches.yInches, args.wallFace.endPointInches.yInches);

  if (!doRangesNearlyOverlap({
    firstMinInches: args.footprintBounds.minYInches,
    firstMaxInches: args.footprintBounds.maxYInches,
    secondMinInches: faceMinYInches,
    secondMaxInches: faceMaxYInches,
  })) {
    return null;
  }

  const faceXInches = (args.wallFace.startPointInches.xInches + args.wallFace.endPointInches.xInches) / 2;
  const snapToRightDistanceInches = faceXInches - args.footprintBounds.maxXInches;

  if (isValidSnapDistance(snapToRightDistanceInches)) {
    return {
      axis: "x",
      deltaInches: snapToRightDistanceInches,
      distanceInches: Math.abs(snapToRightDistanceInches),
    };
  }

  const snapToLeftDistanceInches = faceXInches - args.footprintBounds.minXInches;

  if (isValidSnapDistance(-snapToLeftDistanceInches)) {
    return {
      axis: "x",
      deltaInches: snapToLeftDistanceInches,
      distanceInches: Math.abs(snapToLeftDistanceInches),
    };
  }

  return null;
}

function isValidSnapDistance(distanceInches: number): boolean {
  return distanceInches >= 0 && distanceInches <= WALL_FACE_SNAP_DISTANCE_INCHES;
}

function doRangesNearlyOverlap(args: {
  firstMinInches: number;
  firstMaxInches: number;
  secondMinInches: number;
  secondMaxInches: number;
}): boolean {
  return (
    args.firstMaxInches >= args.secondMinInches - WALL_FACE_SPAN_TOLERANCE_INCHES &&
    args.secondMaxInches >= args.firstMinInches - WALL_FACE_SPAN_TOLERANCE_INCHES
  );
}

function getFootprintPlanBounds(footprint: AssemblyPlacementFootprint): PlanBoundsInches {
  return footprint.cornerPointsInches.reduce<PlanBoundsInches>(
    (bounds, cornerPointInches) => ({
      minXInches: Math.min(bounds.minXInches, cornerPointInches.xInches),
      maxXInches: Math.max(bounds.maxXInches, cornerPointInches.xInches),
      minYInches: Math.min(bounds.minYInches, cornerPointInches.yInches),
      maxYInches: Math.max(bounds.maxYInches, cornerPointInches.yInches),
    }),
    {
      minXInches: Number.POSITIVE_INFINITY,
      maxXInches: Number.NEGATIVE_INFINITY,
      minYInches: Number.POSITIVE_INFINITY,
      maxYInches: Number.NEGATIVE_INFINITY,
    },
  );
}

function isHorizontalWallFace(wallFace: WallSegmentFace): boolean {
  return Math.abs(wallFace.endPointInches.yInches - wallFace.startPointInches.yInches) <= AXIS_ALIGNED_FACE_EPSILON_INCHES;
}

function isVerticalWallFace(wallFace: WallSegmentFace): boolean {
  return Math.abs(wallFace.endPointInches.xInches - wallFace.startPointInches.xInches) <= AXIS_ALIGNED_FACE_EPSILON_INCHES;
}
