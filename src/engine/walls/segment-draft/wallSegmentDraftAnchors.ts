import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "../placedWallGraphTypes";
import type { PlacedWallNode } from "../placedWallNodeTypes";
import type { PlacedWallSegment } from "../placedWallSegmentTypes";
import type { WallSegmentDrawAnchor, WallSegmentDrawingGuide } from "./wallSegmentDraftTypes";

const WALL_NODE_SNAP_DISTANCE_INCHES = 8;
const WALL_SEGMENT_BODY_SNAP_DISTANCE_INCHES = 7;
const WALL_ORTHOGONAL_GUIDE_SNAP_DISTANCE_INCHES = 6;

export function createWallSegmentDrawAnchor(args: {
  pointInches: Point3DInches;
  placedWallGraphs: readonly PlacedWallGraph[];
}): WallSegmentDrawAnchor {
  const nodeAnchor = findWallNodeAnchor({
    pointInches: args.pointInches,
    placedWallGraphs: args.placedWallGraphs,
  });

  if (nodeAnchor !== null) {
    return nodeAnchor;
  }

  const segmentBodyAnchor = findWallSegmentBodyAnchor({
    pointInches: args.pointInches,
    placedWallGraphs: args.placedWallGraphs,
  });

  if (segmentBodyAnchor !== null) {
    return segmentBodyAnchor;
  }

  return {
    kind: "empty-point",
    pointInches: createPlanPoint(args.pointInches),
  };
}

export function createGuidedWallSegmentDrawAnchor(args: {
  pointInches: Point3DInches;
  startPointInches: Point3DInches;
  placedWallGraphs: readonly PlacedWallGraph[];
}): Readonly<{
  anchor: WallSegmentDrawAnchor;
  guide: WallSegmentDrawingGuide | null;
}> {
  const directAnchor = createWallSegmentDrawAnchor({
    pointInches: args.pointInches,
    placedWallGraphs: args.placedWallGraphs,
  });

  if (directAnchor.kind !== "empty-point") {
    return {
      anchor: directAnchor,
      guide: null,
    };
  }

  const horizontalDistanceInches = Math.abs(args.pointInches.yInches - args.startPointInches.yInches);
  const verticalDistanceInches = Math.abs(args.pointInches.xInches - args.startPointInches.xInches);

  if (
    horizontalDistanceInches > WALL_ORTHOGONAL_GUIDE_SNAP_DISTANCE_INCHES &&
    verticalDistanceInches > WALL_ORTHOGONAL_GUIDE_SNAP_DISTANCE_INCHES
  ) {
    return {
      anchor: directAnchor,
      guide: null,
    };
  }

  if (horizontalDistanceInches <= verticalDistanceInches) {
    const snappedPointInches = createPlanPoint({
      xInches: args.pointInches.xInches,
      yInches: args.startPointInches.yInches,
      zInches: 0,
    });

    return {
      anchor: {
        kind: "empty-point",
        pointInches: snappedPointInches,
      },
      guide: {
        kind: "horizontal",
        yInches: args.startPointInches.yInches,
        startXInches: args.startPointInches.xInches,
        endXInches: snappedPointInches.xInches,
      },
    };
  }

  const snappedPointInches = createPlanPoint({
    xInches: args.startPointInches.xInches,
    yInches: args.pointInches.yInches,
    zInches: 0,
  });

  return {
    anchor: {
      kind: "empty-point",
      pointInches: snappedPointInches,
    },
    guide: {
      kind: "vertical",
      xInches: args.startPointInches.xInches,
      startYInches: args.startPointInches.yInches,
      endYInches: snappedPointInches.yInches,
    },
  };
}

export function getWallSegmentAnchorPoint(anchor: WallSegmentDrawAnchor): Point3DInches {
  return anchor.pointInches;
}

function findWallNodeAnchor(args: {
  pointInches: Point3DInches;
  placedWallGraphs: readonly PlacedWallGraph[];
}): WallSegmentDrawAnchor | null {
  const closestNode = args.placedWallGraphs.reduce<Readonly<{
    wallGraphId: string;
    wallNode: PlacedWallNode;
    distanceInches: number;
  }> | null>((currentClosestNode, wallGraph) => {
    return wallGraph.nodes.reduce<typeof currentClosestNode>((candidateClosestNode, wallNode) => {
      const distanceInches = getPlanDistanceInches(args.pointInches, wallNode.positionInches);

      if (distanceInches > WALL_NODE_SNAP_DISTANCE_INCHES) {
        return candidateClosestNode;
      }

      if (candidateClosestNode === null || distanceInches < candidateClosestNode.distanceInches) {
        return { wallGraphId: wallGraph.id, wallNode, distanceInches };
      }

      return candidateClosestNode;
    }, currentClosestNode);
  }, null);

  if (closestNode === null) {
    return null;
  }

  return {
    kind: "existing-node",
    wallGraphId: closestNode.wallGraphId,
    wallNodeId: closestNode.wallNode.id,
    pointInches: closestNode.wallNode.positionInches,
  };
}

function findWallSegmentBodyAnchor(args: {
  pointInches: Point3DInches;
  placedWallGraphs: readonly PlacedWallGraph[];
}): WallSegmentDrawAnchor | null {
  const closestSegmentAnchor = args.placedWallGraphs.reduce<Readonly<{
    wallGraphId: string;
    wallSegmentId: string;
    pointInches: Point3DInches;
    distanceInches: number;
  }> | null>((closestAnchor, wallGraph) => {
    return wallGraph.segments.reduce<typeof closestAnchor>((candidateClosestAnchor, wallSegment) => {
      const startPointInches = wallGraph.nodes.find((wallNode) => wallNode.id === wallSegment.startNodeId)?.positionInches;
      const endPointInches = wallGraph.nodes.find((wallNode) => wallNode.id === wallSegment.endNodeId)?.positionInches;

      if (startPointInches === undefined || endPointInches === undefined) {
        return candidateClosestAnchor;
      }

      const projection = projectPointToSegment({
        pointInches: args.pointInches,
        startPointInches,
        endPointInches,
      });

      if (
        projection.distanceInches > WALL_SEGMENT_BODY_SNAP_DISTANCE_INCHES ||
        projection.distanceToStartInches <= WALL_NODE_SNAP_DISTANCE_INCHES ||
        projection.distanceToEndInches <= WALL_NODE_SNAP_DISTANCE_INCHES
      ) {
        return candidateClosestAnchor;
      }

      if (candidateClosestAnchor === null || projection.distanceInches < candidateClosestAnchor.distanceInches) {
        return {
          wallGraphId: wallGraph.id,
          wallSegmentId: wallSegment.id,
          pointInches: projection.pointInches,
          distanceInches: projection.distanceInches,
        };
      }

      return candidateClosestAnchor;
    }, closestAnchor);
  }, null);

  if (closestSegmentAnchor === null) {
    return null;
  }

  return {
    kind: "segment-body",
    wallGraphId: closestSegmentAnchor.wallGraphId,
    wallSegmentId: closestSegmentAnchor.wallSegmentId,
    pointInches: closestSegmentAnchor.pointInches,
  };
}

function projectPointToSegment(args: {
  pointInches: Point3DInches;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}): Readonly<{
  pointInches: Point3DInches;
  distanceInches: number;
  distanceToStartInches: number;
  distanceToEndInches: number;
}> {
  const segmentXInches = args.endPointInches.xInches - args.startPointInches.xInches;
  const segmentYInches = args.endPointInches.yInches - args.startPointInches.yInches;
  const segmentLengthSquaredInches = segmentXInches ** 2 + segmentYInches ** 2;

  if (segmentLengthSquaredInches <= 0.000001) {
    return {
      pointInches: args.startPointInches,
      distanceInches: getPlanDistanceInches(args.pointInches, args.startPointInches),
      distanceToStartInches: 0,
      distanceToEndInches: 0,
    };
  }

  const rawScale = (
    (args.pointInches.xInches - args.startPointInches.xInches) * segmentXInches +
    (args.pointInches.yInches - args.startPointInches.yInches) * segmentYInches
  ) / segmentLengthSquaredInches;
  const scale = Math.min(1, Math.max(0, rawScale));
  const projectedPointInches = createPlanPoint({
    xInches: args.startPointInches.xInches + segmentXInches * scale,
    yInches: args.startPointInches.yInches + segmentYInches * scale,
    zInches: 0,
  });

  return {
    pointInches: projectedPointInches,
    distanceInches: getPlanDistanceInches(args.pointInches, projectedPointInches),
    distanceToStartInches: getPlanDistanceInches(projectedPointInches, args.startPointInches),
    distanceToEndInches: getPlanDistanceInches(projectedPointInches, args.endPointInches),
  };
}

function getPlanDistanceInches(firstPointInches: Point3DInches, secondPointInches: Point3DInches): number {
  return Math.hypot(
    secondPointInches.xInches - firstPointInches.xInches,
    secondPointInches.yInches - firstPointInches.yInches,
  );
}

function createPlanPoint(pointInches: Point3DInches): Point3DInches {
  return {
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches: 0,
  };
}
