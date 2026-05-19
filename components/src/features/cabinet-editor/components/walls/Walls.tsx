"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { ChevronDown as ChevronDownIcon, ChevronLeft, ChevronRight, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlacementMoveRotateControl } from "../placements/PlacementViews";
import { getElevationWallAxis, getPeninWallEndpointAttachment, getPeninWallVisibleSegment, getWallPlacementDebugLines, getWallPlacementGuideSides, measurementSideToWallFaceSide } from "../elevation/ElevationPlanView";
import { WORKSPACE_HEIGHT, WORKSPACE_WIDTH } from "../../constants/editorConstants";
import { JOINT_DOT_RADIUS, JOINT_TICK_LENGTH } from "../../constants/elevationConstants";
import { PENIN_WALL_THICKNESS, THIN_WALL_STROKE_WIDTH, WALL_STROKE_WIDTH, WALL_THICKNESS } from "../../constants/wallConstants";
import { useMeasurementDisplayUnit } from "../../context/MeasurementDisplayUnitContext";
import { add, distance, dot, formatFeetInches, getAngleDegrees, midpoint, mul, normalize, perp, pointKey, samePoint, sub, toSvgPoint, vectorLength } from "../../engine/geometry";
import { segmentMatchesWall } from "../../engine/openingEngine";
import { buildBlackDotWallBand, closestPointOnSegment, describeHalfArc, formatFeetInchesParts, getAngleGuideLayout, getConvertedMeasurementRunDisplayLength, getMeasurementGuideAnchor, getMeasurementLayout, getMergedMeasurementLayout, getMultiConnectedEndpoints, getThinWallMeasurementLayout, getWallSegmentBlackDotGeometry, getWallSideMeasurementLayout, isConnected, isDetachedPanelWall, isDrawingTool, isIslandWall, isThickWall, isThinWall, shouldMergeMeasurementRun } from "../../engine/wallEngine";
import type { PlacementElement, ConnectionMap, JunctionArm, JunctionMarkerCandidate, JunctionMarkerSegment, MeasurementClickPayload, MeasurementEditState, MeasurementLayout, MeasurementSide, Point, Tool, Wall, WallBandGeometry } from "../../types/editorTypes";

export function ThinWallLine({
  wall,
  onMeasurementClick,
  editingMeasurement: _editingMeasurement,
}: {
  wall: Wall;
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  editingMeasurement?: MeasurementEditState | null;
}) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const layout = getThinWallMeasurementLayout(wall.start, wall.end);
  const length = distance(wall.start, wall.end);
  const payload: MeasurementClickPayload = {
    segmentStart: wall.start,
    segmentEnd: wall.end,
    side: "length",
    currentEdgeLength: length,
    labelPoint: layout.labelPoint,
    rotation: layout.rotation,
  };
  return (
    <g>
      <line
        x1={wall.start.x}
        y1={wall.start.y}
        x2={wall.end.x}
        y2={wall.end.y}
        stroke="#6b7280"
        strokeWidth={THIN_WALL_STROKE_WIDTH}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <MeasurementLabelOnly
        layout={layout}
        label={formatFeetInches(length, measurementDisplayUnit)}
        onClick={onMeasurementClick ? () => onMeasurementClick(payload) : undefined}
      />
    </g>
  );
}

export function PeninWallLine({
  wall,
  structuralWalls = [],
  onMeasurementClick,
  editingMeasurement,
}: {
  wall: Wall;
  structuralWalls?: Wall[];
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  editingMeasurement?: MeasurementEditState | null;
}) {
  const visibleSegment = getPeninWallVisibleSegment(wall, structuralWalls);
  const visibleWall = { ...wall, start: visibleSegment.start, end: visibleSegment.end };
  const length = distance(visibleWall.start, visibleWall.end);
  const direction = length > 0.001 ? normalize(sub(visibleWall.end, visibleWall.start)) : { x: 1, y: 0 };
  const normal = normalize(perp(direction));
  const halfThickness = PENIN_WALL_THICKNESS / 2;
  const endInset = Math.min(10, Math.max(0, length / 5));
  const insetHalfThickness = Math.max(2, halfThickness - 5);
  const start = add(visibleWall.start, mul(direction, endInset));
  const end = add(visibleWall.end, mul(direction, -endInset));
  const outerPolygon = [
    add(visibleWall.start, mul(normal, halfThickness)),
    add(visibleWall.end, mul(normal, halfThickness)),
    add(visibleWall.end, mul(normal, -halfThickness)),
    add(visibleWall.start, mul(normal, -halfThickness)),
  ];
  const innerPolygon = [
    add(start, mul(normal, insetHalfThickness)),
    add(end, mul(normal, insetHalfThickness)),
    add(end, mul(normal, -insetHalfThickness)),
    add(start, mul(normal, -insetHalfThickness)),
  ];

  return (
    <g>
      <polygon
        points={outerPolygon.map(toSvgPoint).join(" ")}
        fill="#f1ede4"
        stroke="#334155"
        strokeWidth="2.25"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={innerPolygon.map(toSvgPoint).join(" ")}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
      <WallChain
        points={[visibleWall.start, visibleWall.end]}
        sourceWalls={[visibleWall]}
        connectionMap={new Map()}
        onMeasurementClick={onMeasurementClick}
        editingMeasurement={editingMeasurement}
        renderWallBody={false}
      />
    </g>
  );
}

export function PeninWallSelectionOverlay({
  wall,
  structuralWalls,
  showDegree = false,
  onRotateStart,
  onResizeStart,
}: {
  wall: Wall;
  structuralWalls: Wall[];
  showDegree?: boolean;
  onRotateStart: (event: React.PointerEvent<SVGPathElement>) => void;
  onResizeStart: (event: React.PointerEvent<SVGCircleElement>, endpoint: "start" | "end") => void;
}) {
  const visibleSegment = getPeninWallVisibleSegment(wall, structuralWalls);
  const visibleWall = { ...wall, start: visibleSegment.start, end: visibleSegment.end };
  const length = distance(visibleWall.start, visibleWall.end);
  if (length < 0.001) return null;

  const direction = normalize(sub(visibleWall.end, visibleWall.start));
  const normal = normalize(perp(direction));
  const center = midpoint(visibleWall.start, visibleWall.end);
  const rotation = getAngleDegrees(visibleWall.start, visibleWall.end);
  const halfThickness = PENIN_WALL_THICKNESS / 2;
  const selectedStroke = "#22bfd6";
  const handleFill = "#22bfd6";
  const startAttachment = isIslandWall(wall) ? null : getPeninWallEndpointAttachment(wall.start, structuralWalls);
  const endAttachment = isIslandWall(wall) ? null : getPeninWallEndpointAttachment(wall.end, structuralWalls);
  const canResizeStart = !startAttachment || Boolean(endAttachment);
  const canResizeEnd = !endAttachment || Boolean(startAttachment);
  const resizeStartPoint = startAttachment ? visibleWall.start : wall.start;
  const resizeEndPoint = endAttachment ? visibleWall.end : wall.end;
  const pseudoPlacement: PlacementElement = {
    id: wall.id,
    center,
    width: length,
    depth: PENIN_WALL_THICKNESS,
    rotation,
    category: "base",
  };
  const outlinePoints = [
    add(visibleWall.start, mul(normal, halfThickness)),
    add(visibleWall.end, mul(normal, halfThickness)),
    add(visibleWall.end, mul(normal, -halfThickness)),
    add(visibleWall.start, mul(normal, -halfThickness)),
  ];

  return (
    <g>
      <polygon
        points={outlinePoints.map(toSvgPoint).join(" ")}
        fill="none"
        stroke={selectedStroke}
        strokeWidth="2.6"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {canResizeStart && (
        <circle
          cx={resizeStartPoint.x}
          cy={resizeStartPoint.y}
          r="5"
          fill={handleFill}
          stroke="#ffffff"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          onPointerDown={(event) => onResizeStart(event, "start")}
          style={{ cursor: "ew-resize" }}
        />
      )}
      {canResizeEnd && (
        <circle
          cx={resizeEndPoint.x}
          cy={resizeEndPoint.y}
          r="5"
          fill={handleFill}
          stroke="#ffffff"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          onPointerDown={(event) => onResizeStart(event, "end")}
          style={{ cursor: "ew-resize" }}
        />
      )}
      <PlacementMoveRotateControl
        placementItem={pseudoPlacement}
        onRotateStart={onRotateStart}
        showDegree={showDegree}
      />
    </g>
  );
}

export function WallChain({
  points,
  sourceWalls,
  connectionMap,
  hideInteriorDetails = false,
  onMeasurementClick,
  editingMeasurement: _editingMeasurement,
  renderWallBody = true,
  renderMeasurements = true,
  renderElevationViewDebugLine = false,
  getMeasurementLabelOffset,
}: {
  points: Point[];
  sourceWalls: Wall[];
  connectionMap: ConnectionMap;
  hideInteriorDetails?: boolean;
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  editingMeasurement?: MeasurementEditState | null;
  renderWallBody?: boolean;
  renderMeasurements?: boolean;
  renderElevationViewDebugLine?: boolean;
  getMeasurementLabelOffset?: (
    segmentStart: Point,
    segmentEnd: Point,
    side: "left" | "right",
    index: number
  ) => number;
}) {
  if (points.length < 2) return null;

  const geometry = buildBlackDotWallBand(points, sourceWalls);
  const chainWalls = sourceWalls.filter((wall) =>
    points.some(
      (point, index) =>
        index < points.length - 1 &&
        segmentMatchesWall(points[index], points[index + 1], wall.id, sourceWalls)
    )
  );
  const elevationViewDebugLines = renderElevationViewDebugLine
    ? chainWalls
        .flatMap((wall) => getWallPlacementDebugLines(wall, sourceWalls))
        .filter((line): line is { key: string; start: Point; end: Point } => Boolean(line))
        .filter((line) => distance(line.start, line.end) > 0.001)
    : [];

  return (
    <g>
      {renderWallBody && (
        <g>
          {geometry.segmentGeometries.map((segment, segmentIndex) => (
            <polygon
              key={`black-dot-wall-body-${segmentIndex}-${segment.polygon.map(pointKey).join("-")}`}
              points={segment.polygon.map(toSvgPoint).join(" ")}
              fill="#c9c9c9"
            />
          ))}
        </g>
      )}

      {elevationViewDebugLines.length > 0 && (
        <g pointerEvents="none">
          {elevationViewDebugLines.map((line) => (
            <line
              key={`elevation-view-debug-${line.key}`}
              x1={line.start.x}
              y1={line.start.y}
              x2={line.end.x}
              y2={line.end.y}
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}

      {renderMeasurements && (
        <WallMeasurementRuns
          points={points}
          edges={geometry.leftEdges}
          side="left"
          sourceWalls={sourceWalls}
          onMeasurementClick={onMeasurementClick}
          getMeasurementLabelOffset={getMeasurementLabelOffset}
        />
      )}

      {renderMeasurements && !hideInteriorDetails && (
        <WallMeasurementRuns
          points={points}
          edges={geometry.rightEdges}
          side="right"
          sourceWalls={sourceWalls}
          onMeasurementClick={onMeasurementClick}
          getMeasurementLabelOffset={getMeasurementLabelOffset}
        />
      )}

      {points.map((point) => {
        const isEndpointOpen = !isConnected(point, connectionMap);

        if (isEndpointOpen) return null;

        return null;
      })}
    </g>
  );
}

export function MeasurementGuideAnchorDebugDots({
  walls,
  chains,
  selectedWall,
}: {
  walls: Wall[];
  chains: { points: Point[] }[];
  selectedWall?: Wall | null;
}) {
  const debugDots: Point[] = [];

  for (const chain of chains) {
    const points = chain.points;

    for (let index = 0; index < points.length - 1; index += 1) {
      const segmentStart = points[index];
      const segmentEnd = points[index + 1];

      for (const side of ["left", "right"] as const) {
        const startAnchor = getWallSideMeasurementAnchor(
          segmentStart,
          segmentEnd,
          side,
          walls
        );
        const endAnchor = getWallSideMeasurementAnchor(
          segmentEnd,
          segmentStart,
          side,
          walls
        );

        debugDots.push(startAnchor);
        debugDots.push(endAnchor);
      }
    }
  }

  const uniqueDots = uniqueDebugPointsByDistance(debugDots, 1);
  const highlightedPointKeys = new Set<string>();

  if (selectedWall && isThickWall(selectedWall)) {
    const geometry = getWallSegmentBlackDotGeometry(
      selectedWall.start,
      selectedWall.end,
      walls
    );
    const highlightedSides = getWallPlacementGuideSides(selectedWall, walls);
    const elevationAxis = getElevationWallAxis(selectedWall);

    highlightedSides.forEach((side) => {
      const projectedFace = measurementSideToWallFaceSide(selectedWall, side);
      const rawStartAnchor = side === "left" ? geometry.startLeft : geometry.startRight;
      const rawEndAnchor = side === "left" ? geometry.endLeft : geometry.endRight;
      const faceNormal =
        projectedFace === "left"
          ? elevationAxis.normal
          : mul(elevationAxis.normal, -1);
      const viewDirection = mul(faceNormal, -1);
      const viewerRight = normalize(perp(viewDirection));
      const startProjection = dot(rawStartAnchor, viewerRight);
      const endProjection = dot(rawEndAnchor, viewerRight);
      const faceStartPoint =
        startProjection <= endProjection ? rawStartAnchor : rawEndAnchor;
      highlightedPointKeys.add(pointKey(faceStartPoint));
    });
  }

  if (uniqueDots.length === 0) return null;

  return (
    <g pointerEvents="none">
      {uniqueDots.map((point) => (
        <circle
          key={`measurement-black-dot-${pointKey(point)}`}
          cx={point.x}
          cy={point.y}
          r={3.25}
          fill={highlightedPointKeys.has(pointKey(point)) ? "#7c3aed" : "#000000"}
          stroke={highlightedPointKeys.has(pointKey(point)) ? "#7c3aed" : "#000000"}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

export function uniqueDebugPointsByDistance(points: Point[], tolerance = 1) {
  const unique: Point[] = [];

  for (const point of points) {
    if (unique.some((existingPoint) => distance(existingPoint, point) <= tolerance)) {
      continue;
    }

    unique.push(point);
  }

  return unique;
}

export function attachWallDebugDotsForExport(walls: Wall[]) {
  const thickWalls = walls.filter(isThickWall);
  return walls.map((wall) => {
    if (!isThickWall(wall)) return wall;
    const geometry = getWallSegmentBlackDotGeometry(
      wall.start,
      wall.end,
      thickWalls
    );

    return {
      ...wall,
      debugDots: {
        left: {
          start: geometry.startLeft,
          end: geometry.endLeft,
        },
        right: {
          start: geometry.startRight,
          end: geometry.endRight,
        },
      },
    };
  });
}

export function getWallSideMeasurementAnchor(
  segmentStart: Point,
  segmentEnd: Point,
  side: Exclude<MeasurementSide, "length">,
  walls: Wall[]
) {
  const direction = normalize(sub(segmentEnd, segmentStart));
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);

  return getMeasurementGuideAnchor(segmentStart, segmentEnd, normal, walls);
}

export function WallMeasurementRuns({
  points,
  edges,
  side,
  sourceWalls,
  onMeasurementClick,
  getMeasurementLabelOffset,
}: {
  points: Point[];
  edges: { a: Point; b: Point }[];
  side: Exclude<MeasurementSide, "length">;
  sourceWalls: Wall[];
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  getMeasurementLabelOffset?: (
    segmentStart: Point,
    segmentEnd: Point,
    side: "left" | "right",
    index: number
  ) => number;
}) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const measurementLines: React.ReactNode[] = [];
  let index = 0;

  while (index < edges.length) {
    let endIndex = index;

    while (
      endIndex < edges.length - 1 &&
      shouldMergeMeasurementRun(points, endIndex, side, sourceWalls)
    ) {
      endIndex += 1;
    }

    const labelOffset =
      getMeasurementLabelOffset?.(points[index], points[index + 1], side, index) ??
      18;
    const firstLayout = getWallSideMeasurementLayout(
      points[index],
      points[index + 1],
      side,
      sourceWalls,
      labelOffset
    );
    const lastLayout = getWallSideMeasurementLayout(
      points[endIndex],
      points[endIndex + 1],
      side,
      sourceWalls,
      labelOffset
    );
    const layout = getMergedMeasurementLayout(firstLayout, lastLayout);
    const edgeLength = distance(layout.lineStart, layout.lineEnd);
    const displayLength =
      getConvertedMeasurementRunDisplayLength(
        points,
        index,
        endIndex,
        side,
        sourceWalls
      ) ?? edgeLength;

    const payload: MeasurementClickPayload = {
      segmentStart: points[index],
      segmentEnd: points[endIndex + 1],
      side,
      currentEdgeLength: displayLength,
      labelPoint: layout.labelPoint,
      rotation: layout.rotation,
    };

    measurementLines.push(
      <MeasurementLine
        key={`${side}-measure-run-${index}-${endIndex}`}
        layout={layout}
        label={formatFeetInches(displayLength, measurementDisplayUnit)}
        onClick={onMeasurementClick ? () => onMeasurementClick(payload) : undefined}
      />
    );

    index = endIndex + 1;
  }

  return <>{measurementLines}</>;
}

export function JointIndicators({
  points,
  geometry,
  connectionMap,
  hideInteriorDetails = false,
}: {
  points: Point[];
  geometry: WallBandGeometry;
  connectionMap: ConnectionMap;
  hideInteriorDetails?: boolean;
}) {
  return (
    <g>
      {points.slice(1, -1).map((center, index) => {
        if ((connectionMap.get(pointKey(center)) ?? 0) > 2) {
          return null;
        }

        const pointIndex = index + 1;
        const previous = points[pointIndex - 1];
        const next = points[pointIndex + 1];

        const previousDir = normalize(sub(previous, center));
        const nextDir = normalize(sub(next, center));

        const leftCorner = geometry.left[pointIndex];
        const rightCorner = geometry.right[pointIndex];

        return (
          <g key={`joint-${pointIndex}-${center.x}-${center.y}`}>
            <CornerJointMarker
              point={leftCorner}
              previousDir={previousDir}
              nextDir={nextDir}
            />

            {!hideInteriorDetails && (
              <CornerJointMarker
                point={rightCorner}
                previousDir={previousDir}
                nextDir={nextDir}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

export function CornerJointMarker({
  point,
  previousDir,
  nextDir,
}: {
  point: Point;
  previousDir: Point;
  nextDir: Point;
}) {
  const previousTick = add(point, mul(previousDir, JOINT_TICK_LENGTH));
  const nextTick = add(point, mul(nextDir, JOINT_TICK_LENGTH));

  return (
    <g>
      <line
        x1={point.x}
        y1={point.y}
        x2={previousTick.x}
        y2={previousTick.y}
        stroke="#43b3c8"
        strokeWidth={4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      <line
        x1={point.x}
        y1={point.y}
        x2={nextTick.x}
        y2={nextTick.y}
        stroke="#43b3c8"
        strokeWidth={4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      <circle
        cx={point.x}
        cy={point.y}
        r={JOINT_DOT_RADIUS}
        fill="#43b3c8"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function MultiConnectionJointIndicators({
  walls,
  connectionMap,
}: {
  walls: Wall[];
  connectionMap: ConnectionMap;
}) {
  const junctionPoints = getMultiConnectedEndpoints(walls, connectionMap);

  return (
    <g>
      {junctionPoints.map((point) => {
        const arms = getConnectedWallArmsAtPoint(point, walls);
        const markerSegments = getJunctionEdgeMarkerSegments(point, arms);

        return (
          <g key={`multi-joint-${pointKey(point)}`}>
            {markerSegments.map((segment, index) => (
              <g key={`multi-joint-edge-${pointKey(point)}-${index}`}>
                <line
                  x1={segment.start.x}
                  y1={segment.start.y}
                  x2={segment.end.x}
                  y2={segment.end.y}
                  stroke="#43b3c8"
                  strokeWidth={4}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />

                <circle
                  cx={segment.start.x}
                  cy={segment.start.y}
                  r={JOINT_DOT_RADIUS - 1}
                  fill="#43b3c8"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
}

export function getConnectedWallArmsAtPoint(point: Point, walls: Wall[]): JunctionArm[] {
  const arms: JunctionArm[] = [];

  for (const wall of walls) {
    let direction: Point | null = null;

    if (samePoint(point, wall.start)) {
      direction = normalize(sub(wall.end, wall.start));
    } else if (samePoint(point, wall.end)) {
      direction = normalize(sub(wall.start, wall.end));
    }

    if (!direction || !vectorLength(direction)) continue;

    arms.push({ wall, direction });
  }

  return arms;
}

export function getJunctionEdgeMarkerSegments(point: Point, arms: JunctionArm[]) {
  const candidates = getJunctionMarkerCandidates(point, arms);
  const segments: JunctionMarkerSegment[] = [];

  for (const candidate of candidates) {
    const segment = getVisibleJunctionMarkerSegment(candidate, arms);
    if (!segment) continue;

    if (isDuplicateJunctionMarkerSegment(segments, segment.start, segment.end)) {
      continue;
    }

    segments.push(segment);
  }

  return segments;
}

export function getJunctionMarkerCandidates(point: Point, arms: JunctionArm[]) {
  const halfThickness = WALL_THICKNESS / 2;
  const edgeOffset = 0.9;
  const candidates: JunctionMarkerCandidate[] = [];

  for (const arm of arms) {
    const normals = [normalize(perp(arm.direction)), normalize(mul(perp(arm.direction), -1))];

    for (const normal of normals) {
      candidates.push({
        wall: arm.wall,
        direction: normalize(arm.direction),
        normal,
        start: add(point, mul(normal, halfThickness + edgeOffset)),
      });
    }
  }

  return candidates;
}

export function getVisibleJunctionMarkerSegment(
  candidate: JunctionMarkerCandidate,
  arms: JunctionArm[]
) {
  const maxDistance = JOINT_TICK_LENGTH;
  const step = 0.75;
  const outwardProbe = 2.75;
  const minVisibleLength = 4.5;

  let firstVisibleDistance: number | null = null;
  let lastVisibleDistance: number | null = null;

  for (let distanceAlongEdge = 0; distanceAlongEdge <= maxDistance; distanceAlongEdge += step) {
    const sample = add(candidate.start, mul(candidate.direction, distanceAlongEdge));
    const outsideSample = add(sample, mul(candidate.normal, outwardProbe));

    const blocked = arms.some((arm) => {
      if (arm.wall.id === candidate.wall.id) return false;

      return (
        pointIsInsideWallBody(sample, arm.wall, 0.15) ||
        pointIsInsideWallBody(outsideSample, arm.wall, 0.15)
      );
    });

    if (!blocked) {
      if (firstVisibleDistance === null) firstVisibleDistance = distanceAlongEdge;
      lastVisibleDistance = distanceAlongEdge;
    } else if (firstVisibleDistance !== null) {
      break;
    }
  }

  if (firstVisibleDistance === null || lastVisibleDistance === null) {
    return null;
  }

  const visibleLength = lastVisibleDistance - firstVisibleDistance + step;
  if (visibleLength < minVisibleLength) {
    return null;
  }

  return {
    start: add(candidate.start, mul(candidate.direction, firstVisibleDistance)),
    end: add(
      candidate.start,
      mul(candidate.direction, Math.min(maxDistance, lastVisibleDistance + step))
    ),
  };
}

export function pointIsInsideWallBody(point: Point, wall: Wall, tolerance = 0) {
  const projectedPoint = closestPointOnSegment(point, wall.start, wall.end);
  const distanceFromCenterline = distance(point, projectedPoint);

  if (distanceFromCenterline > WALL_THICKNESS / 2 + tolerance) return false;

  const wallLength = distance(wall.start, wall.end);
  const startDistance = distance(wall.start, projectedPoint);
  const endDistance = distance(projectedPoint, wall.end);

  return startDistance <= wallLength + tolerance && endDistance <= wallLength + tolerance;
}

export function isDuplicateJunctionMarkerSegment(
  segments: JunctionMarkerSegment[],
  start: Point,
  end: Point
) {
  return segments.some((segment) => {
    return (
      (distance(segment.start, start) < 1 && distance(segment.end, end) < 1) ||
      (distance(segment.start, end) < 1 && distance(segment.end, start) < 1)
    );
  });
}

export function SelectedWallOverlay({ wall, walls = [wall] }: { wall: Wall; walls?: Wall[] }) {
  if (isThinWall(wall)) {
    return (
      <g>
        <line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} stroke="#00aee6" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={wall.start.x} cy={wall.start.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        <circle cx={wall.end.x} cy={wall.end.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  const geometry = getWallSegmentBlackDotGeometry(
    wall.start,
    wall.end,
    walls.filter(isThickWall)
  );
  const polygonPoints = geometry.polygon.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <g>
      <polygon
        points={polygonPoints}
        fill="#b7edf4"
        fillOpacity="0.72"
        stroke="#00aee6"
        strokeWidth={2.8}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={geometry.startLeft.x}
        y1={geometry.startLeft.y}
        x2={geometry.endLeft.x}
        y2={geometry.endLeft.y}
        stroke="#00aee6"
        strokeWidth={2}
        strokeLinecap="butt"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={geometry.startRight.x}
        y1={geometry.startRight.y}
        x2={geometry.endRight.x}
        y2={geometry.endRight.y}
        stroke="#00aee6"
        strokeWidth={2}
        strokeLinecap="butt"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function WallSelectionHitAreas({
  walls,
  activeTool,
  selectedWallId,
  onSelectWall,
  onPeninWallDragStart,
}: {
  walls: Wall[];
  activeTool: Tool;
  selectedWallId?: string | null;
  onSelectWall: (id: string) => void;
  onPeninWallDragStart?: (event: React.PointerEvent<SVGLineElement>, wall: Wall) => void;
}) {
  if (isDrawingTool(activeTool) || activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-placement") return null;

  return (
    <g>
      {walls.map((wall) => (
        <line
          key={`hit-${wall.id}`}
          x1={wall.start.x}
          y1={wall.start.y}
          x2={wall.end.x}
          y2={wall.end.y}
          stroke="transparent"
          strokeWidth={isThinWall(wall) ? 26 : Math.max(WALL_STROKE_WIDTH + 22, 34)}
          strokeLinecap="round"
          pointerEvents="stroke"
          vectorEffect="non-scaling-stroke"
          style={{ cursor: isDetachedPanelWall(wall) && selectedWallId === wall.id && onPeninWallDragStart ? "move" : "pointer" }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isDetachedPanelWall(wall) && selectedWallId === wall.id && onPeninWallDragStart) {
              onPeninWallDragStart(event, wall);
              return;
            }
            onSelectWall(wall.id);
          }}
        />
      ))}
    </g>
  );
}

export function SelectedWallContextMenu({
  position,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  position: Point;
  onDelete: () => void;
  onDragStart: (
    event: React.PointerEvent<HTMLDivElement>,
    startPosition: Point
  ) => void;
  onDragMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={82}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[74px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected wall menu"
          className="flex w-6 shrink-0 cursor-grab items-center justify-center bg-[#0fb8d2] active:cursor-grabbing"
          onPointerDown={(event) => onDragStart(event, position)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex flex-col gap-1">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>

        <button
          type="button"
          aria-label="Delete selected wall"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </foreignObject>
  );
}

export function getWallMenuPosition(wall: Wall): Point {
  const menuHeight = 46;
  const endpointGap = 18;

  const start = wall.start;
  const end = wall.end;

  // Pick the endpoint that is visually more to the right.
  // If the wall is vertical, pick the lower endpoint so the menu still appears
  // beside a clear wall point instead of floating in the middle.
  const rightSidePoint =
    end.x > start.x
      ? end
      : start.x > end.x
        ? start
        : end.y >= start.y
          ? end
          : start;

  return {
    x: rightSidePoint.x + endpointGap,
    y: rightSidePoint.y - menuHeight / 2,
  };
}

export function MeasurementLine({
  layout,
  label,
  onClick,
}: {
  layout: MeasurementLayout;
  label: string;
  onClick?: () => void;
}) {
  return (
    <g>
      <line
        x1={layout.lineStart.x}
        y1={layout.lineStart.y}
        x2={layout.lineEnd.x}
        y2={layout.lineEnd.y}
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeDasharray="4 9"
        pointerEvents="none"
        vectorEffect="non-scaling-stroke"
      />

      <MeasurementEndCap
        point={layout.lineStart}
        lineStart={layout.lineStart}
        lineEnd={layout.lineEnd}
      />
      <MeasurementEndCap
        point={layout.lineEnd}
        lineStart={layout.lineStart}
        lineEnd={layout.lineEnd}
      />

      <g
        className={onClick ? "cursor-pointer" : undefined}
        onPointerDown={(event) => {
          if (!onClick) return;

          event.preventDefault();
          event.stopPropagation();
          onClick();
        }}
      >
        <SvgTextHalo
          x={layout.labelPoint.x}
          y={layout.labelPoint.y}
          text={label}
          rotate={layout.rotation}
          className="fill-slate-950 text-[14px] font-bold"
        />
      </g>
    </g>
  );
}

export function MeasurementEndCap({
  point,
  lineStart,
  lineEnd,
}: {
  point: Point;
  lineStart: Point;
  lineEnd: Point;
}) {
  const direction = normalize(sub(lineEnd, lineStart));
  const normal = perp(direction);
  const capHalfLength = 5;
  const start = add(point, mul(normal, capHalfLength));
  const end = add(point, mul(normal, -capHalfLength));

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke="#38bdf8"
      strokeWidth={2}
      strokeLinecap="square"
      pointerEvents="none"
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function MeasurementLabelOnly({
  layout,
  label,
  onClick,
}: {
  layout: MeasurementLayout;
  label: string;
  onClick?: () => void;
}) {
  return (
    <g
      className={onClick ? "cursor-pointer" : undefined}
      onPointerDown={(event) => {
        if (!onClick) return;

        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <SvgTextHalo
        x={layout.labelPoint.x}
        y={layout.labelPoint.y}
        text={label}
        rotate={layout.rotation}
        className="fill-slate-950 text-[14px] font-bold"
      />
    </g>
  );
}

export function MeasurementEditModal({
  edit,
  onCancel,
  onApply,
}: {
  edit: MeasurementEditState;
  onCancel: () => void;
  onApply: (value: string) => void;
}) {
  const initialParts = formatFeetInchesParts(edit.currentEdgeLength);
  const [feet, setFeet] = useState(initialParts.feet);
  const [inches, setInches] = useState(initialParts.inches);

  useEffect(() => {
    const nextParts = formatFeetInchesParts(edit.currentEdgeLength);
    setFeet(nextParts.feet);
    setInches(nextParts.inches);
  }, [edit.wallId, edit.side, edit.currentEdgeLength]);


  const applyCurrentValue = () => {
    onApply(`${feet || "0"} ${inches || "0"}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      event.preventDefault();
      applyCurrentValue();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  const handleFeetChange = (value: string) => {
    setFeet(value.replace(/[^0-9.]/g, ""));
  };

  const handleInchesChange = (value: string) => {
    setInches(value.replace(/[^0-9.]/g, ""));
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/20"
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="w-[360px] rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-pelican-navy">
              Edit measurement
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Update the selected wall length.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close measurement editor"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Length
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Feet
              </div>
              <div className="flex h-11 items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
                <input
                  aria-label="Feet"
                  value={feet}
                  onChange={(event) => handleFeetChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold text-slate-950 outline-none"
                />
                <span className="ml-2 text-lg font-bold text-slate-500">'</span>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Inches
              </div>
              <div className="flex h-11 items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
                <input
                  aria-label="Inches"
                  value={inches}
                  onChange={(event) => handleInchesChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold text-slate-950 outline-none"
                />
                <span className="ml-2 text-lg font-bold text-slate-500">&quot;</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={applyCurrentValue}
            className="h-9 rounded-md bg-pelican-teal px-4 text-sm font-semibold text-white shadow-sm hover:brightness-95"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

export function WallDrawingOverlay({
  start,
  end,
  horizontalY,
  verticalX,
  showSerialStart,
}: {
  start: Point;
  end: Point;
  horizontalY?: number;
  verticalX?: number;
  showSerialStart: boolean;
}) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const length = distance(start, end);
  const hasLength = length > 4;
  const label = formatFeetInches(length, measurementDisplayUnit);

  const measure = getMeasurementLayout(start, end, "exterior");
  const angleGuide = getAngleGuideLayout(start, end);

  return (
    <g>
      {horizontalY !== undefined && (
        <line
          x1={0}
          y1={horizontalY}
          x2={WORKSPACE_WIDTH}
          y2={horizontalY}
          stroke="#ef4444"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {verticalX !== undefined && (
        <line
          x1={verticalX}
          y1={0}
          x2={verticalX}
          y2={WORKSPACE_HEIGHT}
          stroke="#ef4444"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hasLength && angleGuide.mode === "full" && (
        <circle
          cx={start.x}
          cy={start.y}
          r={length}
          fill="none"
          stroke="#777"
          strokeWidth={1.25}
          opacity={0.85}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hasLength && angleGuide.mode !== "full" && (
        <path
          d={describeHalfArc(start, length, angleGuide.mode)}
          fill="none"
          stroke="#777"
          strokeWidth={1.25}
          opacity={0.85}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hasLength && (
        <>
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#c9c9c9"
            strokeWidth={WALL_STROKE_WIDTH}
            strokeLinecap="butt"
            vectorEffect="non-scaling-stroke"
          />

          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#31bde2"
            strokeWidth={WALL_STROKE_WIDTH}
            strokeLinecap="butt"
            opacity={0.28}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {hasLength && <MeasurementLine layout={measure} label={label} />}

      {hasLength &&
        angleGuide.labels.map((item) => (
          <SvgTextHalo
            key={`${item.text}-${item.point.x}-${item.point.y}`}
            x={item.point.x}
            y={item.point.y}
            text={item.text}
            className="fill-slate-950 text-[14px] font-bold"
          />
        ))}

      <PointHandle point={start} variant={showSerialStart ? "serial" : "blue"} />

      {hasLength && <PointHandle point={end} variant="blue" />}
    </g>
  );
}

export function ThinWallDrawingOverlay({ start, end, horizontalY, verticalX, showSerialStart: _showSerialStart }: { start: Point; end: Point; horizontalY?: number; verticalX?: number; showSerialStart: boolean }) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const length = distance(start, end);
  const hasLength = length > 4;
  const measure = getThinWallMeasurementLayout(start, end);
  const angleGuide = getAngleGuideLayout(start, end);
  return (
    <g>
      {horizontalY !== undefined && <line x1={0} y1={horizontalY} x2={WORKSPACE_WIDTH} y2={horizontalY} stroke="#ef4444" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      {verticalX !== undefined && <line x1={verticalX} y1={0} x2={verticalX} y2={WORKSPACE_HEIGHT} stroke="#ef4444" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      {hasLength && angleGuide.mode === "full" && <circle cx={start.x} cy={start.y} r={length} fill="none" stroke="#777" strokeWidth={1.25} opacity={0.85} vectorEffect="non-scaling-stroke" />}
      {hasLength && angleGuide.mode !== "full" && <path d={describeHalfArc(start, length, angleGuide.mode)} fill="none" stroke="#777" strokeWidth={1.25} opacity={0.85} vectorEffect="non-scaling-stroke" />}
      {hasLength && <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#31bde2" strokeWidth={THIN_WALL_STROKE_WIDTH} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {hasLength && <MeasurementLabelOnly layout={measure} label={formatFeetInches(length, measurementDisplayUnit)} />}
      {hasLength && angleGuide.labels.map((item) => <SvgTextHalo key={`${item.text}-${item.point.x}-${item.point.y}`} x={item.point.x} y={item.point.y} text={item.text} className="fill-slate-950 text-[14px] font-bold" />)}
      <ThinPointHandle point={start} variant="red" />
      {hasLength && <ThinPointHandle point={end} variant="blue" />}
    </g>
  );
}

export function OpenEndpoint({ point }: { point: Point }) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={13}
      fill="#ff9b9b"
      fillOpacity={0.72}
      stroke="#ff7b7b"
      strokeWidth={3}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function ThinOpenEndpoint({ point }: { point: Point }) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={8}
      fill="#ff9b9b"
      fillOpacity={0.72}
      stroke="#ff7b7b"
      strokeWidth={3}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function ThinJointDot({ point }: { point: Point }) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={4}
      fill="#43b3c8"
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function SvgTextHalo({
  x,
  y,
  text,
  rotate = 0,
  className,
}: {
  x: number;
  y: number;
  text: string;
  rotate?: number;
  className?: string;
}) {
  const transform = `rotate(${rotate} ${x} ${y})`;

  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={transform}
        className={cn("text-[14px] font-bold", className)}
        stroke="white"
        strokeWidth={7}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {text}
      </text>

      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={transform}
        className={cn("text-[14px] font-bold", className)}
      >
        {text}
      </text>
    </g>
  );
}

export function PointHandle({
  point,
  variant,
}: {
  point: Point;
  variant: "blue" | "serial";
}) {
  if (variant === "serial") {
    return (
      <g>
        <line
          x1={point.x - 18}
          y1={point.y}
          x2={point.x + 18}
          y2={point.y}
          stroke="#ef4444"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        <line
          x1={point.x}
          y1={point.y - 18}
          x2={point.x}
          y2={point.y + 18}
          stroke="#ef4444"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        <circle
          cx={point.x}
          cy={point.y}
          r={13}
          fill="none"
          stroke="#00aee6"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={13}
      fill="white"
      stroke="#00aee6"
      strokeWidth={3}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function ThinPointHandle({ point, variant }: { point: Point; variant: "blue" | "serial" | "red" }) {
  if (variant === "red") {
    return <circle cx={point.x} cy={point.y} r={8} fill="#ff9b9b" fillOpacity={0.72} stroke="#ff7b7b" strokeWidth={3} vectorEffect="non-scaling-stroke" />;
  }

  if (variant === "serial") {
    return <g><line x1={point.x - 14} y1={point.y} x2={point.x + 14} y2={point.y} stroke="#ef4444" strokeWidth={2} vectorEffect="non-scaling-stroke" /><line x1={point.x} y1={point.y - 14} x2={point.x} y2={point.y + 14} stroke="#ef4444" strokeWidth={2} vectorEffect="non-scaling-stroke" /><circle cx={point.x} cy={point.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" /></g>;
  }

  return <circle cx={point.x} cy={point.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />;
}

export function MoveControl({
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  return (
    <div
      className="absolute left-10 top-10 z-10 h-[86px] w-[86px] cursor-default"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="absolute inset-0 rotate-45 rounded-md bg-white shadow-soft" />

      <button
        type="button"
        aria-label="Move canvas view up"
        onClick={onMoveUp}
        className="absolute left-1/2 top-1 flex h-8 w-8 -translate-x-1/2 items-center justify-center text-slate-400 hover:text-pelican-navy"
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      <button
        type="button"
        aria-label="Move canvas view left"
        onClick={onMoveLeft}
        className="absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-pelican-navy"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      </div>

      <button
        type="button"
        aria-label="Move canvas view right"
        onClick={onMoveRight}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-pelican-navy"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <button
        type="button"
        aria-label="Move canvas view down"
        onClick={onMoveDown}
        className="absolute bottom-1 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center text-slate-400 hover:text-pelican-navy"
      >
        <ChevronDownIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
