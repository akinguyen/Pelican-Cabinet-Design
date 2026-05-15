import type {
  AiCabinet,
  AiCatalogItem,
  AiDoor,
  AiRoomInput,
  AiWall,
  AiWallChain,
  AiWindow,
} from "@/lib/ai/types";

const POINT_MATCH_TOLERANCE = 0.5;
const FLOOR_SUPPORTED_PANTRY_MIN_HEIGHT_INCHES = 54;

type SmartCatalogItem = AiCatalogItem & {
  id?: string;
  image?: string;
  widthInches?: number;
  depthInches?: number;
  heightInches?: number;
  isAccessory?: boolean;
  accessoryKind?: string | null;
  thicknessInches?: number | null;
  projectedWidthInches?: number | null;
};

function inferAccessoryKind(item: SmartCatalogItem) {
  const key = `${item.id ?? ""} ${item.image ?? ""}`;
  if (key.includes("wall-filler")) return "wall-filler";
  if (key.includes("base-filler") || key.includes("accessory-filler")) return "base-filler";
  if (key.includes("wall-end-panel")) return "wall-end-panel";
  if (key.includes("base-end-panel")) return "base-end-panel";
  return null;
}

function isAccessoryCatalogItem(item: SmartCatalogItem) {
  return Boolean(
    item.isAccessory ||
      item.accessoryKind ||
      String(item.id ?? "").startsWith("accessory-") ||
      String(item.image ?? "").startsWith("accessory-")
  );
}

function getSmartObjectSupportType(item: {
  category?: string;
  widthInches?: number;
  heightInches?: number;
  isProduct?: boolean;
  productCategory?: string;
}) {
  if (item.category === "wall" || item.productCategory === "wall") {
    return "elevated-supported" as const;
  }

  if (item.category === "pantry") {
    return (item.heightInches ?? 0) >= FLOOR_SUPPORTED_PANTRY_MIN_HEIGHT_INCHES
      ? ("floor-supported" as const)
      : ("elevated-supported" as const);
  }

  return "floor-supported" as const;
}

function getSmartObjectHasToeKick(item: {
  category?: string;
  widthInches?: number;
  heightInches?: number;
  image?: string;
  isProduct?: boolean;
}) {
  if (item.isProduct) return false;
  if (String(item.image ?? "").startsWith("accessory-")) return false;

  return (
    (item.category === "base" || item.category === "pantry") &&
    getSmartObjectSupportType(item) === "floor-supported"
  );
}

export function buildSmartInputCatalog(catalog: AiCatalogItem[]) {
  return catalog.map((item) => {
    const catalogItem = { ...item } as SmartCatalogItem;
    const isAccessory = isAccessoryCatalogItem(catalogItem);

    if (!isAccessory) {
      return {
        ...catalogItem,
        supportType: getSmartObjectSupportType(catalogItem),
        hasToeKick: getSmartObjectHasToeKick(catalogItem),
      } as AiCatalogItem;
    }

    const accessoryKind = catalogItem.accessoryKind ?? inferAccessoryKind(catalogItem);

    return {
      ...catalogItem,
      isAccessory: true,
      accessoryKind: accessoryKind ?? undefined,
      // Accessories reuse cabinet geometry fields in the editor:
      // widthInches is displayed as Thickness and depthInches is displayed as Width.
      thicknessInches:
        typeof catalogItem.thicknessInches === "number"
          ? catalogItem.thicknessInches
          : catalogItem.widthInches ?? null,
      projectedWidthInches:
        typeof catalogItem.projectedWidthInches === "number"
          ? catalogItem.projectedWidthInches
          : catalogItem.depthInches ?? null,
      supportType: getSmartObjectSupportType(catalogItem),
      hasToeKick: false,
    } as AiCatalogItem;
  });
}


function pointsMatch(a: AiWall["start"], b: AiWall["start"]) {
  return Math.abs(a.x - b.x) <= POINT_MATCH_TOLERANCE && Math.abs(a.y - b.y) <= POINT_MATCH_TOLERANCE;
}

function wallTouches(first: AiWall, second: AiWall) {
  return (
    pointsMatch(first.start, second.start) ||
    pointsMatch(first.start, second.end) ||
    pointsMatch(first.end, second.start) ||
    pointsMatch(first.end, second.end)
  );
}

function buildWallChains(walls: AiWall[]) {
  const remaining = new Set(walls.map((wall) => wall.id));
  const byId = new Map(walls.map((wall) => [wall.id, wall]));
  const chains: AiWallChain[] = [];

  while (remaining.size > 0) {
    const seedId = remaining.values().next().value as string;
    const queue = [seedId];
    const chainIds: string[] = [];
    remaining.delete(seedId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = byId.get(currentId);
      if (!current) continue;
      chainIds.push(currentId);

      for (const candidateId of Array.from(remaining)) {
        const candidate = byId.get(candidateId);
        if (!candidate) continue;
        if (!wallTouches(current, candidate)) continue;
        remaining.delete(candidateId);
        queue.push(candidateId);
      }
    }

    chains.push({
      id: `chain-${chains.length + 1}`,
      wallIds: chainIds,
    });
  }

  return chains;
}

export function exportRoomInput(params: {
  walls: AiWall[];
  windows: AiWindow[];
  doors: AiDoor[];
  cabinets: AiCabinet[];
  catalog: AiCatalogItem[];
  gridSize: number;
  wallThickness: number;
}) : AiRoomInput {
  const thickWalls = params.walls.filter((wall) => wall.kind !== "thin-wall");

  return {
    walls: thickWalls,
    windows: params.windows.filter((item) => thickWalls.some((wall) => wall.id === item.wallId)),
    doors: params.doors.filter((item) => thickWalls.some((wall) => wall.id === item.wallId)),
    cabinets: params.cabinets
      .filter((item) => Boolean(item.wallId && thickWalls.some((wall) => wall.id === item.wallId)))
      .map((item) => ({
        ...item,
        supportType: getSmartObjectSupportType({
          category: item.category,
          widthInches: item.width / params.gridSize * 12,
          heightInches: item.heightInches,
          isProduct: item.isProduct,
        }),
        hasToeKick: getSmartObjectHasToeKick({
          category: item.category,
          widthInches: item.width / params.gridSize * 12,
          heightInches: item.heightInches,
          image: (item as AiCabinet & { image?: string }).image,
          isProduct: item.isProduct,
        }),
      })),
    catalog: buildSmartInputCatalog(params.catalog),
    wallChains: buildWallChains(thickWalls),
    meta: {
      source: "CabinetEditorAiPrototype",
      unit: "inches",
      coordinateUnit: "pixels",
      measurementUnit: "inches",
      gridSize: params.gridSize,
      gridSizePixelsPerFoot: params.gridSize,
      wallThickness: params.wallThickness,
      wallThicknessPixels: params.wallThickness,
      generatedAt: new Date().toISOString(),
    },
  };
}
