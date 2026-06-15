import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { createCountertopOpeningRequestedPolygon } from "@/engine/countertops/countertopOpeningGeometry";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { WallSegmentFace } from "@/engine/walls/wallSegmentTopologyTypes";
import {
  arePlanDirectionsParallel,
  getPlacementEdgePlanSegment,
  getPlanPerpendicularVector,
  getPlanSignedDistanceToLine,
  getPlanVectorLength,
  getProjectedSegmentOverlap,
  getProjectedSegmentSpan,
  normalizePlanVector,
  type PlanVector2DInches,
} from "../assemblyPlacementPlanGeometry";
import {
  OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
  OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
  OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
  OBJECT_WALL_OPENING_PLAN_DEPTH_TOLERANCE_INCHES,
  WALL_ALIGNMENT_PLAN_DEPTH_TOLERANCE_INCHES,
  WALL_ALIGNMENT_SNAP_DISTANCE_INCHES,
  WALL_OPENING_PLAN_TARGET_THICKNESS_INCHES,
} from "./assemblyObjectAlignmentConstants";
import {
  createObjectAlignmentFootprintFromPlanPoints,
  isObjectAlignmentFootprint,
} from "./assemblyObjectAlignmentFootprints";
import type { ObjectAlignmentFootprint } from "./assemblyObjectAlignmentTypes";
import { createCountertopWorldPoint } from "./assemblyCountertopAlignmentGeometry";

export function createWallFacePlanAlignmentFootprints(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  movingAlignmentFootprint: ObjectAlignmentFootprint;
}): readonly ObjectAlignmentFootprint[] {
  return args.placedWallGraphs.flatMap((wallGraph) => {
    const wallGeometry = buildConnectedWallGeometry(wallGraph);

    return wallGeometry.faces
      .map((face) => createWallFacePlanAlignmentFootprint({
        face,
        movingAlignmentFootprint: args.movingAlignmentFootprint,
      }))
      .filter(isObjectAlignmentFootprint);
  });
}

export function createWallCenterlinePlanAlignmentFootprints(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  movingAlignmentFootprint: ObjectAlignmentFootprint;
}): readonly ObjectAlignmentFootprint[] {
  return args.placedWallGraphs.flatMap((wallGraph) => {
    const wallGeometry = buildConnectedWallGeometry(wallGraph);

    return wallGeometry.segmentBodies
      .map((segmentBody) => {
        const centerlineDirectionInches = normalizePlanVector({
          xInches: segmentBody.end.centerPointInches.xInches - segmentBody.start.centerPointInches.xInches,
          yInches: segmentBody.end.centerPointInches.yInches - segmentBody.start.centerPointInches.yInches,
        });

        if (
          centerlineDirectionInches === null ||
          !isWallSegmentCenterlineRelevantToMovingFootprint({
            centerlineStartInches: segmentBody.start.centerPointInches,
            centerlineEndInches: segmentBody.end.centerPointInches,
            centerlineDirectionInches,
            wallThicknessInches: segmentBody.thicknessInches,
            movingAlignmentFootprint: args.movingAlignmentFootprint,
          })
        ) {
          return null;
        }

        return createWallCenterlinePlanAlignmentFootprint({
          segmentId: segmentBody.wallSegmentId,
          startPointInches: segmentBody.start.centerPointInches,
          endPointInches: segmentBody.end.centerPointInches,
          directionInches: centerlineDirectionInches,
        });
      })
      .filter(isObjectAlignmentFootprint);
  });
}

export function createCountertopOpeningAlignmentFootprints(args: {
  placedAssemblies: readonly PlacedAssembly[];
  countertopOpenings: readonly CountertopOpening[];
}): readonly ObjectAlignmentFootprint[] {
  return args.countertopOpenings
    .map((opening) => {
      const hostCountertop = args.placedAssemblies.find((assembly) => assembly.id === opening.hostCountertopId);

      return hostCountertop === undefined
        ? null
        : createCountertopOpeningAlignmentFootprint({ opening, hostCountertop });
    })
    .filter(isObjectAlignmentFootprint);
}

export function createWallOpeningPlanAlignmentFootprints(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly ObjectAlignmentFootprint[] {
  return args.placedWallGraphs.flatMap((wallGraph) => {
    const wallGeometry = buildConnectedWallGeometry(wallGraph);

    return wallGeometry.faces.flatMap((face) => {
      const faceDirectionInches = normalizePlanVector({
        xInches: face.endPointInches.xInches - face.startPointInches.xInches,
        yInches: face.endPointInches.yInches - face.startPointInches.yInches,
      });
      const faceNormalInches = normalizePlanVector(face.normalInches);

      if (faceDirectionInches === null || faceNormalInches === null) {
        return [];
      }

      const wallSegment = wallGraph.segments.find((segment) => segment.id === face.wallSegmentId);

      return (wallSegment?.openings ?? [])
        .filter((opening) => opening.faceSide === face.side)
        .map((opening) => createWallOpeningPlanAlignmentFootprint({
          opening,
          faceStartInches: face.startPointInches,
          faceDirectionInches,
          faceNormalInches,
        }))
        .filter(isObjectAlignmentFootprint);
    });
  });
}

function createWallCenterlinePlanAlignmentFootprint(args: {
  segmentId: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): ObjectAlignmentFootprint {
  const centerPointInches = {
    xInches: (args.startPointInches.xInches + args.endPointInches.xInches) / 2,
    yInches: (args.startPointInches.yInches + args.endPointInches.yInches) / 2,
    zInches: 0,
  };
  const segmentInches = {
    startPointInches: { ...args.startPointInches, zInches: 0 },
    endPointInches: { ...args.endPointInches, zInches: 0 },
  };
  const normalInches = normalizePlanVector(getPlanPerpendicularVector(args.directionInches)) ?? {
    xInches: -args.directionInches.yInches,
    yInches: args.directionInches.xInches,
  };

  return {
    assemblyId: `wall-centerline-${args.segmentId}`,
    targetKind: "wall-centerline",
    targetPriority: -2,
    snapDistanceInches: WALL_ALIGNMENT_SNAP_DISTANCE_INCHES,
    footprint: {
      centerPointInches,
      cornerPointsInches: [segmentInches.startPointInches, segmentInches.endPointInches],
      edges: [{
        index: 0,
        startPointInches: segmentInches.startPointInches,
        endPointInches: segmentInches.endPointInches,
        midpointInches: centerPointInches,
        lengthInches: Math.hypot(
          segmentInches.endPointInches.xInches - segmentInches.startPointInches.xInches,
          segmentInches.endPointInches.yInches - segmentInches.startPointInches.yInches,
        ),
      }],
    },
    lines: [{
      id: `wall-centerline-${args.segmentId}-center`,
      lineKind: "center",
      axisIndex: 0,
      pointInches: centerPointInches,
      directionInches: args.directionInches,
      normalInches,
      segmentInches,
    }],
  };
}

function createWallFacePlanAlignmentFootprint(args: {
  face: WallSegmentFace;
  movingAlignmentFootprint: ObjectAlignmentFootprint;
}): ObjectAlignmentFootprint | null {
  const faceDirectionInches = normalizePlanVector({
    xInches: args.face.endPointInches.xInches - args.face.startPointInches.xInches,
    yInches: args.face.endPointInches.yInches - args.face.startPointInches.yInches,
  });
  const faceNormalInches = normalizePlanVector(args.face.normalInches);

  if (
    faceDirectionInches === null ||
    faceNormalInches === null ||
    !isWallFaceRelevantToMovingFootprint({
      face: args.face,
      faceDirectionInches,
      movingAlignmentFootprint: args.movingAlignmentFootprint,
      distanceToleranceInches: WALL_ALIGNMENT_PLAN_DEPTH_TOLERANCE_INCHES,
    })
  ) {
    return null;
  }

  const halfTargetThicknessInches = 0.01;
  const frontStartPointInches = offsetPlanPoint({
    pointInches: args.face.startPointInches,
    directionInches: faceNormalInches,
    distanceInches: halfTargetThicknessInches,
  });
  const frontEndPointInches = offsetPlanPoint({
    pointInches: args.face.endPointInches,
    directionInches: faceNormalInches,
    distanceInches: halfTargetThicknessInches,
  });
  const backEndPointInches = offsetPlanPoint({
    pointInches: args.face.endPointInches,
    directionInches: faceNormalInches,
    distanceInches: -halfTargetThicknessInches,
  });
  const backStartPointInches = offsetPlanPoint({
    pointInches: args.face.startPointInches,
    directionInches: faceNormalInches,
    distanceInches: -halfTargetThicknessInches,
  });
  const centerPointInches = {
    xInches: (args.face.startPointInches.xInches + args.face.endPointInches.xInches) / 2,
    yInches: (args.face.startPointInches.yInches + args.face.endPointInches.yInches) / 2,
    zInches: 0,
  };

  return createObjectAlignmentFootprintFromPlanPoints({
    assemblyId: `wall-face-${args.face.id}`,
    targetKind: "wall-face",
    targetPriority: -2,
    snapDistanceInches: WALL_ALIGNMENT_SNAP_DISTANCE_INCHES,
    centerPointInches,
    cornerPointsInches: [frontStartPointInches, frontEndPointInches, backEndPointInches, backStartPointInches],
  });
}

function createCountertopOpeningAlignmentFootprint(args: {
  opening: CountertopOpening;
  hostCountertop: PlacedAssembly;
}): ObjectAlignmentFootprint | null {
  const polygonInches = createCountertopOpeningRequestedPolygon(args.opening);

  if (polygonInches.length < 3) {
    return null;
  }

  const topZInches = args.hostCountertop.worldPositionInches.zInches +
    args.hostCountertop.configuration.sizeInches.heightInches / 2;
  const cornerPointsInches = polygonInches.map((localPointInches) => createCountertopWorldPoint({
    hostCountertop: args.hostCountertop,
    localPointInches,
    zInches: topZInches,
  }));
  const centerPointInches = createCountertopWorldPoint({
    hostCountertop: args.hostCountertop,
    localPointInches: args.opening.localCenterInches,
    zInches: topZInches,
  });

  return createObjectAlignmentFootprintFromPlanPoints({
    assemblyId: `countertop-opening-${args.opening.id}`,
    targetKind: "countertop-opening",
    targetPriority: 0,
    snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
    centerPointInches,
    cornerPointsInches,
  });
}

function isWallSegmentCenterlineRelevantToMovingFootprint(args: {
  centerlineStartInches: Point3DInches;
  centerlineEndInches: Point3DInches;
  centerlineDirectionInches: PlanVector2DInches;
  wallThicknessInches: number;
  movingAlignmentFootprint: ObjectAlignmentFootprint;
}): boolean {
  const centerlineNormalInches = normalizePlanVector(getPlanPerpendicularVector(args.centerlineDirectionInches));

  if (centerlineNormalInches === null) {
    return false;
  }

  const centerlineSpanInches = getProjectedSegmentSpan({
    segment: {
      startPointInches: args.centerlineStartInches,
      endPointInches: args.centerlineEndInches,
    },
    originInches: args.centerlineStartInches,
    directionInches: args.centerlineDirectionInches,
  });

  return args.movingAlignmentFootprint.footprint.edges.some((edge) => {
    const edgeDirectionInches = normalizePlanVector({
      xInches: edge.endPointInches.xInches - edge.startPointInches.xInches,
      yInches: edge.endPointInches.yInches - edge.startPointInches.yInches,
    });

    if (
      edgeDirectionInches === null ||
      !arePlanDirectionsParallel({
        firstDirectionInches: edgeDirectionInches,
        secondDirectionInches: args.centerlineDirectionInches,
        angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
      })
    ) {
      return false;
    }

    const distanceInches = Math.abs(getPlanSignedDistanceToLine({
      pointInches: edge.midpointInches,
      linePointInches: args.centerlineStartInches,
      lineNormalInches: centerlineNormalInches,
    }));

    if (distanceInches > args.wallThicknessInches / 2 + WALL_ALIGNMENT_PLAN_DEPTH_TOLERANCE_INCHES) {
      return false;
    }

    const edgeSpanInches = getProjectedSegmentSpan({
      segment: getPlacementEdgePlanSegment(edge),
      originInches: args.centerlineStartInches,
      directionInches: args.centerlineDirectionInches,
    });

    return getProjectedSegmentOverlap({
      firstSpanInches: centerlineSpanInches,
      secondSpanInches: edgeSpanInches,
      toleranceInches: OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
    }) !== null;
  });
}

function isWallFaceRelevantToMovingFootprint(args: {
  face: WallSegmentFace;
  faceDirectionInches: PlanVector2DInches;
  movingAlignmentFootprint: ObjectAlignmentFootprint;
  distanceToleranceInches?: number;
}): boolean {
  const wallSpanInches = getProjectedSegmentSpan({
    segment: {
      startPointInches: args.face.startPointInches,
      endPointInches: args.face.endPointInches,
    },
    originInches: args.face.startPointInches,
    directionInches: args.faceDirectionInches,
  });

  return args.movingAlignmentFootprint.footprint.edges.some((edge) => {
    const edgeDirectionInches = normalizePlanVector({
      xInches: edge.endPointInches.xInches - edge.startPointInches.xInches,
      yInches: edge.endPointInches.yInches - edge.startPointInches.yInches,
    });

    if (
      edgeDirectionInches === null ||
      !arePlanDirectionsParallel({
        firstDirectionInches: edgeDirectionInches,
        secondDirectionInches: args.faceDirectionInches,
        angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
      })
    ) {
      return false;
    }

    const distanceInches = Math.abs(getPlanSignedDistanceToLine({
      pointInches: edge.midpointInches,
      linePointInches: args.face.startPointInches,
      lineNormalInches: args.face.normalInches,
    }));

    if (distanceInches > (args.distanceToleranceInches ?? OBJECT_WALL_OPENING_PLAN_DEPTH_TOLERANCE_INCHES)) {
      return false;
    }

    const edgeSpanInches = getProjectedSegmentSpan({
      segment: getPlacementEdgePlanSegment(edge),
      originInches: args.face.startPointInches,
      directionInches: args.faceDirectionInches,
    });

    return getProjectedSegmentOverlap({
      firstSpanInches: wallSpanInches,
      secondSpanInches: edgeSpanInches,
      toleranceInches: OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
    }) !== null;
  });
}

function createWallOpeningPlanAlignmentFootprint(args: {
  opening: WallOpening;
  faceStartInches: Point3DInches;
  faceDirectionInches: PlanVector2DInches;
  faceNormalInches: PlanVector2DInches;
}): ObjectAlignmentFootprint | null {
  const leftPointInches = {
    xInches: args.faceStartInches.xInches + args.faceDirectionInches.xInches * args.opening.leftInchesAlongFace,
    yInches: args.faceStartInches.yInches + args.faceDirectionInches.yInches * args.opening.leftInchesAlongFace,
    zInches: 0,
  };
  const rightPointInches = {
    xInches:
      args.faceStartInches.xInches +
      args.faceDirectionInches.xInches * (args.opening.leftInchesAlongFace + args.opening.widthInches),
    yInches:
      args.faceStartInches.yInches +
      args.faceDirectionInches.yInches * (args.opening.leftInchesAlongFace + args.opening.widthInches),
    zInches: 0,
  };
  const halfThicknessInches = WALL_OPENING_PLAN_TARGET_THICKNESS_INCHES / 2;
  const frontLeftPointInches = offsetPlanPoint({
    pointInches: leftPointInches,
    directionInches: args.faceNormalInches,
    distanceInches: halfThicknessInches,
  });
  const frontRightPointInches = offsetPlanPoint({
    pointInches: rightPointInches,
    directionInches: args.faceNormalInches,
    distanceInches: halfThicknessInches,
  });
  const backRightPointInches = offsetPlanPoint({
    pointInches: rightPointInches,
    directionInches: args.faceNormalInches,
    distanceInches: -halfThicknessInches,
  });
  const backLeftPointInches = offsetPlanPoint({
    pointInches: leftPointInches,
    directionInches: args.faceNormalInches,
    distanceInches: -halfThicknessInches,
  });
  const centerPointInches = {
    xInches: (leftPointInches.xInches + rightPointInches.xInches) / 2,
    yInches: (leftPointInches.yInches + rightPointInches.yInches) / 2,
    zInches: 0,
  };

  return createObjectAlignmentFootprintFromPlanPoints({
    assemblyId: `wall-opening-${args.opening.id}`,
    targetKind: "wall-opening",
    targetPriority: -1,
    snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
    centerPointInches,
    cornerPointsInches: [frontLeftPointInches, frontRightPointInches, backRightPointInches, backLeftPointInches],
  });
}

function offsetPlanPoint(args: {
  pointInches: Point3DInches;
  directionInches: PlanVector2DInches;
  distanceInches: number;
}): Point3DInches {
  return {
    ...args.pointInches,
    xInches: args.pointInches.xInches + args.directionInches.xInches * args.distanceInches,
    yInches: args.pointInches.yInches + args.directionInches.yInches * args.distanceInches,
  };
}
