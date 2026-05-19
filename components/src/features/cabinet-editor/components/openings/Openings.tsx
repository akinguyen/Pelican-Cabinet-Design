"use client";
import * as React from "react";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { getInteriorMeasurementGuideSide } from "../elevation/ElevationPlanView";
import { SvgTextHalo } from "../walls/Walls";
import { WALL_STROKE_WIDTH, WALL_THICKNESS } from "../../constants/wallConstants";
import { useMeasurementDisplayUnit } from "../../context/MeasurementDisplayUnitContext";
import { add, clamp, distance, dot, formatFeetInches, getPreferredNormal, getTextRotation, midpoint, mul, normalize, perp, pointKey, samePoint, sub, toSvgPoint, vectorLength } from "../../engine/geometry";
import { getDoorGeometry, getWindowGeometry, getWindowTabSideFacingMeasurementGuide } from "../../engine/openingEngine";
import { buildWallChains, getMeasurementGuideAnchor, getMergedMeasurementLayout, getWallSideMeasurementLayout, isThickWall, shouldMergeMeasurementRun } from "../../engine/wallEngine";
import type { DoorElement, DoorPlacementPreview, MeasurementSide, Point, Wall, WindowElement, WindowPlacementPreview } from "../../types/editorTypes";

export function SelectionAreaBox({ start, end }: { start: Point; end: Point }) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(14, 165, 233, 0.10)"
      stroke="#0ea5e9"
      strokeWidth={1.5}
      strokeDasharray="6 5"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );
}

export function DoorOnWall({
  doorItem,
  wall,
  walls,
  selected,
  disabled = false,
  onSelect,
  onDragStart,
}: {
  doorItem: DoorElement;
  wall: Wall;
  walls: Wall[];
  selected: boolean;
  disabled?: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const geometry = getDoorGeometry(doorItem, wall);

  if (!geometry) return null;

  return (
    <g
      className={selected ? "cursor-move" : "cursor-pointer"}
      pointerEvents={disabled ? "none" : undefined}
      onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
    >
      <DoorShapeOnWall geometry={geometry} wall={wall} selected={selected} />

      {selected && (
        <WindowPlacementMeasurements
          wall={wall}
          walls={walls}
          center={geometry.center}
          width={doorItem.width}
          showWidth
        />
      )}

      <line
        x1={geometry.start.x}
        y1={geometry.start.y}
        x2={geometry.end.x}
        y2={geometry.end.y}
        stroke="transparent"
        strokeWidth={WALL_STROKE_WIDTH + 14}
        strokeLinecap="butt"
        pointerEvents="stroke"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function DoorShapeOnWall({
  geometry,
  wall,
  selected = false,
  preview = false,
}: {
  geometry: NonNullable<ReturnType<typeof getDoorGeometry>>;
  wall: Wall;
  selected?: boolean;
  preview?: boolean;
}) {
  const normal = getPreferredNormal(wall.start, wall.end);
  const halfHeight = preview ? 8 : 7;
  const outerPoints = [
    add(geometry.start, mul(normal, halfHeight)),
    add(geometry.end, mul(normal, halfHeight)),
    add(geometry.end, mul(normal, -halfHeight)),
    add(geometry.start, mul(normal, -halfHeight)),
  ];

  if (preview) {
    return (
      <g pointerEvents="none">
        <polygon
          points={outerPoints.map(toSvgPoint).join(" ")}
          fill="#35bed0"
          stroke="#0891b2"
          strokeWidth={1.4}
          opacity={0.9}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const innerInset = 2;
  const innerPoints = [
    add(geometry.start, mul(normal, halfHeight - innerInset)),
    add(geometry.end, mul(normal, halfHeight - innerInset)),
    add(geometry.end, mul(normal, -(halfHeight - innerInset))),
    add(geometry.start, mul(normal, -(halfHeight - innerInset))),
  ];
  const outlineStroke = selected ? "#0891b2" : "#111827";
  const innerStroke = selected ? "#0891b2" : "#6b7280";
  const fill = selected ? "#35bed0" : "#ffffff";

  return (
    <g pointerEvents="none">
      <polygon
        points={outerPoints.map(toSvgPoint).join(" ")}
        fill={fill}
        stroke={outlineStroke}
        strokeWidth={2}
        opacity={selected ? 0.9 : 1}
        vectorEffect="non-scaling-stroke"
      />
      {!selected && (
        <polygon
          points={innerPoints.map(toSvgPoint).join(" ")}
          fill="none"
          stroke={innerStroke}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}

export function FreeStructurePlacementPreview({
  center,
  width,
  kind,
}: {
  center: Point;
  width: number;
  kind: "door" | "window";
}) {
  const halfWidth = width / 2;
  const halfHeight = kind === "window" ? 8 : 8;
  const stroke = "#ef4444";
  const fill = "#fee2e2";

  return (
    <g pointerEvents="none" opacity={0.78}>
      <rect
        x={center.x - halfWidth}
        y={center.y - halfHeight}
        width={width}
        height={halfHeight * 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={center.x - halfWidth + 5}
        y1={center.y}
        x2={center.x + halfWidth - 5}
        y2={center.y}
        stroke={stroke}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function DoorPreview({
  preview,
  width,
  walls,
  showWidth = false,
}: {
  preview: DoorPlacementPreview;
  width: number;
  walls: Wall[];
  showWidth?: boolean;
}) {
  if (!preview.isValid || !preview.wall) {
    return <FreeStructurePlacementPreview center={preview.point} width={width} kind="door" />;
  }

  const geometry = getDoorGeometry(
    {
      id: "preview",
      wallId: preview.wall.id,
      t: preview.t,
      width,
      heightInches: 80,
      distanceFromFloorInches: 0,
    },
    preview.wall
  );

  if (!geometry) return null;

  return (
    <g pointerEvents="none">
      <DoorShapeOnWall
        geometry={geometry}
        wall={preview.wall}
        preview
      />

      <WindowPlacementMeasurements
        wall={preview.wall}
        walls={walls}
        center={geometry.center}
        width={width}
        showWidth={showWidth}
      />
    </g>
  );
}

export function SelectedDoorContextMenu({
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
          aria-label="Drag selected door menu"
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
          aria-label="Delete selected door"
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

export function WindowOnWall({
  windowItem,
  wall,
  walls,
  selected,
  disabled = false,
  onSelect,
  onDragStart,
}: {
  windowItem: WindowElement;
  wall: Wall;
  walls: Wall[];
  selected: boolean;
  disabled?: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const geometry = getWindowGeometry(windowItem, wall);

  if (!geometry) return null;

  return (
    <g
      className={selected ? "cursor-move" : "cursor-pointer"}
      pointerEvents={disabled ? "none" : undefined}
      onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
    >
      <WindowShapeOnWall
        geometry={geometry}
        wall={wall}
        selected={selected}
        tabSide={windowItem.tabSide ?? getWindowTabSideFacingMeasurementGuide(wall, walls)}
      />

      {selected && (
        <WindowPlacementMeasurements
          wall={wall}
          walls={walls}
          center={geometry.center}
          width={windowItem.width}
          showWidth
        />
      )}

      <line
        x1={geometry.start.x}
        y1={geometry.start.y}
        x2={geometry.end.x}
        y2={geometry.end.y}
        stroke="transparent"
        strokeWidth={WALL_STROKE_WIDTH + 14}
        strokeLinecap="butt"
        pointerEvents="stroke"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function WindowShapeOnWall({
  geometry,
  wall,
  selected = false,
  preview = false,
  tabSide = 1,
}: {
  geometry: NonNullable<ReturnType<typeof getWindowGeometry>>;
  wall: Wall;
  selected?: boolean;
  preview?: boolean;
  tabSide?: 1 | -1;
}) {
  const normal = getPreferredNormal(wall.start, wall.end);
  const tabNormal = mul(normal, tabSide);
  const halfHeight = preview ? 8 : 7;
  const tabLength = preview ? 10 : 8;
  const tabWidth = preview ? 14 : 12;
  const center = geometry.center;
  const outerPoints = [
    add(geometry.start, mul(normal, halfHeight)),
    add(geometry.end, mul(normal, halfHeight)),
    add(geometry.end, mul(normal, -halfHeight)),
    add(geometry.start, mul(normal, -halfHeight)),
  ];
  const innerInset = 2;
  const innerPoints = [
    add(geometry.start, mul(normal, halfHeight - innerInset)),
    add(geometry.end, mul(normal, halfHeight - innerInset)),
    add(geometry.end, mul(normal, -(halfHeight - innerInset))),
    add(geometry.start, mul(normal, -(halfHeight - innerInset))),
  ];
  const tabBaseCenter = add(center, mul(tabNormal, halfHeight));
  const tabDirectionA = normalize(sub(wall.start, wall.end));
  const tabDirectionB = normalize(sub(wall.end, wall.start));
  const tabBaseLeft = add(tabBaseCenter, mul(tabDirectionA, tabWidth / 2));
  const tabBaseRight = add(tabBaseCenter, mul(tabDirectionB, tabWidth / 2));
  const tabTipLeft = add(tabBaseLeft, mul(tabNormal, tabLength));
  const tabTipRight = add(tabBaseRight, mul(tabNormal, tabLength));

  if (preview) {
    return (
      <g pointerEvents="none">
        <polygon
          points={outerPoints.map(toSvgPoint).join(" ")}
          fill="#35bed0"
          stroke="#0891b2"
          strokeWidth={1.4}
          opacity={0.9}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M ${tabBaseLeft.x} ${tabBaseLeft.y} L ${tabTipLeft.x} ${tabTipLeft.y} L ${tabTipRight.x} ${tabTipRight.y} L ${tabBaseRight.x} ${tabBaseRight.y}`}
          fill="#35bed0"
          stroke="#0891b2"
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const outlineStroke = selected ? "#0891b2" : "#111827";
  const innerStroke = selected ? "#0891b2" : "#6b7280";
  const fill = selected ? "#35bed0" : "#ffffff";

  return (
    <g pointerEvents="none">
      <polygon
        points={outerPoints.map(toSvgPoint).join(" ")}
        fill={fill}
        stroke={outlineStroke}
        strokeWidth={2}
        opacity={selected ? 0.9 : 1}
        vectorEffect="non-scaling-stroke"
      />
      {!selected && (
        <polygon
          points={innerPoints.map(toSvgPoint).join(" ")}
          fill="none"
          stroke={innerStroke}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={`M ${tabBaseLeft.x} ${tabBaseLeft.y} L ${tabTipLeft.x} ${tabTipLeft.y} L ${tabTipRight.x} ${tabTipRight.y} L ${tabBaseRight.x} ${tabBaseRight.y}`}
        fill={fill}
        stroke={outlineStroke}
        strokeWidth={2}
        opacity={selected ? 0.9 : 1}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function WindowPreview({
  preview,
  width,
  walls,
  showWidth = false,
}: {
  preview: WindowPlacementPreview;
  width: number;
  walls: Wall[];
  showWidth?: boolean;
}) {
  if (!preview.isValid || !preview.wall) {
    return <FreeStructurePlacementPreview center={preview.point} width={width} kind="window" />;
  }

  const geometry = getWindowGeometry(
    {
      id: "preview",
      wallId: preview.wall.id,
      t: preview.t,
      width,
      heightInches: 36,
      distanceFromFloorInches: 24,
    },
    preview.wall
  );

  if (!geometry) return null;

  return (
    <g pointerEvents="none">
      <WindowShapeOnWall
        geometry={geometry}
        wall={preview.wall}
        preview
        tabSide={getWindowTabSideFacingMeasurementGuide(preview.wall, walls)}
      />

      <WindowPlacementMeasurements
        wall={preview.wall}
        walls={walls}
        center={geometry.center}
        width={width}
        showWidth={showWidth}
      />
    </g>
  );
}

export function WindowPlacementMeasurements({
  wall,
  walls,
  center,
  width,
  showWidth,
}: {
  wall: Wall;
  walls?: Wall[];
  center: Point;
  width: number;
  showWidth: boolean;
}) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const measurementWalls = walls?.length ? walls : [wall];
  const guideSide = getInteriorMeasurementGuideSide(wall, measurementWalls);
  const normal = guideSide === "left" ? baseNormal : mul(baseNormal, -1);
  const halfWidth = width / 2;
  const guideEndpoints = getStructureGuideEndpointsFromSideAnchors(
    wall,
    measurementWalls,
    guideSide,
    center,
    width
  );

  const startAnchor = guideEndpoints.startAnchor;
  const endAnchor = guideEndpoints.endAnchor;
  const startScalar = dot(sub(startAnchor, wall.start), direction);
  const endScalar = dot(sub(endAnchor, wall.start), direction);
  const rawCenterScalar = dot(sub(center, wall.start), direction);
  const centerScalar = clamp(
    rawCenterScalar,
    startScalar + halfWidth,
    Math.max(startScalar + halfWidth, endScalar - halfWidth)
  );
  const windowStart = add(wall.start, add(mul(direction, centerScalar - halfWidth), mul(normal, WALL_THICKNESS / 2)));
  const windowEnd = add(wall.start, add(mul(direction, centerScalar + halfWidth), mul(normal, WALL_THICKNESS / 2)));
  const offset = 30;
  const bracketStart = add(startAnchor, mul(normal, offset));
  const bracketWindowStart = add(windowStart, mul(normal, offset));
  const bracketWindowEnd = add(windowEnd, mul(normal, offset));
  const bracketEnd = add(endAnchor, mul(normal, offset));
  const tick = 12;
  const rotation = getTextRotation(wall.start, wall.end);

  const segmentLabel = (a: Point, b: Point) => {
    const mid = midpoint(a, b);
    return add(mid, mul(normal, 12));
  };

  return (
    <g pointerEvents="none">
      <BracketSegment start={bracketStart} end={bracketWindowStart} normal={normal} tick={tick} />
      <BracketSegment start={bracketWindowStart} end={bracketWindowEnd} normal={normal} tick={tick} />
      <BracketSegment start={bracketWindowEnd} end={bracketEnd} normal={normal} tick={tick} />

      <SvgTextHalo
        x={segmentLabel(bracketStart, bracketWindowStart).x}
        y={segmentLabel(bracketStart, bracketWindowStart).y}
        text={formatFeetInches(distance(startAnchor, windowStart), measurementDisplayUnit)}
        rotate={rotation}
        className="fill-slate-950 text-[12px] font-bold"
      />
      {showWidth && (
        <SvgTextHalo
          x={segmentLabel(bracketWindowStart, bracketWindowEnd).x}
          y={segmentLabel(bracketWindowStart, bracketWindowEnd).y}
          text={formatFeetInches(width, measurementDisplayUnit)}
          rotate={rotation}
          className="fill-slate-950 text-[12px] font-bold"
        />
      )}
      <SvgTextHalo
        x={segmentLabel(bracketWindowEnd, bracketEnd).x}
        y={segmentLabel(bracketWindowEnd, bracketEnd).y}
        text={formatFeetInches(distance(windowEnd, endAnchor), measurementDisplayUnit)}
        rotate={rotation}
        className="fill-slate-950 text-[12px] font-bold"
      />
    </g>
  );
}

export function getStructureGuideEndpointsFromSideAnchors(
  wall: Wall,
  walls: Wall[],
  guideSide: Exclude<MeasurementSide, "length">,
  center: Point,
  width: number
) {
  const runEndpoints = getStructureGuideEndpointsFromMeasurementRun(
    wall,
    walls,
    guideSide
  );

  if (runEndpoints) return runEndpoints;

  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const normal = guideSide === "left" ? baseNormal : mul(baseNormal, -1);
  const halfWidth = width / 2;
  const centerScalar = dot(sub(center, wall.start), direction);
  const windowStartScalar = centerScalar - halfWidth;
  const windowEndScalar = centerScalar + halfWidth;
  const sideFaceBase = add(wall.start, mul(normal, WALL_THICKNESS / 2));
  const rawCandidates = getStructureGuideAnchorScalars(wall, walls, normal);
  const candidates = rawCandidates.length
    ? rawCandidates
    : [
        dot(sub(wall.start, wall.start), direction),
        dot(sub(wall.end, wall.start), direction),
      ];

  const uniqueCandidates = Array.from(
    new Set(candidates.map((value) => Math.round(value * 1000) / 1000))
  ).sort((a, b) => a - b);

  const before =
    [...uniqueCandidates]
      .reverse()
      .find((value) => value <= windowStartScalar + 0.001) ??
    uniqueCandidates[0];
  const after =
    uniqueCandidates.find((value) => value >= windowEndScalar - 0.001) ??
    uniqueCandidates[uniqueCandidates.length - 1];

  const startScalar = Math.min(before, after);
  const endScalar = Math.max(before, after);

  return {
    startAnchor: add(sideFaceBase, mul(direction, startScalar)),
    endAnchor: add(sideFaceBase, mul(direction, endScalar)),
  };
}

export function getStructureGuideEndpointsFromMeasurementRun(
  wall: Wall,
  walls: Wall[],
  guideSide: Exclude<MeasurementSide, "length">
) {
  const chains = buildWallChains(walls.filter(isThickWall));
  const direction = normalize(sub(wall.end, wall.start));

  if (!vectorLength(direction)) return null;

  const baseNormal = normalize(perp(direction));
  const normal = guideSide === "left" ? baseNormal : mul(baseNormal, -1);
  const sideFaceBase = add(wall.start, mul(normal, WALL_THICKNESS / 2));
  const wallLineOffset = 14;

  for (const chain of chains) {
    const points = chain.points;
    let segmentIndex = -1;
    let isReversedInChain = false;

    for (let index = 0; index < points.length - 1; index += 1) {
      if (
        samePoint(points[index], wall.start) &&
        samePoint(points[index + 1], wall.end)
      ) {
        segmentIndex = index;
        isReversedInChain = false;
        break;
      }

      if (
        samePoint(points[index], wall.end) &&
        samePoint(points[index + 1], wall.start)
      ) {
        segmentIndex = index;
        isReversedInChain = true;
        break;
      }
    }

    if (segmentIndex < 0) continue;

    const chainGuideSide = isReversedInChain
      ? getOppositeMeasurementSide(guideSide)
      : guideSide;
    let runStart = segmentIndex;
    let runEnd = segmentIndex;

    while (
      runStart > 0 &&
      shouldMergeMeasurementRun(points, runStart - 1, chainGuideSide, walls)
    ) {
      runStart -= 1;
    }

    while (
      runEnd < points.length - 2 &&
      shouldMergeMeasurementRun(points, runEnd, chainGuideSide, walls)
    ) {
      runEnd += 1;
    }

    const firstLayout = getWallSideMeasurementLayout(
      points[runStart],
      points[runStart + 1],
      chainGuideSide,
      walls
    );
    const lastLayout = getWallSideMeasurementLayout(
      points[runEnd],
      points[runEnd + 1],
      chainGuideSide,
      walls
    );
    const mergedLayout = getMergedMeasurementLayout(firstLayout, lastLayout);

    // The structure guide should be a straight line with the same along-wall
    // endpoints as the wall's blue dotted measurement guide. Project both
    // dotted-line endpoints onto the hovered wall direction and rebuild them
    // on the same side-face line to avoid skew/diagonal brackets.
    const startScalar = dot(
      sub(add(mergedLayout.lineStart, mul(normal, -wallLineOffset)), wall.start),
      direction
    );
    const endScalar = dot(
      sub(add(mergedLayout.lineEnd, mul(normal, -wallLineOffset)), wall.start),
      direction
    );
    const minScalar = Math.min(startScalar, endScalar);
    const maxScalar = Math.max(startScalar, endScalar);

    return {
      startAnchor: add(sideFaceBase, mul(direction, minScalar)),
      endAnchor: add(sideFaceBase, mul(direction, maxScalar)),
    };
  }

  return null;
}

export function getOppositeMeasurementSide(
  side: Exclude<MeasurementSide, "length">
): Exclude<MeasurementSide, "length"> {
  return side === "left" ? "right" : "left";
}

export function getStructureGuideAnchorScalars(wall: Wall, walls: Wall[], normal: Point) {
  const direction = normalize(sub(wall.end, wall.start));
  const wallLineTolerance = WALL_THICKNESS + 3;
  const candidates: number[] = [];

  for (const currentWall of walls.filter(isThickWall)) {
    const currentDirection = normalize(sub(currentWall.end, currentWall.start));

    if (!vectorLength(currentDirection)) continue;
    if (Math.abs(dot(currentDirection, direction)) < 0.999) continue;

    const startDistanceToLine = Math.abs(dot(sub(currentWall.start, wall.start), normal));
    const endDistanceToLine = Math.abs(dot(sub(currentWall.end, wall.start), normal));

    if (startDistanceToLine > wallLineTolerance || endDistanceToLine > wallLineTolerance) {
      continue;
    }

    const endpointPairs: Array<[Point, Point]> = [
      [currentWall.start, currentWall.end],
      [currentWall.end, currentWall.start],
    ];

    for (const [endpoint, neighbor] of endpointPairs) {
      const anchor = getMeasurementGuideAnchor(endpoint, neighbor, normal, walls);
      const scalar = dot(sub(anchor, wall.start), direction);
      candidates.push(scalar);
    }
  }

  // Always include the hovered wall endpoints as a safe fallback.
  candidates.push(dot(sub(wall.start, wall.start), direction));
  candidates.push(dot(sub(wall.end, wall.start), direction));

  return candidates;
}

export function BracketSegment({
  start,
  end,
  normal,
  tick,
}: {
  start: Point;
  end: Point;
  normal: Point;
  tick: number;
}) {
  return (
    <g>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#111827"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={start.x}
        y1={start.y}
        x2={start.x - normal.x * tick}
        y2={start.y - normal.y * tick}
        stroke="#111827"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={end.x}
        y1={end.y}
        x2={end.x - normal.x * tick}
        y2={end.y - normal.y * tick}
        stroke="#111827"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function SelectedWindowContextMenu({
  position,
  onFlip,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  position: Point;
  onFlip: () => void;
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
      width={120}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[112px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected window menu"
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
          aria-label="Flip window handle"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onFlip();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeftRight className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label="Delete selected window"
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

export function WallAttachIndicator({ point }: { point: Point }) {
  return (
    <g pointerEvents="none">
      <circle
        cx={point.x}
        cy={point.y}
        r={15}
        fill="#43b3c8"
        vectorEffect="non-scaling-stroke"
      />

      <line
        x1={point.x - 7.5}
        y1={point.y}
        x2={point.x + 7.5}
        y2={point.y}
        stroke="white"
        strokeWidth={5}
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />

      <line
        x1={point.x}
        y1={point.y - 7.5}
        x2={point.x}
        y2={point.y + 7.5}
        stroke="white"
        strokeWidth={5}
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function RoomInteriorFill({ chains }: { chains: { points: Point[] }[] }) {
  return (
    <g pointerEvents="none">
      {chains.map((chain, index) => {
        if (chain.points.length < 4) return null;

        const firstPoint = chain.points[0];
        const lastPoint = chain.points[chain.points.length - 1];

        if (!samePoint(firstPoint, lastPoint)) return null;

        const polygonPoints = chain.points.slice(0, -1);

        return (
          <polygon
            key={`room-interior-fill-${index}-${polygonPoints.map(pointKey).join("-")}`}
            points={polygonPoints.map(toSvgPoint).join(" ")}
            fill="#fbfbfb"
          />
        );
      })}
    </g>
  );
}
