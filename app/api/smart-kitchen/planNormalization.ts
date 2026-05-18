import type {
  AiRoomInput,
  SmartKitchenPlacement,
  SmartKitchenPlacementWallFace,
  SmartKitchenPlan,
  SmartKitchenWallPlan,
} from "@/lib/ai/types";

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toBoolean(value: unknown) {
  return value === true;
}

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

function normalizePlacement(value: unknown): SmartKitchenPlacement | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const catalogId = typeof candidate.catalogId === "string" ? candidate.catalogId : null;
  const leftInches = toNullableNumber(candidate.leftInches);
  const bottomInches = toNullableNumber(candidate.bottomInches);
  const wallFace =
    candidate.wallFace === "interior" || candidate.wallFace === "exterior"
      ? candidate.wallFace
      : null;
  const topOption =
    candidate.topOption === "sink" ||
    candidate.topOption === "surface-cooktop" ||
    candidate.topOption === "front-control-cooktop"
      ? candidate.topOption
      : null;
  const legacyThicknessInches = toNullableNumber(candidate.thicknessInches);
  const parsedWidthInches = toNullableNumber(candidate.widthInches);
  const parsedDepthInches = toNullableNumber(candidate.depthInches);

  if (!catalogId || leftInches === null) return null;

  return {
    catalogId,
    leftInches,
    bottomInches,
    wallFace,
    widthInches: legacyThicknessInches ?? parsedWidthInches,
    depthInches:
      parsedDepthInches ?? (legacyThicknessInches !== null ? parsedWidthInches : null),
    heightInches: toNullableNumber(candidate.heightInches),
    builtInFillerWidthInches:
      toNullableNumber(candidate.builtInFillerWidthInches) ??
      toNullableNumber(candidate.builtInFillerThicknessInches),
    topOption,
    notes: toStringArray(candidate.notes),
  };
}

function normalizeWallPlan(
  room: AiRoomInput,
  value: unknown,
  resolvePlacementWallFace: (
    room: AiRoomInput,
    wall: AiRoomInput["walls"][number],
    wallFace: SmartKitchenPlacementWallFace | null
  ) => "left" | "right" | null
): SmartKitchenWallPlan | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const wallLabelLookup = getWallLabelLookup(room);
  const labelToIdLookup = new Map(
    Array.from(wallLabelLookup.entries()).map(([resolvedWallId, resolvedWallLabel]) => [
      resolvedWallLabel.toLowerCase(),
      resolvedWallId,
    ])
  );
  const wallIdCandidate =
    typeof candidate.wallId === "string" ? candidate.wallId : null;
  const wallLabelCandidate =
    typeof candidate.wallLabel === "string" ? candidate.wallLabel : null;
  const wallId =
    wallIdCandidate && room.walls.some((wall) => wall.id === wallIdCandidate && wall.kind !== "thin-wall")
      ? wallIdCandidate
      : wallLabelCandidate
        ? (labelToIdLookup.get(wallLabelCandidate.trim().toLowerCase()) ?? null)
        : null;

  if (!wallId || !room.walls.some((wall) => wall.id === wallId && wall.kind !== "thin-wall")) {
    return null;
  }

  const resolvedWall = room.walls.find(
    (wall) => wall.id === wallId && wall.kind !== "thin-wall"
  );

  if (!resolvedWall) return null;

  const role =
    candidate.role === "primary" ||
    candidate.role === "secondary" ||
    candidate.role === "storage" ||
    candidate.role === "upper-focus"
      ? candidate.role
      : "secondary";

  const normalizedPlacements: SmartKitchenPlacement[] = [];

  for (const rawPlacement of Array.isArray(candidate.placements) ? candidate.placements : []) {
    const placement = normalizePlacement(rawPlacement);
    if (!placement) continue;

    normalizedPlacements.push({
      ...placement,
      resolvedWallFace: resolvePlacementWallFace(
        room,
        resolvedWall,
        placement.wallFace ?? null
      ),
    });
  }

  return {
    wallId,
    wallLabel: wallLabelLookup.get(wallId) ?? wallId,
    needsPlacement: toBoolean(candidate.needCabinetPlacement ?? candidate.needsPlacement),
    placements: normalizedPlacements,
    role,
    placeSink: toBoolean(candidate.placeSink),
    sinkCatalogId:
      typeof candidate.sinkCatalogId === "string" ? candidate.sinkCatalogId : null,
    placePantry: toBoolean(candidate.placePantry),
    pantryCatalogId:
      typeof candidate.pantryCatalogId === "string" ? candidate.pantryCatalogId : null,
    placeHood: toBoolean(candidate.placeHood),
    upperFeatureCatalogId:
      typeof candidate.upperFeatureCatalogId === "string"
        ? candidate.upperFeatureCatalogId
        : null,
    upperDistanceFromFloorInches: toNullableNumber(candidate.upperDistanceFromFloorInches),
    upperFeatureDistanceFromFloorInches: toNullableNumber(
      candidate.upperFeatureDistanceFromFloorInches
    ),
    skipBaseRun:
      Array.isArray(candidate.basePattern) && toStringArray(candidate.basePattern).length === 0,
    skipUpperRun:
      Array.isArray(candidate.upperPattern) && toStringArray(candidate.upperPattern).length === 0,
    basePattern: toStringArray(candidate.basePattern),
    upperPattern: toStringArray(candidate.upperPattern),
    notes: toStringArray(candidate.notes),
  };
}

export function normalizeSmartKitchenPlan(
  room: AiRoomInput,
  rawPlan: unknown,
  plannerModel: string,
  resolvePlacementWallFace: (
    room: AiRoomInput,
    wall: AiRoomInput["walls"][number],
    wallFace: SmartKitchenPlacementWallFace | null
  ) => "left" | "right" | null
): SmartKitchenPlan {
  const thickWallIds = room.walls
    .filter((wall) => wall.kind !== "thin-wall")
    .map((wall) => wall.id);

  if (!rawPlan || typeof rawPlan !== "object") {
    return {
      layoutType: thickWallIds.length <= 1 ? "single-wall" : "galley",
      wallOrder: thickWallIds,
      wallPlans: [],
      notes: [],
      plannerModel,
    };
  }

  const candidate = rawPlan as Record<string, unknown>;
  const normalizedWallPlans = (
    Array.isArray(candidate.walls)
      ? candidate.walls
      : Array.isArray(candidate.wallPlans)
        ? candidate.wallPlans
        : []
  )
    .map((wallPlan) => normalizeWallPlan(room, wallPlan, resolvePlacementWallFace))
    .filter((wallPlan): wallPlan is SmartKitchenWallPlan => Boolean(wallPlan));

  const plannedWallIds = new Set(normalizedWallPlans.map((wallPlan) => wallPlan.wallId));
  const candidateWallOrder = toStringArray(candidate.wallOrder);
  const wallOrder = [
    ...candidateWallOrder.filter((wallId) => thickWallIds.includes(wallId)),
    ...thickWallIds.filter((wallId) => !candidateWallOrder.includes(wallId)),
  ];

  const layoutType =
    candidate.layoutType === "single-wall" ||
    candidate.layoutType === "galley" ||
    candidate.layoutType === "l-shape" ||
    candidate.layoutType === "u-shape" ||
    candidate.layoutType === "connected-wall-return"
      ? candidate.layoutType
      : wallOrder.length <= 1
        ? "single-wall"
        : plannedWallIds.size >= 2
          ? "l-shape"
          : "galley";

  return {
    layoutType,
    wallOrder,
    wallPlans: normalizedWallPlans,
    notes: toStringArray(candidate.notes),
    plannerModel,
  };
}
