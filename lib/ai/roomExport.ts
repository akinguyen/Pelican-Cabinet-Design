import type {
  AiCatalogItem,
  AiDoor,
  AiRoomInput,
  AiWall,
  AiWallChain,
  AiWindow,
} from "@/lib/ai/types";

const POINT_MATCH_TOLERANCE = 0.5;

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
  catalog: AiCatalogItem[];
  gridSize: number;
  wallThickness: number;
}) : AiRoomInput {
  const thickWalls = params.walls.filter((wall) => wall.kind !== "thin-wall");

  return {
    walls: thickWalls,
    windows: params.windows.filter((item) => thickWalls.some((wall) => wall.id === item.wallId)),
    doors: params.doors.filter((item) => thickWalls.some((wall) => wall.id === item.wallId)),
    catalog: params.catalog,
    wallChains: buildWallChains(thickWalls),
    meta: {
      source: "CabinetEditorAiPrototype",
      unit: "inches",
      gridSize: params.gridSize,
      wallThickness: params.wallThickness,
      generatedAt: new Date().toISOString(),
    },
  };
}
