import { getPlacementProjectionOnWallAxis } from "../components/placements/PlacementViews";
import { getInteriorMeasurementGuideSide } from "../components/elevation/ElevationPlanView";
import { getOppositeMeasurementSide, getStructureGuideEndpointsFromMeasurementRun } from "../components/openings/Openings";
import { WALL_ATTACH_THRESHOLD, WALL_STROKE_WIDTH } from "../constants/wallConstants";
import { add, clamp, distance, dot, getPreferredNormal, inchesToPixels, interpolate, mul, normalize, perp, samePoint, sub } from "./geometry";
import { closestPointOnSegment, isThickWall } from "./wallEngine";
import type { DoorElement, DoorPlacementPreview, MeasurementSide, Point, StructurePlacementSnapOptions, Wall, WindowElement, WindowPlacementPreview } from "../types/editorTypes";

export function getDoorPlacementOnWall(
  point: Point,
  walls: Wall[],
  width: number,
  snapOptions: StructurePlacementSnapOptions = {}
): DoorPlacementPreview | null {
  const placement = getWindowPlacementOnWall(point, walls, width, snapOptions);

  if (!placement) return null;

  return {
    wall: placement.wall,
    t: placement.t,
    point: placement.point,
    isValid: true,
  };
}

export function getDoorGeometry(doorItem: DoorElement, wall: Wall) {
  const wallLength = distance(wall.start, wall.end);

  if (wallLength < 0.001) return null;

  const direction = normalize(sub(wall.end, wall.start));
  const halfWidth = Math.min(doorItem.width / 2, wallLength / 2);
  const centerDistance = clamp(doorItem.t * wallLength, halfWidth, wallLength - halfWidth);
  const center = add(wall.start, mul(direction, centerDistance));

  return {
    center,
    start: add(center, mul(direction, -halfWidth)),
    end: add(center, mul(direction, halfWidth)),
  };
}

export function getDoorMenuPosition(
  doorItem: DoorElement,
  wall: Wall,
  overrideT?: number,
  walls: Wall[] = []
): Point {
  const geometry = getDoorGeometry(
    {
      ...doorItem,
      t: overrideT ?? doorItem.t,
    },
    wall
  );

  if (!geometry) {
    return { x: wall.start.x + 24, y: wall.start.y - 24 };
  }

  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const measurementSide = getInteriorMeasurementGuideSide(wall, walls.length ? walls : [wall]);
  const menuSide = getOppositeMeasurementSide(measurementSide);
  const normal = menuSide === "left" ? baseNormal : mul(baseNormal, -1);
  const menuWidth = 74;
  const menuHeight = 46;
  const doorHalfHeight = 7;
  const menuGapFromDoor = 20;
  const doorCenter = geometry.center;
  const menuHalfProjectionOnNormal =
    (Math.abs(normal.x) * menuWidth + Math.abs(normal.y) * menuHeight) / 2;
  const menuCenter = add(
    doorCenter,
    mul(normal, doorHalfHeight + menuGapFromDoor + menuHalfProjectionOnNormal)
  );

  return {
    x: menuCenter.x - menuWidth / 2,
    y: menuCenter.y - menuHeight / 2,
  };
}

export function snapStructureCenterDistanceToNeighbor(
  centerDistance: number,
  width: number,
  wall: Wall,
  walls: Wall[],
  options: StructurePlacementSnapOptions,
  interiorStart: number,
  interiorEnd: number
) {
  void walls;
  const wallLength = distance(wall.start, wall.end);
  if (wallLength < 0.001) return centerDistance;

  const halfWidth = width / 2;
  const minCenter = interiorStart + halfWidth;
  const maxCenter = interiorEnd - halfWidth;
  const snapThreshold = inchesToPixels(3);
  const snapTargets: { start: number; end: number }[] = [];

  (options.windows ?? []).forEach((windowItem) => {
    if (windowItem.id === options.excludeWindowId || windowItem.wallId !== wall.id) return;
    const targetHalfWidth = windowItem.width / 2;
    const targetCenter = clamp(windowItem.t * wallLength, targetHalfWidth, wallLength - targetHalfWidth);
    snapTargets.push({ start: targetCenter - targetHalfWidth, end: targetCenter + targetHalfWidth });
  });

  (options.doors ?? []).forEach((doorItem) => {
    if (doorItem.id === options.excludeDoorId || doorItem.wallId !== wall.id) return;
    const targetHalfWidth = doorItem.width / 2;
    const targetCenter = clamp(doorItem.t * wallLength, targetHalfWidth, wallLength - targetHalfWidth);
    snapTargets.push({ start: targetCenter - targetHalfWidth, end: targetCenter + targetHalfWidth });
  });

  (options.placements ?? []).forEach((placementItem) => {
    if (placementItem.id === options.excludePlacementId) return;
    if (placementItem.wallId && placementItem.wallId !== wall.id) return;
    const projection = getPlacementProjectionOnWallAxis(placementItem, wall);
    if (!projection) return;
    snapTargets.push({ start: projection.startProjection, end: projection.endProjection });
  });

  let bestCenter = centerDistance;
  let bestDistance = snapThreshold;

  snapTargets.forEach((target) => {
    const candidates = [target.start - halfWidth, target.end + halfWidth];

    candidates.forEach((candidateCenter) => {
      if (candidateCenter < minCenter - 0.001 || candidateCenter > maxCenter + 0.001) return;
      const snapDistance = Math.abs(candidateCenter - centerDistance);
      if (snapDistance <= bestDistance) {
        bestDistance = snapDistance;
        bestCenter = candidateCenter;
      }
    });
  });

  return clamp(bestCenter, minCenter, maxCenter);
}

export function getWindowPlacementOnWall(
  point: Point,
  walls: Wall[],
  width: number,
  snapOptions: StructurePlacementSnapOptions = {}
): WindowPlacementPreview | null {
  let bestPlacement: WindowPlacementPreview | null = null;
  let bestDistance = Infinity;
  const placementTolerance = WALL_ATTACH_THRESHOLD + WALL_STROKE_WIDTH / 2 + 16;
  const thickWalls = walls.filter(isThickWall);

  for (const wall of thickWalls) {
    const wallLength = distance(wall.start, wall.end);
    if (wallLength < width + 4) continue;

    const projection = closestPointOnSegment(point, wall.start, wall.end);
    const distanceToWall = distance(point, projection);

    if (distanceToWall > placementTolerance || distanceToWall >= bestDistance) {
      continue;
    }

    const direction = normalize(sub(wall.end, wall.start));
    const interiorSide = getInteriorMeasurementGuideSide(wall, thickWalls);
    const interiorRun = getStructureGuideEndpointsFromMeasurementRun(
      wall,
      thickWalls,
      interiorSide
    );
    const rawInteriorStart = interiorRun
      ? dot(sub(interiorRun.startAnchor, wall.start), direction)
      : 0;
    const rawInteriorEnd = interiorRun
      ? dot(sub(interiorRun.endAnchor, wall.start), direction)
      : wallLength;
    const interiorStart = clamp(Math.min(rawInteriorStart, rawInteriorEnd), 0, wallLength);
    const interiorEnd = clamp(Math.max(rawInteriorStart, rawInteriorEnd), 0, wallLength);

    // Bound every preview/drag to the interior usable span of the wall. This keeps
    // the door/window fully inside the two interior black-dot endpoints instead
    // of allowing the opening to slide into the thick-wall corner/exterior run.
    if (interiorEnd - interiorStart < width + 0.001) continue;

    const rawDistance = dot(sub(projection, wall.start), direction);
    const clampedDistance = clamp(
      rawDistance,
      interiorStart + width / 2,
      interiorEnd - width / 2
    );
    const snappedDistance = snapStructureCenterDistanceToNeighbor(
      clampedDistance,
      width,
      wall,
      walls,
      snapOptions,
      interiorStart,
      interiorEnd
    );
    const centerPoint = add(wall.start, mul(direction, snappedDistance));

    bestDistance = distanceToWall;
    bestPlacement = {
      wall,
      t: snappedDistance / wallLength,
      point: centerPoint,
      isValid: true,
    };
  }

  return bestPlacement;
}

export function getWindowPlacementPreviewForPoint(
  point: Point,
  walls: Wall[],
  width: number,
  snapOptions: StructurePlacementSnapOptions = {}
): WindowPlacementPreview {
  return getWindowPlacementOnWall(point, walls, width, snapOptions) ?? {
    wall: null,
    t: 0,
    point,
    isValid: false,
    invalidReason: "Windows must be placed on a wall.",
  };
}

export function getDoorPlacementPreviewForPoint(
  point: Point,
  walls: Wall[],
  width: number,
  snapOptions: StructurePlacementSnapOptions = {}
): DoorPlacementPreview {
  return getDoorPlacementOnWall(point, walls, width, snapOptions) ?? {
    wall: null,
    t: 0,
    point,
    isValid: false,
    invalidReason: "Doors must be placed on a wall.",
  };
}

export function getWindowPlacementFromWall(
  windowItem: WindowElement,
  wall: Wall
): WindowPlacementPreview {
  return {
    wall,
    t: windowItem.t,
    point: interpolate(wall.start, wall.end, windowItem.t),
    isValid: true,
  };
}

export function getWindowGeometry(windowItem: WindowElement, wall: Wall) {
  const wallLength = distance(wall.start, wall.end);

  if (wallLength < 0.001) return null;

  const direction = normalize(sub(wall.end, wall.start));
  const halfWidth = Math.min(windowItem.width / 2, wallLength / 2);
  const centerDistance = clamp(windowItem.t * wallLength, halfWidth, wallLength - halfWidth);
  const center = add(wall.start, mul(direction, centerDistance));

  return {
    center,
    start: add(center, mul(direction, -halfWidth)),
    end: add(center, mul(direction, halfWidth)),
  };
}

export function getWindowTabSideFacingMeasurementGuide(
  wall: Wall,
  walls: Wall[] = []
): 1 | -1 {
  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const measurementSide = getInteriorMeasurementGuideSide(
    wall,
    walls.length ? walls : [wall]
  );
  const measurementNormal =
    measurementSide === "left" ? baseNormal : mul(baseNormal, -1);
  const windowShapeNormal = getPreferredNormal(wall.start, wall.end);

  return dot(windowShapeNormal, measurementNormal) >= 0 ? 1 : -1;
}

export function getWindowMenuPosition(
  windowItem: WindowElement,
  wall: Wall,
  overrideT?: number,
  walls: Wall[] = []
): Point {
  const geometry = getWindowGeometry(
    {
      ...windowItem,
      t: overrideT ?? windowItem.t,
    },
    wall
  );

  if (!geometry) {
    return { x: wall.start.x + 24, y: wall.start.y - 24 };
  }

  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const measurementSide = getInteriorMeasurementGuideSide(wall, walls.length ? walls : [wall]);
  const menuSide = getOppositeMeasurementSide(measurementSide);
  const normal = menuSide === "left" ? baseNormal : mul(baseNormal, -1);
  const menuWidth = 112;
  const menuHeight = 46;
  const windowHalfHeight = 7;
  const menuGapFromWindow = 20;
  const windowCenter = geometry.center;

  // Keep a consistent visual gap from the window shape for every wall angle.
  // Since the context menu is an axis-aligned rectangle, use its projected
  // half-size along the wall normal before placing the menu center.
  const menuHalfProjectionOnNormal =
    (Math.abs(normal.x) * menuWidth + Math.abs(normal.y) * menuHeight) / 2;
  const menuCenter = add(
    windowCenter,
    mul(normal, windowHalfHeight + menuGapFromWindow + menuHalfProjectionOnNormal)
  );

  return {
    x: menuCenter.x - menuWidth / 2,
    y: menuCenter.y - menuHeight / 2,
  };
}

export function getStructureGuideSideForWall(
  wall: Wall
): Exclude<MeasurementSide, "length"> {
  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const guideNormal = getPreferredNormal(wall.start, wall.end);

  return dot(guideNormal, baseNormal) >= 0 ? "left" : "right";
}

export function measurementSideMatchesStructureGuide(
  segmentStart: Point,
  segmentEnd: Point,
  side: "left" | "right",
  wall: Wall,
  walls: Wall[] = []
) {
  const guideSide = getInteriorMeasurementGuideSide(wall, walls);

  if (samePoint(segmentStart, wall.start) && samePoint(segmentEnd, wall.end)) {
    return side === guideSide;
  }

  if (samePoint(segmentStart, wall.end) && samePoint(segmentEnd, wall.start)) {
    return side === getOppositeMeasurementSide(guideSide);
  }

  return false;
}

export function segmentMatchesWall(
  segmentStart: Point,
  segmentEnd: Point,
  wallId: string,
  walls: Wall[]
) {
  const wall = walls.find((currentWall) => currentWall.id === wallId);

  if (!wall) return false;

  return (
    (samePoint(segmentStart, wall.start) && samePoint(segmentEnd, wall.end)) ||
    (samePoint(segmentStart, wall.end) && samePoint(segmentEnd, wall.start))
  );
}

export function areWindowsEqual(a: WindowElement[], b: WindowElement[]) {
  if (a.length !== b.length) return false;

  return a.every((windowItem, index) => {
    const otherWindow = b[index];

    return (
      otherWindow &&
      windowItem.id === otherWindow.id &&
      windowItem.wallId === otherWindow.wallId &&
      Math.abs(windowItem.t - otherWindow.t) < 0.001 &&
      Math.abs(windowItem.width - otherWindow.width) < 0.001 &&
      Math.abs(windowItem.heightInches - otherWindow.heightInches) < 0.001 &&
      Math.abs(windowItem.distanceFromFloorInches - otherWindow.distanceFromFloorInches) < 0.001 &&
      (windowItem.tabSide ?? 1) === (otherWindow.tabSide ?? 1)
    );
  });
}

export function areDoorsEqual(a: DoorElement[], b: DoorElement[]) {
  if (a.length !== b.length) return false;

  return a.every((doorItem, index) => {
    const otherDoor = b[index];

    return (
      otherDoor &&
      doorItem.id === otherDoor.id &&
      doorItem.wallId === otherDoor.wallId &&
      Math.abs(doorItem.t - otherDoor.t) < 0.001 &&
      Math.abs(doorItem.width - otherDoor.width) < 0.001 &&
      Math.abs(doorItem.heightInches - otherDoor.heightInches) < 0.001 &&
      Math.abs(doorItem.distanceFromFloorInches - otherDoor.distanceFromFloorInches) < 0.001
    );
  });
}
