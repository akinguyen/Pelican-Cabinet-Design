import type { ElementType } from "react";

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
  | "place-cabinet"
  | null;

export type CabinetCategory = "base" | "pantry" | "wall";
export type ProductCategory = "base" | "wall";
export type ObjectSupportType = "floor-supported" | "elevated-supported";
export type OvenCabinetProductLayout =
  | "none"
  | "single-oven"
  | "double-oven"
  | "microwave-oven"
  | "single-microwave";
export type MeasurementDisplayUnit = "feet-inches" | "inches";
export type CabinetImage =
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

export type CabinetDimensionSet = {
  widthInches: number;
  heightInches: number;
  depthInches: number;
};

export type AccessoryKind = "base-filler" | "wall-filler" | "filler" | "base-end-panel" | "wall-end-panel";

export type CabinetCatalogItem = {
  id: string;
  category: CabinetCategory;
  title: string;
  subtitle: string;
  widthInches: number;
  heightInches: number;
  depthInches: number;
  image: CabinetImage;
  standardWidthOptions?: number[];
  standardHeightOptions?: number[];
  standardDepthOptions?: number[];
  isAccessory?: boolean;
  accessoryKind?: AccessoryKind;
  isProduct?: boolean;
  productCategory?: ProductCategory;
  defaultDistanceFromFloorInches?: number;
};

export type PlanViewMode = "floor" | "elevation";
export type WallElevationViewMode = "interior" | "exterior";
export type WallCabinetPlacementMode = "none" | "both" | "interior" | "exterior";

export type SidebarItem = {
  id: Panel;
  label: string;
  icon: ElementType;
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
  needCabinetPlacement?: boolean;
  cabinetPlacementMode?: WallCabinetPlacementMode;
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

export type CabinetElement = {
  id: string;
  center: Point;
  width: number;
  depth: number;
  rotation: number;
  category?: CabinetCategory;
  catalogId?: string;
  image?: CabinetImage;
  heightInches?: number;
  distanceFromFloorInches?: number;
  sinkFixture?: boolean;
  cooktopFixture?: "surface" | "front";
  cooktopFrontHeightInches?: number;
  wallId?: string;
  wallFace?: WallFaceSide;
  lockMode?: "locked" | "required" | "suggested";
  accessoryKind?: AccessoryKind;
  blindDoorWidthInches?: number;
  blindFillerWidthInches?: number;
  ovenCabinetProductLayout?: OvenCabinetProductLayout;
  ovenCabinetProductHeightInches?: number;
  ovenCabinetFillerHeightInches?: number;
  ovenCabinetBottomDrawerHeightInches?: number;
};

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
  cabinetPlacementMode: WallCabinetPlacementMode;
};

export type CabinetSelectionDetail = {
  id: string;
  catalogId?: string;
  widthInches: number;
  depthInches: number;
  heightInches: number;
  distanceFromFloorInches?: number;
  distanceFromLeftInches?: number;
  distanceFromRightInches?: number;
  wallWidthInches?: number;
  category?: CabinetCategory;
  image?: CabinetImage;
  sinkFixture?: boolean;
  cooktopFixture?: "surface" | "front";
  cooktopFrontHeightInches?: number;
  accessoryKind?: AccessoryKind;
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
  cabinets?: CabinetElement[];
  excludeWindowId?: string;
  excludeDoorId?: string;
  excludeCabinetId?: string;
};

export type CabinetPlacementPreview = {
  center: Point;
  width: number;
  depth: number;
  rotation: number;
  category?: CabinetCategory;
  image?: CabinetImage;
  wall?: Wall | null;
  wallId?: string;
  wallFace?: WallFaceSide;
  isValid: boolean;
  invalidReason?: string;
};

export type CabinetDragState = {
  id: string;
  pointerId: number;
  startPointer: Point;
  startCenter: Point;
  startCabinets: CabinetElement[];
  didMove: boolean;
  snappedRotation?: number | null;
};

export type CabinetRotateState = {
  id: string;
  pointerId: number;
  center: Point;
  startAngle: number;
  startRotation: number;
  startCabinets: CabinetElement[];
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
      kind: "cabinet";
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
      category: CabinetCategory;
      startCabinets: CabinetElement[];
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
  cabinets?: CabinetElement[];
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
