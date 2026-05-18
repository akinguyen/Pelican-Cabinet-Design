import test from "node:test";
import assert from "node:assert/strict";

import { exportRoomInput } from "../lib/ai/roomExport.ts";
import {
  filterRoomForKitchenGeneration,
  generateKitchenLayout,
  generateSmartKitchenLayout,
} from "../lib/ai/kitchenDesigner.ts";

function createCatalog() {
  return [
    {
      id: "base-two-door-cabinet",
      category: "base",
      title: "Base Two Door",
      subtitle: "Base",
      widthInches: 24,
      depthInches: 24,
      image: "base",
    },
    {
      id: "wall-two-door-cabinet",
      category: "wall",
      title: "Wall Two Door",
      subtitle: "Wall",
      widthInches: 24,
      depthInches: 12,
      image: "wall-two-doors",
      defaultHeightInches: 30,
      defaultDistanceFromFloorInches: 54,
    },
    {
      id: "base-sink-cabinet",
      category: "base",
      title: "Base Sink",
      subtitle: "Sink",
      widthInches: 30,
      depthInches: 24,
      image: "base-sink-cabinet",
    },
  ];
}

function createRoom(overrides = {}) {
  return {
    walls: [
      {
        id: "wall-1",
        start: { x: 0, y: 0 },
        end: { x: 120, y: 0 },
      },
    ],
    windows: [],
    doors: [],
    cabinets: [],
    catalog: createCatalog(),
    wallChains: [{ id: "chain-1", wallIds: ["wall-1"] }],
    meta: {
      source: "test",
      unit: "inches",
      coordinateUnit: "pixels",
      measurementUnit: "inches",
      gridSize: 12,
      gridSizePixelsPerFoot: 12,
      wallThickness: 6,
      wallThicknessPixels: 6,
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

test("exportRoomInput filters thin walls and preserves attached objects on thick walls", () => {
  const room = exportRoomInput({
    walls: [
      {
        id: "wall-1",
        start: { x: 0, y: 0 },
        end: { x: 120, y: 0 },
      },
      {
        id: "wall-2",
        start: { x: 120, y: 0 },
        end: { x: 120, y: 120 },
        kind: "thin-wall",
      },
    ],
    windows: [
      {
        id: "window-1",
        wallId: "wall-1",
        t: 0,
        width: 24,
        heightInches: 36,
        distanceFromFloorInches: 36,
      },
      {
        id: "window-2",
        wallId: "wall-2",
        t: 0,
        width: 24,
        heightInches: 36,
        distanceFromFloorInches: 36,
      },
    ],
    doors: [
      {
        id: "door-1",
        wallId: "wall-1",
        t: 0,
        width: 36,
        heightInches: 80,
        distanceFromFloorInches: 0,
      },
    ],
    cabinets: [
      {
        id: "cabinet-1",
        wallId: "wall-1",
        center: { x: 30, y: 30 },
        width: 24,
        depth: 24,
        rotation: 0,
        category: "base",
      },
      {
        id: "cabinet-2",
        wallId: "wall-2",
        center: { x: 30, y: 30 },
        width: 24,
        depth: 24,
        rotation: 0,
        category: "base",
      },
    ],
    catalog: createCatalog(),
    gridSize: 12,
    wallThickness: 6,
  });

  assert.deepEqual(
    room.walls.map((wall) => wall.id),
    ["wall-1"]
  );
  assert.deepEqual(
    room.windows.map((windowItem) => windowItem.id),
    ["window-1"]
  );
  assert.deepEqual(
    room.cabinets.map((cabinet) => cabinet.id),
    ["cabinet-1"]
  );
  assert.deepEqual(room.wallChains, [{ id: "chain-1", wallIds: ["wall-1"] }]);
  assert.equal(room.cabinets[0].supportType, "floor-supported");
  assert.equal(room.cabinets[0].hasToeKick, true);
});

test("filterRoomForKitchenGeneration keeps locked cabinets and drops required or suggested ones", () => {
  const room = createRoom({
    cabinets: [
      {
        id: "locked-explicit",
        center: { x: 10, y: 10 },
        width: 24,
        depth: 24,
        rotation: 0,
        lockMode: "locked",
      },
      {
        id: "locked-implicit",
        center: { x: 20, y: 10 },
        width: 24,
        depth: 24,
        rotation: 0,
      },
      {
        id: "required",
        center: { x: 30, y: 10 },
        width: 24,
        depth: 24,
        rotation: 0,
        lockMode: "required",
      },
      {
        id: "suggested",
        center: { x: 40, y: 10 },
        width: 24,
        depth: 24,
        rotation: 0,
        lockMode: "suggested",
      },
    ],
  });

  const filtered = filterRoomForKitchenGeneration(room);

  assert.deepEqual(
    filtered.cabinets.map((cabinet) => cabinet.id),
    ["locked-explicit", "locked-implicit"]
  );
});

test("generateKitchenLayout returns the current no-thick-wall fallback", () => {
  const room = createRoom({
    walls: [
      {
        id: "thin-1",
        start: { x: 0, y: 0 },
        end: { x: 120, y: 0 },
        kind: "thin-wall",
      },
    ],
    wallChains: [],
  });

  const layout = generateKitchenLayout(room);

  assert.equal(layout.summary.layoutType, "single-wall");
  assert.deepEqual(layout.cabinets, []);
  assert.deepEqual(layout.elevations, []);
  assert.deepEqual(layout.summary.notes, [
    "No thick walls available. Draw thin walls and convert them first.",
  ]);
});

test("generateSmartKitchenLayout returns the current smart fallback when no thick walls remain", () => {
  const room = createRoom({
    walls: [
      {
        id: "thin-1",
        start: { x: 0, y: 0 },
        end: { x: 120, y: 0 },
        kind: "thin-wall",
      },
    ],
    cabinets: [
      {
        id: "required",
        center: { x: 30, y: 10 },
        width: 24,
        depth: 24,
        rotation: 0,
        lockMode: "required",
      },
    ],
    wallChains: [],
  });

  const layout = generateSmartKitchenLayout(room, {
    layoutType: "single-wall",
    wallOrder: [],
    wallPlans: [],
    notes: ["planner note"],
    plannerModel: "test-model",
  });

  assert.equal(layout.summary.layoutType, "single-wall");
  assert.equal(layout.summary.generationMethod, "smart-ai");
  assert.equal(layout.summary.plannerModel, "test-model");
  assert.deepEqual(layout.summary.notes, [
    "The smart planner did not receive any usable thick walls to design against.",
  ]);
  assert.deepEqual(layout.room.cabinets, []);
});
