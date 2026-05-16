import type {
  AiCabinet,
  AiCatalogItem,
  AiCabinetCategory,
  AiPoint,
  AiRoomInput,
  AiWall,
  GeneratedKitchenLayout,
  SmartKitchenPlacement,
  SmartKitchenPlan,
  SmartKitchenWallPlan,
} from "@/lib/ai/types";

type KitchenDesignOptions = Record<string, unknown>;
type KitchenCabinetCategory = AiCabinetCategory | "pantry";

function isPantryCategory(category: unknown): category is "pantry" {
  return category === "pantry";
}

function isFloorStandingKitchenCategory(category: unknown) {
  return category === "base" || isPantryCategory(category);
}

function isUpperOrPantryKitchenCategory(category: unknown) {
  return category === "wall" || isPantryCategory(category);
}

function catalogItemMatchesCategory(item: AiCatalogItem, category: KitchenCabinetCategory) {
  return String(item.category) === category && !(item as AiCatalogItem & { isAccessory?: boolean }).isAccessory;
}

type NormalizedWallPlan = SmartKitchenWallPlan & {
  wallId: string;
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

function getCabinetLockMode(cabinet: AiCabinet) {
  return cabinet.lockMode === "required" || cabinet.lockMode === "suggested"
    ? cabinet.lockMode
    : "locked";
}

function isLockedCabinet(cabinet: AiCabinet) {
  return getCabinetLockMode(cabinet) === "locked";
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
    (cabinet.category === "wall" ? 30 : isPantryCategory(cabinet.category) ? 84 : 34.5);

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
  if (cabinet.category === "wall" || isPantryCategory(cabinet.category)) return [];

  const tabWidth = Math.min(22, Math.max(10, cabinet.width * 0.18));
  const tabHeight = Math.min(8, Math.max(5, cabinet.depth * 0.18));
  const tabY = cabinet.depth / 2 - tabHeight * 0.12;
  const tabCenters =
    image === "base-blind-right"
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
    image === "base-blind-right"
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
    isFloorStandingKitchenCategory(firstCategory) &&
    isFloorStandingKitchenCategory(secondCategory)
  ) {
    return true;
  }

  if ((firstCategory === "wall") !== (secondCategory === "wall")) {
    return !sameWall || verticalRangesOverlap(first, second);
  }

  return !sameWall || verticalRangesOverlap(first, second);
}

function getCabinetElevationCategory(cabinet: AiCabinet): KitchenCabinetCategory {
  if (cabinet.category) return cabinet.category;
  if (cabinet.isProduct && cabinet.distanceFromFloorInches && cabinet.distanceFromFloorInches >= 36) {
    return "wall";
  }
  if ((cabinet.heightInches ?? 0) >= 80) return "pantry";
  return "base";
}

function getCatalogItem(
  catalog: AiCatalogItem[],
  category: KitchenCabinetCategory,
  preferredIds: string[]
) {
  for (const preferredId of preferredIds) {
    const item = catalog.find((candidate) => candidate.id === preferredId);
    if (item) return item;
  }

  return catalog.find((candidate) => catalogItemMatchesCategory(candidate, category)) ?? null;
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
  widthInches?: number;
  depthInches?: number;
  wallFace?: "left" | "right" | null;
  gridSize: number;
  wallThickness: number;
  distanceFromFloorInches: number;
  heightInches: number;
}): AiCabinet {
  const spanWidthInches = params.widthInches ?? params.catalogItem.widthInches;
  const projectionDepthInches = params.depthInches ?? params.catalogItem.depthInches;
  const widthPixels = inchesToPixels(spanWidthInches, params.gridSize);
  const depthPixels = inchesToPixels(projectionDepthInches, params.gridSize);
  const tangentOffset = mul(
    params.axis.direction,
    inchesToPixels(params.centerOffsetInches, params.gridSize)
  );
  const wallFaceSign = params.wallFace === "right" ? -1 : 1;
  const normalOffset = mul(
    params.axis.normal,
    (params.wallThickness / 2 + depthPixels / 2) * wallFaceSign
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
    wallFace: params.wallFace ?? "left",
  };
}

function getBlindDoorWidthInches(cabinet: Pick<AiCabinet, "category" | "image">, widthInches: number) {
  const isWallBlind = cabinet.image === "wall-blind-left" || cabinet.image === "wall-blind-right";

  if (isWallBlind) {
    return Math.max(3, widthInches - 12 - 3);
  }

  return widthInches <= 39 ? 12 : 18;
}

function isStandardRunCatalogItem(item: AiCatalogItem) {
  if (item.category === "wall") return true;

  return !(
    item.image === "base-corner" ||
    item.image === "base-blind-left" ||
    item.image === "base-blind-right" ||
    item.image === "base-sink-cabinet" ||
    item.image === "base-farm-sink-cabinet" ||
    item.image === "base-sink" ||
    item.image === "base-sink-one-door-panel" ||
    item.image === "base-sink-two-door-panel" ||
    item.image === "base-appliance" ||
    item.image === "base-oven-bottom-drawer" ||
    item.image === "base-microwave-bottom-drawer"
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
            catalogItemMatchesCategory(candidate, category) &&
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
        catalogItemMatchesCategory(candidate, category) &&
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

  if (usable < 18 || params.preferredPattern.length === 0) return cabinets;

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

function reserveOpeningFootprint(
  reservations: Map<string, WallReservation[]>,
  wallId: string,
  wallLengthInches: number,
  centerOffsetInches: number,
  widthInches: number,
  padding = 1.5
) {
  const halfWidth = widthInches / 2;
  addReservation(
    reservations,
    wallId,
    clamp(centerOffsetInches - halfWidth - padding, -wallLengthInches / 2, wallLengthInches / 2),
    clamp(centerOffsetInches + halfWidth + padding, -wallLengthInches / 2, wallLengthInches / 2)
  );
}

function getCabinetCenterOffsetInches(
  cabinet: AiCabinet,
  axis: WallAxis,
  gridSize: number
) {
  return pixelsToInches(dot(sub(cabinet.center, axis.midpoint), axis.direction), gridSize);
}

function reserveExistingWallObjects(
  room: AiRoomInput,
  selectedWalls: WallEntry[],
  baseReservations: Map<string, WallReservation[]>,
  upperReservations: Map<string, WallReservation[]>,
  notes: string[]
) {
  const reservedBaseIds = new Set<string>();
  const reservedUpperIds = new Set<string>();

  selectedWalls.forEach((wallEntry, wallIndex) => {
    const wallLengthInches = wallEntry.axis.lengthInches;

    room.doors
      .filter((doorItem) => doorItem.wallId === wallEntry.wall.id)
      .forEach((doorItem) => {
        const centerOffset = doorItem.t * wallLengthInches;
        const widthInches = pixelsToInches(doorItem.width, room.meta.gridSize);
        reserveOpeningFootprint(
          baseReservations,
          wallEntry.wall.id,
          wallLengthInches,
          centerOffset,
          widthInches,
          2
        );
        reserveOpeningFootprint(
          upperReservations,
          wallEntry.wall.id,
          wallLengthInches,
          centerOffset,
          widthInches,
          2
        );
      });

    room.windows
      .filter((windowItem) => windowItem.wallId === wallEntry.wall.id)
      .forEach((windowItem) => {
        const centerOffset = windowItem.t * wallLengthInches;
        const widthInches = pixelsToInches(windowItem.width, room.meta.gridSize);
        reserveOpeningFootprint(
          upperReservations,
          wallEntry.wall.id,
          wallLengthInches,
          centerOffset,
          widthInches,
          2
        );
      });

    room.cabinets
      .filter(
        (cabinetItem) => cabinetItem.wallId === wallEntry.wall.id && isLockedCabinet(cabinetItem)
      )
      .forEach((cabinetItem) => {
        const category = getCabinetElevationCategory(cabinetItem);
        const centerOffset = getCabinetCenterOffsetInches(
          cabinetItem,
          wallEntry.axis,
          room.meta.gridSize
        );
        const widthInches = pixelsToInches(cabinetItem.width, room.meta.gridSize);

        if (isFloorStandingKitchenCategory(category)) {
          reserveCabinetFootprint(
            baseReservations,
            wallEntry.wall.id,
            centerOffset,
            widthInches,
            1
          );
          reservedBaseIds.add(cabinetItem.id);
        }

        if (isUpperOrPantryKitchenCategory(category)) {
          reserveCabinetFootprint(
            upperReservations,
            wallEntry.wall.id,
            centerOffset,
            widthInches,
            1
          );
          reservedUpperIds.add(cabinetItem.id);
        }
      });

    const preservedCount = room.cabinets.filter(
      (cabinetItem) => cabinetItem.wallId === wallEntry.wall.id && isLockedCabinet(cabinetItem)
    ).length;
    const doorCount = room.doors.filter((doorItem) => doorItem.wallId === wallEntry.wall.id).length;
    const windowCount = room.windows.filter((windowItem) => windowItem.wallId === wallEntry.wall.id).length;

    if (preservedCount > 0 || doorCount > 0 || windowCount > 0) {
      notes.push(
        `Wall ${wallIndex + 1} includes ${preservedCount} locked object(s), ${doorCount} door opening(s), and ${windowCount} window opening(s), so those spans were reserved before new cabinet placement.`
      );
    }
  });
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
  allWalls: AiWall[],
  reservations: Map<string, WallReservation[]>
) {
  const insets = getInsets(wallEntry.wall, "wall", allWalls);
  const wallStart = -wallEntry.axis.lengthInches / 2 + insets.start;
  const wallEnd = wallEntry.axis.lengthInches / 2 - insets.end;
  return subtractReservations(
    wallStart,
    wallEnd,
    reservations.get(wallEntry.wall.id) ?? []
  );
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
    "base-blind-left-cabinet",
  ]);
  const blindRight = getCatalogItem(room.catalog, "base", [
    "base-blind-right-cabinet",
    "base-blind-left-cabinet",
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
    `Started at an available corner by placing a ${blindItem.title.toLowerCase()} on the vertical wall with its handle exposed, reserving its ${blindDepthOnHorizontalWall}" floor-plan projection on the horizontal wall, then adding a same-height ${companion.title.toLowerCase()} next to it without overlap.`
  );
}

function getLayoutType(selectedWalls: WallEntry[], corners: CornerPair[]) {
  if (selectedWalls.length <= 1) return "single-wall";
  if (corners.length >= 1) return "l-shape";
  return "galley";
}

export function filterRoomForKitchenGeneration(room: AiRoomInput): AiRoomInput {
  return {
    ...room,
    cabinets: room.cabinets.filter((cabinetItem) => isLockedCabinet(cabinetItem)),
  };
}

export function generateKitchenLayout(
  room: AiRoomInput,
  _options: KitchenDesignOptions = {}
): GeneratedKitchenLayout {
  const thickWalls = room.walls.filter((wall) => wall.kind !== "thin-wall");
  const targetWalls = thickWalls;
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
  const lockedCabinets = room.cabinets.filter((cabinet) => isLockedCabinet(cabinet));
  const cabinets: AiCabinet[] = [...lockedCabinets];
  const notes: string[] = [];
  const baseReservations = new Map<string, WallReservation[]>();
  const upperReservations = new Map<string, WallReservation[]>();

  if (!primary) {
    return {
      room,
      cabinets: [],
      summary: {
        layoutType: "single-wall",
        notes: ["No thick walls available. Draw thin walls and convert them first."],
      } as GeneratedKitchenLayout["summary"],
      elevations: [],
    };
  }

  const sinkBase = getCatalogItem(room.catalog, "base", [
    "base-sink-cabinet",
    "base-farm-sink-cabinet",
    "base-sink-two-door-panel-cabinet",
    "base-sink-one-door-panel-cabinet",
  ]);
  const drawerBase = getCatalogItem(room.catalog, "base", [
    "base-drawer-cabinet",
    "base-two-drawer-cabinet",
  ]);
  const doorBase = getCatalogItem(room.catalog, "base", [
    "base-two-door-cabinet",
    "base-two-door-one-drawer-cabinet",
    "base-one-door-cabinet",
  ]);
  const wallPair = getCatalogItem(room.catalog, "wall", [
    "wall-two-door-cabinet",
    "wall-one-door-cabinet",
  ]);
  const wallHood = getCatalogItem(room.catalog, "wall", [
    "wall-two-door-cabinet",
    "wall-one-door-cabinet",
  ]);
  const pantryCabinet = getCatalogItem(room.catalog, "base", [
    "base-pantry-two-door-cabinet",
    "base-pantry-one-door-cabinet",
  ]);
  const corners = findCornerPairs(selectedWalls);

  notes.push(`Using all ${selectedWalls.length} thick wall side(s) for kitchen generation.`);
  if (lockedCabinets.length > 0) {
    notes.push(
      `Preserved ${lockedCabinets.length} locked cabinet/product object(s) before filling new runs.`
    );
  }
  reserveExistingWallObjects(room, selectedWalls, baseReservations, upperReservations, notes);

  if (corners.length > 0) {
    notes.push(
      `Detected ${corners.length} usable corner(s) across the available walls, so the designer started with corner base cabinets first.`
    );
  }

  for (const corner of corners) {
    placeCornerBaseCabinets({
      room,
      corner,
      cabinets,
      reservations: baseReservations,
      notes,
    });
  }

  for (let wallIndex = 0; wallIndex < selectedWalls.length; wallIndex += 1) {
    const wallEntry = selectedWalls[wallIndex];
    if (!drawerBase || !doorBase) continue;
    const availableSegments = getAvailableBaseSegments(
      wallEntry,
      thickWalls,
      baseReservations
    );
    const isPrimaryWall = wallIndex === 0;
    const hasCornerReservation = (baseReservations.get(wallEntry.wall.id) ?? []).length > 0;
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
        reserveCabinetFootprint(baseReservations, wallEntry.wall.id, 0, sinkBase.widthInches);
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
          `Reserved the center of wall ${wallIndex + 1} for a sink base and filled the remaining base run on both sides.`
        );
        continue;
      }

      const canPlacePantry =
        !pantryPlaced &&
        !isPrimaryWall &&
        pantryCabinet &&
        segmentWidth >= pantryCabinet.widthInches + 18;

      if (canPlacePantry && pantryCabinet) {
        const pantryCenter = segment.end - pantryCabinet.widthInches / 2 - 1.5;
        appendWithoutOverlap(cabinets, [
          placeCabinetOnWall({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalogItem: pantryCabinet,
            centerOffsetInches: pantryCenter,
            gridSize,
            wallThickness,
            distanceFromFloorInches: 0,
            heightInches: 84,
          }),
        ]);
        reserveCabinetFootprint(
          baseReservations,
          wallEntry.wall.id,
          pantryCenter,
          pantryCabinet.widthInches
        );
        reserveCabinetFootprint(
          upperReservations,
          wallEntry.wall.id,
          pantryCenter,
          pantryCabinet.widthInches
        );
        pantryPlaced = true;
        notes.push(`Placed a pantry cabinet at the end of wall ${wallIndex + 1}.`);
      }
    }

    const refreshedSegments = getAvailableBaseSegments(
      wallEntry,
      thickWalls,
      baseReservations
    );
    const wallReservations = baseReservations.get(wallEntry.wall.id) ?? [];
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
        `Filled the remaining width of wall ${wallIndex + 1} with base cabinets after handling its corner and pantry-unit needs.`
      );
    }
  }

  for (let wallIndex = 0; wallIndex < selectedWalls.length; wallIndex += 1) {
    const wallEntry = selectedWalls[wallIndex];
    if (!wallPair) continue;

    const upperSegments = getAvailableUpperSegments(wallEntry, thickWalls, upperReservations);
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
        `After the base run was established, filled wall ${wallIndex + 1} with upper cabinets across the usable wall width.`
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
    } as GeneratedKitchenLayout["summary"],
    elevations: targetWalls.map((wall, index) => ({
      wallId: wall.id,
      label: `Wall ${index + 1}`,
      cabinetCount: cabinets.filter((cabinet) => cabinet.wallId === wall.id).length,
    })),
  };
}

function isStandardUpperRunCatalogItem(item: AiCatalogItem) {
  return item.category === "wall" && (item.image === "wall-two-doors" || item.image === "wall-one-door");
}

function getCatalogItemById(
  catalog: AiCatalogItem[],
  catalogId: string | null | undefined,
  category: KitchenCabinetCategory
) {
  if (!catalogId) return null;

  return (
    catalog.find(
      (candidate) => candidate.id === catalogId && catalogItemMatchesCategory(candidate, category)
    ) ?? null
  );
}

function getFallbackBasePattern(catalog: AiCatalogItem[]) {
  return [
    getCatalogItemById(catalog, "base-drawer-cabinet", "base")?.id,
    getCatalogItemById(catalog, "base-two-door-cabinet", "base")?.id,
    getCatalogItemById(catalog, "base-one-door-cabinet", "base")?.id,
  ].filter((itemId): itemId is string => Boolean(itemId));
}

function getFallbackUpperPattern(catalog: AiCatalogItem[]) {
  return [
    getCatalogItemById(catalog, "wall-two-door-cabinet", "wall")?.id,
    getCatalogItemById(catalog, "wall-one-door-cabinet", "wall")?.id,
  ].filter((itemId): itemId is string => Boolean(itemId));
}

function normalizeBasePattern(catalog: AiCatalogItem[], pattern: string[] | undefined) {
  const normalized = (pattern ?? [])
    .map((itemId) => getCatalogItemById(catalog, itemId, "base"))
    .filter((item): item is AiCatalogItem => Boolean(item && isStandardRunCatalogItem(item)))
    .map((item) => item.id);

  return normalized.length > 0 ? normalized : getFallbackBasePattern(catalog);
}

function normalizeUpperPattern(catalog: AiCatalogItem[], pattern: string[] | undefined) {
  const normalized = (pattern ?? [])
    .map((itemId) => getCatalogItemById(catalog, itemId, "wall"))
    .filter(
      (item): item is AiCatalogItem => Boolean(item && isStandardUpperRunCatalogItem(item))
    )
    .map((item) => item.id);

  return normalized.length > 0 ? normalized : getFallbackUpperPattern(catalog);
}

function getNormalizedWallPlans(
  room: AiRoomInput,
  plan: SmartKitchenPlan,
  targetWalls: AiWall[]
) {
  const targetWallIds = new Set(targetWalls.map((wall) => wall.id));
  const wallPlans = new Map<string, NormalizedWallPlan>();

  plan.wallPlans.forEach((wallPlan) => {
    if (!targetWallIds.has(wallPlan.wallId)) return;

    wallPlans.set(wallPlan.wallId, {
      ...wallPlan,
      wallId: wallPlan.wallId,
      wallLabel: wallPlan.wallLabel ?? wallPlan.wallId,
      needsPlacement: wallPlan.needsPlacement ?? true,
      placements: Array.isArray(wallPlan.placements)
        ? wallPlan.placements.filter((placement) =>
            Boolean(getCatalogItemById(room.catalog, placement.catalogId, "base")) ||
            Boolean(getCatalogItemById(room.catalog, placement.catalogId, "wall")) ||
            Boolean(getCatalogItemById(room.catalog, placement.catalogId, "pantry"))
          )
        : undefined,
      sinkCatalogId:
        getCatalogItemById(room.catalog, wallPlan.sinkCatalogId, "base")?.id ?? null,
      pantryCatalogId:
        getCatalogItemById(room.catalog, wallPlan.pantryCatalogId, "pantry")?.id ?? null,
      upperFeatureCatalogId:
        getCatalogItemById(room.catalog, wallPlan.upperFeatureCatalogId, "wall")?.id ?? null,
      upperDistanceFromFloorInches:
        typeof wallPlan.upperDistanceFromFloorInches === "number"
          ? clamp(wallPlan.upperDistanceFromFloorInches, 36, 84)
          : null,
      upperFeatureDistanceFromFloorInches:
        typeof wallPlan.upperFeatureDistanceFromFloorInches === "number"
          ? clamp(wallPlan.upperFeatureDistanceFromFloorInches, 36, 84)
          : null,
      basePattern: wallPlan.skipBaseRun
        ? []
        : normalizeBasePattern(room.catalog, wallPlan.basePattern),
      upperPattern: wallPlan.skipUpperRun
        ? []
        : normalizeUpperPattern(room.catalog, wallPlan.upperPattern),
      notes: wallPlan.notes ?? [],
    });
  });

  return wallPlans;
}

function sortWallsByPlanOrder(
  walls: AiWall[],
  plan: SmartKitchenPlan,
  roomCenter: AiPoint,
  gridSize: number,
  wallThickness: number
) {
  const planOrder = new Map(plan.wallOrder.map((wallId, index) => [wallId, index]));

  return [...walls]
    .map((wall) => {
      const axis = getWallAxis(wall, roomCenter, gridSize, wallThickness);

      return {
        wall,
        axis,
        orientation: getWallOrientation(axis),
      } satisfies WallEntry;
    })
    .sort((left, right) => {
      const leftOrder = planOrder.get(left.wall.id);
      const rightOrder = planOrder.get(right.wall.id);

      if (leftOrder !== undefined && rightOrder !== undefined) {
        return leftOrder - rightOrder;
      }
      if (leftOrder !== undefined) return -1;
      if (rightOrder !== undefined) return 1;

      return right.axis.lengthInches - left.axis.lengthInches;
    });
}

function getDefaultHeightInches(item: AiCatalogItem) {
  const catalogItem = item as AiCatalogItem & { heightInches?: number };
  return catalogItem.heightInches ?? (item.category === "wall" ? 30 : isPantryCategory(item.category) ? 84 : 34.5);
}

type AiWallWithElevationWidth = AiWall & {
  elevationPlan?: {
    widthInches?: number;
  };
  elevationWidthInches?: number;
};

function getPlacementWallWidthInches(wallEntry: WallEntry) {
  const wallWithMetadata = wallEntry.wall as AiWallWithElevationWidth;
  const elevationWidth =
    wallWithMetadata.elevationPlan?.widthInches ?? wallWithMetadata.elevationWidthInches;

  return typeof elevationWidth === "number" && Number.isFinite(elevationWidth) && elevationWidth > 0
    ? elevationWidth
    : wallEntry.axis.lengthInches;
}

function applyPlacementTopOption(
  cabinet: AiCabinet,
  placement: SmartKitchenPlacement
): AiCabinet {
  if (placement.topOption === "sink") {
    return {
      ...cabinet,
      sinkFixture: true,
      cooktopFixture: undefined,
      cooktopFrontHeightInches: undefined,
    };
  }

  if (placement.topOption === "surface-cooktop") {
    return {
      ...cabinet,
      sinkFixture: false,
      cooktopFixture: "surface",
      cooktopFrontHeightInches: undefined,
    };
  }

  if (placement.topOption === "front-control-cooktop") {
    return {
      ...cabinet,
      sinkFixture: false,
      cooktopFixture: "front",
      cooktopFrontHeightInches: 3,
    };
  }

  return cabinet;
}

function addCabinetReservations(
  baseReservations: Map<string, WallReservation[]>,
  upperReservations: Map<string, WallReservation[]>,
  wallId: string,
  centerOffsetInches: number,
  widthInches: number,
  category: KitchenCabinetCategory
) {
  if (isFloorStandingKitchenCategory(category)) {
    reserveCabinetFootprint(baseReservations, wallId, centerOffsetInches, widthInches, 1);
  }

  if (isUpperOrPantryKitchenCategory(category)) {
    reserveCabinetFootprint(upperReservations, wallId, centerOffsetInches, widthInches, 1);
  }
}

function hasExplicitPlacementPlan(wallPlans: Map<string, NormalizedWallPlan>) {
  return Array.from(wallPlans.values()).some(
    (wallPlan) =>
      wallPlan.needsPlacement !== undefined ||
      Array.isArray(wallPlan.placements)
  );
}

export function generateSmartKitchenLayout(
  room: AiRoomInput,
  plan: SmartKitchenPlan,
  _options: KitchenDesignOptions = {}
): GeneratedKitchenLayout {
  const filteredRoom = filterRoomForKitchenGeneration(room);
  const thickWalls = filteredRoom.walls.filter((wall) => wall.kind !== "thin-wall");
  const targetWalls = thickWalls;
  const roomCenter = getRoomCenter(thickWalls);
  const wallThickness = filteredRoom.meta.wallThickness;
  const gridSize = filteredRoom.meta.gridSize;
  const selectedWalls = sortWallsByPlanOrder(
    targetWalls,
    plan,
    roomCenter,
    gridSize,
    wallThickness
  );
  const wallPlans = getNormalizedWallPlans(filteredRoom, plan, targetWalls);
  const primary = selectedWalls[0] ?? null;
  const lockedCabinets = filteredRoom.cabinets.filter((cabinet) => isLockedCabinet(cabinet));
  const cabinets: AiCabinet[] = [...lockedCabinets];
  const notes = [
    `Smart planner used ${selectedWalls.length} wall side(s) for a ${plan.layoutType} kitchen.`,
    ...plan.notes,
    ...(plan.warnings ?? []).map((warning) => `Planner warning: ${warning.message}`),
  ];
  const baseReservations = new Map<string, WallReservation[]>();
  const upperReservations = new Map<string, WallReservation[]>();

  if (!primary) {
    return {
      room: filteredRoom,
      cabinets: [],
      summary: {
        layoutType: plan.layoutType,
        notes: [
          "The smart planner did not receive any usable thick walls to design against.",
        ],
        generationMethod: "smart-ai",
        plannerModel: plan.plannerModel,
      } as GeneratedKitchenLayout["summary"],
      elevations: [],
    };
  }

  const defaultSinkBase = getCatalogItem(filteredRoom.catalog, "base", [
    "base-sink-cabinet",
    "base-farm-sink-cabinet",
    "base-sink-two-door-panel-cabinet",
    "base-sink-one-door-panel-cabinet",
  ]);
  const defaultPantryCabinet = getCatalogItem(filteredRoom.catalog, "base", [
    "base-pantry-two-door-cabinet",
    "base-pantry-one-door-cabinet",
  ]);
  const defaultWallHood = getCatalogItem(filteredRoom.catalog, "wall", [
    "wall-two-door-cabinet",
    "wall-one-door-cabinet",
  ]);
  const corners = findCornerPairs(selectedWalls);

  if (lockedCabinets.length > 0) {
    notes.push(
      `Preserved ${lockedCabinets.length} locked cabinet/product object(s) from the available walls and designed around them.`
    );
  }
  reserveExistingWallObjects(
    filteredRoom,
    selectedWalls,
    baseReservations,
    upperReservations,
    notes
  );

  if (hasExplicitPlacementPlan(wallPlans)) {
    for (let wallIndex = 0; wallIndex < selectedWalls.length; wallIndex += 1) {
      const wallEntry = selectedWalls[wallIndex];
      const wallPlan = wallPlans.get(wallEntry.wall.id);

      if (!wallPlan || wallPlan.needsPlacement === false) continue;

      wallPlan.notes.forEach((note) => {
        notes.push(`${wallPlan.wallLabel ?? `Wall ${wallIndex + 1}`}: ${note}`);
      });

      if ((wallPlan.placements?.length ?? 0) === 0) {
        notes.push(`${wallPlan.wallLabel ?? `Wall ${wallIndex + 1}`}: left open intentionally.`);
        continue;
      }

      for (const placement of wallPlan.placements ?? []) {
        const catalogItem =
          filteredRoom.catalog.find((item) => item.id === placement.catalogId) ?? null;

        if (!catalogItem) continue;

        const wallWidthInches = getPlacementWallWidthInches(wallEntry);
        const leftInches = placement.leftInches;
        const spanWidthInches = placement.widthInches ?? catalogItem.widthInches;
        const projectionDepthInches =
          placement.depthInches ?? catalogItem.depthInches;
        const widthInches = spanWidthInches;

        if (leftInches < -0.01 || leftInches + widthInches > wallWidthInches + 0.01) {
          notes.push(
            `${wallPlan.wallLabel ?? `Wall ${wallIndex + 1}`}: skipped ${catalogItem.title.toLowerCase()} because it would exceed the wall width.`
          );
          continue;
        }

        const heightInches = placement.heightInches ?? getDefaultHeightInches(catalogItem);
        const defaultBottomInches =
          catalogItem.category === "wall"
            ? catalogItem.defaultDistanceFromFloorInches ?? 54
            : 0;
        const bottomInches = clamp(
          placement.bottomInches ?? defaultBottomInches,
          0,
          Math.max(0, 96 - heightInches)
        );
        const centerOffsetInches =
          -wallWidthInches / 2 + leftInches + widthInches / 2;

        let plannedCabinet = placeCabinetOnWall({
          wall: wallEntry.wall,
          axis: wallEntry.axis,
          catalogItem,
          centerOffsetInches,
          widthInches: spanWidthInches,
          depthInches: projectionDepthInches,
          wallFace: placement.resolvedWallFace ?? "left",
          gridSize,
          wallThickness,
          distanceFromFloorInches: bottomInches,
          heightInches,
        });
        plannedCabinet = {
          ...applyPlacementTopOption(plannedCabinet, placement),
          isProduct: catalogItem.isProduct ?? false,
        };

        if (
          (plannedCabinet.image === "base-blind-left" ||
            plannedCabinet.image === "base-blind-right" ||
            plannedCabinet.image === "wall-blind-left" ||
            plannedCabinet.image === "wall-blind-right") &&
          placement.builtInFillerWidthInches !== null &&
          placement.builtInFillerWidthInches !== undefined
        ) {
          plannedCabinet = {
            ...plannedCabinet,
            blindFillerWidthInches: placement.builtInFillerWidthInches,
            blindDoorWidthInches: getBlindDoorWidthInches(
              plannedCabinet,
              spanWidthInches
            ),
          };
        }

        if (cabinets.some((existing) => cabinetsOverlap(plannedCabinet, existing))) {
          notes.push(
            `${wallPlan.wallLabel ?? `Wall ${wallIndex + 1}`}: skipped ${catalogItem.title.toLowerCase()} because it would overlap an existing object.`
          );
          continue;
        }

        cabinets.push(plannedCabinet);
        addCabinetReservations(
          baseReservations,
          upperReservations,
          wallEntry.wall.id,
          centerOffsetInches,
          widthInches,
          catalogItem.category
        );
      }
    }

    return {
      room: filteredRoom,
      cabinets,
      summary: {
        layoutType: plan.layoutType,
        notes,
        generationMethod: "smart-ai",
        plannerModel: plan.plannerModel,
      } as GeneratedKitchenLayout["summary"],
      elevations: targetWalls.map((wall, index) => ({
        wallId: wall.id,
        label: `Wall ${index + 1}`,
        cabinetCount: cabinets.filter((cabinet) => cabinet.wallId === wall.id).length,
      })),
    };
  }

  if (corners.length > 0 && plan.layoutType !== "single-wall") {
    notes.push(
      `The smart planner kept ${corners.length} detected corner connection(s) available for corner-first cabinet placement.`
    );

    for (const corner of corners) {
      placeCornerBaseCabinets({
        room: filteredRoom,
        corner,
        cabinets,
        reservations: baseReservations,
        notes,
      });
    }
  }

  for (let wallIndex = 0; wallIndex < selectedWalls.length; wallIndex += 1) {
    const wallEntry = selectedWalls[wallIndex];
    const wallPlan = wallPlans.get(wallEntry.wall.id);
    const basePattern = wallPlan?.basePattern ?? getFallbackBasePattern(filteredRoom.catalog);
    const sinkBase =
      getCatalogItemById(filteredRoom.catalog, wallPlan?.sinkCatalogId, "base") ??
      defaultSinkBase;
    const pantryCabinet =
      getCatalogItemById(filteredRoom.catalog, wallPlan?.pantryCatalogId, "pantry") ??
      defaultPantryCabinet;
    const availableSegments = getAvailableBaseSegments(
      wallEntry,
      thickWalls,
      baseReservations
    );
    const hasCornerReservation =
      (baseReservations.get(wallEntry.wall.id) ?? []).length > 0;
    let pantryPlaced = false;

    wallPlan?.notes.forEach((note) => {
      notes.push(`Wall ${wallIndex + 1}: ${note}`);
    });

    for (const segment of availableSegments) {
      const segmentWidth = segment.end - segment.start;
      const canCenterSink =
        Boolean(wallPlan?.placeSink) &&
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
            catalog: filteredRoom.catalog,
            gridSize,
            wallThickness,
            category: "base",
            preferredPattern: basePattern,
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
        reserveCabinetFootprint(baseReservations, wallEntry.wall.id, 0, sinkBase.widthInches);
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: filteredRoom.catalog,
            gridSize,
            wallThickness,
            category: "base",
            preferredPattern: basePattern,
            distanceFromFloorInches: 0,
            heightInches: 34.5,
            segmentStartInches: rightStart,
            segmentEndInches: segment.end,
            align: "end",
          })
        );
        notes.push(
          `Wall ${wallIndex + 1}: centered ${sinkBase.title.toLowerCase()} as the main work-zone anchor.`
        );
        continue;
      }

      const canPlacePantry =
        !pantryPlaced &&
        Boolean(wallPlan?.placePantry) &&
        pantryCabinet &&
        segmentWidth >= pantryCabinet.widthInches + 18;

      if (canPlacePantry && pantryCabinet) {
        const pantryCenter = segment.end - pantryCabinet.widthInches / 2 - 1.5;

        appendWithoutOverlap(cabinets, [
          placeCabinetOnWall({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalogItem: pantryCabinet,
            centerOffsetInches: pantryCenter,
            gridSize,
            wallThickness,
            distanceFromFloorInches: 0,
            heightInches: 84,
          }),
        ]);
        reserveCabinetFootprint(
          baseReservations,
          wallEntry.wall.id,
          pantryCenter,
          pantryCabinet.widthInches
        );
        reserveCabinetFootprint(
          upperReservations,
          wallEntry.wall.id,
          pantryCenter,
          pantryCabinet.widthInches
        );
        pantryPlaced = true;
        notes.push(
          `Wall ${wallIndex + 1}: placed ${pantryCabinet.title.toLowerCase()} at the end of the run for pantry storage.`
        );
      }
    }

    const refreshedSegments = getAvailableBaseSegments(
      wallEntry,
      thickWalls,
      baseReservations
    );
    const wallReservations = baseReservations.get(wallEntry.wall.id) ?? [];

    if (basePattern.length === 0) {
      notes.push(`Wall ${wallIndex + 1}: left the base run open around the preserved objects and openings.`);
      continue;
    }

    for (const segment of refreshedSegments) {
      appendWithoutOverlap(
        cabinets,
        createRun({
          wall: wallEntry.wall,
          axis: wallEntry.axis,
          catalog: filteredRoom.catalog,
          gridSize,
          wallThickness,
          category: "base",
          preferredPattern: basePattern,
          distanceFromFloorInches: 0,
          heightInches: 34.5,
          segmentStartInches: segment.start,
          segmentEndInches: segment.end,
          align: getSegmentFillAlignment(segment, wallReservations),
          maxCount: 12,
        })
      );
    }
  }

  for (let wallIndex = 0; wallIndex < selectedWalls.length; wallIndex += 1) {
    const wallEntry = selectedWalls[wallIndex];
    const wallPlan = wallPlans.get(wallEntry.wall.id);
    const upperPattern =
      wallPlan?.upperPattern ?? getFallbackUpperPattern(filteredRoom.catalog);
    const upperFeature =
      wallPlan?.placeHood
        ? getCatalogItemById(
            filteredRoom.catalog,
            wallPlan.upperFeatureCatalogId,
            "wall"
          ) ?? defaultWallHood
        : null;
    const upperDistanceFromFloorInches = wallPlan?.upperDistanceFromFloorInches ?? 54;
    const upperFeatureDistanceFromFloorInches =
      wallPlan?.upperFeatureDistanceFromFloorInches ?? upperDistanceFromFloorInches;
    const upperSegments = getAvailableUpperSegments(
      wallEntry,
      thickWalls,
      upperReservations
    );

    if (upperPattern.length === 0 && !upperFeature) {
      notes.push(`Wall ${wallIndex + 1}: left the upper run open for balance, clearance, or to respect the existing features.`);
      continue;
    }

    for (const segment of upperSegments) {
      if (
        upperFeature &&
        segment.start <= -upperFeature.widthInches / 2 &&
        segment.end >= upperFeature.widthInches / 2 &&
        segment.end - segment.start >= upperFeature.widthInches + 24
      ) {
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: filteredRoom.catalog,
            gridSize,
            wallThickness,
            category: "wall",
            preferredPattern: upperPattern,
            distanceFromFloorInches: upperDistanceFromFloorInches,
            heightInches: 30,
            segmentStartInches: segment.start,
            segmentEndInches: -upperFeature.widthInches / 2 - 3,
          })
        );
        appendWithoutOverlap(cabinets, [
          placeCabinetOnWall({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalogItem: upperFeature,
            centerOffsetInches: 0,
            gridSize,
            wallThickness,
            distanceFromFloorInches: upperFeatureDistanceFromFloorInches,
            heightInches: 30,
          }),
        ]);
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: filteredRoom.catalog,
            gridSize,
            wallThickness,
            category: "wall",
            preferredPattern: upperPattern,
            distanceFromFloorInches: upperDistanceFromFloorInches,
            heightInches: 30,
            segmentStartInches: upperFeature.widthInches / 2 + 3,
            segmentEndInches: segment.end,
            align: "end",
            maxCount: 8,
          })
        );
        notes.push(
          `Wall ${wallIndex + 1}: centered ${upperFeature.title.toLowerCase()} within the upper run.`
        );
      } else {
        appendWithoutOverlap(
          cabinets,
          createRun({
            wall: wallEntry.wall,
            axis: wallEntry.axis,
            catalog: filteredRoom.catalog,
            gridSize,
            wallThickness,
            category: "wall",
            preferredPattern: upperPattern,
            distanceFromFloorInches: upperDistanceFromFloorInches,
            heightInches: 30,
            segmentStartInches: segment.start,
            segmentEndInches: segment.end,
            maxCount: 12,
          })
        );
      }
    }
  }

  return {
    room: filteredRoom,
    cabinets,
    summary: {
      layoutType: plan.layoutType,
      notes,
      generationMethod: "smart-ai",
      plannerModel: plan.plannerModel,
    } as GeneratedKitchenLayout["summary"],
    elevations: targetWalls.map((wall, index) => ({
      wallId: wall.id,
      label: `Wall ${index + 1}`,
      cabinetCount: cabinets.filter((cabinet) => cabinet.wallId === wall.id).length,
    })),
  };
}
