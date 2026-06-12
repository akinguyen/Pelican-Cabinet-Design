import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallNode } from "./placedWallNodeTypes";
import type { PlacedWallSegment, WallFaceSide } from "./placedWallSegmentTypes";
import type { BuiltWallSegmentBody, WallSegmentFace } from "./connectedWallGeometryTypes";

const MIN_SEGMENT_LENGTH_INCHES = 0.001;
const LINE_INTERSECTION_EPSILON = 0.000001;

export function getPlanDistanceInches(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
): number {
  return Math.hypot(
    secondPointInches.xInches - firstPointInches.xInches,
    secondPointInches.yInches - firstPointInches.yInches,
  );
}

export function buildWallSegmentBody(args: {
  wallGraphId: string;
  wallSegment: PlacedWallSegment;
  placedWallNodes: readonly PlacedWallNode[];
  connectedSegmentsByNodeId: ReadonlyMap<string, readonly PlacedWallSegment[]>;
}): BuiltWallSegmentBody | null {
  const startPointInches = getWallSegmentEndpointPoint(args.placedWallNodes, args.wallSegment.startNodeId);
  const endPointInches = getWallSegmentEndpointPoint(args.placedWallNodes, args.wallSegment.endNodeId);

  if (startPointInches === null || endPointInches === null) {
    return null;
  }

  if (getPlanDistanceInches(startPointInches, endPointInches) <= MIN_SEGMENT_LENGTH_INCHES) {
    return null;
  }

  const segmentDirection = getDirection(startPointInches, endPointInches);
  const start = buildEndpointVertices({
    wallSegment: args.wallSegment,
    endpoint: "start",
    pointInches: startPointInches,
    segmentDirection,
    connectedSegments: args.connectedSegmentsByNodeId.get(args.wallSegment.startNodeId) ?? [],
    placedWallNodes: args.placedWallNodes,
  });
  const end = buildEndpointVertices({
    wallSegment: args.wallSegment,
    endpoint: "end",
    pointInches: endPointInches,
    segmentDirection,
    connectedSegments: args.connectedSegmentsByNodeId.get(args.wallSegment.endNodeId) ?? [],
    placedWallNodes: args.placedWallNodes,
  });
  const footprintPolygonInches = createWallSegmentPolygon({ start, end });
  const safeStart = isWallSegmentPolygonValid(footprintPolygonInches)
    ? start
    : buildRectangularEndpointVertices({
      pointInches: startPointInches,
      segmentDirection,
      thicknessInches: args.wallSegment.thicknessInches,
    });
  const safeEnd = isWallSegmentPolygonValid(footprintPolygonInches)
    ? end
    : buildRectangularEndpointVertices({
      pointInches: endPointInches,
      segmentDirection,
      thicknessInches: args.wallSegment.thicknessInches,
    });

  return {
    id: `${args.wallGraphId}-${args.wallSegment.id}-body`,
    wallGraphId: args.wallGraphId,
    wallSegmentId: args.wallSegment.id,
    startNodeId: args.wallSegment.startNodeId,
    endNodeId: args.wallSegment.endNodeId,
    start: safeStart,
    end: safeEnd,
    footprintPolygonInches: createWallSegmentPolygon({ start: safeStart, end: safeEnd }),
    heightInches: args.wallSegment.heightInches,
    thicknessInches: args.wallSegment.thicknessInches,
  };
}

export function createWallSegmentFaces(
  segmentBody: BuiltWallSegmentBody,
): readonly [WallSegmentFace, WallSegmentFace] {
  const direction = getDirection(segmentBody.start.centerPointInches, segmentBody.end.centerPointInches);
  const sideANormal = getLeftNormal(direction);
  const sideBNormal = { xInches: -sideANormal.xInches, yInches: -sideANormal.yInches };

  return [
    {
      id: `${segmentBody.wallGraphId}-${segmentBody.wallSegmentId}-side-a`,
      wallGraphId: segmentBody.wallGraphId,
      wallSegmentId: segmentBody.wallSegmentId,
      side: "side-a",
      startPointInches: segmentBody.start.sideAPointInches,
      endPointInches: segmentBody.end.sideAPointInches,
      normalInches: sideANormal,
      lengthInches: getPlanDistanceInches(segmentBody.start.sideAPointInches, segmentBody.end.sideAPointInches),
      heightInches: segmentBody.heightInches,
    },
    {
      id: `${segmentBody.wallGraphId}-${segmentBody.wallSegmentId}-side-b`,
      wallGraphId: segmentBody.wallGraphId,
      wallSegmentId: segmentBody.wallSegmentId,
      side: "side-b",
      startPointInches: segmentBody.start.sideBPointInches,
      endPointInches: segmentBody.end.sideBPointInches,
      normalInches: sideBNormal,
      lengthInches: getPlanDistanceInches(segmentBody.start.sideBPointInches, segmentBody.end.sideBPointInches),
      heightInches: segmentBody.heightInches,
    },
  ];
}

export function createWallSegmentFootprintPolygon(args: {
  wallGraphId: string;
  wallSegment: PlacedWallSegment;
  placedWallNodes: readonly PlacedWallNode[];
  connectedSegmentsByNodeId?: ReadonlyMap<string, readonly PlacedWallSegment[]>;
}): readonly Point3DInches[] {
  const connectedSegmentsByNodeId = args.connectedSegmentsByNodeId ?? buildConnectedSegmentsByNodeId([args.wallSegment]);
  return buildWallSegmentBody({
    wallGraphId: args.wallGraphId,
    wallSegment: args.wallSegment,
    placedWallNodes: args.placedWallNodes,
    connectedSegmentsByNodeId,
  })?.footprintPolygonInches ?? [];
}

export function getWallSegmentCenterlineLength(args: {
  wallSegment: PlacedWallSegment;
  placedWallNodes: readonly PlacedWallNode[];
}): number {
  const startPointInches = getWallSegmentEndpointPoint(args.placedWallNodes, args.wallSegment.startNodeId);
  const endPointInches = getWallSegmentEndpointPoint(args.placedWallNodes, args.wallSegment.endNodeId);

  if (startPointInches === null || endPointInches === null) {
    return 0;
  }

  return getPlanDistanceInches(startPointInches, endPointInches);
}

export function getWallSegmentEndpointPoint(
  placedWallNodes: readonly PlacedWallNode[],
  wallNodeId: string,
): Point3DInches | null {
  return placedWallNodes.find((wallNode) => wallNode.id === wallNodeId)?.positionInches ?? null;
}

export function buildConnectedSegmentsByNodeId(
  placedWallSegments: readonly PlacedWallSegment[],
): ReadonlyMap<string, readonly PlacedWallSegment[]> {
  const segmentsByNodeId = new Map<string, PlacedWallSegment[]>();

  placedWallSegments.forEach((wallSegment) => {
    addSegmentToNode(segmentsByNodeId, wallSegment.startNodeId, wallSegment);
    addSegmentToNode(segmentsByNodeId, wallSegment.endNodeId, wallSegment);
  });

  return segmentsByNodeId;
}

function addSegmentToNode(
  segmentsByNodeId: Map<string, PlacedWallSegment[]>,
  wallNodeId: string,
  wallSegment: PlacedWallSegment,
) {
  segmentsByNodeId.set(wallNodeId, [
    ...(segmentsByNodeId.get(wallNodeId) ?? []),
    wallSegment,
  ]);
}

type EndpointConnection = Readonly<{
  wallSegment: PlacedWallSegment;
  endpoint: "start" | "end";
  stableDirection: Readonly<{ xInches: number; yInches: number }>;
  directionFromNode: Readonly<{ xInches: number; yInches: number }>;
  angleRadians: number;
}>;

function buildEndpointVertices(args: {
  wallSegment: PlacedWallSegment;
  endpoint: "start" | "end";
  pointInches: Point3DInches;
  segmentDirection: Readonly<{ xInches: number; yInches: number }>;
  connectedSegments: readonly PlacedWallSegment[];
  placedWallNodes: readonly PlacedWallNode[];
}): BuiltWallSegmentBody["start"] {
  if (args.connectedSegments.length <= 1) {
    return buildRectangularEndpointVertices({
      pointInches: args.pointInches,
      segmentDirection: args.segmentDirection,
      thicknessInches: args.wallSegment.thicknessInches,
    });
  }

  const nodeId = getEndpointNodeId(args.wallSegment, args.endpoint);
  const connections = args.connectedSegments
    .map((wallSegment) => buildEndpointConnection({
      wallSegment,
      nodeId,
      nodePointInches: args.pointInches,
      placedWallNodes: args.placedWallNodes,
    }))
    .filter(isEndpointConnection)
    .sort((firstConnection, secondConnection) => firstConnection.angleRadians - secondConnection.angleRadians);
  const selfIndex = connections.findIndex((connection) => connection.wallSegment.id === args.wallSegment.id);

  if (selfIndex < 0) {
    return buildRectangularEndpointVertices({
      pointInches: args.pointInches,
      segmentDirection: args.segmentDirection,
      thicknessInches: args.wallSegment.thicknessInches,
    });
  }

  return {
    sideAPointInches: buildConnectedEndpointSidePoint({
      nodePointInches: args.pointInches,
      side: "side-a",
      wallSegment: args.wallSegment,
      endpoint: args.endpoint,
      segmentDirection: args.segmentDirection,
      connections,
      selfIndex,
    }),
    centerPointInches: args.pointInches,
    sideBPointInches: buildConnectedEndpointSidePoint({
      nodePointInches: args.pointInches,
      side: "side-b",
      wallSegment: args.wallSegment,
      endpoint: args.endpoint,
      segmentDirection: args.segmentDirection,
      connections,
      selfIndex,
    }),
  };
}

function buildRectangularEndpointVertices(args: {
  pointInches: Point3DInches;
  segmentDirection: Readonly<{ xInches: number; yInches: number }>;
  thicknessInches: number;
}): BuiltWallSegmentBody["start"] {
  const halfThicknessInches = args.thicknessInches / 2;
  const sideANormal = getSideNormal(args.segmentDirection, "side-a");
  const sideBNormal = getSideNormal(args.segmentDirection, "side-b");

  return {
    sideAPointInches: addPlanVector(args.pointInches, sideANormal, halfThicknessInches),
    centerPointInches: args.pointInches,
    sideBPointInches: addPlanVector(args.pointInches, sideBNormal, halfThicknessInches),
  };
}

function buildEndpointConnection(args: {
  wallSegment: PlacedWallSegment;
  nodeId: string;
  nodePointInches: Point3DInches;
  placedWallNodes: readonly PlacedWallNode[];
}): EndpointConnection | null {
  const endpoint = getWallSegmentEndpointAtNode(args.wallSegment, args.nodeId);

  if (endpoint === null) {
    return null;
  }

  const startPointInches = getWallSegmentEndpointPoint(args.placedWallNodes, args.wallSegment.startNodeId);
  const endPointInches = getWallSegmentEndpointPoint(args.placedWallNodes, args.wallSegment.endNodeId);

  if (startPointInches === null || endPointInches === null) {
    return null;
  }

  const otherPointInches = endpoint === "start" ? endPointInches : startPointInches;
  const stableDirection = getDirection(startPointInches, endPointInches);
  const directionFromNode = getDirection(args.nodePointInches, otherPointInches);

  return {
    wallSegment: args.wallSegment,
    endpoint,
    stableDirection,
    directionFromNode,
    angleRadians: Math.atan2(directionFromNode.yInches, directionFromNode.xInches),
  };
}

function buildConnectedEndpointSidePoint(args: {
  nodePointInches: Point3DInches;
  side: WallFaceSide;
  wallSegment: PlacedWallSegment;
  endpoint: "start" | "end";
  segmentDirection: Readonly<{ xInches: number; yInches: number }>;
  connections: readonly EndpointConnection[];
  selfIndex: number;
}): Point3DInches {
  const basePointInches = getEndpointSidePoint({
    nodePointInches: args.nodePointInches,
    wallSegment: args.wallSegment,
    stableDirection: args.segmentDirection,
    side: args.side,
  });
  const sideIsLeftOfOutbound = isStableSideLeftOfEndpointOutbound(args.endpoint, args.side);
  const neighborConnection = sideIsLeftOfOutbound
    ? args.connections[(args.selfIndex + 1) % args.connections.length]
    : args.connections[(args.selfIndex - 1 + args.connections.length) % args.connections.length];
  const neighborSideIsLeftOfOutbound = !sideIsLeftOfOutbound;
  const neighborSide = getStableSideForEndpointOutboundSide(
    neighborConnection.endpoint,
    neighborSideIsLeftOfOutbound,
  );
  const neighborLinePointInches = getEndpointSidePoint({
    nodePointInches: args.nodePointInches,
    wallSegment: neighborConnection.wallSegment,
    stableDirection: neighborConnection.stableDirection,
    side: neighborSide,
  });
  const intersectionPointInches = findPlanLineIntersection({
    firstPointInches: basePointInches,
    firstDirection: args.segmentDirection,
    secondPointInches: neighborLinePointInches,
    secondDirection: neighborConnection.stableDirection,
  });

  if (intersectionPointInches === null) {
    return basePointInches;
  }

  return intersectionPointInches;
}

function getEndpointSidePoint(args: {
  nodePointInches: Point3DInches;
  wallSegment: PlacedWallSegment;
  stableDirection: Readonly<{ xInches: number; yInches: number }>;
  side: WallFaceSide;
}): Point3DInches {
  return addPlanVector(
    args.nodePointInches,
    getSideNormal(args.stableDirection, args.side),
    args.wallSegment.thicknessInches / 2,
  );
}

function isStableSideLeftOfEndpointOutbound(
  endpoint: "start" | "end",
  side: WallFaceSide,
): boolean {
  if (endpoint === "start") {
    return side === "side-a";
  }

  return side === "side-b";
}

function getStableSideForEndpointOutboundSide(
  endpoint: "start" | "end",
  sideIsLeftOfOutbound: boolean,
): WallFaceSide {
  if (endpoint === "start") {
    return sideIsLeftOfOutbound ? "side-a" : "side-b";
  }

  return sideIsLeftOfOutbound ? "side-b" : "side-a";
}

function getEndpointNodeId(wallSegment: PlacedWallSegment, endpoint: "start" | "end"): string {
  return endpoint === "start" ? wallSegment.startNodeId : wallSegment.endNodeId;
}

function getWallSegmentEndpointAtNode(
  wallSegment: PlacedWallSegment,
  wallNodeId: string,
): "start" | "end" | null {
  if (wallSegment.startNodeId === wallNodeId) {
    return "start";
  }

  if (wallSegment.endNodeId === wallNodeId) {
    return "end";
  }

  return null;
}

function createWallSegmentPolygon(args: {
  start: BuiltWallSegmentBody["start"];
  end: BuiltWallSegmentBody["end"];
}): readonly Point3DInches[] {
  return [
    args.start.sideAPointInches,
    args.end.sideAPointInches,
    args.end.centerPointInches,
    args.end.sideBPointInches,
    args.start.sideBPointInches,
    args.start.centerPointInches,
  ];
}

function isWallSegmentPolygonValid(polygonInches: readonly Point3DInches[]): boolean {
  if (polygonInches.length !== 6) {
    return false;
  }

  if (getPolygonAreaInches(polygonInches) <= MIN_SEGMENT_LENGTH_INCHES) {
    return false;
  }

  return !doPlanSegmentsIntersect({
    firstStartPointInches: polygonInches[0],
    firstEndPointInches: polygonInches[1],
    secondStartPointInches: polygonInches[3],
    secondEndPointInches: polygonInches[4],
  });
}

function getPolygonAreaInches(polygonInches: readonly Point3DInches[]): number {
  let areaInches = 0;

  polygonInches.forEach((pointInches, pointIndex) => {
    const nextPointInches = polygonInches[(pointIndex + 1) % polygonInches.length];
    areaInches += pointInches.xInches * nextPointInches.yInches - nextPointInches.xInches * pointInches.yInches;
  });

  return Math.abs(areaInches) / 2;
}

function doPlanSegmentsIntersect(args: {
  firstStartPointInches: Point3DInches;
  firstEndPointInches: Point3DInches;
  secondStartPointInches: Point3DInches;
  secondEndPointInches: Point3DInches;
}): boolean {
  const firstDirection = subtractPlanPoint(args.firstEndPointInches, args.firstStartPointInches);
  const secondDirection = subtractPlanPoint(args.secondEndPointInches, args.secondStartPointInches);
  const denominator = crossPlanVectors(firstDirection, secondDirection);

  if (Math.abs(denominator) <= LINE_INTERSECTION_EPSILON) {
    return false;
  }

  const startDelta = subtractPlanPoint(args.secondStartPointInches, args.firstStartPointInches);
  const firstScale = crossPlanVectors(startDelta, secondDirection) / denominator;
  const secondScale = crossPlanVectors(startDelta, firstDirection) / denominator;

  return firstScale > LINE_INTERSECTION_EPSILON &&
    firstScale < 1 - LINE_INTERSECTION_EPSILON &&
    secondScale > LINE_INTERSECTION_EPSILON &&
    secondScale < 1 - LINE_INTERSECTION_EPSILON;
}

function findPlanLineIntersection(args: {
  firstPointInches: Point3DInches;
  firstDirection: Readonly<{ xInches: number; yInches: number }>;
  secondPointInches: Point3DInches;
  secondDirection: Readonly<{ xInches: number; yInches: number }>;
}): Point3DInches | null {
  const cross = crossPlanVectors(args.firstDirection, args.secondDirection);

  if (Math.abs(cross) <= LINE_INTERSECTION_EPSILON) {
    return null;
  }

  const deltaXInches = args.secondPointInches.xInches - args.firstPointInches.xInches;
  const deltaYInches = args.secondPointInches.yInches - args.firstPointInches.yInches;
  const firstScale = (deltaXInches * args.secondDirection.yInches - deltaYInches * args.secondDirection.xInches) / cross;

  return {
    xInches: args.firstPointInches.xInches + args.firstDirection.xInches * firstScale,
    yInches: args.firstPointInches.yInches + args.firstDirection.yInches * firstScale,
    zInches: 0,
  };
}

function getSideNormal(
  direction: Readonly<{ xInches: number; yInches: number }>,
  side: WallFaceSide,
): Readonly<{ xInches: number; yInches: number }> {
  const leftNormal = getLeftNormal(direction);

  if (side === "side-a") {
    return leftNormal;
  }

  return {
    xInches: -leftNormal.xInches,
    yInches: -leftNormal.yInches,
  };
}

function getDirection(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): Readonly<{ xInches: number; yInches: number }> {
  const xInches = endPointInches.xInches - startPointInches.xInches;
  const yInches = endPointInches.yInches - startPointInches.yInches;
  const lengthInches = Math.hypot(xInches, yInches);

  if (lengthInches <= MIN_SEGMENT_LENGTH_INCHES) {
    return { xInches: 1, yInches: 0 };
  }

  return {
    xInches: xInches / lengthInches,
    yInches: yInches / lengthInches,
  };
}

function getLeftNormal(
  direction: Readonly<{ xInches: number; yInches: number }>,
): Readonly<{ xInches: number; yInches: number }> {
  return {
    xInches: -direction.yInches,
    yInches: direction.xInches,
  };
}

function addPlanVector(
  pointInches: Point3DInches,
  vector: Readonly<{ xInches: number; yInches: number }>,
  scaleInches: number,
): Point3DInches {
  return {
    xInches: pointInches.xInches + vector.xInches * scaleInches,
    yInches: pointInches.yInches + vector.yInches * scaleInches,
    zInches: 0,
  };
}

function subtractPlanPoint(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
): Readonly<{ xInches: number; yInches: number }> {
  return {
    xInches: firstPointInches.xInches - secondPointInches.xInches,
    yInches: firstPointInches.yInches - secondPointInches.yInches,
  };
}

function crossPlanVectors(
  firstVector: Readonly<{ xInches: number; yInches: number }>,
  secondVector: Readonly<{ xInches: number; yInches: number }>,
): number {
  return firstVector.xInches * secondVector.yInches - firstVector.yInches * secondVector.xInches;
}

function isEndpointConnection(connection: EndpointConnection | null): connection is EndpointConnection {
  return connection !== null;
}
