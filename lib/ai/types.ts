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
  elevationViewSideOverride?: "left" | "right";
  interiorSideOverride?: "left" | "right";
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
export type AiObjectLockMode = "locked" | "required" | "suggested";

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
  isProduct?: boolean;
  productCategory?: "base" | "wall";
  defaultHeightInches?: number;
  defaultDistanceFromFloorInches?: number;
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
  sinkFixture?: boolean;
  cooktopFixture?: "surface" | "front";
  cooktopFrontHeightInches?: number;
  isProduct?: boolean;
  lockMode?: AiObjectLockMode;
};

export type AiWallChain = {
  id: string;
  wallIds: string[];
};

export type AiRoomInput = {
  walls: AiWall[];
  windows: AiWindow[];
  doors: AiDoor[];
  cabinets: AiCabinet[];
  catalog: AiCatalogItem[];
  wallChains: AiWallChain[];
  meta: {
    source: string;
    unit?: "inches";
    coordinateUnit?: "pixels";
    measurementUnit?: "inches";
    gridSize: number;
    gridSizePixelsPerFoot?: number;
    wallThickness: number;
    wallThicknessPixels?: number;
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
    generationMethod?: "rule-based" | "smart-ai";
    plannerModel?: string;
  };
  elevations: AiElevationSummary[];
};

export type SmartKitchenWallRole =
  | "primary"
  | "secondary"
  | "storage"
  | "upper-focus";

export type SmartKitchenPlacementTopOption =
  | "sink"
  | "surface-cooktop"
  | "front-control-cooktop";

export type SmartKitchenPlacement = {
  catalogId: string;
  leftInches: number;
  bottomInches?: number | null;
  topOption?: SmartKitchenPlacementTopOption | null;
  notes?: string[];
};

export type SmartKitchenWarning = {
  type: "constraint-warning";
  message: string;
};

export type SmartKitchenWallPlan = {
  wallId: string;
  wallLabel?: string | null;
  needsPlacement?: boolean;
  placements?: SmartKitchenPlacement[];
  role: SmartKitchenWallRole;
  placeSink: boolean;
  sinkCatalogId?: string | null;
  placePantry: boolean;
  pantryCatalogId?: string | null;
  placeHood: boolean;
  upperFeatureCatalogId?: string | null;
  upperDistanceFromFloorInches?: number | null;
  upperFeatureDistanceFromFloorInches?: number | null;
  skipBaseRun?: boolean;
  skipUpperRun?: boolean;
  basePattern: string[];
  upperPattern: string[];
  notes: string[];
};

export type SmartKitchenPlan = {
  layoutType: "single-wall" | "galley" | "l-shape";
  wallOrder: string[];
  wallPlans: SmartKitchenWallPlan[];
  notes: string[];
  warnings?: SmartKitchenWarning[];
  plannerModel?: string;
};
