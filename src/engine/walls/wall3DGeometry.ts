import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildConnectedWallGeometry } from "./buildConnectedWallGeometry";
import type { BuiltConnectedWallGeometry, BuiltWallSegmentBody, WallSegmentFace } from "./connectedWallGeometryTypes";
import type { PlacedWallGraph } from "./placedWallGraphTypes";

export type Wall3DEdgeTargetKind = "wall-face" | "wall-centerline";

export type Wall3DEdgeRole =
  | "bottom-footprint"
  | "top-footprint"
  | "vertical-corner"
  | "face-bottom"
  | "face-top"
  | "face-left"
  | "face-right"
  | "centerline";

export type Wall3DEdge = Readonly<{
  id: string;
  wallGraphId: string;
  wallSegmentId: string;
  targetKind: Wall3DEdgeTargetKind;
  role: Wall3DEdgeRole;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  normalInches?: Point3DInches;
}>;

export type Wall3DGeometry = Readonly<{
  wallGraphId: string;
  edges: readonly Wall3DEdge[];
}>;

export function createWallGraph3DGeometry(wallGraph: PlacedWallGraph): Wall3DGeometry {
  return createConnectedWall3DGeometry(buildConnectedWallGeometry(wallGraph));
}

export function createWallGraphs3DEdges(
  placedWallGraphs: readonly PlacedWallGraph[],
): readonly Wall3DEdge[] {
  return placedWallGraphs.flatMap((placedWallGraph) => createWallGraph3DGeometry(placedWallGraph).edges);
}

export function createConnectedWall3DGeometry(
  connectedWallGeometry: BuiltConnectedWallGeometry,
): Wall3DGeometry {
  return {
    wallGraphId: connectedWallGeometry.wallGraphId,
    edges: [
      ...connectedWallGeometry.segmentBodies.flatMap(createWallSegmentBody3DEdges),
      ...connectedWallGeometry.faces.flatMap(createWallFace3DEdges),
    ],
  };
}

export function createWallSegmentBody3DEdges(segmentBody: BuiltWallSegmentBody): readonly Wall3DEdge[] {
  const bottomPoints = segmentBody.footprintPolygonInches.map((pointInches) => withZ(pointInches, 0));
  const topPoints = segmentBody.footprintPolygonInches.map((pointInches) => withZ(pointInches, segmentBody.heightInches));
  const bottomEdges = createLoopEdges({
    idPrefix: `${segmentBody.id}:bottom-footprint`,
    segmentBody,
    points: bottomPoints,
    role: "bottom-footprint",
    targetKind: "wall-face",
  });
  const topEdges = createLoopEdges({
    idPrefix: `${segmentBody.id}:top-footprint`,
    segmentBody,
    points: topPoints,
    role: "top-footprint",
    targetKind: "wall-face",
  });
  const verticalEdges = bottomPoints.map((bottomPointInches, pointIndex): Wall3DEdge => ({
    id: `${segmentBody.id}:vertical-corner:${pointIndex}`,
    wallGraphId: segmentBody.wallGraphId,
    wallSegmentId: segmentBody.wallSegmentId,
    targetKind: "wall-face",
    role: "vertical-corner",
    startPointInches: bottomPointInches,
    endPointInches: topPoints[pointIndex],
  }));
  const centerlineEdges: readonly Wall3DEdge[] = [
    {
      id: `${segmentBody.id}:centerline:bottom`,
      wallGraphId: segmentBody.wallGraphId,
      wallSegmentId: segmentBody.wallSegmentId,
      targetKind: "wall-centerline",
      role: "centerline",
      startPointInches: withZ(segmentBody.start.centerPointInches, 0),
      endPointInches: withZ(segmentBody.end.centerPointInches, 0),
    },
    {
      id: `${segmentBody.id}:centerline:top`,
      wallGraphId: segmentBody.wallGraphId,
      wallSegmentId: segmentBody.wallSegmentId,
      targetKind: "wall-centerline",
      role: "centerline",
      startPointInches: withZ(segmentBody.start.centerPointInches, segmentBody.heightInches),
      endPointInches: withZ(segmentBody.end.centerPointInches, segmentBody.heightInches),
    },
  ];

  return [...bottomEdges, ...topEdges, ...verticalEdges, ...centerlineEdges];
}

export function createWallFace3DEdges(face: WallSegmentFace): readonly Wall3DEdge[] {
  const normalInches = { ...face.normalInches, zInches: 0 };
  const startBottom = withZ(face.startPointInches, 0);
  const endBottom = withZ(face.endPointInches, 0);
  const startTop = withZ(face.startPointInches, face.heightInches);
  const endTop = withZ(face.endPointInches, face.heightInches);
  const idPrefix = `${face.wallGraphId}-${face.wallSegmentId}-${face.side}:face`;

  return [
    {
      id: `${idPrefix}:bottom`,
      wallGraphId: face.wallGraphId,
      wallSegmentId: face.wallSegmentId,
      targetKind: "wall-face",
      role: "face-bottom",
      startPointInches: startBottom,
      endPointInches: endBottom,
      normalInches,
    },
    {
      id: `${idPrefix}:top`,
      wallGraphId: face.wallGraphId,
      wallSegmentId: face.wallSegmentId,
      targetKind: "wall-face",
      role: "face-top",
      startPointInches: startTop,
      endPointInches: endTop,
      normalInches,
    },
    {
      id: `${idPrefix}:left`,
      wallGraphId: face.wallGraphId,
      wallSegmentId: face.wallSegmentId,
      targetKind: "wall-face",
      role: "face-left",
      startPointInches: startBottom,
      endPointInches: startTop,
      normalInches,
    },
    {
      id: `${idPrefix}:right`,
      wallGraphId: face.wallGraphId,
      wallSegmentId: face.wallSegmentId,
      targetKind: "wall-face",
      role: "face-right",
      startPointInches: endBottom,
      endPointInches: endTop,
      normalInches,
    },
  ];
}

function createLoopEdges(args: {
  idPrefix: string;
  segmentBody: BuiltWallSegmentBody;
  points: readonly Point3DInches[];
  role: Wall3DEdgeRole;
  targetKind: Wall3DEdgeTargetKind;
}): readonly Wall3DEdge[] {
  return args.points.map((pointInches, pointIndex): Wall3DEdge => ({
    id: `${args.idPrefix}:${pointIndex}`,
    wallGraphId: args.segmentBody.wallGraphId,
    wallSegmentId: args.segmentBody.wallSegmentId,
    targetKind: args.targetKind,
    role: args.role,
    startPointInches: pointInches,
    endPointInches: args.points[(pointIndex + 1) % args.points.length],
  }));
}

function withZ(pointInches: Point3DInches, zInches: number): Point3DInches {
  return {
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches,
  };
}
