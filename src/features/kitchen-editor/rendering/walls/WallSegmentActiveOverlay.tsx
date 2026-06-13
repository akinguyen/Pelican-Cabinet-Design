"use client";

import { Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import { WallAnchorRing, WALL_ANCHOR_RING_OUTER_RADIUS_INCHES } from "./WallAnchorRing";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const ACTIVE_WALL_SEGMENT_LINE_WIDTH_PIXELS = 2.5;
const ACTIVE_WALL_CENTERLINE_WIDTH_PIXELS = 2.25;
const ACTIVE_WALL_SEGMENT_Z_OFFSET_INCHES = 1.2;
const ACTIVE_WALL_SEGMENT_RENDER_ORDER = 90;
const ACTIVE_WALL_CENTERLINE_TRIM_INCHES = WALL_ANCHOR_RING_OUTER_RADIUS_INCHES + 0.4;

export function WallSegmentActiveOverlay({
  segmentBody,
}: Readonly<{
  segmentBody: BuiltWallSegmentBody;
}>) {
  const boundaryPoints = createBoundaryPoints(segmentBody.footprintPolygonInches);
  const centerlinePoints = createCenterlinePoints(segmentBody);

  return (
    <group renderOrder={ACTIVE_WALL_SEGMENT_RENDER_ORDER}>
      <Line
        points={boundaryPoints}
        color={wallSegmentRenderColors.activeStroke}
        lineWidth={ACTIVE_WALL_SEGMENT_LINE_WIDTH_PIXELS}
        depthTest={false}
        renderOrder={ACTIVE_WALL_SEGMENT_RENDER_ORDER}
      />
      {centerlinePoints !== null ? (
        <Line
          points={centerlinePoints}
          color={wallSegmentRenderColors.activeCenterlineStroke}
          lineWidth={ACTIVE_WALL_CENTERLINE_WIDTH_PIXELS}
          depthTest={false}
          renderOrder={ACTIVE_WALL_SEGMENT_RENDER_ORDER + 1}
        />
      ) : null}
      <WallAnchorRing pointInches={segmentBody.start.centerPointInches} />
      <WallAnchorRing pointInches={segmentBody.end.centerPointInches} />
    </group>
  );
}

function createBoundaryPoints(
  polygonInches: readonly Point3DInches[],
): readonly [number, number, number][] {
  if (polygonInches.length === 0) {
    return [];
  }

  const boundaryPoints = polygonInches.map<[number, number, number]>((pointInches) => [
    pointInches.xInches,
    pointInches.yInches,
    pointInches.zInches + ACTIVE_WALL_SEGMENT_Z_OFFSET_INCHES,
  ]);

  return [...boundaryPoints, boundaryPoints[0]];
}

function createCenterlinePoints(
  segmentBody: BuiltWallSegmentBody,
): readonly [[number, number, number], [number, number, number]] | null {
  const startPointInches = segmentBody.start.centerPointInches;
  const endPointInches = segmentBody.end.centerPointInches;
  const deltaXInches = endPointInches.xInches - startPointInches.xInches;
  const deltaYInches = endPointInches.yInches - startPointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);

  if (lengthInches <= ACTIVE_WALL_CENTERLINE_TRIM_INCHES * 2) {
    return null;
  }

  const unitX = deltaXInches / lengthInches;
  const unitY = deltaYInches / lengthInches;
  const trimmedStartPointInches = {
    xInches: startPointInches.xInches + unitX * ACTIVE_WALL_CENTERLINE_TRIM_INCHES,
    yInches: startPointInches.yInches + unitY * ACTIVE_WALL_CENTERLINE_TRIM_INCHES,
    zInches: startPointInches.zInches,
  };
  const trimmedEndPointInches = {
    xInches: endPointInches.xInches - unitX * ACTIVE_WALL_CENTERLINE_TRIM_INCHES,
    yInches: endPointInches.yInches - unitY * ACTIVE_WALL_CENTERLINE_TRIM_INCHES,
    zInches: endPointInches.zInches,
  };

  return [
    [
      trimmedStartPointInches.xInches,
      trimmedStartPointInches.yInches,
      trimmedStartPointInches.zInches + ACTIVE_WALL_SEGMENT_Z_OFFSET_INCHES,
    ],
    [
      trimmedEndPointInches.xInches,
      trimmedEndPointInches.yInches,
      trimmedEndPointInches.zInches + ACTIVE_WALL_SEGMENT_Z_OFFSET_INCHES,
    ],
  ];
}
