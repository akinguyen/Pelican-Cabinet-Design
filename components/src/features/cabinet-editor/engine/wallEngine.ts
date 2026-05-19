import { getWallPlacementMode, getWallElevationViewMode } from "../components/elevation/ElevationPlanView";
import { GRID_SIZE } from "../constants/editorConstants";
import { WALL_ATTACH_THRESHOLD, WALL_THICKNESS } from "../constants/wallConstants";
import { add, placementPolarPoint, clamp, cross, distance, dot, formatDecimal, getPreferredNormal, getTextRotation, midpoint, mul, normalize, normalizeDegrees, perp, pixelsToInches, pointKey, roundToQuarter, samePoint, sub, vectorLength } from "./geometry";
import type { ArcMode, ConnectionMap, MeasurementEditState, MeasurementLayout, MeasurementSide, Point, ThickWallCreationMode, Tool, Wall, WallBandGeometry, WallKind, WallSegmentBlackDotGeometry } from "../types/editorTypes";

export function isPeninWall(wall: Wall) { return wall.kind === "penin-wall"; }

export function isIslandWall(wall: Wall) { return wall.kind === "island-wall"; }

export function isDetachedPanelWall(wall: Wall) { return isPeninWall(wall) || isIslandWall(wall); }

export function isThinWall(wall: Wall) { return wall.kind === "thin-wall"; }

export function isThickWall(wall: Wall) { return wall.kind !== "thin-wall"; }

export function isDrawingTool(tool: Tool) { return tool === "draw-wall" || tool === "draw-thin-wall" || tool === "draw-penin-wall" || tool === "draw-island-wall"; }

export function canConvertThinWallSelection(selectedWalls: Wall[], allThinWalls: Wall[]) {
  if (selectedWalls.length === 0) return false;
  if (!selectedWalls.every(isThinWall)) return false;

  const selectedIds = new Set(selectedWalls.map((wall) => wall.id));
  const components = getConnectedWallComponents(allThinWalls);

  for (const component of components) {
    const selectedInComponent = component.filter((wall) => selectedIds.has(wall.id));

    if (selectedInComponent.length === 0) continue;
    if (selectedInComponent.length !== component.length) return false;
  }

  return true;
}

export function getConnectedWallComponents(walls: Wall[]) {
  const remaining = new Map(walls.map((wall) => [wall.id, wall]));
  const pointToWallIds = new Map<string, string[]>();

  for (const wall of walls) {
    for (const point of [wall.start, wall.end]) {
      const key = pointKey(point);
      pointToWallIds.set(key, [...(pointToWallIds.get(key) ?? []), wall.id]);
    }
  }

  const components: Wall[][] = [];

  while (remaining.size > 0) {
    const first = Array.from(remaining.values())[0];
    const queue = [first];
    const component: Wall[] = [];
    remaining.delete(first.id);

    while (queue.length > 0) {
      const wall = queue.shift();
      if (!wall) continue;

      component.push(wall);

      for (const point of [wall.start, wall.end]) {
        for (const neighborId of pointToWallIds.get(pointKey(point)) ?? []) {
          const neighbor = remaining.get(neighborId);

          if (!neighbor) continue;

          remaining.delete(neighborId);
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components;
}

export function convertThinWallsToThickWalls(
  thinWalls: Wall[],
  mode: ThickWallCreationMode
) {
  const convertedWalls: Wall[] = [];
  const thinComponents = getConnectedWallComponents(thinWalls);

  for (const component of thinComponents) {
    const componentConnectionMap = buildConnectionMap(component);
    const hasBranchingJunction = component.some((wall) => {
      return [wall.start, wall.end].some(
        (point) => (componentConnectionMap.get(pointKey(point)) ?? 0) > 2
      );
    });

    // Branching thin-wall systems have T / cross junctions. If we offset every
    // branch independently, their converted centerlines no longer meet at the
    // same node, which creates tiny wall pieces, incorrect labels like 3", and
    // red open-end dots at what should be a real junction. For branched
    // systems, keep the thin guide nodes as the thick-wall centerline graph so
    // every connected endpoint stays exactly shared after conversion.
    if (hasBranchingJunction) {
      for (const wall of component) {
        if (distance(wall.start, wall.end) < 0.001) continue;

        convertedWalls.push({
          id: crypto.randomUUID(),
          start: { ...wall.start },
          end: { ...wall.end },
          kind: "wall",
          sourceThinLength: distance(wall.start, wall.end),
          sourceThinMode: mode,
        });
      }

      continue;
    }

    const thinChains = buildWallChains(component);

    for (const chain of thinChains) {
      if (chain.points.length < 2) continue;

      const centerlinePoints = getThickWallCenterlineFromThinGuide(
        chain.points,
        mode
      );

      for (let index = 0; index < centerlinePoints.length - 1; index++) {
        const start = centerlinePoints[index];
        const end = centerlinePoints[index + 1];

        if (distance(start, end) < 0.001) continue;

        convertedWalls.push({
          id: crypto.randomUUID(),
          start,
          end,
          kind: "wall",
          sourceThinLength: distance(chain.points[index], chain.points[index + 1]),
          sourceThinMode: mode,
        });
      }
    }
  }

  return tuneConvertedWallsToThinGuideLengths(convertedWalls, mode);
}

export function tuneConvertedWallsToThinGuideLengths(
  walls: Wall[],
  mode: ThickWallCreationMode
) {
  const components = getConnectedWallComponents(walls);
  const fittedWalls: Wall[] = [];

  for (const component of components) {
    fittedWalls.push(...fitConvertedComponentToThinGuideLengths(component, mode));
  }

  return fittedWalls;
}

export function fitConvertedComponentToThinGuideLengths(
  component: Wall[],
  mode: ThickWallCreationMode
) {
  const walls = component.map((wall) => ({
    ...wall,
    start: { ...wall.start },
    end: { ...wall.end },
  }));

  if (walls.length === 0) return walls;

  const desiredLengths = new Map<string, number>();

  for (const wall of walls) {
    const centerLength = distance(wall.start, wall.end);
    const sourceLength = wall.sourceThinLength;

    if (!sourceLength || sourceLength <= 0 || centerLength < 0.001) {
      desiredLengths.set(wall.id, centerLength);
      continue;
    }

    const targetSide = getConvertedTargetMeasurementSide(wall, walls, mode);
    const layout = getWallSideMeasurementLayout(
      wall.start,
      wall.end,
      targetSide,
      walls
    );
    const guideLength = distance(layout.lineStart, layout.lineEnd);

    // Keep the original segment direction but change its centerline length by
    // the exact amount needed for the target dotted guide to match the thin
    // guide. For a fixed junction angle, the guide-vs-centerline offset is
    // constant, so this preserves the system shape while correcting the actual
    // measured dotted-line length.
    desiredLengths.set(wall.id, Math.max(4, centerLength + (sourceLength - guideLength)));
  }

  return rebuildConvertedComponentWithDesiredLengths(walls, desiredLengths);
}

export function rebuildConvertedComponentWithDesiredLengths(
  walls: Wall[],
  desiredLengths: Map<string, number>
) {
  if (walls.length === 0) return walls;

  const pointToWalls = new Map<string, Wall[]>();

  for (const wall of walls) {
    pointToWalls.set(pointKey(wall.start), [
      ...(pointToWalls.get(pointKey(wall.start)) ?? []),
      wall,
    ]);
    pointToWalls.set(pointKey(wall.end), [
      ...(pointToWalls.get(pointKey(wall.end)) ?? []),
      wall,
    ]);
  }

  const rootPoint = chooseConvertedRebuildRoot(walls, pointToWalls);
  const rebuiltPoints = new Map<string, Point>();
  const visitedWalls = new Set<string>();
  const queue: Point[] = [rootPoint];

  rebuiltPoints.set(pointKey(rootPoint), { ...rootPoint });

  while (queue.length) {
    const currentOriginalPoint = queue.shift()!;
    const currentKey = pointKey(currentOriginalPoint);
    const currentRebuiltPoint = rebuiltPoints.get(currentKey);

    if (!currentRebuiltPoint) continue;

    for (const wall of pointToWalls.get(currentKey) ?? []) {
      if (visitedWalls.has(wall.id)) continue;

      const currentIsStart = samePoint(wall.start, currentOriginalPoint);
      const neighborOriginalPoint = currentIsStart ? wall.end : wall.start;
      const neighborKey = pointKey(neighborOriginalPoint);
      const originalDirection = normalize(
        sub(neighborOriginalPoint, currentOriginalPoint)
      );

      if (!vectorLength(originalDirection)) continue;

      const desiredLength =
        desiredLengths.get(wall.id) ?? distance(wall.start, wall.end);
      const rebuiltNeighborPoint = add(
        currentRebuiltPoint,
        mul(originalDirection, desiredLength)
      );

      visitedWalls.add(wall.id);

      if (!rebuiltPoints.has(neighborKey)) {
        rebuiltPoints.set(neighborKey, rebuiltNeighborPoint);
        queue.push(neighborOriginalPoint);
      }
    }
  }

  return walls.map((wall) => ({
    ...wall,
    start: rebuiltPoints.get(pointKey(wall.start)) ?? wall.start,
    end: rebuiltPoints.get(pointKey(wall.end)) ?? wall.end,
  }));
}

export function chooseConvertedRebuildRoot(
  walls: Wall[],
  pointToWalls: Map<string, Wall[]>
) {
  const allPoints = uniquePoints(getWallEndpoints(walls));
  const openPoints = allPoints.filter(
    (point) => (pointToWalls.get(pointKey(point)) ?? []).length <= 1
  );

  const candidates = openPoints.length ? openPoints : allPoints;
  let bestPoint = candidates[0];

  for (const point of candidates) {
    if (point.y < bestPoint.y - 0.001) {
      bestPoint = point;
      continue;
    }

    if (Math.abs(point.y - bestPoint.y) <= 0.001 && point.x < bestPoint.x) {
      bestPoint = point;
    }
  }

  return bestPoint;
}

export function getConvertedTargetMeasurementSide(
  wall: Wall,
  walls: Wall[],
  mode: ThickWallCreationMode
): Exclude<MeasurementSide, "length"> {
  const exteriorSide = getExteriorMeasurementSide(wall.start, wall.end, walls);

  // Preserve the current button behavior:
  // Create exterior wall -> match the generated interior guide to the thin wall.
  // Create interior wall -> match the generated exterior guide to the thin wall.
  return mode === "exterior"
    ? exteriorSide === "left"
      ? "right"
      : "left"
    : exteriorSide;
}

export function moveSharedPoint(walls: Wall[], from: Point, to: Point) {
  return walls.map((wall) => ({
    ...wall,
    start: samePoint(wall.start, from) ? { ...to } : wall.start,
    end: samePoint(wall.end, from) ? { ...to } : wall.end,
  }));
}

export function getThickWallCenterlineFromThinGuide(
  thinGuidePoints: Point[],
  mode: ThickWallCreationMode
) {
  // Button behavior is intentionally opposite of the side that should match:
  // - Create exterior wall: preserve thin-wall values on the generated INTERIOR.
  // - Create interior wall: preserve thin-wall values on the generated EXTERIOR.
  const offset = mode === "exterior" ? WALL_THICKNESS / 2 : -WALL_THICKNESS / 2;

  return buildOffsetSide(thinGuidePoints, offset);
}

export function getWallSideMeasurementLayout(
  segmentStart: Point,
  segmentEnd: Point,
  side: Exclude<MeasurementSide, "length">,
  walls: Wall[],
  labelOffset = 18
): MeasurementLayout {
  const direction = normalize(sub(segmentEnd, segmentStart));
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);
  const lineOffsetFromWallFace = 14;

  const startAnchor = getMeasurementGuideAnchor(
    segmentStart,
    segmentEnd,
    normal,
    walls
  );
  const endAnchor = getMeasurementGuideAnchor(
    segmentEnd,
    segmentStart,
    normal,
    walls
  );

  const lineStart = add(startAnchor, mul(normal, lineOffsetFromWallFace));
  const lineEnd = add(endAnchor, mul(normal, lineOffsetFromWallFace));
  const mid = midpoint(lineStart, lineEnd);

  return {
    lineStart,
    lineEnd,
    labelPoint: add(mid, mul(normal, labelOffset)),
    rotation: getTextRotation(segmentStart, segmentEnd),
  };
}

export function getMeasurementGuideAnchor(
  endpoint: Point,
  segmentNeighbor: Point,
  sideNormal: Point,
  walls: Wall[]
) {
  const segmentDirection = normalize(sub(segmentNeighbor, endpoint));
  const wallFacePoint = add(endpoint, mul(sideNormal, WALL_THICKNESS / 2));

  if (!vectorLength(segmentDirection)) return wallFacePoint;

  const connectedDirections = getConnectedDirectionsAtPoint(endpoint, walls);

  if (connectedDirections.length <= 1) return wallFacePoint;

  const matchingIndex = findMatchingDirectionIndex(
    connectedDirections,
    segmentDirection
  );

  if (matchingIndex < 0) return wallFacePoint;

  const leftNormal = normalize(perp(segmentDirection));
  const isLeftSide = dot(sideNormal, leftNormal) >= 0;
  const currentDirection = connectedDirections[matchingIndex];

  if (isLeftSide) {
    const nextDirection =
      connectedDirections[(matchingIndex + 1) % connectedDirections.length];
    return getMiterAnchorForDirectionPair(
      endpoint,
      currentDirection,
      nextDirection,
      "first-left"
    );
  }

  const previousDirection =
    connectedDirections[
      (matchingIndex - 1 + connectedDirections.length) %
        connectedDirections.length
    ];

  return getMiterAnchorForDirectionPair(
    endpoint,
    previousDirection,
    currentDirection,
    "second-right"
  );
}

export function getConnectedDirectionsAtPoint(point: Point, walls: Wall[]) {
  const directions = walls
    .filter((wall) => samePoint(wall.start, point) || samePoint(wall.end, point))
    .map((wall) => {
      const otherPoint = samePoint(wall.start, point) ? wall.end : wall.start;
      return normalize(sub(otherPoint, point));
    })
    .filter((direction) => vectorLength(direction));

  const uniqueDirections: Point[] = [];

  for (const direction of directions) {
    if (
      uniqueDirections.some(
        (existingDirection) => dot(existingDirection, direction) > 0.999
      )
    ) {
      continue;
    }

    uniqueDirections.push(direction);
  }

  return uniqueDirections.sort(
    (a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x)
  );
}

export function findMatchingDirectionIndex(directions: Point[], target: Point) {
  let bestIndex = -1;
  let bestDot = 0.999;

  directions.forEach((direction, index) => {
    const match = dot(direction, target);

    if (match > bestDot) {
      bestDot = match;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function getMiterAnchorForDirectionPair(
  point: Point,
  firstDirection: Point,
  secondDirection: Point,
  whichSide: "first-left" | "second-right"
) {
  const halfThickness = WALL_THICKNESS / 2;
  const firstLeftNormal = normalize(perp(firstDirection));
  const secondRightNormal = mul(normalize(perp(secondDirection)), -1);
  const firstOffsetPoint = add(point, mul(firstLeftNormal, halfThickness));
  const secondOffsetPoint = add(point, mul(secondRightNormal, halfThickness));
  const intersection = lineIntersection(
    firstOffsetPoint,
    firstDirection,
    secondOffsetPoint,
    secondDirection
  );

  const fallback =
    whichSide === "first-left" ? firstOffsetPoint : secondOffsetPoint;

  if (!intersection) return fallback;

  const distanceFromPoint = distance(point, intersection);

  // Avoid extreme spikes at very shallow angles. A bevel-like fallback gives a
  // stable black-dot anchor that follows the visible wall edge.
  if (distanceFromPoint > WALL_THICKNESS * 2.25) {
    return fallback;
  }

  return intersection;
}

export function getRayExitDistanceFromPolygon(
  rayStart: Point,
  rayDirection: Point,
  polygon: Point[]
) {
  if (polygon.length < 3) return null;

  const intersections: number[] = [];

  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const edge = sub(b, a);
    const denominator = cross(rayDirection, edge);

    if (Math.abs(denominator) < 0.0001) continue;

    const diff = sub(a, rayStart);
    const rayT = cross(diff, edge) / denominator;
    const segmentT = cross(diff, rayDirection) / denominator;

    if (rayT >= -0.001 && segmentT >= -0.001 && segmentT <= 1.001) {
      intersections.push(Math.max(0, rayT));
    }
  }

  if (isPointInPolygon(rayStart, polygon)) {
    return intersections.length ? Math.max(...intersections) : null;
  }

  const positiveIntersections = intersections
    .filter((value) => value > 0.25)
    .sort((a, b) => a - b);

  if (positiveIntersections.length < 2) return null;

  return positiveIntersections[1];
}

export function isPointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const crossesY = current.y > point.y !== previous.y > point.y;

    if (!crossesY) continue;

    const xIntersection =
      ((previous.x - current.x) * (point.y - current.y)) /
        (previous.y - current.y + 0.0000001) +
      current.x;

    if (point.x < xIntersection) {
      inside = !inside;
    }
  }

  return inside;
}

export function getConvertedWallDisplayLength(
  _segmentStart: Point,
  _segmentEnd: Point,
  _side: MeasurementSide,
  _walls: Wall[]
) {
  // Always show the real length of the blue dotted measurement guide.
  return null;
}

export function getConvertedMeasurementRunDisplayLength(
  _points: Point[],
  _startIndex: number,
  _endIndex: number,
  _side: Exclude<MeasurementSide, "length">,
  _walls: Wall[]
) {
  // Always use the real blue dotted guide length.
  return null;
}

export function getMergedMeasurementLayout(
  firstLayout: MeasurementLayout,
  lastLayout: MeasurementLayout
): MeasurementLayout {
  const lineStart = firstLayout.lineStart;
  const lineEnd = lastLayout.lineEnd;
  const mergedMidpoint = midpoint(lineStart, lineEnd);
  const firstMidpoint = midpoint(firstLayout.lineStart, firstLayout.lineEnd);
  const labelOffsetVector = sub(firstLayout.labelPoint, firstMidpoint);

  return {
    lineStart,
    lineEnd,
    labelPoint: add(mergedMidpoint, labelOffsetVector),
    rotation: firstLayout.rotation,
  };
}

export function shouldMergeMeasurementRun(
  points: Point[],
  index: number,
  side: Exclude<MeasurementSide, "length">,
  walls: Wall[]
) {
  if (index >= points.length - 2) return false;

  const currentStart = points[index];
  const joint = points[index + 1];
  const currentEnd = points[index + 1];
  const nextEnd = points[index + 2];

  // Re-measure the wall system as a whole: a multi-wall junction creates black
  // measurement anchors, so guides must stop at the closest black dot on each
  // side of that junction instead of merging past it to a farther endpoint.
  // A simple collinear split without an attached wall can still merge.
  if (isMultiWallMeasurementJunction(joint, walls)) return false;

  const currentDirection = normalize(sub(currentEnd, currentStart));
  const nextDirection = normalize(sub(nextEnd, joint));

  if (!vectorLength(currentDirection) || !vectorLength(nextDirection)) {
    return false;
  }

  if (dot(currentDirection, nextDirection) < 0.999) return false;

  const currentExteriorSide = getExteriorMeasurementSide(
    currentStart,
    currentEnd,
    walls
  );
  const nextExteriorSide = getExteriorMeasurementSide(joint, nextEnd, walls);

  return side === currentExteriorSide && side === nextExteriorSide;
}

export function isMultiWallMeasurementJunction(point: Point, walls: Wall[]) {
  const connectedWalls = walls.filter(
    (wall) => samePoint(wall.start, point) || samePoint(wall.end, point)
  );

  if (connectedWalls.length <= 2) return false;

  const uniqueDirections: Point[] = [];

  for (const wall of connectedWalls) {
    const otherPoint = samePoint(wall.start, point) ? wall.end : wall.start;
    const direction = normalize(sub(otherPoint, point));

    if (!vectorLength(direction)) continue;

    if (
      uniqueDirections.some(
        (existingDirection) => Math.abs(dot(existingDirection, direction)) > 0.999
      )
    ) {
      continue;
    }

    uniqueDirections.push(direction);
  }

  return uniqueDirections.length >= 2;
}

export function getExteriorMeasurementSide(
  segmentStart: Point,
  segmentEnd: Point,
  walls: Wall[]
): Exclude<MeasurementSide, "length"> {
  const wallPoints = getWallEndpoints(walls);

  if (wallPoints.length === 0) return "left";

  const centroid = wallPoints.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 }
  );

  centroid.x /= wallPoints.length;
  centroid.y /= wallPoints.length;

  const segmentMidpoint = midpoint(segmentStart, segmentEnd);
  const direction = normalize(sub(segmentEnd, segmentStart));
  const leftNormal = perp(direction);
  const outwardVector = sub(segmentMidpoint, centroid);

  return dot(leftNormal, outwardVector) >= 0 ? "left" : "right";
}

export function resizeWallFromMeasurement(
  walls: Wall[],
  edit: MeasurementEditState,
  targetEdgeLength: number
) {
  const wall = walls.find((currentWall) => currentWall.id === edit.wallId);

  if (!wall) return walls;

  const delta = targetEdgeLength - edit.currentEdgeLength;

  if (Math.abs(delta) < 0.001) return walls;

  const direction = normalize(sub(edit.segmentEnd, edit.segmentStart));

  if (!vectorLength(direction)) return walls;

  const connectionMap = buildConnectionMap(walls);
  const startConnected = isConnected(edit.segmentStart, connectionMap);
  const endConnected = isConnected(edit.segmentEnd, connectionMap);

  const moveStart = !startConnected && endConnected;
  const oldPoint = moveStart ? edit.segmentStart : edit.segmentEnd;
  const newPoint = moveStart
    ? add(edit.segmentStart, mul(direction, -delta))
    : add(edit.segmentEnd, mul(direction, delta));

  return walls.map((currentWall) => {
    const isEditedWall = currentWall.id === wall.id;

    return {
      ...currentWall,
      start: samePoint(currentWall.start, oldPoint) ? newPoint : currentWall.start,
      end: samePoint(currentWall.end, oldPoint) ? newPoint : currentWall.end,
      sourceThinLength:
        isEditedWall && currentWall.sourceThinLength
          ? targetEdgeLength
          : currentWall.sourceThinLength,
    };
  });
}

export function formatFeetInchesForInput(pixelLength: number) {
  const totalInches = pixelsToInches(pixelLength);
  const feet = Math.floor(totalInches / 12);
  const inches = roundToQuarter(totalInches - feet * 12);

  return `${feet} ${formatDecimal(inches)}`;
}

export function formatFeetInchesParts(pixelLength: number) {
  const totalInches = pixelsToInches(pixelLength);
  const feet = Math.floor(totalInches / 12);
  const inches = roundToQuarter(totalInches - feet * 12);

  return {
    feet: `${feet}`,
    inches: formatDecimal(inches),
  };
}

export function parseFeetInchesToPixels(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[″”]/g, '"')
    .replace(/[′’]/g, "'")
    .replace(/feet|foot|ft\.?/g, "'")
    .replace(/inches|inch|in\.?/g, '"')
    .replace(/-/g, " ");

  let feet = 0;
  let inches = 0;

  const feetMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*'/);
  const inchMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*"/);

  if (feetMatch || inchMatch) {
    feet = feetMatch ? Number(feetMatch[1]) : 0;
    inches = inchMatch ? Number(inchMatch[1]) : 0;
  } else {
    const parts = normalized.match(/-?\d+(?:\.\d+)?/g) ?? [];

    if (parts.length >= 2) {
      feet = Number(parts[0]);
      inches = Number(parts[1]);
    } else if (parts.length === 1) {
      feet = Number(parts[0]);
    } else {
      return null;
    }
  }

  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;

  const totalInches = feet * 12 + inches;

  if (totalInches <= 0) return null;

  return (totalInches / 12) * GRID_SIZE;
}

export function areWallsEqual(a: Wall[], b: Wall[]) {
  if (a.length !== b.length) return false;

  return a.every((wall, index) => {
    const other = b[index];

    return (
      other &&
      wall.id === other.id &&
      (wall.kind ?? "wall") === (other.kind ?? "wall") &&
      getWallElevationViewMode(wall) === getWallElevationViewMode(other) &&
      (wall.needPlacement ?? true) === (other.needPlacement ?? true) &&
      getWallPlacementMode(wall) === getWallPlacementMode(other) &&
      samePoint(wall.start, other.start) &&
      samePoint(wall.end, other.end)
    );
  });
}

export function buildWallChains(walls: Wall[]) {
  if (walls.length === 0) return [];

  const pointToWalls = new Map<string, Wall[]>();

  for (const wall of walls) {
    for (const point of [wall.start, wall.end]) {
      const key = pointKey(point);
      pointToWalls.set(key, [...(pointToWalls.get(key) ?? []), wall]);
    }
  }

  const usedWallIds = new Set<string>();
  const chains: { points: Point[] }[] = [];

  const getOtherPoint = (wall: Wall, point: Point) => {
    return samePoint(wall.start, point) ? wall.end : wall.start;
  };

  const isPassThroughPoint = (point: Point) => {
    return (pointToWalls.get(pointKey(point)) ?? []).length === 2;
  };

  const getContinuationWall = (
    previousPoint: Point,
    currentPoint: Point,
    currentWall: Wall
  ) => {
    const connectedWalls = pointToWalls.get(pointKey(currentPoint)) ?? [];
    const unusedWalls = connectedWalls.filter(
      (wall) => wall.id !== currentWall.id && !usedWallIds.has(wall.id)
    );

    if (unusedWalls.length === 0) return undefined;

    if (connectedWalls.length === 2) return unusedWalls[0];

    const incomingDirection = normalize(sub(currentPoint, previousPoint));
    let bestWall: Wall | undefined;
    let bestDot = 0.999;

    for (const wall of unusedWalls) {
      const outgoingDirection = normalize(sub(getOtherPoint(wall, currentPoint), currentPoint));
      const continuationDot = dot(incomingDirection, outgoingDirection);

      if (continuationDot > bestDot) {
        bestDot = continuationDot;
        bestWall = wall;
      }
    }

    return bestWall;
  };

  const walkChain = (startPoint: Point, firstWall: Wall) => {
    const points: Point[] = [startPoint];
    let currentPoint = startPoint;
    let currentWall: Wall | undefined = firstWall;

    while (currentWall && !usedWallIds.has(currentWall.id)) {
      usedWallIds.add(currentWall.id);

      const previousPoint = currentPoint;
      const nextPoint = getOtherPoint(currentWall, currentPoint);
      points.push(nextPoint);
      currentPoint = nextPoint;

      currentWall = getContinuationWall(previousPoint, currentPoint, currentWall);
    }

    return points;
  };

  const junctionOrOpenPoints = uniquePoints(
    getWallEndpoints(walls).filter((point) => !isPassThroughPoint(point))
  ).sort((a, b) => {
    const degreeA = pointToWalls.get(pointKey(a))?.length ?? 0;
    const degreeB = pointToWalls.get(pointKey(b))?.length ?? 0;

    return degreeA - degreeB;
  });

  for (const startPoint of junctionOrOpenPoints) {
    for (const wall of pointToWalls.get(pointKey(startPoint)) ?? []) {
      if (usedWallIds.has(wall.id)) continue;
      chains.push({ points: walkChain(startPoint, wall) });
    }
  }

  for (const wall of walls) {
    if (usedWallIds.has(wall.id)) continue;
    chains.push({ points: walkChain(wall.start, wall) });
  }

  return chains.filter((chain) => chain.points.length >= 2);
}

export function getWallSegmentBlackDotGeometry(
  segmentStart: Point,
  segmentEnd: Point,
  walls: Wall[]
): WallSegmentBlackDotGeometry {
  const direction = normalize(sub(segmentEnd, segmentStart));

  if (!vectorLength(direction)) {
    const fallback = {
      segmentStart,
      segmentEnd,
      startLeft: segmentStart,
      endLeft: segmentEnd,
      endRight: segmentEnd,
      startRight: segmentStart,
      polygon: [segmentStart, segmentEnd, segmentEnd, segmentStart],
      leftEdge: { a: segmentStart, b: segmentEnd },
      rightEdge: { a: segmentStart, b: segmentEnd },
    };

    return fallback;
  }

  // Build the wall body from the four visible black-dot anchors on the same
  // physical side of this segment. The old version asked for the end anchors
  // using the reversed segment direction with the same left/right label. That
  // flips the side at the end of the wall and can connect top-left to
  // bottom-right, creating a twisted bow-tie polygon. Keep the side normal in
  // the original segment direction for both endpoints instead.
  const leftNormal = normalize(perp(direction));
  const rightNormal = mul(leftNormal, -1);
  const startLeft = getMeasurementGuideAnchor(
    segmentStart,
    segmentEnd,
    leftNormal,
    walls
  );
  const endLeft = getMeasurementGuideAnchor(
    segmentEnd,
    segmentStart,
    leftNormal,
    walls
  );
  const endRight = getMeasurementGuideAnchor(
    segmentEnd,
    segmentStart,
    rightNormal,
    walls
  );
  const startRight = getMeasurementGuideAnchor(
    segmentStart,
    segmentEnd,
    rightNormal,
    walls
  );

  return {
    segmentStart,
    segmentEnd,
    startLeft,
    endLeft,
    endRight,
    startRight,
    polygon: [startLeft, endLeft, endRight, startRight],
    leftEdge: { a: startLeft, b: endLeft },
    rightEdge: { a: startRight, b: endRight },
  };
}

export function buildBlackDotWallBand(
  points: Point[],
  walls: Wall[]
): WallBandGeometry {
  const segmentGeometries = points.slice(0, -1).map((point, index) =>
    getWallSegmentBlackDotGeometry(point, points[index + 1], walls)
  );

  const leftEdges = segmentGeometries.map((segment) => segment.leftEdge);
  const rightEdges = segmentGeometries.map((segment) => segment.rightEdge);
  const left = segmentGeometries.length
    ? [
        ...segmentGeometries.map((segment) => segment.startLeft),
        segmentGeometries[segmentGeometries.length - 1].endLeft,
      ]
    : [];
  const right = segmentGeometries.length
    ? [
        ...segmentGeometries.map((segment) => segment.startRight),
        segmentGeometries[segmentGeometries.length - 1].endRight,
      ]
    : [];
  const polygon = segmentGeometries.flatMap((segment) => segment.polygon);

  return {
    left,
    right,
    polygon,
    leftEdges,
    rightEdges,
    segmentGeometries,
  };
}

export function buildWallBand(points: Point[], thickness: number): WallBandGeometry {
  const half = thickness / 2;

  const left = buildOffsetSide(points, half);
  const right = buildOffsetSide(points, -half);

  const polygon = [...left, ...[...right].reverse()];

  const leftEdges = left.slice(0, -1).map((point, index) => ({
    a: point,
    b: left[index + 1],
  }));

  const rightEdges = right.slice(0, -1).map((point, index) => ({
    a: point,
    b: right[index + 1],
  }));

  return {
    left,
    right,
    polygon,
    leftEdges,
    rightEdges,
    segmentGeometries: [],
  };
}

export function buildOffsetSide(points: Point[], offset: number) {
  const result: Point[] = [];
  const directions = points
    .slice(0, -1)
    .map((point, index) => normalize(sub(points[index + 1], point)));

  for (let index = 0; index < points.length; index++) {
    if (index === 0) {
      const normal = perp(directions[0]);
      result.push(add(points[index], mul(normal, offset)));
      continue;
    }

    if (index === points.length - 1) {
      const normal = perp(directions[directions.length - 1]);
      result.push(add(points[index], mul(normal, offset)));
      continue;
    }

    const previousDirection = directions[index - 1];
    const nextDirection = directions[index];
    const previousNormal = perp(previousDirection);
    const nextNormal = perp(nextDirection);

    const previousOffsetPoint = add(
      points[index],
      mul(previousNormal, offset)
    );

    const nextOffsetPoint = add(points[index], mul(nextNormal, offset));

    const intersection = lineIntersection(
      previousOffsetPoint,
      previousDirection,
      nextOffsetPoint,
      nextDirection
    );

    if (intersection) {
      result.push(intersection);
    } else {
      const averageNormal = normalize(add(previousNormal, nextNormal));
      result.push(add(points[index], mul(averageNormal, offset)));
    }
  }

  return result;
}

export function lineIntersection(
  p1: Point,
  d1: Point,
  p2: Point,
  d2: Point
): Point | null {
  const crossValue = cross(d1, d2);

  if (Math.abs(crossValue) < 0.0001) return null;

  const diff = sub(p2, p1);
  const t = cross(diff, d2) / crossValue;

  return add(p1, mul(d1, t));
}

export function getEdgeMeasurementLayout(
  start: Point,
  end: Point,
  side: "left" | "right",
  labelOffset = 18,
  startInset = 0,
  endInset = 0
): MeasurementLayout {
  const direction = sub(end, start);
  const directionUnit = normalize(direction);
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);

  const lineOffset = 14;
  const lineStart = {
    x: start.x + normal.x * lineOffset + directionUnit.x * startInset,
    y: start.y + normal.y * lineOffset + directionUnit.y * startInset,
  };

  const lineEnd = {
    x: end.x + normal.x * lineOffset - directionUnit.x * endInset,
    y: end.y + normal.y * lineOffset - directionUnit.y * endInset,
  };

  const mid = midpoint(lineStart, lineEnd);

  const labelPoint = {
    x: mid.x + normal.x * labelOffset,
    y: mid.y + normal.y * labelOffset,
  };

  return {
    lineStart,
    lineEnd,
    labelPoint,
    rotation: getTextRotation(start, end),
  };
}

export function getThinWallMeasurementLayout(start: Point, end: Point): MeasurementLayout {
  const normal = getPreferredNormal(start, end);
  const labelDistance = 16;

  const mid = midpoint(start, end);

  return {
    lineStart: start,
    lineEnd: end,
    labelPoint: {
      x: mid.x + normal.x * labelDistance,
      y: mid.y + normal.y * labelDistance,
    },
    rotation: getTextRotation(start, end),
  };
}

export function getMeasurementLayout(
  start: Point,
  end: Point,
  side: "exterior" | "interior"
): MeasurementLayout {
  const exteriorNormal = getPreferredNormal(start, end);
  const normal =
    side === "exterior"
      ? exteriorNormal
      : { x: -exteriorNormal.x, y: -exteriorNormal.y };

  const lineOffset = 14;
  const labelOffset = 18;

  const lineStart = {
    x: start.x + normal.x * lineOffset,
    y: start.y + normal.y * lineOffset,
  };

  const lineEnd = {
    x: end.x + normal.x * lineOffset,
    y: end.y + normal.y * lineOffset,
  };

  const mid = midpoint(lineStart, lineEnd);

  const labelPoint = {
    x: mid.x + normal.x * labelOffset,
    y: mid.y + normal.y * labelOffset,
  };

  return {
    lineStart,
    lineEnd,
    labelPoint,
    rotation: getTextRotation(start, end),
  };
}

export function getAngleGuideLayout(start: Point, end: Point): {
  mode: ArcMode;
  labels: { text: string; point: Point }[];
} {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const radius = distance(start, end);

  if (radius <= 4) return { mode: "full", labels: [] };

  if (Math.abs(dy) < 0.01) {
    return {
      mode: "full",
      labels: [
        {
          text: "180°",
          point: { x: start.x, y: start.y - Math.max(72, radius * 0.6) },
        },
        {
          text: "180°",
          point: { x: start.x, y: start.y + Math.max(72, radius * 0.6) },
        },
      ],
    };
  }

  const mode: ArcMode = dy < 0 ? "upper" : "lower";
  const wallAngle = normalizeDegrees((Math.atan2(-dy, dx) * 180) / Math.PI);
  const acute = Math.round(
    (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI
  );
  const obtuse = 180 - acute;
  const labelRadius = Math.max(72, radius * 0.56);

  let acuteLabelAngle = 0;
  let obtuseLabelAngle = 0;

  if (mode === "upper") {
    if (dx >= 0) {
      acuteLabelAngle = wallAngle / 2;
      obtuseLabelAngle = (wallAngle + 180) / 2;
    } else {
      acuteLabelAngle = (wallAngle + 180) / 2;
      obtuseLabelAngle = wallAngle / 2;
    }
  } else {
    if (dx >= 0) {
      acuteLabelAngle = (wallAngle + 360) / 2;
      obtuseLabelAngle = (180 + wallAngle) / 2;
    } else {
      acuteLabelAngle = (180 + wallAngle) / 2;
      obtuseLabelAngle = (wallAngle + 360) / 2;
    }
  }

  return {
    mode,
    labels: [
      {
        text: `${obtuse}°`,
        point: placementPolarPoint(start, labelRadius, obtuseLabelAngle),
      },
      {
        text: `${acute}°`,
        point: placementPolarPoint(start, labelRadius, acuteLabelAngle),
      },
    ],
  };
}

export function describeHalfArc(center: Point, radius: number, mode: "upper" | "lower") {
  const left = { x: center.x - radius, y: center.y };
  const right = { x: center.x + radius, y: center.y };
  const sweepFlag = mode === "upper" ? 1 : 0;

  return `M ${left.x} ${left.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${right.x} ${right.y}`;
}

export function normalizeWallJunctions(walls: Wall[], kind: WallKind) {
  let nextWalls = [...walls];
  let didChange = true;

  while (didChange) {
    didChange = false;

    const snappedWalls = snapEndpointsToNearbyInteriorSegments(nextWalls, kind);

    if (!areWallsEqualLoose(nextWalls, snappedWalls)) {
      nextWalls = snappedWalls;
      didChange = true;
      continue;
    }

    const kindWalls = nextWalls.filter((wall) => (wall.kind ?? "wall") === kind);
    const endpoints = uniquePoints(
      getWallEndpoints(kindWalls)
    );

    for (const endpoint of endpoints) {
      const splitWalls = splitWallsAtInteriorPoint(nextWalls, endpoint, kind);

      if (splitWalls.length !== nextWalls.length) {
        nextWalls = splitWalls;
        didChange = true;
        break;
      }
    }
  }

  return nextWalls;
}

export function snapEndpointsToNearbyInteriorSegments(walls: Wall[], kind: WallKind) {
  const snapThreshold = WALL_THICKNESS * 1.1;
  const kindWalls = walls.filter((wall) => (wall.kind ?? "wall") === kind);

  for (const sourceWall of kindWalls) {
    for (const sourcePoint of [sourceWall.start, sourceWall.end]) {
      let bestSnap: Point | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const targetWall of kindWalls) {
        if (targetWall.id === sourceWall.id) continue;
        if (samePoint(sourcePoint, targetWall.start) || samePoint(sourcePoint, targetWall.end)) continue;

        const projectedPoint = closestPointOnSegment(
          sourcePoint,
          targetWall.start,
          targetWall.end
        );

        if (!pointIsInteriorToSegment(projectedPoint, targetWall.start, targetWall.end)) continue;

        const snapDistance = distance(sourcePoint, projectedPoint);

        if (snapDistance < bestDistance && snapDistance <= snapThreshold) {
          bestDistance = snapDistance;
          bestSnap = projectedPoint;
        }
      }

      if (!bestSnap) continue;

      return walls.map((wall) => {
        if ((wall.kind ?? "wall") !== kind) return wall;

        return {
          ...wall,
          start: samePoint(wall.start, sourcePoint) ? { ...bestSnap } : wall.start,
          end: samePoint(wall.end, sourcePoint) ? { ...bestSnap } : wall.end,
        };
      });
    }
  }

  return walls;
}

export function pointIsInteriorToSegment(point: Point, segmentStart: Point, segmentEnd: Point) {
  const totalLength = distance(segmentStart, segmentEnd);
  const startLength = distance(segmentStart, point);
  const endLength = distance(point, segmentEnd);

  return startLength > 1 && endLength > 1 && startLength < totalLength && endLength < totalLength;
}

export function areWallsEqualLoose(a: Wall[], b: Wall[]) {
  if (a.length !== b.length) return false;

  return a.every((wall, index) => {
    const other = b[index];

    return (
      other &&
      wall.id === other.id &&
      (wall.kind ?? "wall") === (other.kind ?? "wall") &&
      samePoint(wall.start, other.start) &&
      samePoint(wall.end, other.end)
    );
  });
}

export function getMultiConnectedEndpoints(walls: Wall[], connectionMap: ConnectionMap) {
  const points: Point[] = [];

  for (const wall of walls) {
    if ((connectionMap.get(pointKey(wall.start)) ?? 0) > 2) points.push(wall.start);
    if ((connectionMap.get(pointKey(wall.end)) ?? 0) > 2) points.push(wall.end);
  }

  return uniquePoints(points);
}

export function getConnectedWallDirectionsAtPoint(point: Point, walls: Wall[]) {
  const directions: Point[] = [];

  for (const wall of walls) {
    let direction: Point | null = null;

    if (samePoint(point, wall.start)) {
      direction = normalize(sub(wall.end, wall.start));
    } else if (samePoint(point, wall.end)) {
      direction = normalize(sub(wall.start, wall.end));
    }

    if (!direction || !vectorLength(direction)) continue;

    const isDuplicate = directions.some((existingDirection) => {
      return dot(existingDirection, direction) > 0.999;
    });

    if (!isDuplicate) directions.push(direction);
  }

  return directions;
}

export function buildConnectionMap(walls: Wall[]) {
  const map = new Map<string, number>();

  for (const wall of walls) {
    map.set(pointKey(wall.start), (map.get(pointKey(wall.start)) ?? 0) + 1);
    map.set(pointKey(wall.end), (map.get(pointKey(wall.end)) ?? 0) + 1);
  }

  return map;
}

export function getOpenEndpoints(walls: Wall[], connectionMap: ConnectionMap) {
  const points: Point[] = [];

  for (const wall of walls) {
    if (
      !isConnected(wall.start, connectionMap) &&
      !touchesAnotherWallInterior(wall.start, wall, walls)
    ) {
      points.push(wall.start);
    }

    if (
      !isConnected(wall.end, connectionMap) &&
      !touchesAnotherWallInterior(wall.end, wall, walls)
    ) {
      points.push(wall.end);
    }
  }

  return uniquePoints(points);
}

export function touchesAnotherWallInterior(point: Point, sourceWall: Wall, walls: Wall[]) {
  const tolerance = 1.25;

  return walls.some((wall) => {
    if (wall.id === sourceWall.id) return false;
    if ((wall.kind ?? "wall") !== (sourceWall.kind ?? "wall")) return false;
    if (samePoint(point, wall.start) || samePoint(point, wall.end)) return false;

    const projectedPoint = closestPointOnSegment(point, wall.start, wall.end);

    if (!pointIsInteriorToSegment(projectedPoint, wall.start, wall.end)) return false;

    return distance(point, projectedPoint) <= tolerance;
  });
}

export function getConnectedEndpoints(walls: Wall[], connectionMap: ConnectionMap) {
  const points: Point[] = [];

  for (const wall of walls) {
    if (isConnected(wall.start, connectionMap)) points.push(wall.start);
    if (isConnected(wall.end, connectionMap)) points.push(wall.end);
  }

  return uniquePoints(points);
}

export function getWallEndpoints(walls: Wall[]): Point[] {
  return walls.reduce<Point[]>((points, wall) => {
    points.push(wall.start, wall.end);
    return points;
  }, []);
}

export function uniquePoints(points: Point[]) {
  const seen = new Set<string>();
  const unique: Point[] = [];

  for (const point of points) {
    const key = pointKey(point);

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(point);
  }

  return unique;
}

export function isConnected(point: Point, connectionMap: ConnectionMap) {
  return (connectionMap.get(pointKey(point)) ?? 0) > 1;
}

export function splitConnectedWallsAndAddWall(walls: Wall[], newWall: Wall): Wall[] {
  let nextWalls = walls;

  const wallKind: WallKind = newWall.kind ?? "wall";
  const splitKinds: WallKind[] = wallKind === "penin-wall" || wallKind === "island-wall" ? [] : [wallKind];

  for (const kind of splitKinds) {
    nextWalls = splitWallsAtInteriorPoint(nextWalls, newWall.start, kind);
    nextWalls = splitWallsAtInteriorPoint(nextWalls, newWall.end, kind);
  }

  return [...nextWalls, newWall];
}

export function splitWallsAtInteriorPoint(walls: Wall[], point: Point, kind: WallKind): Wall[] {
  const result: Wall[] = [];

  for (const wall of walls) {
    if (wall.kind !== kind || !pointIsInsideWallSegment(point, wall)) {
      result.push(wall);
      continue;
    }

    result.push({
      ...wall,
      id: crypto.randomUUID(),
      start: wall.start,
      end: { ...point },
      sourceThinLength: wall.sourceThinMode ? distance(wall.start, point) : undefined,
      sourceThinMode: wall.sourceThinMode,
    });

    result.push({
      ...wall,
      id: crypto.randomUUID(),
      start: { ...point },
      end: wall.end,
      sourceThinLength: wall.sourceThinMode ? distance(point, wall.end) : undefined,
      sourceThinMode: wall.sourceThinMode,
    });
  }

  return result;
}

export function pointIsInsideWallSegment(point: Point, wall: Wall) {
  if (samePoint(point, wall.start) || samePoint(point, wall.end)) return false;

  const projectedPoint = closestPointOnSegment(point, wall.start, wall.end);
  const distanceFromWall = distance(point, projectedPoint);

  if (distanceFromWall > 0.75) return false;

  const totalLength = distance(wall.start, wall.end);
  const startLength = distance(wall.start, projectedPoint);
  const endLength = distance(projectedPoint, wall.end);

  return startLength > 1 && endLength > 1 && startLength < totalLength && endLength < totalLength;
}

export function getClosestEndpointPoint(point: Point, walls: Wall[]): Point | null {
  let closestEndpointPoint: Point | null = null;
  let closestEndpointDistance = Number.POSITIVE_INFINITY;

  for (const wall of walls) {
    for (const endpoint of [wall.start, wall.end]) {
      const endpointDistance = distance(point, endpoint);

      if (endpointDistance < closestEndpointDistance) {
        closestEndpointDistance = endpointDistance;
        closestEndpointPoint = endpoint;
      }
    }
  }

  if (!closestEndpointPoint || closestEndpointDistance > WALL_ATTACH_THRESHOLD) {
    return null;
  }

  return closestEndpointPoint;
}

export function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const segment = sub(end, start);
  const segmentLengthSquared = dot(segment, segment);

  if (segmentLengthSquared === 0) return start;

  const t = clamp(dot(sub(point, start), segment) / segmentLengthSquared, 0, 1);

  return {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  };
}

export function snapToGrid(point: Point): Point {
  return {
    x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
  };
}
