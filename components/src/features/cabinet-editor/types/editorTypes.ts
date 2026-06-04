import type * as React from "react";
import type { AiRoomInput, GeneratedKitchenLayout } from "@/lib/ai/types";
import { distance } from "../engine/geometry";

export type Panel =
  | "walls"
  | "structures"
  | "products"
  | "cabinets"
  | "objects"
  | "text"
  | "lines";

export type Tool =
  | "draw-wall"
  | "draw-thin-wall"
  | "draw-penin-wall"
  | "draw-island-wall"
  | "place-window"
  | "place-door"
  | "place-placement"
  | null;

export type PlacementCategory = "base" | "pantry" | "wall";

export type ProductCategory = "base" | "wall";

export type ObjectSupportType = "floor-supported" | "elevated-supported";

export type OvenCabinetProductLayout =
  | "none"
  | "single-oven"
  | "double-oven"
  | "microwave-oven"
  | "single-microwave";

export type MeasurementDisplayUnit = "feet-inches" | "inches";

export type PlacementImage =
  | "base"
  | "base-corner"
  | "base-one-door"
  | "base-drawer"
  | "base-sink-cabinet"
  | "base-farm-sink-cabinet"
  | "base-spice-rack"
  | "base-trash-can"
  | "base-appliance"
  | "base-dishwasher"
  | "base-refrigerator"
  | "base-range"
  | "base-blind-left"
  | "base-blind-right"
  | "base-two-door-one-drawer"
  | "base-one-door-one-drawer"
  | "base-two-door-two-drawer"
  | "base-two-drawer"
  | "base-four-drawer"
  | "base-blind-left-one-drawer"
  | "base-blind-right-one-drawer"
  | "base-oven-bottom-drawer"
  | "base-microwave-bottom-drawer"
  | "pantry-one-door"
  | "pantry-two-door"
  | "wall-two-doors"
  | "wall-one-door"
  | "wall-blind-left"
  | "wall-blind-right"
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
  | "accessory-wall-end-panel";

export type PlacementDimensionSet = {
  widthInches: number;
  heightInches: number;
  depthInches: number;
};

export type PlacementCatalogItem = {
  id: string;
  category: PlacementCategory;
  title: string;
  subtitle: string;
  widthInches: number;
  heightInches: number;
  depthInches: number;
  image: PlacementImage;
  standardWidthOptions?: number[];
  standardHeightOptions?: number[];
  standardDepthOptions?: number[];
  productCategory?: ProductCategory;
  defaultDistanceFromFloorInches?: number;
};

export type PlanViewMode = "floor" | "elevation";

export type WallElevationViewMode = "interior" | "exterior";

export type WallPlacementMode = "none" | "both" | "interior" | "exterior";

export type SidebarItem = {
  id: Panel;
  label: string;
  icon: React.ElementType;
};

export type Point = {
  x: number;
  y: number;
};

export type WallKind = "wall" | "thin-wall" | "penin-wall" | "island-wall";

export type Wall = {
  id: string;
  start: Point;
  end: Point;
  kind?: WallKind;
  elevationViewMode?: WallElevationViewMode;
  elevationViewSideOverride?: "left" | "right";
  interiorSideOverride?: "left" | "right";
  needPlacement?: boolean;
  placementMode?: WallPlacementMode;
  sourceThinLength?: number;
  sourceThinMode?: ThickWallCreationMode;
};

export type WindowElement = {
  id: string;
  wallId: string;
  t: number;
  width: number;
  heightInches: number;
  distanceFromFloorInches: number;
  tabSide?: 1 | -1;
};

export type DoorElement = {
  id: string;
  wallId: string;
  t: number;
  width: number;
  heightInches: number;
  distanceFromFloorInches: number;
};

export type PlacementElementKind = "cabinet" | "product" | "accessory";

export type PlacementElementBase = {
  id: string;
  center: Point;
  width: number;
  depth: number;
  rotation: number;

  /**
   * Neutral placed-object discriminator. It is optional so existing saved
   * drawings that only have catalogId/image continue to load unchanged.
   */
  placementType?: PlacementElementKind;

  category?: PlacementCategory;
  productCategory?: ProductCategory;
  catalogId?: string;
  image?: PlacementImage;
  heightInches?: number;
  distanceFromFloorInches?: number;
  sinkFixture?: boolean;
  cooktopFixture?: "surface" | "front";
  cooktopFrontHeightInches?: number;
  // Wall that this placed element is attached to. This keeps elevation
  // projection tied to the same wall as the floor-plan placement, like
  // doors/windows.
  wallId?: string;
  wallFace?: WallFaceSide;
  lockMode?: "locked" | "required" | "suggested";
  blindDoorWidthInches?: number;
  blindFillerWidthInches?: number;
  ovenCabinetProductLayout?: OvenCabinetProductLayout;
  ovenCabinetProductHeightInches?: number;
  ovenCabinetFillerHeightInches?: number;
  ovenCabinetBottomDrawerHeightInches?: number;
};

export type CabinetElement = PlacementElementBase & {
  placementType?: "cabinet";
};

export type ProductElement = PlacementElementBase & {
  placementType?: "product";
  productCategory?: ProductCategory;
};

export type AccessoryElement = PlacementElementBase & {
  placementType?: "accessory";
};

export type PlacementElement = CabinetElement | ProductElement | AccessoryElement;

export type WindowSelectionDetail = {
  id: string;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
  distanceFromLeftInches?: number;
  distanceFromRightInches?: number;
  wallWidthInches?: number;
};

export type DoorSelectionDetail = {
  id: string;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
  distanceFromLeftInches?: number;
  distanceFromRightInches?: number;
  wallWidthInches?: number;
};

export type WallSelectionDetail = {
  id: string;
  kind: WallKind;
  elevationViewMode: WallElevationViewMode;
  placementMode: WallPlacementMode;
};

export type PlacementSelectionDetail = {
  id: string;
  catalogId?: string;
  widthInches: number;
  depthInches: number;
  heightInches: number;
  distanceFromFloorInches?: number;
  distanceFromLeftInches?: number;
  distanceFromRightInches?: number;
  wallWidthInches?: number;
  placementType?: PlacementElementKind;
  category?: PlacementCategory;
  productCategory?: ProductCategory;
  image?: PlacementImage;
  sinkFixture?: boolean;
  cooktopFixture?: "surface" | "front";
  cooktopFrontHeightInches?: number;
  blindDoorWidthInches?: number;
  blindFillerWidthInches?: number;
  ovenCabinetProductLayout?: OvenCabinetProductLayout;
  ovenCabinetProductHeightInches?: number;
  ovenCabinetFillerHeightInches?: number;
  ovenCabinetBottomDrawerHeightInches?: number;
};

export type WindowPlacementPreview = {
  wall: Wall | null;
  t: number;
  point: Point;
  isValid: boolean;
  invalidReason?: string;
};

export type DoorPlacementPreview = {
  wall: Wall | null;
  t: number;
  point: Point;
  isValid: boolean;
  invalidReason?: string;
};

export type StructurePlacementSnapOptions = {
  windows?: WindowElement[];
  doors?: DoorElement[];
  placements?: PlacementElement[];
  excludeWindowId?: string;
  excludeDoorId?: string;
  excludePlacementId?: string;
};

export type PlacementPreview = {
  center: Point;
  width: number;
  depth: number;
  rotation: number;
  category?: PlacementCategory;
  image?: PlacementImage;
  wall?: Wall | null;
  wallId?: string;
  wallFace?: WallFaceSide;
  isValid: boolean;
  invalidReason?: string;
};

export type PlacementDragState = {
  id: string;
  pointerId: number;
  startPointer: Point;
  startCenter: Point;
  startPlacements: PlacementElement[];
  didMove: boolean;
  snappedRotation?: number | null;
};

export type PlacementRotateState = {
  id: string;
  pointerId: number;
  center: Point;
  startAngle: number;
  startRotation: number;
  startPlacements: PlacementElement[];
  didMove: boolean;
  snappedRotation: number | null;
};

export type WindowDragState = {
  id: string;
  pointerId: number;
  startWindows: WindowElement[];
  didMove: boolean;
};

export type DoorDragState = {
  id: string;
  pointerId: number;
  startDoors: DoorElement[];
  didMove: boolean;
};

export type ElevationDragState =
  | {
      kind: "window";
      id: string;
      pointerId: number;
      startPointer: Point;
      startCenterInches: number;
      startDistanceFromFloorInches: number;
      grabOffsetCenterXInches: number;
      grabOffsetBottomYInches: number;
      widthInches: number;
      heightInches: number;
    }
  | {
      kind: "door";
      id: string;
      pointerId: number;
      startPointer: Point;
      startCenterInches: number;
      startDistanceFromFloorInches: number;
      grabOffsetCenterXInches: number;
      grabOffsetBottomYInches: number;
      widthInches: number;
      heightInches: number;
    }
  | {
      kind: "penin-wall";
      id: string;
      pointerId: number;
      startPointer: Point;
      startWall: Wall;
      hostWallId: string;
      anchorEndpoint: "start" | "end";
      normalSign: number;
      length: number;
      grabOffsetCenterXInches: number;
      widthInches: number;
      startWalls: Wall[];
    }
  | {
      kind: "placement";
      id: string;
      pointerId: number;
      startPointer: Point;
      startCenter: Point;
      startStartInches: number;
      startDisplayStartInches: number;
      depthVisualOffsetInches: number;
      startDistanceFromFloorInches: number;
      grabOffsetXInches: number;
      grabOffsetBottomYInches: number;
      widthInches: number;
      heightInches: number;
      category: PlacementCategory;
      startPlacements: PlacementElement[];
    };

export type ElevationAlignmentGuide =
  | {
      kind: "vertical";
      x: number;
      y1: number;
      y2: number;
      label?: string;
      labelX?: number;
      labelY?: number;
    }
  | {
      kind: "horizontal";
      y: number;
      x1: number;
      x2: number;
      label?: string;
      labelX?: number;
      labelY?: number;
    };

export type ElevationObjectBox = {
  key: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

export type EditorSnapshot = {
  walls: Wall[];
  windows: WindowElement[];
  doors: DoorElement[];
  placements?: PlacementElement[];
};

export type GuideInfo = {
  point: Point;
  verticalX?: number;
  horizontalY?: number;
};

export type ArcMode = "full" | "upper" | "lower";

export type ConnectionMap = Map<string, number>;

export type WallSegmentBlackDotGeometry = {
  segmentStart: Point;
  segmentEnd: Point;
  startLeft: Point;
  endLeft: Point;
  endRight: Point;
  startRight: Point;
  polygon: Point[];
  leftEdge: { a: Point; b: Point };
  rightEdge: { a: Point; b: Point };
};

export type WallBandGeometry = {
  left: Point[];
  right: Point[];
  polygon: Point[];
  leftEdges: { a: Point; b: Point }[];
  rightEdges: { a: Point; b: Point }[];
  // Wall body is now drawn from the same four black-dot anchors used by the
  // measurement system. Each segment keeps its own four-dot geometry so later
  // cabinet clamping/selection can reason from the exact visible wall side.
  segmentGeometries: WallSegmentBlackDotGeometry[];
};

export type MeasurementLayout = {
  lineStart: Point;
  lineEnd: Point;
  labelPoint: Point;
  rotation: number;
};

export type MenuDragState = {
  pointerId: number;
  startClient: Point;
  startPosition: Point;
};

export type GroupDragState = {
  pointerId: number;
  startPoint: Point;
  startWalls: Wall[];
  selectedIds: Set<string>;
  didMove: boolean;
};

export type PeninWallDragState = {
  id: string;
  pointerId: number;
  startPointer: Point;
  startWall: Wall;
  startWalls: Wall[];
  didMove: boolean;
};

export type PeninWallRotateState = {
  id: string;
  pointerId: number;
  anchorEndpoint: "start" | "end";
  anchorPoint: Point;
  startAngle: number;
  startRotation: number;
  length: number;
  startWall: Wall;
  startWalls: Wall[];
  didMove: boolean;
  snappedRotation: number | null;
};

export type PeninWallResizeState = {
  id: string;
  pointerId: number;
  fixedEndpoint: "start" | "end";
  fixedPoint: Point;
  movingEndpoint: "start" | "end";
  direction: Point;
  startWall: Wall;
  startWalls: Wall[];
  didMove: boolean;
};

export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GroupContextMenuState = {
  position: Point;
};

export type MeasurementSide = "left" | "right" | "length";

export type WallFaceSide = "left" | "right";

export type ThickWallCreationMode = "exterior" | "interior";

export type MeasurementEditState = {
  wallId: string;
  segmentStart: Point;
  segmentEnd: Point;
  side: MeasurementSide;
  currentEdgeLength: number;
  position: Point;
  rotation: number;
  value: string;
};

export type MeasurementClickPayload = {
  segmentStart: Point;
  segmentEnd: Point;
  side: MeasurementSide;
  currentEdgeLength: number;
  labelPoint: Point;
  rotation: number;
};

export type ImportedKitchenPlacement = {
  catalogId: string;
  wallFace?: "interior" | "exterior" | null;
  leftInches: number;
  bottomInches?: number | null;
  builtInFillerWidthInches?: number | null;
  widthInches?: number | null;
  depthInches?: number | null;
  heightInches?: number | null;
  topOption?: "sink" | "surface-cooktop" | "front-control-cooktop" | null;
  notes?: string[];
};

export type ImportedKitchenWallPlan = {
  wallId?: string;
  wallLabel?: string;
  placements?: ImportedKitchenPlacement[];
  notes?: string[];
};

export type ImportedKitchenPlan = {
  layoutType?: GeneratedKitchenLayout["summary"]["layoutType"];
  wallOrder?: string[];
  walls?: ImportedKitchenWallPlan[];
  notes?: string[];
};

export type SmartElevationFixedObject = {
  id: string;
  type: "window" | "door" | "cabinet" | "product" | "accessory";
  coordinateSpace: "elevationPlan";
  leftInches: number;
  rightInches: number;
  bottomInches: number;
  widthInches: number;
  heightInches?: number | null;
  depthInches?: number | null;
  catalogId?: string | null;
  title?: string;
  category?: PlacementCategory;
  image?: PlacementImage | null;
  topOption?: "sink" | "surface-cooktop" | "front-control-cooktop" | null;
  lockMode?: "locked" | "required" | "suggested";
};

export type AiRoomWallWithEditorElevationData = AiRoomInput["walls"][number] & {
  needPlacement?: boolean;
  elevationPlan?: {
    widthInches?: number;
    fixedObjects?: SmartElevationFixedObject[];
    [key: string]: unknown;
  };
  elevationWidthInches?: number;
};

export type PlacementElevationItem = {
  placement: PlacementElement;
  category: PlacementCategory;
  startInches: number;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
  depthFromWallInches: number;
  stackOverflow?: boolean;
  stackOverflowMessage?: string;
};

export type ElevationOpeningLayout = {
  startInches: number;
  centerInches: number;
  widthInches: number;
};

export type PeninWallElevationPlacement = {
  wall: Wall;
  centerInches: number;
  startInches: number;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
};

export type ElevationWallAxis = {
  start: Point;
  end: Point;
  direction: Point;
  normal: Point;
  length: number;
};

export type ElevationWallDistanceContext = {
  wall: Wall;
  axis: ElevationWallAxis;
  displayWalls: Wall[];
  wallStartOffsetInches: number;
  wallWidthInches: number;
};

export type ElevationObjectDistanceMetrics = {
  distanceFromLeftInches: number;
  distanceFromRightInches: number;
  wallWidthInches: number;
};

export type ElevationWallInteriorSpan = {
  startScalar: number;
  endScalar: number;
  length: number;
  startAnchor: Point;
  endAnchor: Point;
};

export type PlacementWallAttachment = {
  wall: Wall;
  wallFace: WallFaceSide;
  startProjection: number;
  endProjection: number;
  depthFromWallFace: number;
  overlap: number;
  gap: number;
};

export type WallPlacementStackPlacementResult = {
  placements: PlacementElement[];
  message?: string;
};

export type ElevationCornerReservationSeverity = "taken" | "caution";

export type ElevationCornerReservation = {
  key: string;
  sourcePlacement: PlacementElement;
  title: string;
  severity: ElevationCornerReservationSeverity;
  startInches: number;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
  boundary?: "start" | "end";
  boundaryDistanceInches?: number;
  distanceToSharedCornerPixels?: number;
  wallFaceGapPixels?: number;
  coveredSameWallCorner?: boolean;
};

export type JunctionArm = {
  wall: Wall;
  direction: Point;
};

export type JunctionMarkerSegment = {
  start: Point;
  end: Point;
};

export type JunctionMarkerCandidate = {
  wall: Wall;
  direction: Point;
  normal: Point;
  start: Point;
};

export type PlacementDistanceMetric = {
  key: string;
  start: Point;
  end: Point;
  tickStart: Point;
  tickEnd: Point;
  label: Point;
  distance: number;
};

export type PlacementWallSideGuideLine = {
  startAnchor: Point;
  endAnchor: Point;
  direction: Point;
  length: number;
  side: Exclude<MeasurementSide, "length">;
};

export type PlacementWallFacingResolution = {
  center: Point;
  rotation: number;
  wallId?: string;
  wallFace?: WallFaceSide;
};

export type PlacementEdgeSnapOptions = {
  center: Point;
  walls: Wall[];
  placements: PlacementElement[];
  width: number;
  depth: number;
  rotation: number;
  placementCategory?: PlacementCategory;
  placementImage?: PlacementImage;
  excludedPlacementId?: string;
  preferredWallId?: string;
  snapThreshold?: number;
};

export type PlacementElevationPairOverlap = {
  movingStartInches: number;
  movingEndInches: number;
  movingBottomInches: number;
  movingTopInches: number;
  otherStartInches: number;
  otherEndInches: number;
  otherBottomInches: number;
  otherTopInches: number;
};
