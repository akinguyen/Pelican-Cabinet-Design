"use client";

export type AiPoint = {
  x: number;
  y: number;
};

export type AiWallKind = "wall" | "thin-wall";

export type AiWall = {
  id: string;
  start: AiPoint;
  end: AiPoint;
  kind?: AiWallKind;
};

export type AiWindow = {
  id: string;
  wallId: string;
  t: number;
  width: number;
  heightInches: number;
  distanceFromFloorInches: number;
};

export type AiDoor = {
  id: string;
  wallId: string;
  t: number;
  width: number;
  heightInches: number;
  distanceFromFloorInches: number;
};

export type AiCabinetCategory = "base" | "tall" | "wall";

export type AiCabinetImage =
  | "base"
  | "base-corner"
  | "base-one-door"
  | "base-sink"
  | "base-drawer"
  | "base-appliance"
  | "base-blind-left"
  | "base-two-door-one-drawer"
  | "base-one-door-one-drawer"
  | "base-two-door-two-drawer"
  | "base-two-drawer"
  | "base-four-drawer"
  | "base-sink-one-door-panel"
  | "base-sink-two-door-panel"
  | "base-blind-left-one-drawer"
  | "base-blind-right-one-drawer"
  | "base-oven-bottom-drawer"
  | "tall"
  | "wall"
  | "wall-microwave-one-door"
  | "wall-hood-one-door";

export type AiCatalogItem = {
  id: string;
  category: AiCabinetCategory;
  title: string;
  subtitle: string;
  widthInches: number;
  depthInches: number;
  image: AiCabinetImage;
};

export type AiCabinet = {
  id: string;
  center: AiPoint;
  width: number;
  depth: number;
  rotation: number;
  category?: AiCabinetCategory;
  catalogId?: string;
  image?: AiCabinetImage;
  heightInches?: number;
  distanceFromFloorInches?: number;
  wallId?: string;
};

export type AiWallChain = {
  id: string;
  wallIds: string[];
};

export type AiRoomInput = {
  walls: AiWall[];
  windows: AiWindow[];
  doors: AiDoor[];
  catalog: AiCatalogItem[];
  wallChains: AiWallChain[];
  meta: {
    source: string;
    unit: "inches";
    gridSize: number;
    wallThickness: number;
    generatedAt: string;
  };
};

export type AiElevationSummary = {
  wallId: string;
  label: string;
  cabinetCount: number;
};

export type GeneratedKitchenLayout = {
  room: AiRoomInput;
  cabinets: AiCabinet[];
  summary: {
    layoutType: "single-wall" | "galley" | "l-shape";
    notes: string[];
    selectedWallIds: string[];
  };
  elevations: AiElevationSummary[];
};
