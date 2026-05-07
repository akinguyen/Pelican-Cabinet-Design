import type {
  AiCabinet,
  AiCatalogItem,
  AiCabinetCategory,
  AiPoint,
  AiRoomInput,
  AiWall,
  GeneratedKitchenLayout,
} from "@/lib/ai/types";

type KitchenDesignOptions = {
  selectedWallIds?: string[];
};

type WallAxis = {
  midpoint: AiPoint;
  direction: AiPoint;
  normal: AiPoint;
  lengthPixels: number;
  lengthInches: number;
};

type WallEntry = {
  wall: AiWall;
  axis: WallAxis;
  orientation: "horizontal" | "vertical";
};

type WallEndpoint = "start" | "end";

type WallReservation = {
  start: number;
  end: number;
};

type CornerPair = {
  id: string;
  point: AiPoint;
  vertical: WallEntry;
  horizontal: WallEntry;
  verticalEndpoint: WallEndpoint;
  horizontalEndpoint: WallEndpoint;
};

function add(a: AiPoint, b: AiPoint): AiPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: AiPoint, b: AiPoint): AiPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mul(point: AiPoint, scalar: number): AiPoint {
  return { x: point.x * scalar, y: point.y * scalar };
}

function length(point: AiPoint) {
  return Math.hypot(point.x, point.y);
}

function normalize(point: AiPoint): AiPoint {
  const pointLength = length(point);
  if (pointLength < 0.0001) return { x: 1, y: 0 };
  return { x: point.x / pointLength, y: point.y / pointLength };
}

function perp(point: AiPoint): AiPoint {
  return { x: -point.y, y: point.x };
}

function dot(a: AiPoint, b: AiPoint) {
  return a.x * b.x + a.y * b.y;
}

function inchesToPixels(inches: number, gridSize: number) {
  return (inches / 12) * gridSize;
}

function pixelsToInches(pixels: number, gridSize: number) {
  return (pixels / gridSize) * 12;
}

function pointsMatch(a: AiPoint, b: AiPoint, tolerance = 0.5) {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}


function getRotatedRectCorners(
  center: AiPoint,
  width: number,
  depth: number,
  rotation: number
) {
  const radians = (rotation * Math.PI) / 180;
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  return [
    { x: -halfWidth, y: -halfDepth },
    { x: halfWidth, y: -halfDepth },
    { x: halfWidth, y: halfDepth },
    { x: -halfWidth, y: halfDepth },
  ].map((corner) => ({
    x: center.x + corner.x * cosValue - corner.y * sinValue,
    y: center.y + corner.x * sinValue + corner.y * cosValue,
  }));
}

function getBoundsFromPoints(points: AiPoint[]) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

function getRotatedRectBounds(
  center: AiPoint,
  width: number,
  depth: number,
  rotation: number
) {
  return getBoundsFromPoints(getRotatedRectCorners(center, width, depth, rotation));
}

function wallHasStartConnection(wall: AiWall, walls: AiWall[]) {
  return walls.some(
    (candidate) =>
      candidate.id !== wall.id &&
      (pointsMatch(candidate.start, wall.start) || pointsMatch(candidate.end, wall.start))
  );
}

function wallHasEndConnection(wall: AiWall, walls: AiWall[]) {
  return walls.some(
    (candidate) =>
      candidate.id !== wall.id &&
      (pointsMatch(candidate.start, wall.end) || pointsMatch(candidate.end, wall.end))
  );
}

function getCabinetVerticalRange(cabinet: AiCabinet) {
  const bottom = cabinet.distanceFromFloorInches ?? 0;
  const inferredHeight =
    cabinet.heightInches ??
    (cabinet.category === "wall" ? 30 : cabinet.category === "tall" ? 84 : 34.5);

  return {
    bottom,
    top: bottom + inferredHeight,
  };
}

function verticalRangesOverlap(first: AiCabinet, second: AiCabinet, tolerance = 0.25) {
  const firstRange = getCabinetVerticalRange(first);
  const secondRange = getCabinetVerticalRange(second);
  return (
    Math.min(firstRange.top, secondRange.top) -
      Math.max(firstRange.bottom, secondRange.bottom) >
    tolerance
  );
}


function boundsOverlap(
  first: { minX: number; maxX: number; minY: number; maxY: number },
  second: { minX: number; maxX: number; minY: number; maxY: number },
  tolerance = 0.5
) {
  return (
    Math.min(first.maxX, second.maxX) - Math.max(first.minX, second.minX) > tolerance &&
    Math.min(first.maxY, second.maxY) - Math.max(first.minY, second.minY) > tolerance
  );
}

function getCabinetHandleTabBounds(cabinet: AiCabinet) {
  const image = cabinet.image;
  if (cabinet.category === "wall" || cabinet.category === "tall") return [];

  const tabWidth = Math.min(22, Math.max(10, cabinet.width * 0.18));
  const tabHeight = Math.min(8, Math.max(5, cabinet.depth * 0.18));
  const tabY = cabinet.depth / 2 - tabHeight * 0.12;
  const tabCenters =
    image === "base-blind-right-one-drawer"
      ? [-cabinet.width / 2 + tabWidth * 0.9]
      : [cabinet.width / 2 - tabWidth * 0.9];

  const radians = (cabinet.rotation * Math.PI) / 180;
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);

  return tabCenters.map((tabCenter) => {
    const tab = {
      x: tabCenter - tabWidth / 2,
      y: tabY,
      width: tabWidth,
      height: tabHeight,
    };
    const corners = [
      { x: tab.x, y: tab.y },
      { x: tab.x + tab.width, y: tab.y },
      { x: tab.x + tab.width, y: tab.y + tab.height },
      { x: tab.x, y: tab.y + tab.height },
    ].map((corner) => ({
      x: cabinet.center.x + corner.x * cosValue - corner.y * sinValue,
      y: cabinet.center.y + corner.x * sinValue + corner.y * cosValue,
    }));

    return getBoundsFromPoints(corners);
  });
}

function handleIsHiddenByCabinet(blindCabinet: AiCabinet, companionCabinet: AiCabinet) {
  const companionBounds = getRotatedRectBounds(
    companionCabinet.center,
    Math.max(1, companionCabinet.width - 1),
    Math.max(1, companionCabinet.depth - 1),
    companionCabinet.rotation
  );

  return getCabinetHandleTabBounds(blindCabinet).some((handleBounds) =>
    boundsOverlap(handleBounds, companionBounds, 0.25)
  );
}

function isBlindCornerImage(image?: AiCabinet["image"]) {
  return (
    image === "base-blind-left" ||
    image === "base-blind-left-one-drawer" ||
    image === "base-blind-right-one-drawer"
  );
}

function getPerpendicularRotationDelta(first: AiCabinet, second: AiCabinet) {
  const rawDelta = Math.abs(((first.rotation - second.rotation) % 180 + 180) % 180);
  return Math.min(rawDelta, Math.abs(180 - rawDelta));
}

function isIntentionalCornerOverlap(first: AiCabinet, second: AiCabinet) {
  if (!first.wallId || !second.wallId || first.wallId === second.wallId) return false;
  if (!isBlindCornerImage(first.image) && !isBlindCornerImage(second.image)) return false;

  const angleDelta = getPerpendicularRotationDelta(first, second);
  if (Math.abs(angleDelta - 90) > 8) return false;

  // Blind-corner cabinets are allowed to reserve space on the adjacent wall,
  // but their actual floor-plan rectangles should still not overlap another
  // base cabinet. Keeping this false prevents the companion cabinet from being
  // accepted when it blocks the blind door/handle.
  return false;
}

function cabinetsOverlap(first: AiCabinet, second: AiCabinet) {
  const firstBounds = getRotatedRectBounds(
    first.center,
    Math.max(1, first.width - 1),
    Math.max(1, first.depth - 1),
    first.rotation
  );
  const secondBounds = getRotatedRectBounds(
    second.center,
    Math.max(1, second.width - 1),
    Math.max(1, second.depth - 1),
    second.rotation
  );
  const overlapX =
    Math.min(firstBounds.maxX, secondBounds.maxX) -
    Math.max(firstBounds.minX, secondBounds.minX);
  const overlapY =
    Math.min(firstBounds.maxY, secondBounds.maxY) -
    Math.max(firstBounds.minY, secondBounds.minY);

  if (overlapX <= 0.5 || overlapY <= 0.5) return false;

  const sameWall = Boolean(first.wallId && second.wallId && first.wallId === second.wallId);
  const firstCategory = first.category ?? "base";
  const secondCategory = second.category ?? "base";

  if (isIntentionalCornerOverlap(first, second)) {
    return false;
  }

  if (
    (firstCategory === "base" || firstCategory === "tall") &&
    (secondCategory === "base" || secondCategory === "tall")
  ) {
    return true;
  }

  if ((firstCategory === "wall") !== (secondCategory === "wall")) {
    return !sameWall || verticalRangesOverlap(first, second);
  }

  return !sameWall || verticalRangesOverlap(first, second);
}

function getCatalogItem(
  catalog: AiCatalogItem[],
  category: AiCabinetCategory,
  preferredIds: string[]
) {
  for (const preferredId of preferredIds) {
    const item = catalog.find((candidate) => candidate.id === preferredId);
    if (item) return item;
  }

  return catalog.find((candidate) => candidate.category === category) ?? null;
}

function getRoomCenter(walls: AiWall[]) {
  const points = walls.flatMap((wall) => [wall.start, wall.end]);
  if (points.length === 0) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function getWallAxis(
  wall: AiWall,
  roomCenter: AiPoint,
  gridSize: number,
  wallThickness: number
): WallAxis {
  const vector = sub(wall.end, wall.start);
  const direction = normalize(vector);
  const rawNormal = perp(direction);
  const midpoint = mul(add(wall.start, wall.end), 0.5);
  const positiveSide = add(midpoint, mul(rawNormal, wallThickness));
  const negativeSide = add(midpoint, mul(rawNormal, -wallThickness));
  const positiveDistance = length(sub(roomCenter, positiveSide));
  const negativeDistance = length(sub(roomCenter, negativeSide));
  const normal = positiveDistance <= negativeDistance ? rawNormal : mul(rawNormal, -1);
  const lengthPixels = length(vector);

  return {
    midpoint,
    direction,
    normal,
    lengthPixels,
    lengthInches: (lengthPixels / gridSize) * 12,
  };
}

function getWallOrientation(axis: WallAxis): WallEntry["orientation"] {
  return Math.abs(axis.direction.x) >= Math.abs(axis.direction.y)
    ? "horizontal"
    : "vertical";
}

function placeCabinetOnWall(params: {
  wall: AiWall;
  axis: WallAxis;
  catalogItem: AiCatalogItem;
  centerOffsetInches: number;
  gridSize: number;
  wallThickness: number;
  distanceFromFloorInches: number;
  heightInches: number;
}): AiCabinet {
  const widthPixels = inchesToPixels(params.catalogItem.widthInches, params.gridSize);
  const depthPixels = inchesToPixels(params.catalogItem.depthInches, params.gridSize);
  const tangentOffset = mul(
    params.axis.direction,
    inchesToPixels(params.centerOffsetInches, params.gridSize)
  );
  const normalOffset = mul(
    params.axis.normal,
    params.wallThickness / 2 + depthPixels / 2
  );
  const center = add(params.axis.midpoint, add(tangentOffset, normalOffset));
  const rotation =
    (Math.atan2(params.axis.direction.y, params.axis.direction.x) * 180) / Math.PI;

  return {
    id: `ai-cabinet-${crypto.randomUUID()}`,
    center,
    width: widthPixels,
    depth: depthPixels,
    rotation,
    category: params.catalogItem.category,
    catalogId: params.catalogItem.id,
    image: params.catalogItem.image,
    heightInches: params.heightInches,
    distanceFromFloorInches: params.distanceFromFloorInches,
    wallId: params.wall.id,
  };
}

function isStandardRunCatalogItem(item: AiCatalogItem) {
  if (item.category === "wall") return true;

  return !(
    item.image === "base-corner" ||
    item.image === "base-blind-left" ||
    item.image === "base-blind-left-one-drawer" ||
    item.image === "base-blind-right-one-drawer" ||
    item.image === "base-sink" ||
    item.image === "base-sink-one-door-panel" ||
    item.image === "base-sink-two-door-panel" ||
    item.image === "base-appliance" ||
    item.image === "base-oven-bottom-drawer"
  );
}

function getRunCatalogItemForRemaining(
  catalog: AiCatalogItem[],
  category: "base" | "wall",
  preferredPattern: string[],
  patternIndex: number,
  remainingInches: number
) {
  const preferredItems = preferredPattern
    .map(
      (id) =>
        catalog.find(
          (candidate) =>
            candidate.id === id &&
            candidate.category === category &&
            isStandardRunCatalogItem(candidate)
        ) ?? null
    )
    .filter((item): item is AiCatalogItem => Boolean(item));

  const preferredItem = preferredItems[patternIndex % Math.max(1, preferredItems.length)];
  if (preferredItem && preferredItem.widthInches <= remainingInches + 0.001) {
    return preferredItem;
  }

  return catalog
    .filter(
      (candidate) =>
        candidate.category === category &&
        isStandardRunCatalogItem(candidate) &&
        candidate.widthInches <= remainingInches + 0.001
    )
    .sort((left, right) => {
      if (right.widthInches !== left.widthInches) return right.widthInches - left.widthInches;
      const leftPreferred = preferredPattern.includes(left.id) ? 1 : 0;
      const rightPreferred = preferredPattern.includes(right.id) ? 1 : 0;
      return rightPreferred - leftPreferred;
    })[0] ?? null;
}

function createRun(params: {
  wall: AiWall;
  axis: WallAxis;
  segmentStartInches: number;
  segmentEndInches: number;
  catalog: AiCatalogItem[];
  gridSize: number;
  wallThickness: number;
  category: "base" | "wall";
  preferredPattern: string[];
  maxCount?: number;
  distanceFromFloorInches: number;
  heightInches: number;
  align?: "start" | "end";
}) {
  const segmentStart = Math.min(params.segmentStartInches, params.segmentEndInches);
  const segmentEnd = Math.max(params.segmentStartInches, params.segmentEndInches);
  const usable = segmentEnd - segmentStart;
  const cabinets: AiCabinet[] = [];

  if (usable < 18) return cabinets;

  const maxCount = params.maxCount ?? 12;
  let cursor = params.align === "end" ? segmentEnd : segmentStart;
  let patternIndex = 0;

  while (cabinets.length < maxCount) {
    const remaining = params.align === "end" ? cursor - segmentStart : segmentEnd - cursor;
    const item = getRunCatalogItemForRemaining(
      params.catalog,
      params.category,
      params.preferredPattern,
      patternIndex,
      remaining
    );

    if (!item) break;

    const nextCenter =
      params.align === "end"
        ? cursor - item.widthInches / 2
        : cursor + item.widthInches / 2;

    if (nextCenter - item.widthInches / 2 < segmentStart - 0.001) break;
    if (nextCenter + item.widthInches / 2 > segmentEnd + 0.001) break;

    cabinets.push(
      placeCabinetOnWall({
        wall: params.wall,
        axis: params.axis,
        catalogItem: item,
        centerOffsetInches: nextCenter,
        gridSize: params.gridSize,
        wallThickness: params.wallThickness,
        distanceFromFloorInches: params.distanceFromFloorInches,
        heightInches: params.heightInches,
      })
    );

    cursor += (params.align === "end" ? -1 : 1) * item.widthInches;
    patternIndex += 1;
  }

  return params.align === "end" ? cabinets.reverse() : cabinets;
}

function appendWithoutOverlap(target: AiCabinet[], additions: AiCabinet[]) {
  for (const candidate of additions) {
    if (target.some((existing) => cabinetsOverlap(candidate, existing))) continue;
    target.push(candidate);
  }
}

function addReservation(
  reservations: Map<string, WallReservation[]>,
  wallId: string,
  start: number,
  end: number
) {
  const nextReservation = {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
  const current = reservations.get(wallId) ?? [];
  current.push(nextReservation);
  reservations.set(wallId, current);
}

function reserveCabinetFootprint(
  reservations: Map<string, WallReservation[]>,
  wallId: string,
  centerOffsetInches: number,
  widthInches: number,
  padding = 0.75
) {
  addReservation(
    reservations,
    wallId,
    centerOffsetInches - widthInches / 2 - padding,
    centerOffsetInches + widthInches / 2 + padding
  );
}

function subtractReservations(
  start: number,
  end: number,
  reservations: WallReservation[]
) {
  const sorted = [...reservations]
    .map((item) => ({
      start: clamp(Math.min(item.start, item.end), start, end),
      end: clamp(Math.max(item.start, item.end), start, end),
    }))
    .filter((item) => item.end - item.start > 0.01)
    .sort((left, right) => left.start - right.start);

  const segments: Array<{ start: number; end: number }> = [];
  let cursor = start;

  for (const reservation of sorted) {
    if (reservation.start > cursor + 0.01) {
      segments.push({ start: cursor, end: reservation.start });
    }
    cursor = Math.max(cursor, reservation.end);
  }

  if (cursor < end - 0.01) {
    segments.push({ start: cursor, end });
  }

  return segments.filter((segment) => segment.end - segment.start >= 18);
}

function getSegmentFillAlignment(
  segment: { start: number; end: number },
  reservations: WallReservation[]
): "start" | "end" {
  const touchesReservationOnEnd = reservations.some(
    (reservation) => Math.abs(Math.min(reservation.start, reservation.end) - segment.end) <= 0.25
  );

  // If the open segment is immediately before a blind-corner/companion
  // reservation, pack cabinets from that reserved edge first. This keeps the
  // run touching the corner block and leaves any unavoidable odd filler gap at
  // the far/open side instead of beside the blind cabinet.
  return touchesReservationOnEnd ? "end" : "start";
}

function getEndpointOffset(
  wallLengthInches: number,
  itemWidthInches: number,
  endpoint: WallEndpoint,
  edgeInset = 1.5
) {
  return endpoint === "start"
    ? -wallLengthInches / 2 + itemWidthInches / 2 + edgeInset
    : wallLengthInches / 2 - itemWidthInches / 2 - edgeInset;
}

function getOffsetFromCorner(
  wallLengthInches: number,
  distanceFromCornerInches: number,
  endpoint: WallEndpoint
) {
  return endpoint === "start"
    ? -wallLengthInches / 2 + distanceFromCornerInches
    : wallLengthInches / 2 - distanceFromCornerInches;
}

function getCabinetOffsetAfterCornerBlock(
  wallLengthInches: number,
  itemWidthInches: number,
  endpoint: WallEndpoint,
  blockedFromCornerInches: number,
  gap = 0.75
) {
  return getOffsetFromCorner(
    wallLengthInches,
    blockedFromCornerInches + gap + itemWidthInches / 2,
    endpoint
  );
}

function reserveCornerBlockOnWall(
  reservations: Map<string, WallReservation[]>,
  wallId: string,
  wallLengthInches: number,
  endpoint: WallEndpoint,
  blockedFromCornerInches: number,
  padding = 0.75
) {
  const cornerOffset = getOffsetFromCorner(wallLengthInches, 0, endpoint);
  const blockEndOffset = getOffsetFromCorner(
    wallLengthInches,
    blockedFromCornerInches + padding,
    endpoint
  );
  addReservation(reservations, wallId, cornerOffset, blockEndOffset);
}

function findCornerPairs(selectedWalls: WallEntry[]) {
  const corners: CornerPair[] = [];

  for (let index = 0; index < selectedWalls.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < selectedWalls.length; nextIndex += 1) {
      const first = selectedWalls[index];
      const second = selectedWalls[nextIndex];
      if (Math.abs(dot(first.axis.direction, second.axis.direction)) > 0.2) continue;
      if (first.orientation === second.orientation) continue;

      const endpointMatches: Array<{
        firstEndpoint: WallEndpoint;
        secondEndpoint: WallEndpoint;
        point: AiPoint;
      }> = [];

      if (pointsMatch(first.wall.start, second.wall.start)) {
        endpointMatches.push({
          firstEndpoint: "start",
          secondEndpoint: "start",
          point: first.wall.start,
        });
      }
      if (pointsMatch(first.wall.start, second.wall.end)) {
        endpointMatches.push({
          firstEndpoint: "start",
          secondEndpoint: "end",
          point: first.wall.start,
        });
      }
      if (pointsMatch(first.wall.end, second.wall.start)) {
        endpointMatches.push({
          firstEndpoint: "end",
          secondEndpoint: "start",
          point: first.wall.end,
        });
      }
      if (pointsMatch(first.wall.end, second.wall.end)) {
        endpointMatches.push({
          firstEndpoint: "end",
          secondEndpoint: "end",
          point: first.wall.end,
        });
      }

      for (const match of endpointMatches) {
        const vertical = first.orientation === "vertical" ? first : second;
        const horizontal = first.orientation === "horizontal" ? first : second;
        const verticalEndpoint =
          vertical.wall.id === first.wall.id ? match.firstEndpoint : match.secondEndpoint;
        const horizontalEndpoint =
          horizontal.wall.id === first.wall.id ? match.firstEndpoint : match.secondEndpoint;
        corners.push({
          id: `${vertical.wall.id}:${verticalEndpoint}:${horizontal.wall.id}:${horizontalEndpoint}`,
          point: match.point,
          vertical,
          horizontal,
          verticalEndpoint,
          horizontalEndpoint,
        });
      }
    }
  }

  return corners;
}

function getInsets(
  wall: AiWall,
  category: "base" | "wall",
  allWalls: AiWall[]
) {
  const baseCornerInset = 3;
  const connectedCornerInset = 24;
  const upperCornerInset = 6;
  return {
    start:
      category === "base"
        ? wallHasStartConnection(wall, allWalls)
          ? connectedCornerInset
          : baseCornerInset
        : upperCornerInset,
    end:
      category === "base"
        ? wallHasEndConnection(wall, allWalls)
          ? connectedCornerInset
          : baseCornerInset
        : upperCornerInset,
  };
}

function getAvailableBaseSegments(
  wallEntry: WallEntry,
  allWalls: AiWall[],
  reservations: Map<string, WallReservation[]>
) {
  const insets = getInsets(wallEntry.wall, "base", allWalls);
  const wallStart = -wallEntry.axis.lengthInches / 2 + insets.start;
  const wallEnd = wallEntry.axis.lengthInches / 2 - insets.end;
  return subtractReservations(
    wallStart,
    wallEnd,
    reservations.get(wallEntry.wall.id) ?? []
  );
}

function getAvailableUpperSegments(
  wallEntry: WallEntry,
  allWalls: AiWall[]
) {
  const insets = getInsets(wallEntry.wall, "wall", allWalls);
  return [
    {
      start: -wallEntry.axis.lengthInches / 2 + insets.start,
      end: wallEntry.axis.lengthInches / 2 - insets.end,
    },
  ].filter((segment) => segment.end - segment.start >= 18);
}

function placeCornerBaseCabinets(params: {
  room: AiRoomInput;
  corner: CornerPair;
  cabinets: AiCabinet[];
  reservations: Map<string, WallReservation[]>;
  notes: string[];
}) {
  const { room, corner, cabinets, reservations, notes } = params;
  const blindLeft = getCatalogItem(room.catalog, "base", [
    "base-blind-left-one-drawer-cabinet",
  ]);
  const blindRight = getCatalogItem(room.catalog, "base", [
    "base-blind-right-one-drawer-cabinet",
    "base-blind-left-one-drawer-cabinet",
  ]);
  const companion = getCatalogItem(room.catalog, "base", [
    "base-one-door-cabinet",
    "base-one-door-one-drawer-cabinet",
    "base-two-drawer-cabinet",
  ]);

  if (!blindLeft || !blindRight || !companion) return;

  const horizontalExtendsLeft =
    corner.horizontal.axis.midpoint.x < corner.vertical.axis.midpoint.x;
  const wallThicknessInches = pixelsToInches(room.meta.wallThickness, room.meta.gridSize);
  const insideWallFaceInsetInches = wallThicknessInches / 2;

  const buildCornerCandidate = (blindItem: AiCatalogItem) => {
    const verticalOffset = getEndpointOffset(
      corner.vertical.axis.lengthInches,
      blindItem.widthInches,
      corner.verticalEndpoint,
      insideWallFaceInsetInches
    );
    // Build the blind corner as a real floor-plan corner before filling either
    // run. The blind cabinet is mounted to the vertical wall, so its top/bottom
    // edge should snap to the inside face of the connected horizontal wall
    // rather than leaving a clearance gap. Its projected footprint on the
    // horizontal run starts at that same inside wall face and extends by the
    // blind depth; the companion cabinet then touches that projected edge with
    // no intentional gap.
    const blindDepthOnHorizontalWall =
      insideWallFaceInsetInches + blindItem.depthInches;
    const horizontalOffset = getCabinetOffsetAfterCornerBlock(
      corner.horizontal.axis.lengthInches,
      companion.widthInches,
      corner.horizontalEndpoint,
      blindDepthOnHorizontalWall,
      0
    );

    const blindCabinet = placeCabinetOnWall({
      wall: corner.vertical.wall,
      axis: corner.vertical.axis,
      catalogItem: blindItem,
      centerOffsetInches: verticalOffset,
      gridSize: room.meta.gridSize,
      wallThickness: room.meta.wallThickness,
      distanceFromFloorInches: 0,
      heightInches: 34.5,
    });
    const companionCabinet = placeCabinetOnWall({
      wall: corner.horizontal.wall,
      axis: corner.horizontal.axis,
      catalogItem: companion,
      centerOffsetInches: horizontalOffset,
      gridSize: room.meta.gridSize,
      wallThickness: room.meta.wallThickness,
      distanceFromFloorInches: 0,
      heightInches: 34.5,
    });

    return {
      blindItem,
      blindCabinet,
      companionCabinet,
      verticalOffset,
      horizontalOffset,
      blindDepthOnHorizontalWall,
      handleHidden: handleIsHiddenByCabinet(blindCabinet, companionCabinet),
    };
  };

  // Choose the blind handedness from the floor-plan result, not only from the
  // wall orientation. At opposite corners, the same vertical/horizontal pair can
  // require the opposite blind cabinet. The valid choice is the one whose black
  // handle tab is not underneath or blocked by the cabinet that touches it on
  // the connected horizontal wall.
  const preferredBlindItem = horizontalExtendsLeft ? blindLeft : blindRight;
  const fallbackBlindItem = preferredBlindItem.id === blindLeft.id ? blindRight : blindLeft;
  const candidates = [preferredBlindItem, fallbackBlindItem].map(buildCornerCandidate);
  const selectedCandidate =
    candidates.find((candidate) => !candidate.handleHidden) ?? candidates[0];
  const {
    blindItem,
    blindCabinet,
    companionCabinet,
    verticalOffset,
    horizontalOffset,
    blindDepthOnHorizontalWall,
  } = selectedCandidate;

  const beforeCount = cabinets.length;
  appendWithoutOverlap(cabinets, [blindCabinet, companionCabinet]);
  if (cabinets.length === beforeCount) return;

  reserveCabinetFootprint(
    reservations,
    corner.vertical.wall.id,
    verticalOffset,
    blindItem.widthInches
  );
  reserveCornerBlockOnWall(
    reservations,
    corner.horizontal.wall.id,
    corner.horizontal.axis.lengthInches,
    corner.horizontalEndpoint,
    blindDepthOnHorizontalWall
  );
  reserveCabinetFootprint(
    reservations,
    corner.horizontal.wall.id,
    horizontalOffset,
    companion.widthInches
  );
  notes.push(
    `Started at a selected corner by placing a ${blindItem.title.toLowerCase()} on the vertical wall with its handle exposed, reserving its ${blindDepthOnHorizontalWall}" floor-plan projection on the horizontal wall, then adding a same-height ${companion.title.toLowerCase()} next to it without overlap.`
  );
}

function getLayoutType(selectedWalls: WallEntry[], corners: CornerPair[]) {
  if (selectedWalls.length <= 1) return "single-wall";
  if (corners.length >= 1) return "l-shape";
  return "galley";
}

export function generateKitchenLayout(
  room: AiRoomInput,
  options: KitchenDesignOptions = {}
): GeneratedKitchenLayout {
  const thickWalls = room.walls.filter((wall) => wall.kind !== "thin-wall");
  const selectedWallSet = options.selectedWallIds?.length
    ? new Set(options.selectedWallIds)
    : null;
  const targetWalls = selectedWallSet
    ? thickWalls.filter((wall) => selectedWallSet.has(wall.id))
    : thickWalls;
  const roomCenter = getRoomCenter(thickWalls);
  const wallThickness = room.meta.wallThickness;
  const gridSize = room.meta.gridSize;
  const selectedWalls = [...targetWalls]
    .map((wall) => {
      const axis = getWallAxis(wall, roomCenter, gridSize, wallThickness);
      return {
        wall,
        axis,
        orientation: getWallOrientation(axis),
      } satisfies WallEntry;
    })
    .sort((left, right) => right.axis.lengthInches - left.axis.lengthInches);

  const primary = selectedWalls[0] ?? null;
  const cabinets: AiCabinet[] = [];
  const notes: string[] = [];
  const reservations = new Map<string, WallReservation[]>();

  if (!primary) {
    return {
      room,
      cabinets: [],
      summary: {
        layoutType: "single-wall",
        notes: [
          selectedWallSet
            ? "No selected thick walls were available for generation. Select one or more thick walls first."
            : "No thick walls available. Draw thin walls and convert them first.",
        ],
        selectedWallIds: [],
      },
      elevations: [],
    };
  }

  const sinkBase = getCatalogItem(room.catalog, "base", [
    "base-sink-cabinet",
    "base-sink-two-door-panel-cabinet",
    "base-sink-one-door-panel-cabinet",
  ]);
  const drawerBase = getCatalogItem(room.catalog, "base", [
    "base-drawer-cabinet",
    "base-four-drawer-cabinet",
    "base-two-drawer-cabinet",
  ]);
  const doorBase = getCatalogItem(room.catalog, "base", [
    "base-two-door-cabinet",
    "base-two-door-one-drawer-cabinet",
    "base-one-door-cabinet",
  ]);
  const wallPair = getCatalogItem(room.catalog, "wall", [
    "wall-cabinet",
    "wall-microwave-one-door-cabinet",
  ]);
  const wallHood = getCatalogItem(room.catalog, "wall", [
    "wall-hood-one-door-cabinet",
    "wall-cabinet",
  ]);
  const tallPantry = getCatalogItem(room.catalog, "tall", ["tall-cabinet"]);
  const corners = findCornerPairs(selectedWalls);

  notes.push(
    selectedWallSet
      ? `Using ${selectedWalls.length} selected wall side(s) for kitchen generation.`
      : `No wall sides were selected, so the designer used all ${selectedWalls.length} thick wall side(s).`
  );

  if (corners.length > 0) {
    notes.push(
      `Detected ${corners.length} usable corner(s) across the selected walls, so the designer started with corner base cabinets first.`
    );
  }

  for (const corner of corners) {
    placeCornerBaseCabinets({
      room,
      corner,
      cabinets,
      reservations,
      notes,
    });
  }

  for (let wallIndex = 0; wallIndex < selectedWalls.length; wallIndex += 1) {
    const wallEntry = selectedWalls[wallIndex];
    if (!drawerBase || !doorBase) continue;
    const availableSegments = getAvailableBaseSegments(
      wallEntry,
      thickWalls,
      reservations
    );
    const isPrimaryWall = wallIndex === 0;
    const hasCornerReservation = (reservations.get(wallEntry.wall.id) ?? []).length > 0;
    let pantryPlaced = false;

    for (const segment of availableSegments) {
      const segmentWidth = segment.end - segment.start;
      const canCenterSink =
        selectedWalls.length === 1 &&
        isPrimaryWall &&
        !hasCornerReservation &&
        sinkBase &&
        segment.start <= -sinkBase.widthInches / 2 &&
        segment.end >= sinkBase.widthInches / 2 &&
        segmentWidth >= sinkBase.widthInches + 24;

      if (canCenterSink && sinkBase) {
        const leftEnd = -sinkBase.widthInches / 2 - 1.5;
        const rightStart = sinkBase.widthInches / 2 + 1.5;
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: room.catalog,
            gridSize,
            wallThickness,
            category: "base",
            preferredPattern: [drawerBase.id, doorBase.id],
            distanceFromFloorInches: 0,
            heightInches: 34.5,
            segmentStartInches: segment.start,
            segmentEndInches: leftEnd,
          })
        );
        appendWithoutOverlap(cabinets, [
          placeCabinetOnWall({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalogItem: sinkBase,
            centerOffsetInches: 0,
            gridSize,
            wallThickness,
            distanceFromFloorInches: 0,
            heightInches: 34.5,
          }),
        ]);
        reserveCabinetFootprint(reservations, wallEntry.wall.id, 0, sinkBase.widthInches);
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: room.catalog,
            gridSize,
            wallThickness,
            category: "base",
            preferredPattern: [doorBase.id, drawerBase.id],
            distanceFromFloorInches: 0,
            heightInches: 34.5,
            segmentStartInches: rightStart,
            segmentEndInches: segment.end,
            align: "end",
          })
        );
        notes.push(
          `Reserved the center of selected wall ${wallIndex + 1} for a sink base and filled the remaining base run on both sides.`
        );
        continue;
      }

      const canPlacePantry =
        !pantryPlaced &&
        !isPrimaryWall &&
        tallPantry &&
        segmentWidth >= tallPantry.widthInches + 18;

      if (canPlacePantry && tallPantry) {
        const pantryCenter = segment.end - tallPantry.widthInches / 2 - 1.5;
        appendWithoutOverlap(cabinets, [
          placeCabinetOnWall({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalogItem: tallPantry,
            centerOffsetInches: pantryCenter,
            gridSize,
            wallThickness,
            distanceFromFloorInches: 0,
            heightInches: 84,
          }),
        ]);
        reserveCabinetFootprint(
          reservations,
          wallEntry.wall.id,
          pantryCenter,
          tallPantry.widthInches
        );
        pantryPlaced = true;
        notes.push(`Placed a tall pantry at the end of selected wall ${wallIndex + 1}.`);
      }
    }

    const refreshedSegments = getAvailableBaseSegments(
      wallEntry,
      thickWalls,
      reservations
    );
    const wallReservations = reservations.get(wallEntry.wall.id) ?? [];
    for (const segment of refreshedSegments) {
      appendWithoutOverlap(
        cabinets,
        createRun({
          wall: wallEntry.wall,
          axis: wallEntry.axis,
          catalog: room.catalog,
          gridSize,
          wallThickness,
          category: "base",
          preferredPattern: [drawerBase.id, doorBase.id],
          distanceFromFloorInches: 0,
          heightInches: 34.5,
          segmentStartInches: segment.start,
          segmentEndInches: segment.end,
          align: getSegmentFillAlignment(segment, wallReservations),
          maxCount: 12,
        })
      );
    }

    if (refreshedSegments.length > 0) {
      notes.push(
        `Filled the remaining width of selected wall ${wallIndex + 1} with base cabinets after handling its corner and tall-unit needs.`
      );
    }
  }

  for (let wallIndex = 0; wallIndex < selectedWalls.length; wallIndex += 1) {
    const wallEntry = selectedWalls[wallIndex];
    if (!wallPair) continue;

    const upperSegments = getAvailableUpperSegments(wallEntry, thickWalls);
    const isPrimaryWall = wallIndex === 0;
    const centeredUpperFeature = selectedWalls.length === 1 && isPrimaryWall && wallHood
      ? wallHood
      : null;

    for (const segment of upperSegments) {
      if (
        centeredUpperFeature &&
        segment.start <= -centeredUpperFeature.widthInches / 2 &&
        segment.end >= centeredUpperFeature.widthInches / 2 &&
        segment.end - segment.start >= centeredUpperFeature.widthInches + 24
      ) {
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: room.catalog,
            gridSize,
            wallThickness,
            category: "wall",
            preferredPattern: [wallPair.id],
            distanceFromFloorInches: 54,
            heightInches: 30,
            segmentStartInches: segment.start,
            segmentEndInches: -centeredUpperFeature.widthInches / 2 - 3,
          })
        );
        appendWithoutOverlap(cabinets, [
          placeCabinetOnWall({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalogItem: centeredUpperFeature,
            centerOffsetInches: 0,
            gridSize,
            wallThickness,
            distanceFromFloorInches: 54,
            heightInches: 30,
          }),
        ]);
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: room.catalog,
            gridSize,
            wallThickness,
            category: "wall",
            preferredPattern: [wallPair.id],
            distanceFromFloorInches: 54,
            heightInches: 30,
            segmentStartInches: centeredUpperFeature.widthInches / 2 + 3,
            segmentEndInches: segment.end,
            align: "end",
            maxCount: 8,
          })
        );
      } else {
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: room.catalog,
            gridSize,
            wallThickness,
            category: "wall",
            preferredPattern: [wallPair.id],
            distanceFromFloorInches: 54,
            heightInches: 30,
            segmentStartInches: segment.start,
            segmentEndInches: segment.end,
            maxCount: 12,
          })
        );
      }
    }

    if (upperSegments.length > 0) {
      notes.push(
        `After the base run was established, filled selected wall ${wallIndex + 1} with upper cabinets across the usable wall width.`
      );
    }
  }

  const layoutType = getLayoutType(selectedWalls, corners);

  return {
    room,
    cabinets,
    summary: {
      layoutType,
      notes,
      selectedWallIds: selectedWalls.map((item) => item.wall.id),
    },
    elevations: targetWalls.map((wall, index) => ({
      wallId: wall.id,
      label: `Wall elevation ${index + 1}`,
      cabinetCount: cabinets.filter((cabinet) => cabinet.wallId === wall.id).length,
    })),
  };
}
