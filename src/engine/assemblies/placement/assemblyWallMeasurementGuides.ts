import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWall } from "@/engine/walls/wallTypes";
import { getClosedPolygonEdges, projectPointToSegment } from "@/engine/walls/footprint/wallFootprintGeometry";
import {
  createAssemblyPlacementFootprint,
  getPlanAngleDegrees,
  getPlanDistanceInches,
} from "./assemblyPlacementGeometry";
import type {
  AssemblyPlacementEdge,
  AssemblyWallMeasurementGuide,
} from "./assemblyPlacementTypes";

const MAX_ASSEMBLY_WALL_MEASUREMENT_DISTANCE_INCHES = 180;
const MIN_ASSEMBLY_WALL_MEASUREMENT_DISTANCE_INCHES = 0.25;
const MAX_ASSEMBLY_WALL_MEASUREMENT_GUIDE_COUNT = 2;
const MEASUREMENT_GUIDE_Z_INCHES = 5.5;
const MEASUREMENT_GUIDE_LABEL_Z_INCHES = 6;

export function createAssemblyWallMeasurementGuides(args: {
  placedAssembly: PlacedAssembly;
  placedWalls: readonly PlacedWall[];
}): readonly AssemblyWallMeasurementGuide[] {
  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);
  const candidates: AssemblyWallMeasurementGuideCandidate[] = [];

  footprint.edges.forEach((assemblyEdge) => {
    args.placedWalls.forEach((placedWall) => {
      getClosedPolygonEdges(placedWall.footprint.boundaryPointsInches).forEach((wallEdge, wallEdgeIndex) => {
        const closestPoints = findClosestPlanSegmentPoints({
          firstStartPointInches: assemblyEdge.startPointInches,
          firstEndPointInches: assemblyEdge.endPointInches,
          secondStartPointInches: wallEdge.startPointInches,
          secondEndPointInches: wallEdge.endPointInches,
        });

        if (!isRenderableAssemblyWallMeasurementLength(closestPoints.distanceInches)) {
          return;
        }

        candidates.push({
          placedAssemblyId: args.placedAssembly.id,
          placedWallId: placedWall.id,
          assemblyEdgeIndex: assemblyEdge.index,
          wallEdgeIndex,
          startPointInches: addGuideZInches(closestPoints.firstPointInches),
          endPointInches: addGuideZInches(closestPoints.secondPointInches),
          lengthInches: closestPoints.distanceInches,
        });
      });
    });
  });

  return candidates
    .sort((firstCandidate, secondCandidate) => firstCandidate.lengthInches - secondCandidate.lengthInches)
    .slice(0, MAX_ASSEMBLY_WALL_MEASUREMENT_GUIDE_COUNT)
    .map(createAssemblyWallMeasurementGuide);
}

type AssemblyWallMeasurementGuideCandidate = Readonly<{
  placedAssemblyId: string;
  placedWallId: string;
  assemblyEdgeIndex: AssemblyPlacementEdge["index"];
  wallEdgeIndex: number;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
}>;

type ClosestPlanSegmentPoints = Readonly<{
  firstPointInches: Point3DInches;
  secondPointInches: Point3DInches;
  distanceInches: number;
}>;

function createAssemblyWallMeasurementGuide(
  candidate: AssemblyWallMeasurementGuideCandidate,
): AssemblyWallMeasurementGuide {
  return {
    id: `assembly-wall-measurement-${candidate.placedAssemblyId}-${candidate.placedWallId}-${candidate.assemblyEdgeIndex}-${candidate.wallEdgeIndex}`,
    startPointInches: candidate.startPointInches,
    endPointInches: candidate.endPointInches,
    lengthInches: candidate.lengthInches,
    labelPointInches: {
      xInches: (candidate.startPointInches.xInches + candidate.endPointInches.xInches) / 2,
      yInches: (candidate.startPointInches.yInches + candidate.endPointInches.yInches) / 2,
      zInches: MEASUREMENT_GUIDE_LABEL_Z_INCHES,
    },
    labelRotationDegrees: getPlanAngleDegrees({
      startPointInches: candidate.startPointInches,
      endPointInches: candidate.endPointInches,
    }),
  };
}

function findClosestPlanSegmentPoints(args: {
  firstStartPointInches: Point3DInches;
  firstEndPointInches: Point3DInches;
  secondStartPointInches: Point3DInches;
  secondEndPointInches: Point3DInches;
}): ClosestPlanSegmentPoints {
  const intersectionPointInches = getPlanSegmentIntersectionPoint(args);

  if (intersectionPointInches !== null) {
    return {
      firstPointInches: intersectionPointInches,
      secondPointInches: intersectionPointInches,
      distanceInches: 0,
    };
  }

  const candidates = [
    createClosestPointCandidate({
      sourcePointInches: args.firstStartPointInches,
      targetSegmentStartInches: args.secondStartPointInches,
      targetSegmentEndInches: args.secondEndPointInches,
      sourceIsFirstSegment: true,
    }),
    createClosestPointCandidate({
      sourcePointInches: args.firstEndPointInches,
      targetSegmentStartInches: args.secondStartPointInches,
      targetSegmentEndInches: args.secondEndPointInches,
      sourceIsFirstSegment: true,
    }),
    createClosestPointCandidate({
      sourcePointInches: args.secondStartPointInches,
      targetSegmentStartInches: args.firstStartPointInches,
      targetSegmentEndInches: args.firstEndPointInches,
      sourceIsFirstSegment: false,
    }),
    createClosestPointCandidate({
      sourcePointInches: args.secondEndPointInches,
      targetSegmentStartInches: args.firstStartPointInches,
      targetSegmentEndInches: args.firstEndPointInches,
      sourceIsFirstSegment: false,
    }),
  ];

  return candidates.sort((firstCandidate, secondCandidate) => firstCandidate.distanceInches - secondCandidate.distanceInches)[0];
}

function getPlanSegmentIntersectionPoint(args: {
  firstStartPointInches: Point3DInches;
  firstEndPointInches: Point3DInches;
  secondStartPointInches: Point3DInches;
  secondEndPointInches: Point3DInches;
}): Point3DInches | null {
  const firstDeltaXInches = args.firstEndPointInches.xInches - args.firstStartPointInches.xInches;
  const firstDeltaYInches = args.firstEndPointInches.yInches - args.firstStartPointInches.yInches;
  const secondDeltaXInches = args.secondEndPointInches.xInches - args.secondStartPointInches.xInches;
  const secondDeltaYInches = args.secondEndPointInches.yInches - args.secondStartPointInches.yInches;
  const denominator = firstDeltaXInches * secondDeltaYInches - firstDeltaYInches * secondDeltaXInches;

  if (Math.abs(denominator) <= 0.0001) {
    return null;
  }

  const startDeltaXInches = args.secondStartPointInches.xInches - args.firstStartPointInches.xInches;
  const startDeltaYInches = args.secondStartPointInches.yInches - args.firstStartPointInches.yInches;
  const firstT = (startDeltaXInches * secondDeltaYInches - startDeltaYInches * secondDeltaXInches) / denominator;
  const secondT = (startDeltaXInches * firstDeltaYInches - startDeltaYInches * firstDeltaXInches) / denominator;

  if (firstT < 0 || firstT > 1 || secondT < 0 || secondT > 1) {
    return null;
  }

  return {
    xInches: args.firstStartPointInches.xInches + firstDeltaXInches * firstT,
    yInches: args.firstStartPointInches.yInches + firstDeltaYInches * firstT,
    zInches: MEASUREMENT_GUIDE_Z_INCHES,
  };
}

function createClosestPointCandidate(args: {
  sourcePointInches: Point3DInches;
  targetSegmentStartInches: Point3DInches;
  targetSegmentEndInches: Point3DInches;
  sourceIsFirstSegment: boolean;
}): ClosestPlanSegmentPoints {
  const projectedPointInches = projectPointToSegment({
    pointInches: args.sourcePointInches,
    segmentStartInches: args.targetSegmentStartInches,
    segmentEndInches: args.targetSegmentEndInches,
  }).pointInches;
  const distanceInches = getPlanDistanceInches(args.sourcePointInches, projectedPointInches);

  if (args.sourceIsFirstSegment) {
    return {
      firstPointInches: args.sourcePointInches,
      secondPointInches: projectedPointInches,
      distanceInches,
    };
  }

  return {
    firstPointInches: projectedPointInches,
    secondPointInches: args.sourcePointInches,
    distanceInches,
  };
}

function addGuideZInches(pointInches: Point3DInches): Point3DInches {
  return {
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches: MEASUREMENT_GUIDE_Z_INCHES,
  };
}

function isRenderableAssemblyWallMeasurementLength(lengthInches: number): boolean {
  return (
    lengthInches >= MIN_ASSEMBLY_WALL_MEASUREMENT_DISTANCE_INCHES &&
    lengthInches <= MAX_ASSEMBLY_WALL_MEASUREMENT_DISTANCE_INCHES
  );
}
