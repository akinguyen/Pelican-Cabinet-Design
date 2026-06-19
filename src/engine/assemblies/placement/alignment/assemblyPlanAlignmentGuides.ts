import type { Point3DInches } from "@/core/geometry/pointTypes";
import type {
  AssemblyObjectAlignmentGuide,
  AssemblyPlacementFootprint,
} from "../assemblyPlacementTypes";
import {
  getPlanPointAtProjection,
  getProjectedSegmentSpan,
  translatePlanPoint,
  type PlanVector2DInches,
} from "../assemblyPlacementPlanGeometry";
import { OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES } from "./assemblyObjectAlignmentConstants";
import type {
  ObjectAlignmentCandidate,
  ObjectAlignmentDeltaInches,
  ObjectAlignmentFootprint,
} from "./assemblyObjectAlignmentTypes";

export function buildAlignmentGuides(args: {
  movingAlignmentFootprint: ObjectAlignmentFootprint;
  targetAlignmentFootprints: readonly ObjectAlignmentFootprint[];
  selectedCandidates: readonly ObjectAlignmentCandidate[];
  finalDeltaInches: ObjectAlignmentDeltaInches;
}): readonly AssemblyObjectAlignmentGuide[] {
  return args.selectedCandidates.map((candidate) => {
    const targetAlignmentFootprint = args.targetAlignmentFootprints.find((targetFootprint) => (
      targetFootprint.assemblyId === candidate.targetAssemblyId
    ));
    const movingFootprint = getTranslatedFootprint({
      footprint: args.movingAlignmentFootprint.footprint,
      deltaInches: args.finalDeltaInches,
    });
    const targetFootprint = targetAlignmentFootprint?.footprint ?? args.movingAlignmentFootprint.footprint;
    const guideSpanInches = getCombinedGuideSpan({
      movingFootprint,
      targetFootprint,
      originInches: candidate.targetLine.pointInches,
      directionInches: candidate.targetLine.directionInches,
    });

    return {
      id: `object-alignment-${candidate.targetAssemblyId}-${candidate.targetLine.id}-${candidate.movingLine.id}`,
      guidePlane: "plan",
      startPointInches: getPlanPointAtProjection({
        originInches: candidate.targetLine.pointInches,
        directionInches: candidate.targetLine.directionInches,
        projectionInches: guideSpanInches.minInches,
      }),
      endPointInches: getPlanPointAtProjection({
        originInches: candidate.targetLine.pointInches,
        directionInches: candidate.targetLine.directionInches,
        projectionInches: guideSpanInches.maxInches,
      }),
    };
  });
}

function getTranslatedFootprint(args: {
  footprint: AssemblyPlacementFootprint;
  deltaInches: ObjectAlignmentDeltaInches;
}): AssemblyPlacementFootprint {
  const cornerPointsInches = args.footprint.cornerPointsInches.map((cornerPointInches) => translatePlanPoint({
    pointInches: cornerPointInches,
    deltaInches: args.deltaInches,
  }));
  const centerPointInches = translatePlanPoint({
    pointInches: args.footprint.centerPointInches,
    deltaInches: args.deltaInches,
  });

  return {
    centerPointInches,
    cornerPointsInches,
    edges: args.footprint.edges.map((edge, edgeIndex) => {
      const startPointInches = cornerPointsInches[edgeIndex];
      const endPointInches = cornerPointsInches[(edgeIndex + 1) % cornerPointsInches.length];

      return {
        ...edge,
        startPointInches,
        endPointInches,
        midpointInches: {
          xInches: (startPointInches.xInches + endPointInches.xInches) / 2,
          yInches: (startPointInches.yInches + endPointInches.yInches) / 2,
          zInches: edge.midpointInches.zInches,
        },
      };
    }),
  };
}

function getCombinedGuideSpan(args: {
  movingFootprint: AssemblyPlacementFootprint;
  targetFootprint: AssemblyPlacementFootprint;
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): Readonly<{ minInches: number; maxInches: number }> {
  const movingSpanInches = getFootprintProjectionSpan({
    footprint: args.movingFootprint,
    originInches: args.originInches,
    directionInches: args.directionInches,
  });
  const targetSpanInches = getFootprintProjectionSpan({
    footprint: args.targetFootprint,
    originInches: args.originInches,
    directionInches: args.directionInches,
  });

  return {
    minInches: Math.min(movingSpanInches.minInches, targetSpanInches.minInches) - OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
    maxInches: Math.max(movingSpanInches.maxInches, targetSpanInches.maxInches) + OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
  };
}

function getFootprintProjectionSpan(args: {
  footprint: AssemblyPlacementFootprint;
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): Readonly<{ minInches: number; maxInches: number }> {
  return args.footprint.edges.reduce((spanInches, edge) => {
    const edgeSpanInches = getProjectedSegmentSpan({
      segment: {
        startPointInches: edge.startPointInches,
        endPointInches: edge.endPointInches,
      },
      originInches: args.originInches,
      directionInches: args.directionInches,
    });

    return {
      minInches: Math.min(spanInches.minInches, edgeSpanInches.minInches),
      maxInches: Math.max(spanInches.maxInches, edgeSpanInches.maxInches),
    };
  }, {
    minInches: Number.POSITIVE_INFINITY,
    maxInches: Number.NEGATIVE_INFINITY,
  });
}
