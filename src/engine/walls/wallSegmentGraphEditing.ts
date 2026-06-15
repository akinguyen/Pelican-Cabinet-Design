import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "./placedWallGraphTypes";
import type { PlacedWallNode } from "./placedWallNodeTypes";
import type { PlacedWallSegment } from "./placedWallSegmentTypes";

export function createWallGraphFromSegment(args: {
  wallGraphId: string;
  wallGraphName: string;
  startNodeId: string;
  endNodeId: string;
  wallSegmentId: string;
  wallSegmentName: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  heightInches: number;
  thicknessInches: number;
}): PlacedWallGraph {
  return {
    id: args.wallGraphId,
    name: args.wallGraphName,
    nodes: [
      createWallNode(args.startNodeId, args.startPointInches),
      createWallNode(args.endNodeId, args.endPointInches),
    ],
    segments: [
      createWallSegment({
        id: args.wallSegmentId,
        name: args.wallSegmentName,
        startNodeId: args.startNodeId,
        endNodeId: args.endNodeId,
        heightInches: args.heightInches,
        thicknessInches: args.thicknessInches,
      }),
    ],
  };
}

export function createWallNode(id: string, positionInches: Point3DInches): PlacedWallNode {
  return {
    id,
    positionInches: {
      xInches: positionInches.xInches,
      yInches: positionInches.yInches,
      zInches: 0,
    },
  };
}

export function createWallSegment(args: {
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  heightInches: number;
  thicknessInches: number;
}): PlacedWallSegment {
  return {
    id: args.id,
    name: args.name,
    startNodeId: args.startNodeId,
    endNodeId: args.endNodeId,
    heightInches: args.heightInches,
    thicknessInches: args.thicknessInches,
  };
}

export function splitWallSegmentAtPoint(args: {
  graph: PlacedWallGraph;
  wallSegmentId: string;
  pointInches: Point3DInches;
  insertedWallNodeId: string;
  createSplitWallSegmentId: (side: "start" | "end") => string;
}): Readonly<{
  graph: PlacedWallGraph;
  insertedWallNodeId: string;
  splitWallSegmentIds: readonly string[];
}> {
  const wallSegment = args.graph.segments.find((candidate) => candidate.id === args.wallSegmentId);

  if (wallSegment === undefined) {
    return {
      graph: args.graph,
      insertedWallNodeId: args.insertedWallNodeId,
      splitWallSegmentIds: [],
    };
  }

  const splitStartSegmentId = args.createSplitWallSegmentId("start");
  const splitEndSegmentId = args.createSplitWallSegmentId("end");
  const splitStartSegment = createWallSegment({
    id: splitStartSegmentId,
    name: `${wallSegment.name} A`,
    startNodeId: wallSegment.startNodeId,
    endNodeId: args.insertedWallNodeId,
    heightInches: wallSegment.heightInches,
    thicknessInches: wallSegment.thicknessInches,
  });
  const splitEndSegment = createWallSegment({
    id: splitEndSegmentId,
    name: `${wallSegment.name} B`,
    startNodeId: args.insertedWallNodeId,
    endNodeId: wallSegment.endNodeId,
    heightInches: wallSegment.heightInches,
    thicknessInches: wallSegment.thicknessInches,
  });

  return {
    graph: {
      ...args.graph,
      nodes: [
        ...args.graph.nodes,
        createWallNode(args.insertedWallNodeId, args.pointInches),
      ],
      segments: [
        ...args.graph.segments.filter((candidate) => candidate.id !== args.wallSegmentId),
        splitStartSegment,
        splitEndSegment,
      ],
    },
    insertedWallNodeId: args.insertedWallNodeId,
    splitWallSegmentIds: [splitStartSegmentId, splitEndSegmentId],
  };
}

export function mergeWallGraphs(args: {
  firstGraph: PlacedWallGraph;
  secondGraph: PlacedWallGraph;
  mergedGraphId?: string;
  mergedGraphName?: string;
}): PlacedWallGraph {
  return {
    id: args.mergedGraphId ?? args.firstGraph.id,
    name: args.mergedGraphName ?? args.firstGraph.name,
    nodes: [...args.firstGraph.nodes, ...args.secondGraph.nodes],
    segments: [...args.firstGraph.segments, ...args.secondGraph.segments],
  };
}

export function removeOrphanWallNodes(graph: PlacedWallGraph): PlacedWallGraph {
  const usedNodeIds = new Set(graph.segments.flatMap((segment) => [segment.startNodeId, segment.endNodeId]));

  return {
    ...graph,
    nodes: graph.nodes.filter((node) => usedNodeIds.has(node.id)),
  };
}

export function splitDisconnectedWallGraph(args: {
  graph: PlacedWallGraph;
  createGraphId: () => string;
}): readonly PlacedWallGraph[] {
  const graph = removeOrphanWallNodes(args.graph);

  if (graph.segments.length === 0) {
    return [];
  }

  const segmentsByNodeId = new Map<string, PlacedWallSegment[]>();
  graph.segments.forEach((segment) => {
    addSegmentToNodeMap(segmentsByNodeId, segment.startNodeId, segment);
    addSegmentToNodeMap(segmentsByNodeId, segment.endNodeId, segment);
  });

  const visitedSegmentIds = new Set<string>();
  const components: PlacedWallSegment[][] = [];

  graph.segments.forEach((segment) => {
    if (visitedSegmentIds.has(segment.id)) {
      return;
    }

    const component: PlacedWallSegment[] = [];
    const queue: PlacedWallSegment[] = [segment];
    visitedSegmentIds.add(segment.id);

    while (queue.length > 0) {
      const currentSegment = queue.shift();

      if (currentSegment === undefined) {
        continue;
      }

      component.push(currentSegment);
      [currentSegment.startNodeId, currentSegment.endNodeId].forEach((nodeId) => {
        (segmentsByNodeId.get(nodeId) ?? []).forEach((connectedSegment) => {
          if (!visitedSegmentIds.has(connectedSegment.id)) {
            visitedSegmentIds.add(connectedSegment.id);
            queue.push(connectedSegment);
          }
        });
      });
    }

    components.push(component);
  });

  if (components.length <= 1) {
    return [graph];
  }

  return components.map((segments, index) => {
    const usedNodeIds = new Set(segments.flatMap((segment) => [segment.startNodeId, segment.endNodeId]));

    return {
      id: index === 0 ? graph.id : args.createGraphId(),
      name: index === 0 ? graph.name : `${graph.name} ${index + 1}`,
      nodes: graph.nodes.filter((node) => usedNodeIds.has(node.id)),
      segments,
    };
  });
}

function addSegmentToNodeMap(
  segmentsByNodeId: Map<string, PlacedWallSegment[]>,
  wallNodeId: string,
  wallSegment: PlacedWallSegment,
): void {
  segmentsByNodeId.set(wallNodeId, [
    ...(segmentsByNodeId.get(wallNodeId) ?? []),
    wallSegment,
  ]);
}
