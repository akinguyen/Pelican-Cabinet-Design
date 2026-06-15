import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyPlacementFootprint } from "../assemblyPlacementTypes";
import {
  getPlanPerpendicularVector,
  getPlanPointAtProjection,
  normalizePlanVector,
  projectPointOntoPlanDirection,
  type PlanVector2DInches,
} from "../assemblyPlacementPlanGeometry";
import type {
  ObjectAlignmentFootprint,
  ObjectAlignmentLine,
  ObjectAlignmentTargetKind,
} from "./assemblyObjectAlignmentTypes";

export function createObjectAlignmentFootprintFromPlanPoints(args: {
  assemblyId: string;
  targetKind: ObjectAlignmentTargetKind;
  targetPriority: number;
  snapDistanceInches: number;
  centerPointInches: Point3DInches;
  cornerPointsInches: readonly Point3DInches[];
}): ObjectAlignmentFootprint | null {
  if (args.cornerPointsInches.length < 3) {
    return null;
  }

  return createObjectAlignmentFootprint({
    assemblyId: args.assemblyId,
    targetKind: args.targetKind,
    targetPriority: args.targetPriority,
    snapDistanceInches: args.snapDistanceInches,
    footprint: {
      centerPointInches: args.centerPointInches,
      cornerPointsInches: args.cornerPointsInches,
      edges: args.cornerPointsInches.map((cornerPointInches, cornerIndex) => {
        const nextCornerPointInches = args.cornerPointsInches[(cornerIndex + 1) % args.cornerPointsInches.length];

        return {
          index: cornerIndex,
          startPointInches: cornerPointInches,
          endPointInches: nextCornerPointInches,
          midpointInches: {
            xInches: (cornerPointInches.xInches + nextCornerPointInches.xInches) / 2,
            yInches: (cornerPointInches.yInches + nextCornerPointInches.yInches) / 2,
            zInches: args.centerPointInches.zInches,
          },
          lengthInches: Math.hypot(
            nextCornerPointInches.xInches - cornerPointInches.xInches,
            nextCornerPointInches.yInches - cornerPointInches.yInches,
          ),
        };
      }),
    },
  });
}

export function isObjectAlignmentFootprint(
  footprint: ObjectAlignmentFootprint | null,
): footprint is ObjectAlignmentFootprint {
  return footprint !== null;
}

export function createObjectAlignmentFootprint(args: {
  assemblyId: string;
  targetKind: ObjectAlignmentTargetKind;
  targetPriority: number;
  snapDistanceInches: number;
  footprint: AssemblyPlacementFootprint;
}): ObjectAlignmentFootprint {
  const edgeLines = args.footprint.edges.map<ObjectAlignmentLine | null>((edge) => {
    const directionInches = normalizePlanVector({
      xInches: edge.endPointInches.xInches - edge.startPointInches.xInches,
      yInches: edge.endPointInches.yInches - edge.startPointInches.yInches,
    });

    if (directionInches === null) {
      return null;
    }

    const normalInches = normalizePlanVector(getPlanPerpendicularVector(directionInches));

    if (normalInches === null) {
      return null;
    }

    return {
      id: `${args.assemblyId}-edge-${edge.index}`,
      lineKind: "edge",
      axisIndex: edge.index % 2,
      pointInches: edge.midpointInches,
      directionInches,
      normalInches,
      segmentInches: {
        startPointInches: edge.startPointInches,
        endPointInches: edge.endPointInches,
      },
    };
  }).filter(isObjectAlignmentLine);
  const centerLines = edgeLines.slice(0, 2).map<ObjectAlignmentLine>((edgeLine, axisIndex) => {
    const halfGuideLengthInches = getFootprintProjectedLength({
      footprint: args.footprint,
      originInches: args.footprint.centerPointInches,
      directionInches: edgeLine.directionInches,
    }) / 2;

    return {
      id: `${args.assemblyId}-center-${axisIndex}`,
      lineKind: "center",
      axisIndex,
      pointInches: args.footprint.centerPointInches,
      directionInches: edgeLine.directionInches,
      normalInches: edgeLine.normalInches,
      segmentInches: {
        startPointInches: getPlanPointAtProjection({
          originInches: args.footprint.centerPointInches,
          directionInches: edgeLine.directionInches,
          projectionInches: -halfGuideLengthInches,
        }),
        endPointInches: getPlanPointAtProjection({
          originInches: args.footprint.centerPointInches,
          directionInches: edgeLine.directionInches,
          projectionInches: halfGuideLengthInches,
        }),
      },
    };
  });

  return {
    assemblyId: args.assemblyId,
    targetKind: args.targetKind,
    targetPriority: args.targetPriority,
    snapDistanceInches: args.snapDistanceInches,
    footprint: args.footprint,
    lines: [...edgeLines, ...centerLines],
  };
}

function getFootprintProjectedLength(args: {
  footprint: AssemblyPlacementFootprint;
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): number {
  const projectionsInches = args.footprint.cornerPointsInches.map((cornerPointInches) => projectPointOntoPlanDirection({
    pointInches: cornerPointInches,
    originInches: args.originInches,
    directionInches: args.directionInches,
  }));

  return Math.max(...projectionsInches) - Math.min(...projectionsInches);
}

function isObjectAlignmentLine(line: ObjectAlignmentLine | null): line is ObjectAlignmentLine {
  return line !== null;
}
