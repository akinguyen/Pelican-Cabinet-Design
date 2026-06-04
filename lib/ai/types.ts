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

export type AiCabinetCategory = "base" | "wall";
export type AiObjectLockMode = "locked" | "required" | "suggested";
export type AiCatalogItemKind = "cabinet" | "product" | "accessory";
export type AiOvenCabinetProductLayout =
  | "none"
  | "single-oven"
  | "double-oven"
  | "microwave-oven"
  | "single-microwave";

export type AiCabinetImage =
  | "base"
  | "base-corner"
  | "base-one-door"
  | "base-drawer"
  | "base-sink-cabinet"
  | "base-farm-sink-cabinet"
  | "base-spice-rack"
  | "base-trash-can"
  | "base-dishwasher"
  | "base-refrigerator"
  | "base-range"
  | "base-appliance"
  | "base-blind-left"
  | "base-blind-right"
  | "base-two-door-one-drawer"
  | "base-one-door-one-drawer"
  | "base-two-door-two-drawer"
  | "base-two-drawer"
  | "base-four-drawer"
  | "pantry-one-door"
  | "pantry-two-door"
  | "wall-two-doors"
  | "wall-one-door"
  | "wall-hood"
  | "wall-microwave"
  | "wall-oven"
  | "wall-double-oven"
  | "wall-microwave-one-door"
  | "wall-hood-one-door"
  | "accessory-base-filler"
  | "accessory-wall-filler"
  | "accessory-wall-filler-horizontal"
  | "accessory-filler"
  | "accessory-base-end-panel"
  | "accessory-wall-end-panel"
  | "base-sink"
  | "base-sink-one-door-panel"
  | "base-sink-two-door-panel"
  | "base-blind-left-one-drawer"
  | "base-blind-right-one-drawer"
  | "base-oven-bottom-drawer"
  | "base-microwave-bottom-drawer"
  | "wall-blind-left"
  | "wall-blind-right"
  | "tall"
  | "wall";

export type AiCatalogItem = {
  id: string;
  category: AiCabinetCategory;
  kind: AiCatalogItemKind;
  title: string;
  widthInches: number;
  heightInches: number;
  depthInches: number;
  defaultHeightInches?: number;
  defaultDistanceFromFloorInches?: number;
  hasToeKick?: boolean;
};

type BaseAiPlacementElement = {
  id: string;
  kind: AiCatalogItemKind;
  center: AiPoint;
  width: number;
  depth: number;
  rotation: number;
  category?: AiCabinetCategory;
  catalogId: string;
  // Derived visual id for rendering/debug summaries only. catalogId is the source of truth.
  image?: AiCabinetImage;
  heightInches?: number;
  distanceFromFloorInches?: number;
  wallId?: string;
  hasToeKick?: boolean;
  wallFace?: "left" | "right";
  sinkFixture?: boolean;
  cooktopFixture?: "surface" | "front";
  cooktopFrontHeightInches?: number;
  blindDoorWidthInches?: number;
  blindFillerWidthInches?: number;
  ovenCabinetProductLayout?: AiOvenCabinetProductLayout;
  ovenCabinetProductHeightInches?: number;
  ovenCabinetFillerHeightInches?: number;
  ovenCabinetBottomDrawerHeightInches?: number;
  lockMode?: AiObjectLockMode;
};

export type AiCabinetPlacementElement = BaseAiPlacementElement & {
  kind: "cabinet";
};

export type AiProduct = BaseAiPlacementElement & {
  kind: "product";
};

export type AiAccessory = BaseAiPlacementElement & {
  kind: "accessory";
};

export type AiPlacementElement =
  | AiCabinetPlacementElement
  | AiProduct
  | AiAccessory;

// Legacy alias retained while planner code migrates from cabinet-centric naming.
export type AiCabinet = AiPlacementElement;

export type AiWallChain = {
  id: string;
  wallIds: string[];
};

export type AiRoomInput = {
  walls: AiWall[];
  windows: AiWindow[];
  doors: AiDoor[];
  cabinets: AiPlacementElement[];
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
    layoutType:
      | "single-wall"
      | "galley"
      | "l-shape"
      | "u-shape"
      | "connected-wall-return";
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

export type SmartKitchenPlacementWallFace = "interior" | "exterior";
export type SmartKitchenResolvedWallFace = "left" | "right";

export type SmartKitchenPlacement = {
  catalogId: string;
  leftInches: number;
  bottomInches?: number | null;
  wallFace?: SmartKitchenPlacementWallFace | null;
  resolvedWallFace?: SmartKitchenResolvedWallFace | null;
  widthInches?: number | null;
  depthInches?: number | null;
  heightInches?: number | null;
  builtInFillerWidthInches?: number | null;
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
  zoneType?: string | null;
  cabinetPlacementMode?: "none" | "both" | "interior" | "exterior" | null;
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
  layoutType:
    | "single-wall"
    | "galley"
    | "l-shape"
    | "u-shape"
    | "connected-wall-return";
  wallOrder: string[];
  wallPlans: SmartKitchenWallPlan[];
  notes: string[];
  warnings?: SmartKitchenWarning[];
  plannerModel?: string;
};
