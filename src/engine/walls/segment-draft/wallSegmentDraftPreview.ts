import { getPlanDistanceInches } from "../wallSegmentGeometry";
import type { PlacedWallGraph, WallSegmentReference } from "../placedWallGraphTypes";
import { createWallNode, createWallSegment, mergeWallGraphs, splitWallSegmentAtPoint } from "../wallSegmentGraphEditing";
import { getWallSegmentAnchorPoint } from "./wallSegmentDraftAnchors";
import type { WallSegmentDrawAnchor, WallSegmentDraft } from "./wallSegmentDraftTypes";

const DRAFT_GRAPH_ID = "wall-segment-draft-preview-graph";
const DRAFT_START_NODE_ID = "wall-segment-draft-start-node";
const DRAFT_END_NODE_ID = "wall-segment-draft-end-node";
const DRAFT_SEGMENT_ID = "wall-segment-draft-preview-segment";
const DRAFT_START_SPLIT_NODE_ID = "wall-segment-draft-start-split-node";
const DRAFT_END_SPLIT_NODE_ID = "wall-segment-draft-end-split-node";
const DRAFT_MIN_SEGMENT_LENGTH_INCHES = 3;

export type WallSegmentDraftPreviewGraph = Readonly<{
  placedWallGraphs: readonly PlacedWallGraph[];
  previewWallGraphIds: readonly string[];
  previewWallSegmentId: string;
  previewWallSegmentReferences: readonly WallSegmentReference[];
  affectedCommittedWallGraphIds: readonly string[];
  affectedCommittedWallSegmentReferences: readonly WallSegmentReference[];
}>;

export function buildWallSegmentDraftPreviewGraph(args: {
  draft: WallSegmentDraft;
  placedWallGraphs: readonly PlacedWallGraph[];
}): WallSegmentDraftPreviewGraph | null {
  if (args.draft.activeStartAnchor === null || args.draft.hoverAnchor === null) {
    return null;
  }

  if (
    getPlanDistanceInches(
      getWallSegmentAnchorPoint(args.draft.activeStartAnchor),
      getWallSegmentAnchorPoint(args.draft.hoverAnchor),
    ) < DRAFT_MIN_SEGMENT_LENGTH_INCHES
  ) {
    return null;
  }

  return buildWallSegmentDraftGraph({
    placedWallGraphs: args.placedWallGraphs,
    startAnchor: args.draft.activeStartAnchor,
    endAnchor: args.draft.hoverAnchor,
    heightInches: args.draft.heightInches,
    thicknessInches: args.draft.thicknessInches,
    createDraftGraphId: () => DRAFT_GRAPH_ID,
    createStartNodeId: () => DRAFT_START_NODE_ID,
    createEndNodeId: () => DRAFT_END_NODE_ID,
    createSplitNodeId: (endpoint) => endpoint === "start" ? DRAFT_START_SPLIT_NODE_ID : DRAFT_END_SPLIT_NODE_ID,
    createSplitWallSegmentId: (endpoint, side) => `wall-segment-draft-${endpoint}-split-${side}`,
    createDraftWallSegmentId: () => DRAFT_SEGMENT_ID,
  });
}

export function buildWallSegmentDraftGraph(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  startAnchor: WallSegmentDrawAnchor;
  endAnchor: WallSegmentDrawAnchor;
  heightInches: number;
  thicknessInches: number;
  createDraftGraphId: () => string;
  createStartNodeId: () => string;
  createEndNodeId: () => string;
  createSplitNodeId: (endpoint: "start" | "end") => string;
  createSplitWallSegmentId: (endpoint: "start" | "end", side: "start" | "end") => string;
  createDraftWallSegmentId: () => string;
}): WallSegmentDraftPreviewGraph {
  const startResult = materializeAnchorInWallGraphs({
    anchor: args.startAnchor,
    placedWallGraphs: args.placedWallGraphs,
    preferredWallGraphId: null,
    draftGraphId: args.createDraftGraphId(),
    draftNodeId: args.createStartNodeId(),
    draftSplitNodeId: args.createSplitNodeId("start"),
    createSplitWallSegmentId: (side) => args.createSplitWallSegmentId("start", side),
  });
  const endResult = materializeAnchorInWallGraphs({
    anchor: args.endAnchor,
    placedWallGraphs: startResult.placedWallGraphs,
    preferredWallGraphId: startResult.wallGraphId,
    draftGraphId: startResult.wallGraphId,
    draftNodeId: args.createEndNodeId(),
    draftSplitNodeId: args.createSplitNodeId("end"),
    createSplitWallSegmentId: (side) => args.createSplitWallSegmentId("end", side),
  });
  const draftWallSegmentId = args.createDraftWallSegmentId();
  const mergedGraphResult = mergeAnchorGraphsWhenNeeded({
    placedWallGraphs: endResult.placedWallGraphs,
    startWallGraphId: startResult.wallGraphId,
    endWallGraphId: endResult.wallGraphId,
  });
  const draftGraph = mergedGraphResult.placedWallGraphs.find((wallGraph) => wallGraph.id === mergedGraphResult.wallGraphId);

  if (draftGraph === undefined) {
    return {
      placedWallGraphs: args.placedWallGraphs,
      previewWallGraphIds: [],
      previewWallSegmentId: draftWallSegmentId,
      previewWallSegmentReferences: [],
      affectedCommittedWallGraphIds: [],
      affectedCommittedWallSegmentReferences: [],
    };
  }

  const draftWallSegment = createWallSegment({
    id: draftWallSegmentId,
    name: "Wall Segment Preview",
    startNodeId: startResult.wallNodeId,
    endNodeId: endResult.wallNodeId,
    heightInches: args.heightInches,
    thicknessInches: args.thicknessInches,
  });
  const placedWallGraphs = mergedGraphResult.placedWallGraphs.map((wallGraph) => (
    wallGraph.id === draftGraph.id
      ? { ...wallGraph, segments: [...wallGraph.segments, draftWallSegment] }
      : wallGraph
  ));

  return {
    placedWallGraphs,
    previewWallGraphIds: [draftGraph.id],
    previewWallSegmentId: draftWallSegmentId,
    previewWallSegmentReferences: [
      ...startResult.previewWallSegmentReferences,
      ...endResult.previewWallSegmentReferences,
      { wallGraphId: draftGraph.id, wallSegmentId: draftWallSegmentId },
    ],
    affectedCommittedWallGraphIds: uniqueStrings([
      ...startResult.affectedCommittedWallGraphIds,
      ...endResult.affectedCommittedWallGraphIds,
    ]),
    affectedCommittedWallSegmentReferences: uniqueWallSegmentReferences([
      ...startResult.affectedCommittedWallSegmentReferences,
      ...endResult.affectedCommittedWallSegmentReferences,
    ]),
  };
}

function materializeAnchorInWallGraphs(args: {
  anchor: WallSegmentDrawAnchor;
  placedWallGraphs: readonly PlacedWallGraph[];
  preferredWallGraphId: string | null;
  draftGraphId: string;
  draftNodeId: string;
  draftSplitNodeId: string;
  createSplitWallSegmentId: (side: "start" | "end") => string;
}): Readonly<{
  wallGraphId: string;
  wallNodeId: string;
  placedWallGraphs: readonly PlacedWallGraph[];
  previewWallSegmentReferences: readonly WallSegmentReference[];
  affectedCommittedWallGraphIds: readonly string[];
  affectedCommittedWallSegmentReferences: readonly WallSegmentReference[];
}> {
  if (args.anchor.kind === "existing-node") {
    const anchor = args.anchor;
    const wallGraph = args.placedWallGraphs.find((candidate) => candidate.id === anchor.wallGraphId);

    return {
      wallGraphId: anchor.wallGraphId,
      wallNodeId: anchor.wallNodeId,
      placedWallGraphs: args.placedWallGraphs,
      previewWallSegmentReferences: [],
      affectedCommittedWallGraphIds: wallGraph === undefined ? [] : [wallGraph.id],
      affectedCommittedWallSegmentReferences: (wallGraph?.segments ?? [])
        .filter((segment) => segment.startNodeId === anchor.wallNodeId || segment.endNodeId === anchor.wallNodeId)
        .map((segment) => ({ wallGraphId: anchor.wallGraphId, wallSegmentId: segment.id })),
    };
  }

  if (args.anchor.kind === "segment-body") {
    const anchor = args.anchor;
    const wallGraph = args.placedWallGraphs.find((candidate) => candidate.id === anchor.wallGraphId);

    if (wallGraph === undefined) {
      return createEmptyAnchorNode(args);
    }

    const splitResult = splitWallSegmentAtPoint({
      graph: wallGraph,
      wallSegmentId: anchor.wallSegmentId,
      pointInches: anchor.pointInches,
      insertedWallNodeId: args.draftSplitNodeId,
      createSplitWallSegmentId: args.createSplitWallSegmentId,
    });
    const placedWallGraphs = args.placedWallGraphs.map((candidate) => (
      candidate.id === wallGraph.id ? splitResult.graph : candidate
    ));

    return {
      wallGraphId: wallGraph.id,
      wallNodeId: splitResult.insertedWallNodeId,
      placedWallGraphs,
      previewWallSegmentReferences: splitResult.splitWallSegmentIds.map((wallSegmentId) => ({ wallGraphId: wallGraph.id, wallSegmentId })),
      affectedCommittedWallGraphIds: [wallGraph.id],
      affectedCommittedWallSegmentReferences: [{ wallGraphId: wallGraph.id, wallSegmentId: anchor.wallSegmentId }],
    };
  }

  return createEmptyAnchorNode(args);
}

function createEmptyAnchorNode(args: {
  anchor: WallSegmentDrawAnchor;
  placedWallGraphs: readonly PlacedWallGraph[];
  preferredWallGraphId: string | null;
  draftGraphId: string;
  draftNodeId: string;
}): Readonly<{
  wallGraphId: string;
  wallNodeId: string;
  placedWallGraphs: readonly PlacedWallGraph[];
  previewWallSegmentReferences: readonly WallSegmentReference[];
  affectedCommittedWallGraphIds: readonly string[];
  affectedCommittedWallSegmentReferences: readonly WallSegmentReference[];
}> {
  const pointInches = getWallSegmentAnchorPoint(args.anchor);

  if (args.preferredWallGraphId !== null) {
    const placedWallGraphs = args.placedWallGraphs.map((wallGraph) => (
      wallGraph.id === args.preferredWallGraphId
        ? { ...wallGraph, nodes: [...wallGraph.nodes, createWallNode(args.draftNodeId, pointInches)] }
        : wallGraph
    ));

    return {
      wallGraphId: args.preferredWallGraphId,
      wallNodeId: args.draftNodeId,
      placedWallGraphs,
      previewWallSegmentReferences: [],
      affectedCommittedWallGraphIds: args.preferredWallGraphId === args.draftGraphId ? [] : [args.preferredWallGraphId],
      affectedCommittedWallSegmentReferences: [],
    };
  }

  const newGraph: PlacedWallGraph = {
    id: args.draftGraphId,
    name: "Wall Graph Preview",
    nodes: [createWallNode(args.draftNodeId, pointInches)],
    segments: [],
  };

  return {
    wallGraphId: newGraph.id,
    wallNodeId: args.draftNodeId,
    placedWallGraphs: [...args.placedWallGraphs, newGraph],
    previewWallSegmentReferences: [],
    affectedCommittedWallGraphIds: [],
    affectedCommittedWallSegmentReferences: [],
  };
}

function mergeAnchorGraphsWhenNeeded(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  startWallGraphId: string;
  endWallGraphId: string;
}): Readonly<{
  wallGraphId: string;
  placedWallGraphs: readonly PlacedWallGraph[];
}> {
  if (args.startWallGraphId === args.endWallGraphId) {
    return {
      wallGraphId: args.startWallGraphId,
      placedWallGraphs: args.placedWallGraphs,
    };
  }

  const startGraph = args.placedWallGraphs.find((wallGraph) => wallGraph.id === args.startWallGraphId);
  const endGraph = args.placedWallGraphs.find((wallGraph) => wallGraph.id === args.endWallGraphId);

  if (startGraph === undefined || endGraph === undefined) {
    return {
      wallGraphId: args.startWallGraphId,
      placedWallGraphs: args.placedWallGraphs,
    };
  }

  const keepGraph = startGraph.segments.length === 0 ? endGraph : startGraph;
  const mergeGraph = keepGraph.id === startGraph.id ? endGraph : startGraph;
  const mergedGraph = mergeWallGraphs({
    firstGraph: keepGraph,
    secondGraph: mergeGraph,
    mergedGraphId: keepGraph.id,
    mergedGraphName: keepGraph.name,
  });

  return {
    wallGraphId: mergedGraph.id,
    placedWallGraphs: [
      ...args.placedWallGraphs.filter((wallGraph) => wallGraph.id !== startGraph.id && wallGraph.id !== endGraph.id),
      mergedGraph,
    ],
  };
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function uniqueWallSegmentReferences(values: readonly WallSegmentReference[]): readonly WallSegmentReference[] {
  const seenKeys = new Set<string>();
  const uniqueValues: WallSegmentReference[] = [];

  values.forEach((value) => {
    const key = `${value.wallGraphId}:${value.wallSegmentId}`;

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    uniqueValues.push(value);
  });

  return uniqueValues;
}
