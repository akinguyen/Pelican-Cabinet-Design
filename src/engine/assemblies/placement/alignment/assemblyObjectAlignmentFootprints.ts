import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyPlacementFootprint } from "../assemblyPlacementTypes";
import {
  getPlanPerpendicularVector,
  normalizePlanVector,
} from "../assemblyPlacementPlanGeometry";
import type {
  ObjectAlignmentFootprint,
  ObjectAlignmentLine,
} from "./assemblyObjectAlignmentTypes";

export function createObjectAlignmentFootprintFromPlanPoints(args: {
  assemblyId: string;
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
      pointInches: edge.midpointInches,
      directionInches,
      normalInches,
    };
  }).filter(isObjectAlignmentLine);
  const centerLines = edgeLines.slice(0, 2).map<ObjectAlignmentLine>((edgeLine, axisIndex) => {
    return {
      id: `${args.assemblyId}-center-${axisIndex}`,
      lineKind: "center",
      pointInches: args.footprint.centerPointInches,
      directionInches: edgeLine.directionInches,
      normalInches: edgeLine.normalInches,
    };
  });

  return {
    assemblyId: args.assemblyId,
    targetPriority: args.targetPriority,
    snapDistanceInches: args.snapDistanceInches,
    footprint: args.footprint,
    lines: [...edgeLines, ...centerLines],
  };
}

function isObjectAlignmentLine(line: ObjectAlignmentLine | null): line is ObjectAlignmentLine {
  return line !== null;
}
