import { NextResponse } from "next/server";

import {
  filterRoomForKitchenGeneration,
  generateKitchenLayout,
  generateSmartKitchenLayout,
} from "@/lib/ai/kitchenDesigner";
import {
  add,
  clamp,
  dot,
  mul,
  perp,
  pixelsToInches,
  pointKey,
  pointsMatch,
  samePoint,
  sub,
  uniquePoints,
} from "@/lib/ai/geometry";
import {
  getResponseText,
  parsePlannerJson,
  type OpenAIResponsesPayload,
} from "./plannerOutput";
import { summarizeCatalog } from "./catalogSummary";
import { normalizeSmartKitchenPlan } from "./planNormalization";
import {
  readRequiredTextFile,
  readStructuredSmartKitchenPrompt,
  SMART_KITCHEN_OUTPUT_SHAPE_PATH,
} from "./promptFiles";
import type {
  AiPoint,
  AiRoomInput,
  SmartKitchenPlacementWallFace,
  SmartKitchenPlan,
} from "@/lib/ai/types";

type SmartKitchenRequestBody = {
  room?: AiRoomInput;
  designerFeedback?: string;
  previewOnly?: boolean;
};

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getWallLabelLookup(room: AiRoomInput) {
  return new Map(
    room.walls
      .filter((wall) => wall.kind !== "thin-wall")
      .map((wall, index) => [wall.id, `Wall ${index + 1}`] as const)
  );
}

function getWallHeightInches() {
  return 96;
}

function getWallThicknessInches(room: AiRoomInput) {
  return (room.meta.wallThickness / room.meta.gridSize) * 12;
}

function getRawWallLengthInches(room: AiRoomInput, wall: AiRoomInput["walls"][number]) {
  return (
    (Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) / room.meta.gridSize) * 12
  );
}

function getElevationWallAxis(wall: AiRoomInput["walls"][number]) {
  const isMostlyHorizontal =
    Math.abs(wall.end.x - wall.start.x) >= Math.abs(wall.end.y - wall.start.y);
  const shouldFlip = isMostlyHorizontal
    ? wall.start.x > wall.end.x
    : wall.start.y > wall.end.y;
  const start = shouldFlip ? wall.end : wall.start;
  const end = shouldFlip ? wall.start : wall.end;
  const length = distanceBetweenPoints(start, end);
  const direction = length > 0.001 ? normalize(sub(end, start)) : { x: 1, y: 0 };
  const normal = perp(direction);

  return {
    start,
    end,
    direction,
    normal,
    length,
  };
}

function vectorLength(point: AiPoint) {
  return Math.sqrt(dot(point, point));
}

function normalize(point: AiPoint): AiPoint {
  const pointLength = vectorLength(point);
  if (!pointLength) return { x: 0, y: 0 };
  return {
    x: point.x / pointLength,
    y: point.y / pointLength,
  };
}

function distanceBetweenPoints(a: AiPoint, b: AiPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: AiPoint, b: AiPoint): AiPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function lineIntersection(
  p1: AiPoint,
  d1: AiPoint,
  p2: AiPoint,
  d2: AiPoint
) {
  const crossValue = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(crossValue) < 0.0001) return null;

  const diff = sub(p2, p1);
  const t = (diff.x * d2.y - diff.y * d2.x) / crossValue;
  return add(p1, mul(d1, t));
}

function getNormal(a: AiPoint, b: AiPoint): AiPoint {
  const unit = normalize(sub(b, a));
  return {
    x: -unit.y,
    y: unit.x,
  };
}

function getPreferredNormal(start: AiPoint, end: AiPoint): AiPoint {
  const normal = getNormal(start, end);
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dy) < 0.001) return { x: 0, y: -1 };
  if (dy < 0) {
    return normal.y < 0 ? normal : { x: -normal.x, y: -normal.y };
  }
  if (dx >= 0) {
    return normal.y > 0 ? normal : { x: -normal.x, y: -normal.y };
  }

  return normal.y > 0 ? normal : { x: -normal.x, y: -normal.y };
}

function getWallEndpoints(room: AiRoomInput) {
  return room.walls
    .filter((wall) => wall.kind !== "thin-wall")
    .flatMap((wall) => [wall.start, wall.end]);
}

function buildMeasurementChainsFromWalls(walls: AiRoomInput["walls"]) {
  if (walls.length === 0) return [] as Array<{ points: AiPoint[] }>;

  const pointToWalls = new Map<string, typeof walls>();

  for (const wall of walls) {
    for (const point of [wall.start, wall.end]) {
      const key = pointKey(point);
      pointToWalls.set(key, [...(pointToWalls.get(key) ?? []), wall]);
    }
  }

  const usedWallIds = new Set<string>();
  const chains: Array<{ points: AiPoint[] }> = [];

  const getOtherPoint = (wall: AiRoomInput["walls"][number], point: AiPoint) =>
    samePoint(wall.start, point) ? wall.end : wall.start;

  const isPassThroughPoint = (point: AiPoint) =>
    (pointToWalls.get(pointKey(point)) ?? []).length === 2;

  const getContinuationWall = (
    previousPoint: AiPoint,
    currentPoint: AiPoint,
    currentWall: AiRoomInput["walls"][number]
  ) => {
    const connectedWalls = pointToWalls.get(pointKey(currentPoint)) ?? [];
    const unusedWalls = connectedWalls.filter(
      (wall) => wall.id !== currentWall.id && !usedWallIds.has(wall.id)
    );

    if (unusedWalls.length === 0) return undefined;
    if (connectedWalls.length === 2) return unusedWalls[0];

    const incomingDirection = normalize(sub(currentPoint, previousPoint));
    let bestWall: AiRoomInput["walls"][number] | undefined;
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

  const walkChain = (startPoint: AiPoint, firstWall: AiRoomInput["walls"][number]) => {
    const points: AiPoint[] = [startPoint];
    let currentPoint = startPoint;
    let currentWall: AiRoomInput["walls"][number] | undefined = firstWall;

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
    walls.flatMap((wall) => [wall.start, wall.end]).filter((point) => !isPassThroughPoint(point))
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

function buildWallChainsForMeasurement(room: AiRoomInput) {
  return buildMeasurementChainsFromWalls(
    room.walls.filter((wall) => wall.kind !== "thin-wall")
  );
}

function getConnectedMeasurementWallComponents(room: AiRoomInput) {
  const walls = room.walls.filter((wall) => wall.kind !== "thin-wall");
  const remaining = new Map(walls.map((wall) => [wall.id, wall]));
  const pointToWallIds = new Map<string, string[]>();

  for (const wall of walls) {
    for (const point of [wall.start, wall.end]) {
      const key = pointKey(point);
      pointToWallIds.set(key, [...(pointToWallIds.get(key) ?? []), wall.id]);
    }
  }

  const components: typeof walls[] = [];

  while (remaining.size > 0) {
    const first = Array.from(remaining.values())[0];
    const queue = [first];
    const component: typeof walls = [];
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

function getExteriorMeasurementSide(
  wall: AiRoomInput["walls"][number],
  room: AiRoomInput
): "left" | "right" {
  const wallPoints = getWallEndpoints(room);
  if (wallPoints.length === 0) return "left";

  const centroid = wallPoints.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= wallPoints.length;
  centroid.y /= wallPoints.length;

  const segmentMidpoint = midpoint(wall.start, wall.end);
  const direction = normalize(sub(wall.end, wall.start));
  const leftNormal = perp(direction);
  const outwardVector = sub(segmentMidpoint, centroid);

  return dot(leftNormal, outwardVector) >= 0 ? "left" : "right";
}

function getConnectedDirectionsAtPoint(point: AiPoint, room: AiRoomInput) {
  const directions = room.walls
    .filter(
      (wall) =>
        wall.kind !== "thin-wall" &&
        (pointsMatch(wall.start, point) || pointsMatch(wall.end, point))
    )
    .map((wall) => {
      const otherPoint = pointsMatch(wall.start, point) ? wall.end : wall.start;
      return normalize(sub(otherPoint, point));
    })
    .filter((direction) => vectorLength(direction));

  const uniqueDirections: AiPoint[] = [];
  for (const direction of directions) {
    if (uniqueDirections.some((existingDirection) => dot(existingDirection, direction) > 0.999)) {
      continue;
    }
    uniqueDirections.push(direction);
  }

  return uniqueDirections.sort(
    (a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x)
  );
}

function findMatchingDirectionIndex(directions: AiPoint[], target: AiPoint) {
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

function getMiterAnchorForDirectionPair(
  room: AiRoomInput,
  point: AiPoint,
  firstDirection: AiPoint,
  secondDirection: AiPoint,
  whichSide: "first-left" | "second-right"
) {
  const halfThickness = room.meta.wallThickness / 2;
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
  const fallback = whichSide === "first-left" ? firstOffsetPoint : secondOffsetPoint;

  if (!intersection) return fallback;

  const distanceFromPoint = distanceBetweenPoints(point, intersection);
  if (distanceFromPoint > room.meta.wallThickness * 2.25) {
    return fallback;
  }

  return intersection;
}

function getMeasurementGuideAnchor(
  room: AiRoomInput,
  endpoint: AiPoint,
  segmentNeighbor: AiPoint,
  sideNormal: AiPoint
) {
  const segmentDirection = normalize(sub(segmentNeighbor, endpoint));
  const wallFacePoint = add(endpoint, mul(sideNormal, room.meta.wallThickness / 2));

  if (!vectorLength(segmentDirection)) return wallFacePoint;

  const connectedDirections = getConnectedDirectionsAtPoint(endpoint, room);
  if (connectedDirections.length <= 1) return wallFacePoint;

  const matchingIndex = findMatchingDirectionIndex(connectedDirections, segmentDirection);
  if (matchingIndex < 0) return wallFacePoint;

  const leftNormal = normalize(perp(segmentDirection));
  const isLeftSide = dot(sideNormal, leftNormal) >= 0;
  const currentDirection = connectedDirections[matchingIndex];

  if (isLeftSide) {
    const nextDirection =
      connectedDirections[(matchingIndex + 1) % connectedDirections.length];
    return getMiterAnchorForDirectionPair(
      room,
      endpoint,
      currentDirection,
      nextDirection,
      "first-left"
    );
  }

  const previousDirection =
    connectedDirections[
      (matchingIndex - 1 + connectedDirections.length) % connectedDirections.length
    ];

  return getMiterAnchorForDirectionPair(
    room,
    endpoint,
    previousDirection,
    currentDirection,
    "second-right"
  );
}

function getWallSideMeasurementAnchor(
  room: AiRoomInput,
  segmentStart: AiPoint,
  segmentEnd: AiPoint,
  side: "left" | "right"
) {
  const direction = normalize(sub(segmentEnd, segmentStart));
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);

  return getMeasurementGuideAnchor(room, segmentStart, segmentEnd, normal);
}

function getWallSideMeasurementLayout(
  room: AiRoomInput,
  segmentStart: AiPoint,
  segmentEnd: AiPoint,
  side: "left" | "right"
) {
  const direction = normalize(sub(segmentEnd, segmentStart));
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);
  const lineOffsetFromWallFace = 14;

  const startAnchor = getMeasurementGuideAnchor(room, segmentStart, segmentEnd, normal);
  const endAnchor = getMeasurementGuideAnchor(room, segmentEnd, segmentStart, normal);
  const lineStart = add(startAnchor, mul(normal, lineOffsetFromWallFace));
  const lineEnd = add(endAnchor, mul(normal, lineOffsetFromWallFace));
  const mid = midpoint(lineStart, lineEnd);

  return {
    lineStart,
    lineEnd,
    labelPoint: add(mid, mul(normal, 18)),
  };
}

function getMergedMeasurementLayout(
  firstLayout: ReturnType<typeof getWallSideMeasurementLayout>,
  lastLayout: ReturnType<typeof getWallSideMeasurementLayout>
) {
  const lineStart = firstLayout.lineStart;
  const lineEnd = lastLayout.lineEnd;
  const mergedMidpoint = midpoint(lineStart, lineEnd);
  const firstMidpoint = midpoint(firstLayout.lineStart, firstLayout.lineEnd);
  const labelOffsetVector = sub(firstLayout.labelPoint, firstMidpoint);

  return {
    lineStart,
    lineEnd,
    labelPoint: add(mergedMidpoint, labelOffsetVector),
  };
}

function isMultiWallMeasurementJunction(point: AiPoint, room: AiRoomInput) {
  const connectedWalls = room.walls.filter(
    (wall) =>
      wall.kind !== "thin-wall" &&
      (samePoint(wall.start, point) || samePoint(wall.end, point))
  );

  if (connectedWalls.length <= 2) return false;

  const uniqueDirections: AiPoint[] = [];

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

function shouldMergeMeasurementRun(
  room: AiRoomInput,
  points: AiPoint[],
  index: number,
  side: "left" | "right"
) {
  if (index >= points.length - 2) return false;

  const currentStart = points[index];
  const joint = points[index + 1];
  const currentEnd = points[index + 1];
  const nextEnd = points[index + 2];

  if (isMultiWallMeasurementJunction(joint, room)) return false;

  const currentDirection = normalize(sub(currentEnd, currentStart));
  const nextDirection = normalize(sub(nextEnd, joint));

  if (!vectorLength(currentDirection) || !vectorLength(nextDirection)) return false;
  if (dot(currentDirection, nextDirection) < 0.999) return false;

  const currentExteriorSide = getExteriorMeasurementSide(
    { id: "", start: currentStart, end: currentEnd },
    room
  );
  const nextExteriorSide = getExteriorMeasurementSide(
    { id: "", start: joint, end: nextEnd },
    room
  );

  return side === currentExteriorSide && side === nextExteriorSide;
}

function getStructureGuideEndpointsFromMeasurementRun(
  room: AiRoomInput,
  wall: AiRoomInput["walls"][number],
  guideSide: "left" | "right"
) {
  const chains = buildWallChainsForMeasurement(room);
  const direction = normalize(sub(wall.end, wall.start));

  if (!vectorLength(direction)) return null;

  const baseNormal = normalize(perp(direction));
  const normal = guideSide === "left" ? baseNormal : mul(baseNormal, -1);
  const sideFaceBase = add(wall.start, mul(normal, room.meta.wallThickness / 2));
  const wallLineOffset = 14;

  for (const chain of chains) {
    const points = chain.points;
    let segmentIndex = -1;
    let isReversedInChain = false;

    for (let index = 0; index < points.length - 1; index += 1) {
      if (samePoint(points[index], wall.start) && samePoint(points[index + 1], wall.end)) {
        segmentIndex = index;
        isReversedInChain = false;
        break;
      }

      if (samePoint(points[index], wall.end) && samePoint(points[index + 1], wall.start)) {
        segmentIndex = index;
        isReversedInChain = true;
        break;
      }
    }

    if (segmentIndex < 0) continue;

    const chainGuideSide = isReversedInChain
      ? guideSide === "left" ? "right" : "left"
      : guideSide;
    let runStart = segmentIndex;
    let runEnd = segmentIndex;

    while (runStart > 0 && shouldMergeMeasurementRun(room, points, runStart - 1, chainGuideSide)) {
      runStart -= 1;
    }

    while (runEnd < points.length - 2 && shouldMergeMeasurementRun(room, points, runEnd, chainGuideSide)) {
      runEnd += 1;
    }

    const firstLayout = getWallSideMeasurementLayout(
      room,
      points[runStart],
      points[runStart + 1],
      chainGuideSide
    );
    const lastLayout = getWallSideMeasurementLayout(
      room,
      points[runEnd],
      points[runEnd + 1],
      chainGuideSide
    );
    const mergedLayout = getMergedMeasurementLayout(firstLayout, lastLayout);

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

function getWallSideGuideRunLength(
  room: AiRoomInput,
  wall: AiRoomInput["walls"][number],
  side: "left" | "right"
) {
  const runEndpoints = getStructureGuideEndpointsFromMeasurementRun(room, wall, side);
  if (runEndpoints) {
    return distanceBetweenPoints(runEndpoints.startAnchor, runEndpoints.endAnchor);
  }

  return distanceBetweenPoints(wall.start, wall.end);
}

function getInteriorMeasurementGuideSideFromWallSystem(
  room: AiRoomInput,
  wall: AiRoomInput["walls"][number]
) {
  const component = getConnectedMeasurementWallComponents(room).find((candidateWalls) =>
    candidateWalls.some((candidateWall) => candidateWall.id === wall.id)
  );

  if (!component || component.length === 0) return null;
  const chains = buildMeasurementChainsFromWalls(component);
  const matchingChain = chains
    .map((chain) => {
      for (let index = 0; index < chain.points.length - 1; index += 1) {
        const segmentStart = chain.points[index];
        const segmentEnd = chain.points[index + 1];

        if (samePoint(segmentStart, wall.start) && samePoint(segmentEnd, wall.end)) {
          return { chain, segmentIndex: index, reversed: false };
        }

        if (samePoint(segmentStart, wall.end) && samePoint(segmentEnd, wall.start)) {
          return { chain, segmentIndex: index, reversed: true };
        }
      }

      return null;
    })
    .find((candidate): candidate is {
      chain: { points: AiPoint[] };
      segmentIndex: number;
      reversed: boolean;
    } => Boolean(candidate));

  if (!matchingChain) return null;

  const componentPoints = uniquePoints(
    component.flatMap((componentWall) => [componentWall.start, componentWall.end])
  );

  if (componentPoints.length === 0) return null;

  const centroid = componentPoints.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 }
  );

  centroid.x /= componentPoints.length;
  centroid.y /= componentPoints.length;
  const candidateStartSides: Array<"left" | "right"> = ["left", "right"];
  let bestSolution: {
    sides: Array<"left" | "right">;
    continuityCost: number;
    inwardScore: number;
  } | null = null;

  const getJointAnchorDistance = (
    points: AiPoint[],
    segmentIndex: number,
    previousSide: "left" | "right",
    nextSide: "left" | "right"
  ) => {
    const previousEndAnchor = getWallSideMeasurementAnchor(
      room,
      points[segmentIndex + 1],
      points[segmentIndex],
      previousSide
    );
    const nextStartAnchor = getWallSideMeasurementAnchor(
      room,
      points[segmentIndex + 1],
      points[segmentIndex + 2],
      nextSide
    );

    return distanceBetweenPoints(previousEndAnchor, nextStartAnchor);
  };

  const getInwardScore = (points: AiPoint[], sides: Array<"left" | "right">) =>
    sides.reduce((score, side, index) => {
      const segmentStart = points[index];
      const segmentEnd = points[index + 1];
      const direction = normalize(sub(segmentEnd, segmentStart));
      if (!vectorLength(direction)) return score;
      const baseNormal = normalize(perp(direction));
      const normal = side === "left" ? baseNormal : mul(baseNormal, -1);
      const inwardVector = sub(centroid, midpoint(segmentStart, segmentEnd));

      return score + dot(normal, inwardVector);
    }, 0);

  for (const forcedStartSide of candidateStartSides) {
    const points = matchingChain.chain.points;
    const segmentCount = points.length - 1;
    const dp = Array.from({ length: segmentCount }, () => ({ left: Infinity, right: Infinity }));
    const parent = Array.from({ length: segmentCount }, () => ({
      left: null as "left" | "right" | null,
      right: null as "left" | "right" | null,
    }));

    dp[0][forcedStartSide] = 0;

    for (let index = 1; index < segmentCount; index += 1) {
      for (const side of candidateStartSides) {
        for (const previousSide of candidateStartSides) {
          const candidateCost =
            dp[index - 1][previousSide] +
            getJointAnchorDistance(points, index - 1, previousSide, side);

          if (candidateCost < dp[index][side]) {
            dp[index][side] = candidateCost;
            parent[index][side] = previousSide;
          }
        }
      }
    }

    const endSide = dp[segmentCount - 1].left <= dp[segmentCount - 1].right ? "left" : "right";
    const continuityCost = dp[segmentCount - 1][endSide];
    const sides = new Array<"left" | "right">(segmentCount).fill("left");
    let currentSide: "left" | "right" = endSide;

    for (let index = segmentCount - 1; index >= 0; index -= 1) {
      sides[index] = currentSide;
      currentSide = parent[index][currentSide] ?? forcedStartSide;
    }

    const inwardScore = getInwardScore(points, sides);
    const isBetter =
      !bestSolution ||
      continuityCost < bestSolution.continuityCost - 0.001 ||
      (
        Math.abs(continuityCost - bestSolution.continuityCost) <= 0.001 &&
        inwardScore > bestSolution.inwardScore
      );

    if (isBetter) {
      bestSolution = {
        sides,
        continuityCost,
        inwardScore,
      };
    }
  }

  if (!bestSolution) return null;

  const chainSide = bestSolution.sides[matchingChain.segmentIndex];
  return matchingChain.reversed
    ? (chainSide === "left" ? "right" : "left")
    : chainSide;
}

type WallElevationViewMode = "interior" | "exterior";
type WallCabinetPlacementMode = "none" | "both" | "interior" | "exterior";

type ElevationFixedObjectSummary = Record<string, unknown> & {
  id: string;
  type: string;
  coordinateSpace: "elevationPlan";
  leftInches: number;
  bottomInches: number;
};

type WallWithElevationMetadata = AiRoomInput["walls"][number] & {
  elevationViewMode?: WallElevationViewMode;
  needCabinetPlacement?: boolean;
  needsPlacement?: boolean;
  cabinetPlacementMode?: WallCabinetPlacementMode;
  elevationViewSideOverride?: "left" | "right";
  interiorSideOverride?: "left" | "right";
  debugDots?: {
    left?: {
      start?: AiPoint;
      end?: AiPoint;
    };
    right?: {
      start?: AiPoint;
      end?: AiPoint;
    };
  };
  elevationPlan?: {
    widthInches?: number;
    fixedObjects?: unknown;
    [key: string]: unknown;
  };
  elevationWidthInches?: number;
};

function getClientElevationWidthInches(wall: AiRoomInput["walls"][number]) {
  const wallWithMetadata = wall as WallWithElevationMetadata;
  const candidate = wallWithMetadata.elevationPlan?.widthInches ?? wallWithMetadata.elevationWidthInches;

  return typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0
    ? candidate
    : null;
}

function getClientNeedCabinetPlacement(wall: AiRoomInput["walls"][number]) {
  const wallWithMetadata = wall as WallWithElevationMetadata;

  if (typeof wallWithMetadata.needCabinetPlacement === "boolean") {
    return wallWithMetadata.needCabinetPlacement;
  }

  if (typeof wallWithMetadata.needsPlacement === "boolean") {
    return wallWithMetadata.needsPlacement;
  }

  return true;
}

function getClientCabinetPlacementMode(
  wall: AiRoomInput["walls"][number]
): WallCabinetPlacementMode {
  const mode = (wall as WallWithElevationMetadata).cabinetPlacementMode;
  return mode === "none" || mode === "both" || mode === "exterior"
    ? mode
    : "interior";
}

function roundElevationPlanInches(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeClientElevationFixedObject(value: unknown): ElevationFixedObjectSummary | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id : null;
  const type = typeof candidate.type === "string" ? candidate.type : null;
  const leftInches = toNullableNumber(candidate.leftInches);
  const bottomInches = toNullableNumber(candidate.bottomInches);

  if (!id || !type || leftInches === null || bottomInches === null) {
    return null;
  }

  const normalized: ElevationFixedObjectSummary = {
    ...candidate,
    id,
    type,
    coordinateSpace: "elevationPlan",
    leftInches: roundElevationPlanInches(leftInches),
    bottomInches: roundElevationPlanInches(bottomInches),
  };

  (["widthInches", "heightInches", "depthInches"] as const).forEach((field) => {
    const fieldValue = toNullableNumber(candidate[field]);
    if (fieldValue !== null) {
      normalized[field] = roundElevationPlanInches(fieldValue);
    }
  });

  return normalized;
}

function getClientElevationFixedObjects(wall: AiRoomInput["walls"][number]) {
  const fixedObjects = (wall as WallWithElevationMetadata).elevationPlan?.fixedObjects;

  if (!Array.isArray(fixedObjects)) return null;

  return fixedObjects
    .map((fixedObject) => normalizeClientElevationFixedObject(fixedObject))
    .filter(
      (fixedObject): fixedObject is ElevationFixedObjectSummary => Boolean(fixedObject)
    );
}

function getWallElevationViewMode(wall: AiRoomInput["walls"][number]): WallElevationViewMode {
  const mode = (wall as WallWithElevationMetadata).elevationViewMode;

  return mode === "exterior" ? "exterior" : "interior";
}

function getInteriorMeasurementGuideSide(room: AiRoomInput, wall: AiRoomInput["walls"][number]) {
  const wallWithMetadata = wall as WallWithElevationMetadata;
  const manualOverride = wallWithMetadata.elevationViewSideOverride ?? wallWithMetadata.interiorSideOverride;
  if (manualOverride) return manualOverride;

  const direction = normalize(sub(wall.end, wall.start));
  if (!vectorLength(direction)) return "left" as const;

  const leftLength = getWallSideGuideRunLength(room, wall, "left");
  const rightLength = getWallSideGuideRunLength(room, wall, "right");
  const tolerance = 0.5;

  if (leftLength + tolerance < rightLength) return "left" as const;
  if (rightLength + tolerance < leftLength) return "right" as const;

  const componentSide = getInteriorMeasurementGuideSideFromWallSystem(room, wall);
  if (componentSide) return componentSide;

  const baseNormal = normalize(perp(direction));
  const interiorNormal = mul(getPreferredNormal(wall.start, wall.end), -1);

  return dot(interiorNormal, baseNormal) >= 0 ? "left" as const : "right" as const;
}

function getWallElevationGuideSide(room: AiRoomInput, wall: AiRoomInput["walls"][number]) {
  const interiorSide = getInteriorMeasurementGuideSide(room, wall);
  const mode = getWallElevationViewMode(wall);

  if (mode === "exterior") {
    return interiorSide === "left" ? "right" as const : "left" as const;
  }

  return interiorSide;
}

function measurementSideToWallFaceSide(
  wall: AiRoomInput["walls"][number],
  side: "left" | "right"
) {
  const wallDirection = normalize(sub(wall.end, wall.start));
  const axisDirection = getElevationWallAxis(wall).direction;

  if (!vectorLength(wallDirection) || !vectorLength(axisDirection)) {
    return side;
  }

  return dot(wallDirection, axisDirection) < 0
    ? side === "left"
      ? "right"
      : "left"
    : side;
}

function resolvePlacementWallFace(
  room: AiRoomInput,
  wall: AiRoomInput["walls"][number],
  wallFace: SmartKitchenPlacementWallFace | null
) {
  if (!wallFace) return null;

  const interiorGuideSide = getInteriorMeasurementGuideSide(room, wall);
  const targetGuideSide =
    wallFace === "exterior"
      ? interiorGuideSide === "left"
        ? "right"
        : "left"
      : interiorGuideSide;

  return measurementSideToWallFaceSide(wall, targetGuideSide);
}

function getElevationWallSpanInches(
  room: AiRoomInput,
  wall: AiRoomInput["walls"][number],
  guideSide = getWallElevationGuideSide(room, wall)
) {
  const rawLengthInches = getRawWallLengthInches(room, wall);
  const axis = getElevationWallAxis(wall);
  const startAnchor = getWallSideMeasurementAnchor(
    room,
    wall.start,
    wall.end,
    guideSide
  );
  const endAnchor = getWallSideMeasurementAnchor(
    room,
    wall.end,
    wall.start,
    guideSide
  );
  const startScalar = clamp(dot(sub(startAnchor, axis.start), axis.direction), 0, axis.length);
  const endScalar = clamp(dot(sub(endAnchor, axis.start), axis.direction), 0, axis.length);
  const spanStartPixels = Math.min(startScalar, endScalar);
  const spanEndPixels = Math.max(startScalar, endScalar);
  const lengthPixels = Math.max(0, spanEndPixels - spanStartPixels);

  if (lengthPixels < 0.001) {
    return {
      rawLengthInches,
      startInset: 0,
      endInset: 0,
      lengthInches: rawLengthInches,
    };
  }

  const lengthInches = pixelsToInches(lengthPixels, room.meta.gridSize);

  return {
    rawLengthInches,
    startInset: pixelsToInches(spanStartPixels, room.meta.gridSize),
    endInset: Math.max(0, rawLengthInches - pixelsToInches(spanEndPixels, room.meta.gridSize)),
    lengthInches,
  };
}

function getWallCornerDots(room: AiRoomInput, wall: AiRoomInput["walls"][number]) {
  const debugDots = (wall as WallWithElevationMetadata).debugDots;

  if (
    debugDots?.left?.start &&
    debugDots.left.end &&
    debugDots.right?.end &&
    debugDots.right.start
  ) {
    return {
      startLeft: debugDots.left.start,
      endLeft: debugDots.left.end,
      endRight: debugDots.right.end,
      startRight: debugDots.right.start,
    };
  }

  const axis = getElevationWallAxis(wall);
  const halfThickness = room.meta.wallThickness / 2;
  const leftOffset = mul(axis.normal, halfThickness);
  const rightOffset = mul(axis.normal, -halfThickness);

  return {
    startLeft: add(wall.start, leftOffset),
    endLeft: add(wall.end, leftOffset),
    endRight: add(wall.end, rightOffset),
    startRight: add(wall.start, rightOffset),
  };
}

function summarizeWallFaceDots(
  room: AiRoomInput,
  wall: AiRoomInput["walls"][number]
) {
  const elevationViewMode = getWallElevationViewMode(wall);
  const cornerDots = getWallCornerDots(room, wall);
  const interiorMeasurementSide = getInteriorMeasurementGuideSide(room, wall);
  const exteriorMeasurementSide = interiorMeasurementSide === "left" ? "right" : "left";
  const pairForSide = (side: "left" | "right") =>
    side === "left"
      ? {
          dotPair: ["left-start", "left-end"] as [string, string],
          start: cornerDots.startLeft,
          end: cornerDots.endLeft,
        }
      : {
          dotPair: ["right-start", "right-end"] as [string, string],
          start: cornerDots.startRight,
          end: cornerDots.endRight,
        };
  const interiorPair = pairForSide(interiorMeasurementSide);
  const exteriorPair = pairForSide(exteriorMeasurementSide);

  return {
    elevationViewMode,
    elevationViewSide: elevationViewMode,
    dots: [
      {
        dotId: "left-start",
        x: cornerDots.startLeft.x,
        y: cornerDots.startLeft.y,
      },
      {
        dotId: "left-end",
        x: cornerDots.endLeft.x,
        y: cornerDots.endLeft.y,
      },
      {
        dotId: "right-end",
        x: cornerDots.endRight.x,
        y: cornerDots.endRight.y,
      },
      {
        dotId: "right-start",
        x: cornerDots.startRight.x,
        y: cornerDots.startRight.y,
      },
    ],
    wallShapeDotPairs: [
      ["left-start", "left-end"],
      ["left-end", "right-end"],
      ["right-end", "right-start"],
      ["right-start", "left-start"],
    ],
    interiorSide: {
      dotPair: interiorPair.dotPair,
      start: {
        x: interiorPair.start.x,
        y: interiorPair.start.y,
      },
      end: {
        x: interiorPair.end.x,
        y: interiorPair.end.y,
      },
      lengthInches: roundElevationPlanInches(
        pixelsToInches(
          distanceBetweenPoints(interiorPair.start, interiorPair.end),
          room.meta.gridSize
        )
      ),
    },
    exteriorSide: {
      dotPair: exteriorPair.dotPair,
      start: {
        x: exteriorPair.start.x,
        y: exteriorPair.start.y,
      },
      end: {
        x: exteriorPair.end.x,
        y: exteriorPair.end.y,
      },
      lengthInches: roundElevationPlanInches(
        pixelsToInches(
          distanceBetweenPoints(exteriorPair.start, exteriorPair.end),
          room.meta.gridSize
        )
      ),
    },
  };
}

function getCenterOffsetInchesForWall(
  room: AiRoomInput,
  wall: AiRoomInput["walls"][number],
  point: AiPoint
) {
  const axis = getElevationWallAxis(wall);
  const axisMidpoint = midpoint(axis.start, axis.end);
  const direction = axis.direction;
  return (
    (((point.x - axisMidpoint.x) * direction.x + (point.y - axisMidpoint.y) * direction.y) /
      room.meta.gridSize) *
    12
  );
}

function getElevationOffsets(params: {
  room: AiRoomInput;
  wall: AiRoomInput["walls"][number];
  center: AiPoint;
  widthInches: number;
  bottomInches: number;
}) {
  const wallSpan = getElevationWallSpanInches(params.room, params.wall);
  const centerOffsetInches = getCenterOffsetInchesForWall(params.room, params.wall, params.center);
  const absoluteLeftFromRawStart =
    wallSpan.rawLengthInches / 2 + centerOffsetInches - params.widthInches / 2;
  const leftInches = absoluteLeftFromRawStart - wallSpan.startInset;
  const rightInches = wallSpan.lengthInches - leftInches - params.widthInches;

  return {
    leftInches: Math.round(leftInches * 10) / 10,
    rightInches: Math.round(rightInches * 10) / 10,
    bottomInches: Math.round(params.bottomInches * 10) / 10,
  };
}

function getTopOption(cabinetItem: AiRoomInput["cabinets"][number]) {
  if (cabinetItem.sinkFixture) return "sink";
  if (cabinetItem.cooktopFixture === "surface") return "surface-cooktop";
  if (cabinetItem.cooktopFixture === "front") return "front-control-cooktop";
  return null;
}

function summarizeWalls(room: AiRoomInput) {
  const wallLabelLookup = getWallLabelLookup(room);

  return room.walls
    .filter((wall) => wall.kind !== "thin-wall")
    .map((wall) => {
      const dx = Math.abs(wall.end.x - wall.start.x);
      const dy = Math.abs(wall.end.y - wall.start.y);
      const wallSpan = getElevationWallSpanInches(room, wall);
      const lengthInches = wallSpan.lengthInches;
      const elevationWidthInches = getClientElevationWidthInches(wall) ?? lengthInches;
      const wallHeightInches = getWallHeightInches();
      const wallFaceDots = summarizeWallFaceDots(room, wall);
      const fallbackElevationFixedObjects: ElevationFixedObjectSummary[] = [
        ...room.windows
          .filter((windowItem) => windowItem.wallId === wall.id)
          .map((windowItem) => {
            const widthInches =
              Math.round((windowItem.width / room.meta.gridSize) * 12 * 10) / 10;
            const centerOffsetInches = windowItem.t * elevationWidthInches;
            const leftInches = elevationWidthInches / 2 + centerOffsetInches - widthInches / 2;

            return {
              id: windowItem.id,
              type: "window",
              coordinateSpace: "elevationPlan" as const,
              leftInches: Math.round(leftInches * 10) / 10,
              bottomInches: Math.round(windowItem.distanceFromFloorInches * 10) / 10,
              widthInches,
              heightInches: Math.round(windowItem.heightInches * 10) / 10,
            };
          }),
        ...room.doors
          .filter((doorItem) => doorItem.wallId === wall.id)
          .map((doorItem) => {
            const widthInches =
              Math.round((doorItem.width / room.meta.gridSize) * 12 * 10) / 10;
            const centerOffsetInches = doorItem.t * elevationWidthInches;
            const leftInches = elevationWidthInches / 2 + centerOffsetInches - widthInches / 2;

            return {
              id: doorItem.id,
              type: "door",
              coordinateSpace: "elevationPlan" as const,
              leftInches: Math.round(leftInches * 10) / 10,
              bottomInches: Math.round(doorItem.distanceFromFloorInches * 10) / 10,
              widthInches,
              heightInches: Math.round(doorItem.heightInches * 10) / 10,
            };
          }),
        ...room.cabinets
          .filter((cabinetItem) => cabinetItem.wallId === wall.id)
          .map((cabinetItem) => {
            const catalogItem =
              room.catalog.find((item) => item.id === cabinetItem.catalogId) ?? null;
            const widthInches =
              Math.round(((cabinetItem.width / room.meta.gridSize) * 12) * 10) / 10;
            const category = cabinetItem.category ?? catalogItem?.category ?? "base";
            const catalogItemWithHeight = catalogItem as (typeof catalogItem & { heightInches?: number });
            const heightInches =
              cabinetItem.heightInches ?? catalogItemWithHeight?.heightInches ?? null;
            const distanceFromFloorInches =
              category === "wall"
                ? cabinetItem.distanceFromFloorInches ??
                  catalogItem?.defaultDistanceFromFloorInches ??
                  0
                : 0;
            const elevationOffsets = getElevationOffsets({
              room,
              wall,
              center: cabinetItem.center,
              widthInches,
              bottomInches: distanceFromFloorInches,
            });

            const isAccessory = Boolean(
              (cabinetItem as typeof cabinetItem & { accessoryKind?: string }).accessoryKind ||
              (catalogItem as typeof catalogItem & { isAccessory?: boolean } | null)?.isAccessory
            );
            const isProduct = Boolean(cabinetItem.isProduct ?? catalogItem?.isProduct);

            return {
              id: cabinetItem.id,
              type: isAccessory ? "accessory" : isProduct ? "product" : "cabinet",
              coordinateSpace: "elevationPlan" as const,
              catalogId: cabinetItem.catalogId ?? null,
              title: catalogItem?.title ?? "Placed object",
              category,
              topOption: getTopOption(cabinetItem),
              widthInches,
              depthInches:
                Math.round(((cabinetItem.depth / room.meta.gridSize) * 12) * 10) / 10,
              heightInches,
              leftInches: elevationOffsets.leftInches,
              bottomInches: elevationOffsets.bottomInches,
            };
          }),
      ];
      const elevationFixedObjects =
        getClientElevationFixedObjects(wall) ?? fallbackElevationFixedObjects;

      return {
        wallId: wall.id,
        wallLabel: wallLabelLookup.get(wall.id) ?? wall.id,
        cabinetPlacementMode: getClientCabinetPlacementMode(wall),
        wallDots: wallFaceDots.dots,
        wallShapeDotPairs: wallFaceDots.wallShapeDotPairs,
        interiorSide: wallFaceDots.interiorSide,
        exteriorSide: wallFaceDots.exteriorSide,
        fixedObjects: elevationFixedObjects,
      };
    });
}

function buildFallbackSmartLayout(params: {
  room: AiRoomInput;
  plannerModel: string;
  planNotes?: string[];
  designerFeedback?: string;
  plannerFailureReason: string;
}) {
  const fallbackLayout = generateKitchenLayout(params.room);

  return {
    ...fallbackLayout,
    summary: {
      ...fallbackLayout.summary,
      generationMethod: "smart-ai" as const,
      plannerModel: params.plannerModel,
      notes: [
        "The smart planner could not produce a usable structured plan, so the rule-based kitchen generator was used as a fallback.",
        params.plannerFailureReason,
        ...(params.designerFeedback
          ? ["Designer feedback was included in the smart-planning request."]
          : []),
        ...(params.planNotes ?? []),
        ...fallbackLayout.summary.notes,
      ],
    },
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing OPENAI_API_KEY. Add it to your environment before using Generate smart kitchen.",
      },
      { status: 400 }
    );
  }

  let body: SmartKitchenRequestBody;

  try {
    body = (await request.json()) as SmartKitchenRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!body.room) {
    return NextResponse.json({ error: "Missing room input." }, { status: 400 });
  }

  const fullRoom = body.room;
  const roomForGeneration = filterRoomForKitchenGeneration(fullRoom);
  const designerFeedback =
    typeof body.designerFeedback === "string" ? body.designerFeedback.trim() : "";

  if (fullRoom.walls.filter((wall) => wall.kind !== "thin-wall").length === 0) {
    return NextResponse.json(
      { error: "No thick walls were available for smart kitchen generation." },
      { status: 400 }
    );
  }

  const plannerModel = process.env.OPENAI_SMART_KITCHEN_MODEL ?? "gpt-5.5";
  const summarizedWalls = summarizeWalls(fullRoom);
  const summarizedCatalog = summarizeCatalog(fullRoom);
  const plannerInput = {
    walls: summarizedWalls,
    catalog: summarizedCatalog,
    catalogVersion: `${summarizedCatalog.length}-items`,
    designerFeedback: designerFeedback || null,
  };
  const plannerInputPayload = { plannerInput };
  const plannerPrompt = await readStructuredSmartKitchenPrompt();
  const outputShapeText = await readRequiredTextFile(
    SMART_KITCHEN_OUTPUT_SHAPE_PATH,
    "smart-kitchen output shape"
  );

  const aiPlannerRequestPayload = {
    model: plannerModel,
    reasoning: {
      effort: "medium",
    },
    max_output_tokens: 20000,
    text: {
      format: {
        type: "json_object",
      },
    },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: plannerPrompt,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Planner input JSON:\n${JSON.stringify(plannerInputPayload, null, 2)}`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Required output shape reference:",
              'Use the value of "outputShape" as the schema reference.',
              'Return only the inner JSON object that matches that shape. Do not wrap your final answer in an outer "outputShape" key.',
              outputShapeText,
            ].join("\n\n"),
          },
        ],
      },
    ],
  };

  if (body.previewOnly) {
    return NextResponse.json({
      preview: aiPlannerRequestPayload,
      plannerInput: plannerInputPayload,
      outputShape: outputShapeText,
    });
  }

  const plannerResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(aiPlannerRequestPayload),
  });

  if (!plannerResponse.ok) {
    const errorText = await plannerResponse.text();

    return NextResponse.json(
      {
        error: `OpenAI planning request failed: ${errorText}`,
      },
      { status: 502 }
    );
  }

  const plannerPayload = (await plannerResponse.json()) as OpenAIResponsesPayload;
  const plannerText = getResponseText(plannerPayload);

  if (!plannerText) {
    return NextResponse.json({
      layout: buildFallbackSmartLayout({
        room: roomForGeneration,
        plannerModel,
        designerFeedback,
        plannerFailureReason:
          "The smart planner returned no usable output text.",
      }),
      usedFallback: true,
      plannerError: "The smart planner returned no usable output text.",
    });
  }

  let rawPlan: unknown;
  let plannerParseError: string | null = null;

  try {
    rawPlan = parsePlannerJson(plannerText);
  } catch (error) {
    plannerParseError =
      error instanceof Error
        ? error.message
        : "The parser could not recover a usable plan from the model output.";
    return NextResponse.json({
      layout: buildFallbackSmartLayout({
        room: roomForGeneration,
        plannerModel,
        designerFeedback,
        plannerFailureReason: `The smart planner returned invalid JSON. ${plannerParseError}`,
      }),
      aiOutput: plannerText,
      usedFallback: true,
      plannerError: `The smart planner returned invalid JSON. ${plannerParseError}`,
    });
  }

  if (
    rawPlan &&
    typeof rawPlan === "object" &&
    !Array.isArray(rawPlan) &&
    "outputShape" in rawPlan
  ) {
    const wrappedPlan = rawPlan as { outputShape?: unknown };
    if (wrappedPlan.outputShape) {
      rawPlan = wrappedPlan.outputShape;
    }
  }

  const plan = normalizeSmartKitchenPlan(
    fullRoom,
    rawPlan,
    plannerModel,
    resolvePlacementWallFace
  );
  const smartLayout = generateSmartKitchenLayout(fullRoom, plan);

  if (smartLayout.cabinets.length > 0) {
    return NextResponse.json({
      layout: designerFeedback
        ? {
            ...smartLayout,
            summary: {
              ...smartLayout.summary,
              notes: [
                "Designer feedback was applied to this smart kitchen concept.",
                ...smartLayout.summary.notes,
              ],
            },
          }
        : smartLayout,
      aiOutput: rawPlan,
      plan,
    });
  }

  const fallbackLayout = generateKitchenLayout(roomForGeneration);

  return NextResponse.json({
    layout: {
      ...fallbackLayout,
      summary: {
        ...fallbackLayout.summary,
        generationMethod: "smart-ai",
        plannerModel,
        notes: [
          ...(designerFeedback
            ? ["Designer feedback was applied to this smart kitchen concept."]
            : []),
          "The smart planner produced a plan, but the engine could not realize it cleanly, so the rule-based generator was used as a fallback.",
          ...plan.notes,
          ...fallbackLayout.summary.notes,
        ],
      },
    },
    aiOutput: rawPlan,
    plan,
    usedFallback: true,
  });
}
