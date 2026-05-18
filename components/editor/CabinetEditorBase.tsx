"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeftRight,
  Boxes,
  BrickWall,
  CheckCircle2,
  ChevronDown,
  ChevronDown as ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  DoorOpen,
  Download,
  Grid3X3,
  Home,
  ImagePlus,
  Magnet,
  PencilLine,
  Ruler,
  Scan,
  Settings,
  Sofa,
  Square,
  Trash2,
  Type,
  Undo2,
  Redo2,
  Video,
  ZoomIn,
  ZoomOut,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportRoomInput } from "@/lib/ai/roomExport";
import type { AiRoomInput, GeneratedKitchenLayout } from "@/lib/ai/types";
import {
  add,
  cabinetPolarPoint,
  clamp,
  closestPointOnSegment,
  cross,
  degreesToRadians,
  distance,
  dot,
  getAngleDegrees,
  getNormal,
  getRotatedRectBounds,
  getRotatedRectCorners,
  getTextRotation,
  getUnitVector,
  midpoint,
  mul,
  normalize,
  normalizeDegrees,
  perp,
  pointInPolygon,
  pointOnSegment,
  pointToSegmentDistance,
  polarPoint,
  segmentOrientation,
  segmentsIntersect,
  sub,
  toSvgPoint,
  vectorLength,
} from "./geometry";
import {
  formatDecimal,
  formatFeetInches,
  formatFeetInchesForInput,
  formatFeetInchesParts,
  formatMeasurementFromInches,
  inchesToPixels,
  parseFeetInchesToPixels,
  pixelsToInches,
  roundToQuarter,
} from "./measurements";
import {
  AI_WALL_MATCH_TOLERANCE,
  CABINET_ROTATION_SNAP_ENTER_DEGREES,
  CABINET_ROTATION_SNAP_STEP_DEGREES,
  CABINET_TOE_KICK_HEIGHT_INCHES,
  DEFAULT_DOOR_WIDTH,
  DEFAULT_ELEVATION_WALL_HEIGHT_INCHES,
  DEFAULT_WINDOW_WIDTH,
  ELEVATION_VIEWBOX_HEIGHT,
  ELEVATION_VIEWBOX_WIDTH,
  FLOOR_SUPPORTED_PANTRY_MIN_HEIGHT_INCHES,
  GRID_SIZE,
  JOINT_DOT_RADIUS,
  JOINT_TICK_LENGTH,
  MAX_ZOOM,
  MIN_ZOOM,
  MOVE_STEP,
  OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES,
  OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES,
  PENIN_WALL_ELEVATION_FACE_WIDTH_INCHES,
  PENIN_WALL_ELEVATION_HEIGHT_INCHES,
  PENIN_WALL_THICKNESS,
  SNAP_THRESHOLD,
  THIN_WALL_STROKE_WIDTH,
  WALL_ATTACH_THRESHOLD,
  WALL_STROKE_WIDTH,
  WALL_THICKNESS,
  WORKSPACE_HEIGHT,
  WORKSPACE_WIDTH,
  ZOOM_BUTTON_STEP,
  ZOOM_INTENSITY,
  sidebarItems,
} from "./constants";
import { CABINET_CATALOG } from "./catalog";
import {
  getCabinetCatalogItemByIdentity,
  getCabinetCategoryForImage,
  getDefaultBottomDrawerProductLayout,
  getEditorCabinetCatalogItem,
  getEditorCabinetTopOption,
  cabinetHasToeKick,
  isElevationFloatingCabinet,
  isFloorStandingCabinet,
  getCabinetSupportType,
  getSupportTypeForCategory,
} from "./catalogHelpers";
import type {
  ImportedKitchenPlacement,
  ImportedKitchenPlan,
  ImportedKitchenWallPlan,
} from "./importedKitchenHelpers";
import {
  getBlindCabinetSide,
  getBlindCabinetWidthSegments,
  getDefaultBlindCabinetDoorWidthInches,
  isBlindCabinetImage,
  normalizeBlindCabinetSettings,
} from "./blindCabinetHelpers";
import {
  getDefaultOvenCabinetProductHeightInches,
  getOvenCabinetHeightSegments,
  isOvenLikeBottomDrawerCabinetImage,
  normalizeOvenCabinetHeightSegments,
  normalizeSpecialCabinetState,
} from "./specialCabinetHelpers";
import {
  normalizeImportedKitchenPlan,
  normalizeImportedKitchenPlacement,
  toImportedKitchenNumber,
} from "./importedKitchenHelpers";
import {
  formatDimensionOptionNumber,
  getCatalogDimensionOptions,
  getDefaultDimensionFromOptions,
  matchesDimensionOption,
} from "./catalogDimensionHelpers";
import { L_SHAPED_CORNER_CABINET_DISPLAY_IMAGE } from "./catalogImages";
import {
  CABINET_NOT_AGAINST_WALL_MESSAGE,
  CABINET_OVERLAP_MESSAGE,
  NOT_ENOUGH_VERTICAL_WALL_SPACE_MESSAGE,
  WALL_CABINET_ELEVATION_OVERLAP_MESSAGE,
} from "./messages";
import type {
  AccessoryKind,
  ArcMode,
  CabinetCategory,
  CabinetCatalogItem,
  CabinetDimensionSet,
  CabinetDragState,
  CabinetElement,
  CabinetImage,
  CabinetPlacementPreview,
  CabinetRotateState,
  CabinetSelectionDetail,
  ConnectionMap,
  DoorDragState,
  DoorElement,
  DoorPlacementPreview,
  DoorSelectionDetail,
  EditorSnapshot,
  ElevationAlignmentGuide,
  ElevationDragState,
  ElevationObjectBox,
  GroupContextMenuState,
  GroupDragState,
  GuideInfo,
  MeasurementClickPayload,
  MeasurementDisplayUnit,
  MeasurementEditState,
  MeasurementLayout,
  MeasurementSide,
  MenuDragState,
  OvenCabinetProductLayout,
  Panel,
  PeninWallDragState,
  PeninWallResizeState,
  PeninWallRotateState,
  PlanViewMode,
  Point,
  ProductCategory,
  SelectionRect,
  SidebarItem,
  StructurePlacementSnapOptions,
  ThickWallCreationMode,
  Tool,
  Wall,
  WallBandGeometry,
  WallCabinetPlacementMode,
  WallElevationViewMode,
  WallFaceSide,
  WallKind,
  WallSegmentBlackDotGeometry,
  WallSelectionDetail,
  WindowDragState,
  WindowElement,
  WindowPlacementPreview,
  WindowSelectionDetail,
} from "./types";

function isBuiltInSinkCabinetImage(image?: CabinetImage) {
  return image === "base-sink-cabinet" || image === "base-farm-sink-cabinet";
}

function isFarmSinkCabinetImage(image?: CabinetImage) {
  return image === "base-farm-sink-cabinet";
}

function isSpiceRackCabinetImage(image?: CabinetImage) {
  return image === "base-spice-rack";
}

function isTrashCanCabinetImage(image?: CabinetImage) {
  return image === "base-trash-can";
}

function canHaveBaseTopFixtureControls(image?: CabinetImage) {
  return Boolean(
    image &&
      !isBuiltInSinkCabinetImage(image) &&
      !isSpiceRackCabinetImage(image) &&
      !isTrashCanCabinetImage(image) &&
      image !== "pantry-one-door" &&
      image !== "pantry-two-door" &&
      !isOvenLikeBottomDrawerCabinetImage(image)
  );
}

function buildSmartInputCatalog(): AiRoomInput["catalog"] {
  return CABINET_CATALOG.map((catalogItem) => ({
    ...catalogItem,
    // Keep accessory metadata on the room payload because roomExport currently
    // normalizes the catalog and can drop fields that the smart-input preview needs.
    isAccessory: catalogItem.isAccessory ?? false,
    accessoryKind: catalogItem.accessoryKind ?? undefined,
    supportType: getSupportTypeForCategory(
      catalogItem.category,
      catalogItem.widthInches,
      catalogItem.heightInches
    ),
    hasToeKick: cabinetHasToeKick({
      category: catalogItem.category,
      widthInches: catalogItem.widthInches,
      heightInches: catalogItem.heightInches,
      image: catalogItem.image,
    }),
  })) as AiRoomInput["catalog"];
}

function withSmartInputCatalog(room: AiRoomInput): AiRoomInput {
  return {
    ...room,
    catalog: buildSmartInputCatalog(),
  };
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

async function readJsonFile(file: File): Promise<AiRoomInput> {
  const text = await file.text();
  return JSON.parse(text) as AiRoomInput;
}

async function readUnknownJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text) as unknown;
}
function pointsAlmostEqualForAiWall(left: Point, right: Point, tolerance = AI_WALL_MATCH_TOLERANCE) {
  return Math.abs(left.x - right.x) <= tolerance && Math.abs(left.y - right.y) <= tolerance;
}

function wallsMatchForAiSelection(editorWall: Wall, aiWall: AiRoomInput["walls"][number]) {
  return (
    (pointsAlmostEqualForAiWall(editorWall.start, aiWall.start) &&
      pointsAlmostEqualForAiWall(editorWall.end, aiWall.end)) ||
    (pointsAlmostEqualForAiWall(editorWall.start, aiWall.end) &&
      pointsAlmostEqualForAiWall(editorWall.end, aiWall.start))
  );
}

type SmartElevationFixedObject = {
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
  category?: CabinetCategory;
  image?: CabinetImage | null;
  topOption?: "sink" | "surface-cooktop" | "front-control-cooktop" | null;
  lockMode?: "locked" | "required" | "suggested";
  accessoryKind?: AccessoryKind;
};

type AiRoomWallWithEditorElevationData = AiRoomInput["walls"][number] & {
  needCabinetPlacement?: boolean;
  elevationPlan?: {
    widthInches?: number;
    fixedObjects?: SmartElevationFixedObject[];
    [key: string]: unknown;
  };
  elevationWidthInches?: number;
};

function roundSmartWallWidthInches(value: number) {
  return Math.round(value * 10) / 10;
}

function roundSmartObjectInches(value: number) {
  return Math.round(value * 10) / 10;
}

function getEditorElevationWallWidthInches(
  wall: Wall,
  editorWalls: Wall[],
  editorCabinets: CabinetElement[]
) {
  if (!isThickWall(wall)) return null;

  const structuralWalls = editorWalls.filter(
    (candidateWall) => isThickWall(candidateWall) && !isDetachedPanelWall(candidateWall)
  );

  const widthPixels = isDetachedPanelWall(wall)
    ? distance(
        getPeninWallVisibleSegment(wall, structuralWalls).start,
        getPeninWallVisibleSegment(wall, structuralWalls).end
      )
    : getElevationWallInteriorSpan(wall, structuralWalls, editorCabinets).length;
  const widthInches = pixelsToInches(widthPixels);

  return Number.isFinite(widthInches) && widthInches > 0
    ? roundSmartWallWidthInches(widthInches)
    : null;
}

function findEditorWallForAiWall(
  aiWall: AiRoomInput["walls"][number],
  editorWalls: Wall[]
) {
  const exactIdMatch = editorWalls.find(
    (editorWall) => editorWall.id === aiWall.id && isThickWall(editorWall)
  );

  if (exactIdMatch) return exactIdMatch;

  return editorWalls.find(
    (editorWall) => isThickWall(editorWall) && wallsMatchForAiSelection(editorWall, aiWall)
  ) ?? null;
}

function exportAiRoomInputFromEditor(params: {
  walls: Wall[];
  windows: WindowElement[];
  doors: DoorElement[];
  cabinets: CabinetElement[];
}) {
  return exportRoomInput({
    walls: attachWallDebugDotsForExport(params.walls) as never,
    windows: params.windows as never,
    doors: params.doors as never,
    cabinets: params.cabinets as never,
    catalog: CABINET_CATALOG as never,
    gridSize: GRID_SIZE,
    wallThickness: WALL_THICKNESS,
  });
}

function getEditorElevationFixedObjectsForWall(
  editorWall: Wall,
  editorWalls: Wall[],
  editorWindows: WindowElement[],
  editorDoors: DoorElement[],
  editorCabinets: CabinetElement[]
): SmartElevationFixedObject[] {
  const openingFixedObjects = [
    ...editorWindows
      .filter((windowItem) => windowItem.wallId === editorWall.id)
      .map((windowItem): SmartElevationFixedObject | null => {
        const metrics = getOpeningElevationDistanceMetrics(
          windowItem,
          editorWalls,
          editorCabinets
        );
        if (!metrics) return null;

        return {
          id: windowItem.id,
          type: "window",
          coordinateSpace: "elevationPlan",
          leftInches: roundSmartObjectInches(metrics.distanceFromLeftInches),
          rightInches: roundSmartObjectInches(metrics.distanceFromRightInches),
          bottomInches: roundSmartObjectInches(windowItem.distanceFromFloorInches),
          widthInches: roundSmartObjectInches(pixelsToInches(windowItem.width)),
          heightInches: roundSmartObjectInches(windowItem.heightInches),
        };
      }),
    ...editorDoors
      .filter((doorItem) => doorItem.wallId === editorWall.id)
      .map((doorItem): SmartElevationFixedObject | null => {
        const metrics = getOpeningElevationDistanceMetrics(
          doorItem,
          editorWalls,
          editorCabinets
        );
        if (!metrics) return null;

        return {
          id: doorItem.id,
          type: "door",
          coordinateSpace: "elevationPlan",
          leftInches: roundSmartObjectInches(metrics.distanceFromLeftInches),
          rightInches: roundSmartObjectInches(metrics.distanceFromRightInches),
          bottomInches: roundSmartObjectInches(doorItem.distanceFromFloorInches),
          widthInches: roundSmartObjectInches(pixelsToInches(doorItem.width)),
          heightInches: roundSmartObjectInches(doorItem.heightInches),
        };
      }),
  ].filter((fixedObject): fixedObject is SmartElevationFixedObject => Boolean(fixedObject));

  const cabinetFixedObjects = editorCabinets
    .map((cabinetItem): SmartElevationFixedObject | null => {
      const attachedWall = getCabinetDistanceWall(cabinetItem, editorWalls, editorCabinets);
      if (!attachedWall || attachedWall.id !== editorWall.id) return null;

      const metrics = getCabinetElevationDistanceMetrics(
        cabinetItem,
        editorWalls,
        editorCabinets
      );
      if (!metrics) return null;

      const catalogItem = getEditorCabinetCatalogItem(cabinetItem);
      const category =
        getCabinetElevationCategory(cabinetItem) ??
        cabinetItem.category ??
        catalogItem?.category ??
        "base";
      const isAccessory = Boolean(
        catalogItem?.isAccessory || isAccessoryCabinetImage(cabinetItem.image)
      );
      const isProduct = Boolean(
        catalogItem?.isProduct || isProductCabinetImage(cabinetItem.image)
      );
      const bottomInches =
        category === "wall"
          ? cabinetItem.distanceFromFloorInches ??
            catalogItem?.defaultDistanceFromFloorInches ??
            0
          : 0;

      return {
        id: cabinetItem.id,
        type: isAccessory ? "accessory" : isProduct ? "product" : "cabinet",
        coordinateSpace: "elevationPlan",
        catalogId: cabinetItem.catalogId ?? null,
        title: catalogItem?.title ?? "Placed object",
        category,
        image: cabinetItem.image ?? catalogItem?.image ?? null,
        topOption: getEditorCabinetTopOption(cabinetItem),
        accessoryKind: cabinetItem.accessoryKind ?? catalogItem?.accessoryKind,
        leftInches: roundSmartObjectInches(metrics.distanceFromLeftInches),
        rightInches: roundSmartObjectInches(metrics.distanceFromRightInches),
        bottomInches: roundSmartObjectInches(bottomInches),
        widthInches: roundSmartObjectInches(pixelsToInches(cabinetItem.width)),
        depthInches: roundSmartObjectInches(pixelsToInches(cabinetItem.depth)),
        heightInches: roundSmartObjectInches(
          cabinetItem.heightInches ??
            catalogItem?.heightInches ??
            (category === "wall" ? 30 : 36)
        ),
        lockMode: cabinetItem.lockMode ?? "locked",
      };
    })
    .filter((fixedObject): fixedObject is SmartElevationFixedObject => Boolean(fixedObject));

  return [...openingFixedObjects, ...cabinetFixedObjects];
}

function addEditorElevationWidthsToRoom(
  room: AiRoomInput,
  editorWalls: Wall[],
  editorCabinets: CabinetElement[],
  editorWindows: WindowElement[] = [],
  editorDoors: DoorElement[] = []
): AiRoomInput {
  return {
    ...room,
    walls: room.walls.map((aiWall) => {
      if (aiWall.kind === "thin-wall") return aiWall;

      const editorWall = findEditorWallForAiWall(aiWall, editorWalls);
      const widthInches = editorWall
        ? getEditorElevationWallWidthInches(editorWall, editorWalls, editorCabinets)
        : null;
      const fixedObjects = editorWall
        ? getEditorElevationFixedObjectsForWall(
            editorWall,
            editorWalls,
            editorWindows,
            editorDoors,
            editorCabinets
          )
        : [];
      const needCabinetPlacement = editorWall?.needCabinetPlacement ?? true;

      if (widthInches === null && fixedObjects.length === 0 && needCabinetPlacement) {
        return aiWall;
      }

      const wallWithElevation = aiWall as AiRoomWallWithEditorElevationData;

      return {
        ...wallWithElevation,
        needCabinetPlacement,
        elevationPlan: {
          ...(wallWithElevation.elevationPlan ?? {}),
          ...(widthInches === null ? {} : { widthInches }),
          fixedObjects,
        },
        ...(widthInches === null ? {} : { elevationWidthInches: widthInches }),
      };
    }),
  };
}

type CabinetEditorBaseMode = "default" | "ai-prototype" | "ai-viewer";

const MeasurementDisplayUnitContext = createContext<MeasurementDisplayUnit>("feet-inches");

function useMeasurementDisplayUnit() {
  return useContext(MeasurementDisplayUnitContext);
}

type CabinetEditorBaseProps = {
  mode?: CabinetEditorBaseMode;
};

export default function CabinetEditorBase({
  mode = "default",
}: CabinetEditorBaseProps) {
  const isAiPrototype = mode === "ai-prototype";
  const isAiViewer = mode === "ai-viewer";
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [activePanel, setActivePanel] = useState<Panel>("walls");
  const [cabinetCategoryTab, setCabinetCategoryTab] = useState<CabinetCategory>("base");
  const [selectedCabinetCatalogId, setSelectedCabinetCatalogId] = useState<string>(CABINET_CATALOG[0].id);
  const [selectedWindowDetail, setSelectedWindowDetail] =
    useState<WindowSelectionDetail | null>(null);
  const [selectedDoorDetail, setSelectedDoorDetail] =
    useState<DoorSelectionDetail | null>(null);
  const [selectedWallDetail, setSelectedWallDetail] =
    useState<WallSelectionDetail | null>(null);
  const [selectedCabinetDetail, setSelectedCabinetDetail] =
    useState<CabinetSelectionDetail | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [planViewMode, setPlanViewMode] = useState<PlanViewMode>("floor");
  const [showElevationMeasurements, setShowElevationMeasurements] = useState(true);
  const [measurementDisplayUnit, setMeasurementDisplayUnit] =
    useState<MeasurementDisplayUnit>("feet-inches");
  const [canConvertSelectedThinWalls, setCanConvertSelectedThinWalls] = useState(false);
  const [generatedLayout, setGeneratedLayout] = useState<GeneratedKitchenLayout | null>(null);
  const [isDesignerSummaryCollapsed, setIsDesignerSummaryCollapsed] = useState(false);
  const [isGeneratingSmartKitchen, setIsGeneratingSmartKitchen] = useState(false);
  const [lastSmartKitchenAiOutput, setLastSmartKitchenAiOutput] = useState<unknown | null>(null);
  const [smartKitchenFeedback, setSmartKitchenFeedback] = useState("");
  const [isSmartKitchenFeedbackCollapsed, setIsSmartKitchenFeedbackCollapsed] = useState(false);
  const [loadedRoom, setLoadedRoom] = useState<AiRoomInput | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importKitchenInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCabinetCatalogItem = useMemo(
    () => CABINET_CATALOG.find((item) => item.id === selectedCabinetCatalogId) ?? CABINET_CATALOG[0],
    [selectedCabinetCatalogId]
  );
  const selectedCabinetWidth = (selectedCabinetCatalogItem.widthInches / 12) * GRID_SIZE;
  const selectedCabinetDepth = (selectedCabinetCatalogItem.depthInches / 12) * GRID_SIZE;

  useEffect(() => {
    const handleWallSelectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<WallSelectionDetail | null>;
      setSelectedWallDetail(customEvent.detail ?? null);
      if (customEvent.detail) {
        setActivePanel("walls");
      }
    };

    window.addEventListener(
      "pelican-wall-selection-change",
      handleWallSelectionChange
    );

    return () => {
      window.removeEventListener(
        "pelican-wall-selection-change",
        handleWallSelectionChange
      );
    };
  }, []);

  useEffect(() => {
    const handleWallCabinetPlacementModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        value: WallCabinetPlacementMode;
      }>;
      const { id, value } = customEvent.detail ?? {};
      if (!id || !value) return;

      setSelectedWallDetail((current) =>
        current && current.id === id
          ? { ...current, cabinetPlacementMode: value }
          : current
      );
    };

    window.addEventListener(
      "pelican-wall-cabinet-placement-mode-change",
      handleWallCabinetPlacementModeChange
    );

    return () => {
      window.removeEventListener(
        "pelican-wall-cabinet-placement-mode-change",
        handleWallCabinetPlacementModeChange
      );
    };
  }, []);

  useEffect(() => {
    const handleWindowSelectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<WindowSelectionDetail | null>;
      setSelectedWindowDetail(customEvent.detail ?? null);
      if (customEvent.detail) {
        setActivePanel("structures");
      }
    };

    window.addEventListener(
      "pelican-window-selection-change",
      handleWindowSelectionChange
    );

    return () => {
      window.removeEventListener(
        "pelican-window-selection-change",
        handleWindowSelectionChange
      );
    };
  }, []);

  useEffect(() => {
    const handleDoorSelectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<DoorSelectionDetail | null>;
      setSelectedDoorDetail(customEvent.detail ?? null);
      if (customEvent.detail) {
        setActivePanel("structures");
      }
    };

    window.addEventListener(
      "pelican-door-selection-change",
      handleDoorSelectionChange
    );

    return () => {
      window.removeEventListener(
        "pelican-door-selection-change",
        handleDoorSelectionChange
      );
    };
  }, []);

  useEffect(() => {
    const handleCabinetSelectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<CabinetSelectionDetail | null>;
      const detail = customEvent.detail ?? null;
      setSelectedCabinetDetail(detail);
      if (detail) {
        setActivePanel(detail.image && isAccessoryCabinetImage(detail.image) ? "objects" : detail.image && isProductCabinetImage(detail.image) ? "products" : "cabinets");
      }
    };

    window.addEventListener(
      "pelican-cabinet-selection-change",
      handleCabinetSelectionChange
    );

    return () => {
      window.removeEventListener(
        "pelican-cabinet-selection-change",
        handleCabinetSelectionChange
      );
    };
  }, []);

  useEffect(() => {
    const handleAvailabilityChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ canConvert: boolean }>;
      setCanConvertSelectedThinWalls(Boolean(customEvent.detail?.canConvert));
    };

    window.addEventListener(
      "pelican-selection-conversion-availability",
      handleAvailabilityChange
    );

    return () => {
      window.removeEventListener(
        "pelican-selection-conversion-availability",
        handleAvailabilityChange
      );
    };
  }, []);

  useEffect(() => {
    if (!isAiPrototype) return undefined;

    const handleKitchenGenerated = (event: Event) => {
      const customEvent = event as CustomEvent<GeneratedKitchenLayout>;
      setGeneratedLayout(customEvent.detail);
      setIsDesignerSummaryCollapsed(false);
      setActivePanel("cabinets");
    };

    window.addEventListener("pelican-ai-kitchen-generated", handleKitchenGenerated);

    return () => {
      window.removeEventListener("pelican-ai-kitchen-generated", handleKitchenGenerated);
    };
  }, [isAiPrototype]);

  useEffect(() => {
    if (!isAiPrototype) return undefined;

    const handleSmartKitchenStatus = (event: Event) => {
      const customEvent = event as CustomEvent<{ isLoading?: boolean }>;
      setIsGeneratingSmartKitchen(Boolean(customEvent.detail?.isLoading));
    };

    window.addEventListener("pelican-ai-smart-kitchen-status", handleSmartKitchenStatus);

    return () => {
      window.removeEventListener(
        "pelican-ai-smart-kitchen-status",
        handleSmartKitchenStatus
      );
    };
  }, [isAiPrototype]);

  const zoomIn = () => {
    setScale((currentScale) =>
      clamp(currentScale * ZOOM_BUTTON_STEP, MIN_ZOOM, MAX_ZOOM)
    );
  };

  const zoomOut = () => {
    setScale((currentScale) =>
      clamp(currentScale / ZOOM_BUTTON_STEP, MIN_ZOOM, MAX_ZOOM)
    );
  };

  const resetCanvasView = () => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  const handleImportRoomClick = () => {
    importInputRef.current?.click();
  };

  const handleImportKitchenClick = () => {
    importKitchenInputRef.current?.click();
  };

  const handleImportedRoom = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const nextRoom = await readJsonFile(file);
      setLoadedRoom(nextRoom);
    } finally {
      event.target.value = "";
    }
  };

  const handleImportedKitchen = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    window.dispatchEvent(
      new CustomEvent("pelican-ai-import-kitchen-output-request", {
        detail: { file },
      })
    );

    event.target.value = "";
  };

  return (
    <MeasurementDisplayUnitContext.Provider value={measurementDisplayUnit}>
      <main className="flex h-screen w-screen flex-col overflow-hidden bg-white text-pelican-navy">
      <TopBar
        title={
          isAiPrototype
            ? "AI kitchen prototype"
            : isAiViewer
              ? "AI kitchen viewer"
              : undefined
        }
        onImportRoom={
          isAiPrototype || isAiViewer ? handleImportRoomClick : undefined
        }
        onImportKitchen={isAiPrototype ? handleImportKitchenClick : undefined}
        onExportRoom={
          isAiPrototype
            ? () => window.dispatchEvent(new Event("pelican-ai-export-room-request"))
            : undefined
        }
        onDownloadSmartKitchenInput={
          isAiPrototype
            ? () =>
                window.dispatchEvent(
                  new Event("pelican-ai-download-smart-kitchen-input-request")
                )
            : undefined
        }
        onDownloadLastSmartKitchenOutput={
          isAiPrototype
            ? () => {
                if (!lastSmartKitchenAiOutput) return;
                downloadJsonFile(
                  "pelican-smart-kitchen-ai-output.json",
                  lastSmartKitchenAiOutput
                );
              }
            : undefined
        }
        hasLastSmartKitchenOutput={Boolean(lastSmartKitchenAiOutput)}
        onGenerateSmartKitchen={
          isAiPrototype
            ? () =>
                window.dispatchEvent(
                  new Event("pelican-ai-generate-smart-kitchen-request")
                )
            : undefined
        }
        isGeneratingSmartKitchen={isGeneratingSmartKitchen}
      />
      {(isAiPrototype || isAiViewer) && (
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportedRoom}
        />
      )}
      {isAiPrototype && (
        <input
          ref={importKitchenInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportedKitchen}
        />
      )}

      {isAiPrototype && generatedLayout && (
        <section className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-pelican-navy">
                AI kitchen concept: {generatedLayout.summary.layoutType}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {generatedLayout.summary.generationMethod === "smart-ai"
                  ? `The layout was planned by ${generatedLayout.summary.plannerModel ?? "the smart planner"} and placed using the existing editor cabinet engine.`
                  : "Cabinets were placed onto the current room using the existing editor cabinet model."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-medium text-slate-500">
                {generatedLayout.cabinets.length} cabinet placement(s)
              </div>
              <button
                type="button"
                onClick={() =>
                  setIsSmartKitchenFeedbackCollapsed((current) => !current)
                }
                className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {isSmartKitchenFeedbackCollapsed
                  ? "Expand AI feedback"
                  : "Collapse AI feedback"}
              </button>
              <button
                type="button"
                onClick={() => setIsDesignerSummaryCollapsed((current) => !current)}
                className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {isDesignerSummaryCollapsed ? "Expand reasons" : "Collapse reasons"}
              </button>
            </div>
          </div>
          {!isSmartKitchenFeedbackCollapsed && (
            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-pelican-navy">
                    AI feedback for the next smart generation
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Use wall labels like{" "}
                    {generatedLayout.elevations.map((item) => item.label).join(", ")}.
                    The next Generate smart kitchen run will read this feedback together with the available walls, catalog, and pre-placed objects.
                  </p>
                </div>
                {smartKitchenFeedback.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSmartKitchenFeedback("")}
                    className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Clear feedback
                  </button>
                ) : null}
              </div>
              <textarea
                value={smartKitchenFeedback}
                onChange={(event) => setSmartKitchenFeedback(event.target.value)}
                placeholder='Example: "Wall 1 should feel more symmetrical in elevation, Wall 2 can stay lighter, and avoid a pantry cabinet unless it really helps."'
                className="mt-3 min-h-[110px] w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-pelican-teal"
              />
            </div>
          )}
          {!isDesignerSummaryCollapsed && (
            <div className="mt-3 flex flex-col gap-2">
              {generatedLayout.summary.notes.map((note, index) => (
                <div
                  key={`ai-note-${index}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  {note}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section className="flex min-w-0 flex-1 flex-col">
          <ModeBar
            isAiPrototype={isAiPrototype}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={resetCanvasView}
            isSelectionMode={isSelectionMode}
            planViewMode={planViewMode}
            onSelectPlanView={setPlanViewMode}
            showMeasurements={showElevationMeasurements}
            onToggleMeasurements={() => setShowElevationMeasurements((current) => !current)}
            measurementDisplayUnit={measurementDisplayUnit}
            onToggleMeasurementDisplayUnit={() =>
              setMeasurementDisplayUnit((current) =>
                current === "feet-inches" ? "inches" : "feet-inches"
              )
            }
            canConvertSelectedThinWalls={canConvertSelectedThinWalls}
            onCreateWallExterior={() =>
              window.dispatchEvent(new Event("pelican-create-selected-wall-exterior"))
            }
            onCreateWallInterior={() =>
              window.dispatchEvent(new Event("pelican-create-selected-wall-interior"))
            }
            onToggleSelectionMode={() => {
              setActiveTool(null);
              setIsSelectionMode((current) => !current);
            }}
          />

          <CanvasArea
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            planViewMode={planViewMode}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            offset={offset}
            scale={scale}
            setOffset={setOffset}
            setScale={setScale}
            selectedCabinetWidth={selectedCabinetWidth}
            selectedCabinetDepth={selectedCabinetDepth}
            selectedCabinetCategory={selectedCabinetCatalogItem.category}
            selectedCabinetCatalogItem={selectedCabinetCatalogItem}
            showElevationMeasurements={showElevationMeasurements}
            enableAiPrototype={isAiPrototype}
            smartKitchenFeedback={smartKitchenFeedback}
            onSmartKitchenOutput={setLastSmartKitchenAiOutput}
            loadedRoom={isAiPrototype || isAiViewer ? loadedRoom : null}
          />
        </section>

        <section className="flex h-full shrink-0 border-l border-slate-200 bg-white">
          <ContextPanel
            activePanel={activePanel}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            setIsSelectionMode={setIsSelectionMode}
            selectedWall={selectedWallDetail}
            selectedWindow={selectedWindowDetail}
            selectedDoor={selectedDoorDetail}
            selectedCabinet={selectedCabinetDetail}
            cabinetCategoryTab={cabinetCategoryTab}
            selectedCabinetCatalogId={selectedCabinetCatalogId}
            onSelectCabinetCategory={(category) => {
              setCabinetCategoryTab(category);
              const firstItemInCategory = CABINET_CATALOG.find((item) => item.category === category);
              if (firstItemInCategory) {
                setSelectedCabinetCatalogId(firstItemInCategory.id);
              }
            }}
            onSelectCabinetCatalog={(catalogId) => setSelectedCabinetCatalogId(catalogId)}
            onRequestPanel={setActivePanel}
          />
          <MainToolbar
            active={activePanel}
            onSelect={(panel) => {
              setActivePanel(panel);
              if (panel !== "walls") {
                setActiveTool(null);
              }
              if (panel !== "structures") {
                setSelectedWindowDetail(null);
                setSelectedDoorDetail(null);
                window.dispatchEvent(new Event("pelican-deselect-window"));
                window.dispatchEvent(new Event("pelican-deselect-door"));
              }
              if (panel !== "cabinets" && panel !== "products" && panel !== "objects") {
                setSelectedCabinetDetail(null);
                window.dispatchEvent(new Event("pelican-deselect-cabinet"));
              }
            }}
          />
        </section>
      </div>
      </main>
    </MeasurementDisplayUnitContext.Provider>
  );
}

function TopBar({
  title,
  onImportRoom,
  onImportKitchen,
  onExportRoom,
  onDownloadSmartKitchenInput,
  onDownloadLastSmartKitchenOutput,
  hasLastSmartKitchenOutput = false,
  onGenerateSmartKitchen,
  isGeneratingSmartKitchen = false,
}: {
  title?: string;
  onImportRoom?: () => void;
  onImportKitchen?: () => void;
  onExportRoom?: () => void;
  onDownloadSmartKitchenInput?: () => void;
  onDownloadLastSmartKitchenOutput?: () => void;
  hasLastSmartKitchenOutput?: boolean;
  onGenerateSmartKitchen?: () => void;
  isGeneratingSmartKitchen?: boolean;
}) {
  return (
    <header className="relative flex h-[55px] w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pelican-teal text-2xl font-bold italic text-white shadow-sm">
          df
        </div>
        {title ? (
          <div className="text-sm font-semibold text-pelican-navy">{title}</div>
        ) : null}
      </div>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
        <TopAction
          icon={Undo2}
          label="Undo"
          onClick={() => window.dispatchEvent(new Event("pelican-editor-undo"))}
        />
        <TopAction
          icon={Redo2}
          label="Redo"
          onClick={() => window.dispatchEvent(new Event("pelican-editor-redo"))}
        />
        {onImportRoom ? (
          <TopAction icon={Download} label="Import room" onClick={onImportRoom} />
        ) : null}
        {onImportKitchen ? (
          <TopAction icon={Download} label="Import objects" onClick={onImportKitchen} />
        ) : null}
        {onExportRoom ? (
          <TopAction icon={Download} label="Export room JSON" onClick={onExportRoom} />
        ) : null}
        {onDownloadSmartKitchenInput ? (
          <TopAction
            icon={Download}
            label="Download smart input"
            onClick={onDownloadSmartKitchenInput}
          />
        ) : null}
        {onDownloadLastSmartKitchenOutput ? (
          <TopAction
            icon={Download}
            label="Download last AI output"
            onClick={onDownloadLastSmartKitchenOutput}
            disabled={!hasLastSmartKitchenOutput}
          />
        ) : null}
        {onGenerateSmartKitchen ? (
          <TopAction
            icon={CheckCircle2}
            label={
              isGeneratingSmartKitchen
                ? "Planning smart kitchen..."
                : "Generate smart kitchen"
            }
            onClick={onGenerateSmartKitchen}
            disabled={isGeneratingSmartKitchen}
          />
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-pelican-slate px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-pelican-navy">
          <Box className="h-4 w-4" />
          Render Studio
        </button>

        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-pelican-teal px-3.5 text-sm font-semibold text-white shadow-sm hover:brightness-95">
          <CheckCircle2 className="h-4 w-4" />
          Save
        </button>

        <button className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Exit Editor
        </button>
      </div>
    </header>
  );
}

function TopAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3.5 text-sm font-semibold",
        disabled
          ? "cursor-not-allowed bg-slate-100 text-slate-400"
          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ModeBar({
  isAiPrototype,
  onZoomIn,
  onZoomOut,
  onResetView,
  isSelectionMode,
  planViewMode,
  onSelectPlanView,
  showMeasurements,
  onToggleMeasurements,
  measurementDisplayUnit,
  onToggleMeasurementDisplayUnit,
  canConvertSelectedThinWalls,
  onCreateWallExterior,
  onCreateWallInterior,
  onToggleSelectionMode,
}: {
  isAiPrototype: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  isSelectionMode: boolean;
  planViewMode: PlanViewMode;
  onSelectPlanView: (mode: PlanViewMode) => void;
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
  measurementDisplayUnit: MeasurementDisplayUnit;
  onToggleMeasurementDisplayUnit: () => void;
  canConvertSelectedThinWalls: boolean;
  onCreateWallExterior: () => void;
  onCreateWallInterior: () => void;
  onToggleSelectionMode: () => void;
}) {
  return (
    <div className="flex h-[62px] shrink-0 items-center gap-3 overflow-x-auto border-b border-slate-200 bg-white px-6">
      <div className="flex shrink-0 items-center gap-2">
        <ModeIconButton icon={ZoomOut} label="Zoom out" onClick={onZoomOut} />
        <ModeIconButton icon={ZoomIn} label="Zoom in" onClick={onZoomIn} />
        <ModeIconButton
          icon={Crosshair}
          label="Center canvas view"
          onClick={onResetView}
        />
        <ModeIconButton
          icon={Scan}
          label="Selection area"
          active={isSelectionMode}
          onClick={onToggleSelectionMode}
        />
        <ModeIconButton
          icon={BrickWall}
          label="Create wall exterior from selected thin walls"
          disabled={!canConvertSelectedThinWalls}
          onClick={onCreateWallExterior}
        />
        <ModeIconButton
          icon={Grid3X3}
          label="Create wall interior from selected thin walls"
          disabled={!canConvertSelectedThinWalls}
          onClick={onCreateWallInterior}
        />
        <ModeIconButton icon={Ruler} label="Ruler" />
        <ModeIconButton icon={Magnet} label="Snap" />

        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-pelican-navy hover:bg-slate-100">
          <Video className="h-[19px] w-[19px]" />
          Camera
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 items-center rounded-full bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => onSelectPlanView("floor")}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition",
            planViewMode === "floor"
              ? "bg-white text-pelican-navy shadow-sm"
              : "text-slate-500 hover:text-pelican-navy"
          )}
        >
          <Grid3X3 className="h-4 w-4" />
          Floorplan
        </button>

        <button
          type="button"
          onClick={() => onSelectPlanView("elevation")}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition",
            planViewMode === "elevation"
              ? "bg-white text-pelican-navy shadow-sm"
              : "text-slate-500 hover:text-pelican-navy"
          )}
        >
          <Square className="h-4 w-4" />
          Elevation plan
        </button>

        <button className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold text-slate-500 hover:text-pelican-navy">
          <Square className="h-4 w-4" />
          Top-down
        </button>

        <button className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold text-slate-500 hover:text-pelican-navy">
          <Grid3X3 className="h-4 w-4" />
          Perspective
        </button>
      </div>

      <div className="flex min-w-max flex-1 items-center justify-end gap-3">
        <button
          type="button"
          onClick={onToggleMeasurements}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-pelican-navy hover:bg-slate-100",
            showMeasurements && "bg-white shadow-sm"
          )}
          aria-pressed={showMeasurements}
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-sm border border-slate-400 bg-white",
              showMeasurements && "border-pelican-teal bg-pelican-teal text-white"
            )}
            aria-hidden="true"
          >
            {showMeasurements && <span className="text-[11px] leading-none">✓</span>}
          </span>
          Measurement
        </button>
        {isAiPrototype ? (
          <button
            type="button"
            onClick={onToggleMeasurementDisplayUnit}
            className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-pelican-navy hover:bg-slate-100"
          >
            <Ruler className="h-4 w-4" />
            {measurementDisplayUnit === "inches"
              ? "Show ft/in"
              : "Convert to inches"}
          </button>
        ) : null}
        <ModeIconButton icon={Settings} label="Canvas settings" />
      </div>
    </div>
  );
}

function ModeIconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md border text-pelican-navy hover:bg-slate-100",
        active
          ? "border-pelican-teal bg-cyan-50 text-pelican-teal shadow-sm"
          : "border-slate-200 bg-slate-50",
        disabled && "cursor-not-allowed opacity-40 hover:bg-slate-50"
      )}
    >
      <Icon className="h-[21px] w-[21px]" />
    </button>
  );
}


function EditorAlertModal({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  const stopModalEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      onPointerDown={stopModalEvent}
      onPointerMove={stopModalEvent}
      onPointerUp={stopModalEvent}
      onPointerCancel={stopModalEvent}
      onClick={stopModalEvent}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl font-bold text-amber-600">
          !
        </div>
        <h2 className="text-lg font-bold text-pelican-navy">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            className="inline-flex h-10 items-center justify-center rounded-md bg-pelican-teal px-5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function shouldSuppressEditorAlert(_message: string) {
  return false;
}

function CanvasArea({
  activeTool,
  setActiveTool,
  planViewMode,
  isSelectionMode,
  setIsSelectionMode,
  offset,
  scale,
  setOffset,
  setScale,
  selectedCabinetWidth,
  selectedCabinetDepth,
  selectedCabinetCategory,
  selectedCabinetCatalogItem,
  showElevationMeasurements,
  enableAiPrototype,
  smartKitchenFeedback,
  onSmartKitchenOutput,
  loadedRoom = null,
}: {
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  planViewMode: PlanViewMode;
  isSelectionMode: boolean;
  setIsSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  offset: Point;
  scale: number;
  setOffset: React.Dispatch<React.SetStateAction<Point>>;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  selectedCabinetWidth: number;
  selectedCabinetDepth: number;
  selectedCabinetCategory: CabinetCategory;
  selectedCabinetCatalogItem: CabinetCatalogItem;
  showElevationMeasurements: boolean;
  enableAiPrototype: boolean;
  smartKitchenFeedback: string;
  onSmartKitchenOutput?: (payload: unknown | null) => void;
  loadedRoom?: AiRoomInput | null;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef<Point>(offset);
  const scaleRef = useRef(scale);
  const activeToolRef = useRef<Tool>(activeTool);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragOffsetStartRef = useRef<Point>({ x: 0, y: 0 });
  const menuDragRef = useRef<MenuDragState | null>(null);
  const groupDragRef = useRef<GroupDragState | null>(null);
  const peninWallDragRef = useRef<PeninWallDragState | null>(null);
  const peninWallRotateRef = useRef<PeninWallRotateState | null>(null);
  const peninWallResizeRef = useRef<PeninWallResizeState | null>(null);

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isPeninWallRotating, setIsPeninWallRotating] = useState(false);
  const [walls, setWalls] = useState<Wall[]>([]);
  const wallsRef = useRef<Wall[]>([]);
  const [windows, setWindows] = useState<WindowElement[]>([]);
  const windowsRef = useRef<WindowElement[]>([]);
  const [doors, setDoors] = useState<DoorElement[]>([]);
  const doorsRef = useRef<DoorElement[]>([]);
  // CabinetElement
  const [cabinets, setCabinets] = useState<CabinetElement[]>([]);
  const cabinetsRef = useRef<CabinetElement[]>([]);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const selectedCabinetIdRef = useRef<string | null>(null);
  const smartKitchenFeedbackRef = useRef(smartKitchenFeedback);
  const resolveImportedPlacementWallFace = useCallback(
    (
      wall: Wall,
      importedWallFace: ImportedKitchenPlacement["wallFace"]
    ): WallFaceSide => {
      const thickWalls = wallsRef.current.filter(isThickWall);
      const interiorSide = getInteriorMeasurementGuideSide(wall, thickWalls);
      const measurementSide =
        importedWallFace === "exterior"
          ? interiorSide === "left"
            ? "right"
            : "left"
          : interiorSide;

      return measurementSideToWallFaceSide(wall, measurementSide);
    },
    []
  );
  const getImportedWallFacePlacementGeometry = useCallback(
    (wall: Wall, wallFace: WallFaceSide) => {
      const thickWalls = wallsRef.current.filter(isThickWall);
      const geometry = getWallSegmentBlackDotGeometry(
        wall.start,
        wall.end,
        thickWalls
      );
      const faceStartAnchor =
        wallFace === "left" ? geometry.startLeft : geometry.startRight;
      const faceEndAnchor =
        wallFace === "left" ? geometry.endLeft : geometry.endRight;
      const faceVector = sub(faceEndAnchor, faceStartAnchor);
      const faceLength = vectorLength(faceVector);
      const faceDirection =
        faceLength > 0.001 ? normalize(faceVector) : normalize(sub(wall.end, wall.start));
      const faceNormal = wallFace === "left" ? getElevationWallAxis(wall).normal : mul(getElevationWallAxis(wall).normal, -1);
      const viewDirection = mul(faceNormal, -1);
      const viewerRight = normalize(perp(viewDirection));
      const startProjection = dot(faceStartAnchor, viewerRight);
      const endProjection = dot(faceEndAnchor, viewerRight);
      const displayOrigin =
        startProjection <= endProjection ? faceStartAnchor : faceEndAnchor;

      return {
        displayOrigin,
        viewerRight,
        faceNormal,
        faceLength,
      };
    },
    []
  );
  const [cabinetPreview, setCabinetPreview] = useState<CabinetPlacementPreview | null>(null);
  const cabinetPreviewRef = useRef<CabinetPlacementPreview | null>(null);
  const cabinetDragRef = useRef<CabinetDragState | null>(null);
  const cabinetRotateRef = useRef<CabinetRotateState | null>(null);
  const [isCabinetRotating, setIsCabinetRotating] = useState(false);
  const [isCabinetDragging, setIsCabinetDragging] = useState(false);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const selectedWindowIdRef = useRef<string | null>(null);
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);
  const selectedDoorIdRef = useRef<string | null>(null);
  const [windowPreview, setWindowPreview] = useState<WindowPlacementPreview | null>(null);
  const [doorPreview, setDoorPreview] = useState<DoorPlacementPreview | null>(null);
  const windowPreviewRef = useRef<WindowPlacementPreview | null>(null);
  const doorPreviewRef = useRef<DoorPlacementPreview | null>(null);
  const windowDragRef = useRef<WindowDragState | null>(null);
  const doorDragRef = useRef<DoorDragState | null>(null);
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const selectedWallIdRef = useRef<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<Point | null>(null);
  const [editingMeasurement, setEditingMeasurement] =
    useState<MeasurementEditState | null>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [groupSelectedWallIds, setGroupSelectedWallIds] = useState<string[]>([]);
  const groupSelectedWallIdsRef = useRef<string[]>([]);
  const [groupSelectedCabinetIds, setGroupSelectedCabinetIds] = useState<string[]>([]);
  const [groupContextMenu, setGroupContextMenu] =
    useState<GroupContextMenuState | null>(null);
  const [activeElevationIndex, setActiveElevationIndex] = useState(0);
  const [editorAlert, setEditorAlert] = useState<{ title: string; message: string } | null>(null);

  const showEditorAlert = useCallback((message: string, title = "Placement warning") => {
    if (shouldSuppressEditorAlert(message)) return;
    setEditorAlert({ title, message });
  }, []);

  useEffect(() => {
    smartKitchenFeedbackRef.current = smartKitchenFeedback;
  }, [smartKitchenFeedback]);

  useEffect(() => {
    if (!loadedRoom) return;

    const nextWalls = loadedRoom.walls as Wall[];
    const nextWindows = loadedRoom.windows as WindowElement[];
    const nextDoors = loadedRoom.doors as DoorElement[];

    wallsRef.current = nextWalls;
    windowsRef.current = nextWindows;
    doorsRef.current = nextDoors;
    cabinetsRef.current = [];
    setWalls(nextWalls);
    setWindows(nextWindows);
    setDoors(nextDoors);
    setCabinets([]);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setSelectedWallId(null);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedCabinetId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedCabinetIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setDrawingStart(null);
    setPreviewPoint(null);
    windowPreviewRef.current = null;
    doorPreviewRef.current = null;
    cabinetPreviewRef.current = null;
    setWindowPreview(null);
    setDoorPreview(null);
    setCabinetPreview(null);
    setActiveElevationIndex(0);
  }, [loadedRoom]);

  useEffect(() => {
    if (!enableAiPrototype) return undefined;

    const handleExportRoomRequest = () => {
      const room = withSmartInputCatalog(
        exportAiRoomInputFromEditor({
          walls: wallsRef.current,
          windows: windowsRef.current,
          doors: doorsRef.current,
          cabinets: cabinetsRef.current,
        })
      );

      if (room.walls.length === 0) {
        showEditorAlert(
          "Draw thin walls and convert them into thick walls first, then export the room JSON.",
          "Room export blocked"
        );
        return;
      }

      downloadJsonFile("pelican-room-input.json", room);
    };

    window.addEventListener("pelican-ai-export-room-request", handleExportRoomRequest);

    return () => {
      window.removeEventListener("pelican-ai-export-room-request", handleExportRoomRequest);
    };
  }, [enableAiPrototype, showEditorAlert]);

  const thickWalls = useMemo(() => walls.filter(isThickWall), [walls]);
  const structuralThickWalls = useMemo(() => thickWalls.filter((wall) => !isDetachedPanelWall(wall)), [thickWalls]);
  const peninWalls = useMemo(() => thickWalls.filter(isDetachedPanelWall), [thickWalls]);
  const thinWalls = useMemo(() => walls.filter(isThinWall), [walls]);

  const wallPoints = useMemo(() => {
    return getWallEndpoints(walls);
  }, [walls]);

  const selectedWall = useMemo(() => {
    return walls.find((wall) => wall.id === selectedWallId) ?? null;
  }, [walls, selectedWallId]);

  const selectedWindow = useMemo(() => {
    return windows.find((windowItem) => windowItem.id === selectedWindowId) ?? null;
  }, [selectedWindowId, windows]);

  const selectedDoor = useMemo(() => {
    return doors.find((doorItem) => doorItem.id === selectedDoorId) ?? null;
  }, [selectedDoorId, doors]);

  // selectedCabinet
  const selectedCabinet = useMemo(() => {
    return cabinets.find((cabinetItem) => cabinetItem.id === selectedCabinetId) ?? null;
  }, [cabinets, selectedCabinetId]);

  const groupSelectedWalls = useMemo(() => {
    const selectedIds = new Set(groupSelectedWallIds);
    return walls.filter((wall) => selectedIds.has(wall.id));
  }, [groupSelectedWallIds, walls]);

  const groupSelectedCabinets = useMemo(() => {
    const selectedIds = new Set(groupSelectedCabinetIds);
    return cabinets.filter((cabinetItem) => selectedIds.has(cabinetItem.id));
  }, [cabinets, groupSelectedCabinetIds]);

  const groupSelectedThinWalls = useMemo(() => {
    return groupSelectedWalls.filter(isThinWall);
  }, [groupSelectedWalls]);

  const canConvertGroupThinWalls = useMemo(() => {
    return canConvertThinWallSelection(groupSelectedWalls, thinWalls);
  }, [groupSelectedWalls, thinWalls]);

  const connectionMap = useMemo(() => buildConnectionMap(structuralThickWalls), [structuralThickWalls]);
  const thinConnectionMap = useMemo(() => buildConnectionMap(thinWalls), [thinWalls]);
  const wallChains = useMemo(() => buildWallChains(structuralThickWalls), [structuralThickWalls]);
  const thinWallChains = useMemo(() => buildWallChains(thinWalls), [thinWalls]);
  const elevationWalls = useMemo(
    () => [...structuralThickWalls, ...peninWalls],
    [structuralThickWalls, peninWalls]
  );

  useEffect(() => {
    setActiveElevationIndex((currentIndex) =>
      clamp(currentIndex, 0, Math.max(0, elevationWalls.length - 1))
    );
  }, [elevationWalls.length]);

  const clearWallSelectionState = useCallback(() => {
    setSelectedWallId(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    setDrawingStart(null);
    setPreviewPoint(null);
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelectingArea(false);
    setGroupSelectedWallIds([]);
    setGroupContextMenu(null);
  }, []);

  const updateWindowPreview = useCallback((preview: WindowPlacementPreview | null) => {
    windowPreviewRef.current = preview;
    setWindowPreview(preview);
  }, []);

  const updateDoorPreview = useCallback((preview: DoorPlacementPreview | null) => {
    doorPreviewRef.current = preview;
    setDoorPreview(preview);
  }, []);

  // updateCabinetPreview
  const updateCabinetPreview = useCallback((preview: CabinetPlacementPreview | null) => {
    const nextPreview =
      preview && activeToolRef.current === "place-cabinet" && !preview.image
        ? { ...preview, image: selectedCabinetCatalogItem.image }
        : preview;

    cabinetPreviewRef.current = nextPreview;
    setCabinetPreview(nextPreview);
  }, [selectedCabinetCatalogItem.image]);

  const commitWallsChange = useCallback(
    (updater: Wall[] | ((currentWalls: Wall[]) => Wall[])) => {
      const currentWalls = wallsRef.current;
      const currentWindows = windowsRef.current;
      const currentDoors = doorsRef.current;
      const nextWalls =
        typeof updater === "function" ? updater(currentWalls) : updater;

      if (areWallsEqual(currentWalls, nextWalls)) return;

      undoStackRef.current.push({ walls: currentWalls, windows: currentWindows, doors: currentDoors });
      redoStackRef.current = [];
      wallsRef.current = nextWalls;
      setWalls(nextWalls);
    },
    []
  );

  const commitWindowsChange = useCallback(
    (updater: WindowElement[] | ((currentWindows: WindowElement[]) => WindowElement[])) => {
      const currentWalls = wallsRef.current;
      const currentWindows = windowsRef.current;
      const currentDoors = doorsRef.current;
      const nextWindows =
        typeof updater === "function" ? updater(currentWindows) : updater;

      if (areWindowsEqual(currentWindows, nextWindows)) return;

      undoStackRef.current.push({ walls: currentWalls, windows: currentWindows, doors: currentDoors });
      redoStackRef.current = [];
      windowsRef.current = nextWindows;
      setWindows(nextWindows);
    },
    []
  );

  const commitDoorsChange = useCallback(
    (updater: DoorElement[] | ((currentDoors: DoorElement[]) => DoorElement[])) => {
      const currentWalls = wallsRef.current;
      const currentWindows = windowsRef.current;
      const currentDoors = doorsRef.current;
      const nextDoors =
        typeof updater === "function" ? updater(currentDoors) : updater;

      if (areDoorsEqual(currentDoors, nextDoors)) return;

      undoStackRef.current.push({ walls: currentWalls, windows: currentWindows, doors: currentDoors });
      redoStackRef.current = [];
      doorsRef.current = nextDoors;
      setDoors(nextDoors);
    },
    []
  );


  // commitCabinetsChange
  const commitCabinetsChange = useCallback(
    (updater: CabinetElement[] | ((currentCabinets: CabinetElement[]) => CabinetElement[])) => {
      const currentWalls = wallsRef.current;
      const currentWindows = windowsRef.current;
      const currentDoors = doorsRef.current;
      const currentCabinets = cabinetsRef.current;
      const nextCabinets =
        typeof updater === "function" ? updater(currentCabinets) : updater;

      if (areCabinetsEqual(currentCabinets, nextCabinets)) return;

      undoStackRef.current.push({
        walls: currentWalls,
        windows: currentWindows,
        doors: currentDoors,
        cabinets: currentCabinets,
      });
      redoStackRef.current = [];
      cabinetsRef.current = nextCabinets;
      setCabinets(nextCabinets);
    },
    []
  );

  const buildImportedKitchenCabinet = useCallback(
    (
      wall: Wall,
      placement: ImportedKitchenPlacement,
      catalogItem: CabinetCatalogItem
    ): CabinetElement => {
      const wallFace = resolveImportedPlacementWallFace(wall, placement.wallFace);
      const { displayOrigin, viewerRight, faceNormal, faceLength } =
        getImportedWallFacePlacementGeometry(wall, wallFace);
      const spanWidthInches = placement.widthInches ?? catalogItem.widthInches;
      const projectionDepthInches =
        placement.depthInches ?? catalogItem.depthInches;
      const heightInches =
        placement.heightInches ??
        catalogItem.heightInches ??
        (catalogItem.category === "wall" ? 30 : 34.5);
      const supportType = getSupportTypeForCategory(
        catalogItem.category,
        spanWidthInches,
        heightInches
      );
      const bottomInches =
        supportType === "floor-supported"
          ? 0
          : placement.bottomInches ??
            catalogItem.defaultDistanceFromFloorInches ??
            (catalogItem.category === "wall" ? 54 : 0);
      const widthPixels = inchesToPixels(spanWidthInches);
      const depthPixels = inchesToPixels(projectionDepthInches);
      const maxDisplayStartPixels = Math.max(0, faceLength - widthPixels);
      const displayStartPixels = clamp(
        inchesToPixels(placement.leftInches),
        0,
        maxDisplayStartPixels
      );
      const roughCenter = add(
        displayOrigin,
        add(
          mul(viewerRight, displayStartPixels + widthPixels / 2),
          mul(faceNormal, WALL_THICKNESS / 2 + depthPixels / 2)
        )
      );
      const baseRotation =
        (Math.atan2(viewerRight.y, viewerRight.x) * 180) / Math.PI;
      const preview = getCabinetPlacementPreview(
        roughCenter,
        wallsRef.current.filter(isThickWall),
        widthPixels,
        depthPixels,
        baseRotation,
        [],
        undefined,
        catalogItem.category,
        false,
        true,
        false,
        wall.id,
        catalogItem.image
      );
      const center = preview.center;
      const rotation = preview.rotation;

      const cabinet: CabinetElement = {
        id: crypto.randomUUID(),
        center,
        width: widthPixels,
        depth: depthPixels,
        rotation,
        category: catalogItem.category,
        catalogId: catalogItem.id,
        image: catalogItem.image,
        accessoryKind: catalogItem.accessoryKind,
        heightInches,
        distanceFromFloorInches: bottomInches,
        wallId: preview.wallId ?? wall.id,
        wallFace: preview.wallFace ?? wallFace,
        sinkFixture:
          placement.topOption === "sink" || isBuiltInSinkCabinetImage(catalogItem.image)
            ? true
            : undefined,
        cooktopFixture:
          placement.topOption === "surface-cooktop"
            ? "surface"
            : placement.topOption === "front-control-cooktop"
              ? "front"
              : undefined,
        cooktopFrontHeightInches:
          placement.topOption === "front-control-cooktop" ? 3 : undefined,
        blindDoorWidthInches: isBlindCabinetImage(catalogItem.image)
          ? getDefaultBlindCabinetDoorWidthInches(
              spanWidthInches,
              catalogItem.category
            )
          : undefined,
        blindFillerWidthInches: isBlindCabinetImage(catalogItem.image)
          ? placement.builtInFillerWidthInches ?? 3
          : undefined,
        ovenCabinetProductLayout: getDefaultBottomDrawerProductLayout(catalogItem.image),
        ovenCabinetProductHeightInches:
          isOvenLikeBottomDrawerCabinetImage(catalogItem.image)
            ? getDefaultOvenCabinetProductHeightInches(heightInches)
            : undefined,
      };

      return normalizeSpecialCabinetState(cabinet);
    },
    [getImportedWallFacePlacementGeometry, resolveImportedPlacementWallFace]
  );

  useEffect(() => {
    if (!enableAiPrototype) return undefined;

    const handleDownloadSmartKitchenInputRequest = async () => {
      const room = addEditorElevationWidthsToRoom(
        withSmartInputCatalog(
          exportAiRoomInputFromEditor({
            walls: wallsRef.current,
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: cabinetsRef.current,
          })
        ),
        wallsRef.current,
        cabinetsRef.current,
        windowsRef.current,
        doorsRef.current
      );

      if (room.walls.length === 0) {
        showEditorAlert(
          "Draw thin walls and convert them into thick walls first, then download the smart kitchen input.",
          "Smart input blocked"
        );
        return;
      }

      try {
        const response = await fetch("/api/smart-kitchen", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room,
            designerFeedback: smartKitchenFeedbackRef.current.trim() || undefined,
            previewOnly: true,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          plannerInput?: unknown;
        };

        if (!response.ok || !payload.plannerInput) {
          showEditorAlert(
            payload.error ??
              "The smart kitchen input could not be prepared for download.",
            "Smart input failed"
          );
          return;
        }

        downloadJsonFile(
          "pelican-smart-kitchen-ai-input.json",
          payload.plannerInput
        );
      } catch (error) {
        showEditorAlert(
          error instanceof Error
            ? error.message
            : "The smart kitchen input request failed.",
          "Smart input failed"
        );
      }
    };

    window.addEventListener(
      "pelican-ai-download-smart-kitchen-input-request",
      handleDownloadSmartKitchenInputRequest
    );

    return () => {
      window.removeEventListener(
        "pelican-ai-download-smart-kitchen-input-request",
        handleDownloadSmartKitchenInputRequest
      );
    };
  }, [enableAiPrototype, showEditorAlert]);

  useEffect(() => {
    if (!enableAiPrototype) return undefined;

    const handleGenerateSmartKitchenRequest = async () => {
      const room = addEditorElevationWidthsToRoom(
        withSmartInputCatalog(
          exportAiRoomInputFromEditor({
            walls: wallsRef.current,
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: cabinetsRef.current,
          })
        ),
        wallsRef.current,
        cabinetsRef.current,
        windowsRef.current,
        doorsRef.current
      );

      if (room.walls.length === 0) {
        showEditorAlert(
          "Draw thin walls and convert them into thick walls first, then generate a smart kitchen.",
          "Smart kitchen blocked"
        );
        return;
      }

      window.dispatchEvent(
        new CustomEvent("pelican-ai-smart-kitchen-status", {
          detail: { isLoading: true },
        })
      );

      try {
        const response = await fetch("/api/smart-kitchen", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room,
            designerFeedback: smartKitchenFeedbackRef.current.trim() || undefined,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          layout?: GeneratedKitchenLayout;
          aiOutput?: unknown;
          plan?: unknown;
        };
        const downloadableAiOutput = payload.aiOutput ?? payload.plan ?? null;

        if (!response.ok || !payload.layout) {
          showEditorAlert(
            payload.error ??
              "The smart kitchen planner could not generate a layout for this room.",
            "Smart kitchen failed"
          );
          return;
        }

        if (payload.layout.cabinets.length === 0) {
          showEditorAlert(
            "The smart kitchen planner did not produce any cabinet placements for the current room.",
            "No smart kitchen generated"
          );
          return;
        }

        onSmartKitchenOutput?.(downloadableAiOutput);

        if (downloadableAiOutput) {
          downloadJsonFile(
            "pelican-smart-kitchen-ai-output.json",
            downloadableAiOutput
          );
        }

        const didImportAiOutput =
          downloadableAiOutput &&
          applyImportedKitchenPlan(downloadableAiOutput, {
            importNote: "Kitchen imported automatically from smart AI output.",
            plannerModel: payload.layout.summary.plannerModel ?? "smart-ai-output",
          });

        if (!didImportAiOutput) {
          commitCabinetsChange(() => payload.layout!.cabinets as CabinetElement[]);
          setSelectedCabinetId(null);
          setSelectedWindowId(null);
          setSelectedDoorId(null);
          setSelectedWallId(null);
          setGroupSelectedCabinetIds([]);
          setGroupSelectedWallIds([]);
          setGroupContextMenu(null);
          setMenuPosition(null);
          updateCabinetPreview(null);
          updateDoorPreview(null);
          updateWindowPreview(null);

          window.dispatchEvent(
            new CustomEvent("pelican-ai-kitchen-generated", { detail: payload.layout })
          );
        }
      } catch (error) {
        showEditorAlert(
          error instanceof Error
            ? error.message
            : "The smart kitchen planner request failed.",
          "Smart kitchen failed"
        );
      } finally {
        window.dispatchEvent(
          new CustomEvent("pelican-ai-smart-kitchen-status", {
            detail: { isLoading: false },
          })
        );
      }
    };

    window.addEventListener(
      "pelican-ai-generate-smart-kitchen-request",
      handleGenerateSmartKitchenRequest
    );

    return () => {
      window.removeEventListener(
        "pelican-ai-generate-smart-kitchen-request",
        handleGenerateSmartKitchenRequest
      );
    };
  }, [
    enableAiPrototype,
    commitCabinetsChange,
    onSmartKitchenOutput,
    showEditorAlert,
    updateCabinetPreview,
    updateDoorPreview,
    updateWindowPreview,
  ]);

  function applyImportedKitchenPlan(
    rawPlan: unknown,
    options?: {
      importNote?: string;
      plannerModel?: string;
    }
  ) {
      const importedPlan = normalizeImportedKitchenPlan(rawPlan);

      if (!importedPlan || !importedPlan.walls?.length) {
        return false;
      }

      const thickWalls = wallsRef.current.filter(isThickWall);
      if (thickWalls.length === 0) {
        return false;
      }

      const wallLabelLookup = new Map(
        thickWalls.map((wall, index) => [wall.id, `Wall ${index + 1}`] as const)
      );
      const labelToWallIdLookup = new Map(
        Array.from(wallLabelLookup.entries()).map(([wallId, wallLabel]) => [
          wallLabel.toLowerCase(),
          wallId,
        ])
      );

      const importedCabinets: CabinetElement[] = [];

      for (const wallPlan of importedPlan.walls ?? []) {
        const resolvedWallId =
          wallPlan.wallId && thickWalls.some((wall) => wall.id === wallPlan.wallId)
            ? wallPlan.wallId
            : wallPlan.wallLabel
              ? labelToWallIdLookup.get(wallPlan.wallLabel.trim().toLowerCase()) ?? null
              : null;
        if (!resolvedWallId) continue;

        const wall = thickWalls.find((candidateWall) => candidateWall.id === resolvedWallId);
        if (!wall) continue;

        for (const placement of wallPlan.placements ?? []) {
          const catalogItem = CABINET_CATALOG.find(
            (item) => item.id === placement.catalogId
          );
          if (!catalogItem) continue;
          importedCabinets.push(
            buildImportedKitchenCabinet(wall, placement, catalogItem)
          );
        }
      }

      if (importedCabinets.length === 0) {
        return false;
      }

      commitCabinetsChange(() => importedCabinets);
      setSelectedCabinetId(null);
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setSelectedWallId(null);
      setGroupSelectedCabinetIds([]);
      setGroupSelectedWallIds([]);
      setGroupContextMenu(null);
      setMenuPosition(null);
      updateCabinetPreview(null);
      updateDoorPreview(null);
      updateWindowPreview(null);

      const room = addEditorElevationWidthsToRoom(
        withSmartInputCatalog(
          exportAiRoomInputFromEditor({
            walls: wallsRef.current,
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: importedCabinets,
          })
        ),
        wallsRef.current,
        importedCabinets,
        windowsRef.current,
        doorsRef.current
      );

      onSmartKitchenOutput?.(rawPlan);

      window.dispatchEvent(
        new CustomEvent("pelican-ai-kitchen-generated", {
          detail: {
            room,
            cabinets: importedCabinets,
            summary: {
              layoutType: importedPlan.layoutType ?? "single-wall",
              notes: [
                options?.importNote ?? "Kitchen imported from AI output JSON.",
                ...(importedPlan.notes ?? []),
              ],
              selectedWallIds: thickWalls.map((wall) => wall.id),
              generationMethod: "smart-ai",
              plannerModel: options?.plannerModel ?? "imported-ai-output",
            },
            elevations: thickWalls.map((wall, index) => ({
              wallId: wall.id,
              label: wallLabelLookup.get(wall.id) ?? `Wall ${index + 1}`,
              cabinetCount: importedCabinets.filter(
                (cabinet) => cabinet.wallId === wall.id
              ).length,
            })),
          } as GeneratedKitchenLayout,
        })
      );

      return true;
  }

  const importKitchenFromOutputPlan = useCallback(
    async (file: File) => {
      const rawPlan = await readUnknownJsonFile(file);
      const didImport = applyImportedKitchenPlan(rawPlan, {
        importNote: "Kitchen imported from AI output JSON.",
        plannerModel: "imported-ai-output",
      });

      if (didImport) return;

      const importedPlan = normalizeImportedKitchenPlan(rawPlan);
      const thickWalls = wallsRef.current.filter(isThickWall);

      if (!importedPlan || !importedPlan.walls?.length) {
        showEditorAlert(
          "The imported kitchen JSON did not contain any wall placements.",
          "Import kitchen failed"
        );
        return;
      }

      if (thickWalls.length === 0) {
        showEditorAlert(
          "Draw thin walls and convert them into thick walls first, then import a kitchen layout.",
          "Import kitchen blocked"
        );
        return;
      }

      showEditorAlert(
        "The imported kitchen JSON did not produce any drawable cabinets in the current room.",
        "Import kitchen failed"
      );
    },
    [
      applyImportedKitchenPlan,
      showEditorAlert,
    ]
  );

  useEffect(() => {
    if (!enableAiPrototype) return undefined;

    const handleImportKitchenOutputRequest = async (event: Event) => {
      const customEvent = event as CustomEvent<{ file?: File }>;
      const file = customEvent.detail?.file;
      if (!file) return;

      try {
        await importKitchenFromOutputPlan(file);
      } catch (error) {
        showEditorAlert(
          error instanceof Error
            ? error.message
            : "The selected kitchen JSON could not be imported.",
          "Import kitchen failed"
        );
      }
    };

    window.addEventListener(
      "pelican-ai-import-kitchen-output-request",
      handleImportKitchenOutputRequest
    );

    return () => {
      window.removeEventListener(
        "pelican-ai-import-kitchen-output-request",
        handleImportKitchenOutputRequest
      );
    };
  }, [enableAiPrototype, importKitchenFromOutputPlan, showEditorAlert]);

  const undoWallChange = useCallback(() => {
    const previousSnapshot = undoStackRef.current.pop();

    if (!previousSnapshot) return;

    const currentSnapshot = {
      walls: wallsRef.current,
      windows: windowsRef.current,
      doors: doorsRef.current,
      cabinets: cabinetsRef.current,
    };

    redoStackRef.current.push(currentSnapshot);
    wallsRef.current = previousSnapshot.walls;
    windowsRef.current = previousSnapshot.windows;
    doorsRef.current = previousSnapshot.doors ?? [];
    cabinetsRef.current = previousSnapshot.cabinets ?? cabinetsRef.current;
    setWalls(previousSnapshot.walls);
    setWindows(previousSnapshot.windows);
    setDoors(previousSnapshot.doors ?? []);
    setCabinets(previousSnapshot.cabinets ?? cabinetsRef.current);
    clearWallSelectionState();
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedCabinetId(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updateCabinetPreview(null);
  }, [clearWallSelectionState, updateCabinetPreview, updateDoorPreview, updateWindowPreview]);

  const redoWallChange = useCallback(() => {
    const nextSnapshot = redoStackRef.current.pop();

    if (!nextSnapshot) return;

    const currentSnapshot = {
      walls: wallsRef.current,
      windows: windowsRef.current,
      doors: doorsRef.current,
      cabinets: cabinetsRef.current,
    };

    undoStackRef.current.push(currentSnapshot);
    wallsRef.current = nextSnapshot.walls;
    windowsRef.current = nextSnapshot.windows;
    doorsRef.current = nextSnapshot.doors ?? [];
    cabinetsRef.current = nextSnapshot.cabinets ?? cabinetsRef.current;
    setWalls(nextSnapshot.walls);
    setWindows(nextSnapshot.windows);
    setDoors(nextSnapshot.doors ?? []);
    setCabinets(nextSnapshot.cabinets ?? cabinetsRef.current);
    clearWallSelectionState();
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedCabinetId(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updateCabinetPreview(null);
  }, [clearWallSelectionState, updateCabinetPreview, updateDoorPreview, updateWindowPreview]);

  const createThickWallsFromThinWalls = useCallback(
    (mode: ThickWallCreationMode, sourceWallIds?: string[]) => {
      const sourceIdSet = sourceWallIds ? new Set(sourceWallIds) : null;
      const currentThinWalls = wallsRef.current.filter(
        (wall) => isThinWall(wall) && (!sourceIdSet || sourceIdSet.has(wall.id))
      );

      if (currentThinWalls.length === 0) return;

      const convertedWalls = convertThinWallsToThickWalls(currentThinWalls, mode);

      if (convertedWalls.length === 0) return;

      commitWallsChange((currentWalls) => {
        const baseWalls = currentWalls.filter((wall) => {
          if (!isThinWall(wall)) return true;
          return sourceIdSet ? !sourceIdSet.has(wall.id) : false;
        });

        return normalizeWallJunctions([...baseWalls, ...convertedWalls], "wall");
      });

      setActiveTool(null);
      activeToolRef.current = null;
      clearWallSelectionState();
    },
    [clearWallSelectionState, commitWallsChange, setActiveTool]
  );

  useEffect(() => {
    wallsRef.current = walls;
  }, [walls]);

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  useEffect(() => {
    doorsRef.current = doors;
  }, [doors]);

  useEffect(() => {
    selectedWallIdRef.current = selectedWallId;
  }, [selectedWallId]);

  useEffect(() => {
    groupSelectedWallIdsRef.current = groupSelectedWallIds;
  }, [groupSelectedWallIds]);

  // cabinetsRef
  useEffect(() => {
    cabinetsRef.current = cabinets;
  }, [cabinets]);

  // selectedCabinetIdRef
  useEffect(() => {
    selectedCabinetIdRef.current = selectedCabinetId;
  }, [selectedCabinetId]);

  useEffect(() => {
    selectedWindowIdRef.current = selectedWindowId;
  }, [selectedWindowId]);

  useEffect(() => {
    selectedDoorIdRef.current = selectedDoorId;
  }, [selectedDoorId]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    const wallDistanceMetrics = selectedWindow
      ? getOpeningElevationDistanceMetrics(selectedWindow, walls, cabinets)
      : null;
    const detail = selectedWindow
      ? {
          id: selectedWindow.id,
          widthInches: pixelsToInches(selectedWindow.width),
          heightInches: selectedWindow.heightInches,
          distanceFromFloorInches: selectedWindow.distanceFromFloorInches,
          ...(wallDistanceMetrics ?? {}),
        }
      : null;

    window.dispatchEvent(
      new CustomEvent("pelican-window-selection-change", { detail })
    );
  }, [selectedWindow, walls, cabinets]);

  useEffect(() => {
    const wallDistanceMetrics = selectedDoor
      ? getOpeningElevationDistanceMetrics(selectedDoor, walls, cabinets)
      : null;
    const detail = selectedDoor
      ? {
          id: selectedDoor.id,
          widthInches: pixelsToInches(selectedDoor.width),
          heightInches: selectedDoor.heightInches,
          distanceFromFloorInches: selectedDoor.distanceFromFloorInches,
          ...(wallDistanceMetrics ?? {}),
        }
      : null;

    window.dispatchEvent(
      new CustomEvent("pelican-door-selection-change", { detail })
    );
  }, [selectedDoor, walls, cabinets]);

  useEffect(() => {
    const category = selectedCabinet ? getCabinetElevationCategory(selectedCabinet) : null;
    const wallDistanceMetrics = selectedCabinet
      ? getCabinetElevationDistanceMetrics(selectedCabinet, walls, cabinets)
      : null;
    const catalogItem = selectedCabinet ? getEditorCabinetCatalogItem(selectedCabinet) : null;
    const detail = selectedCabinet
      ? {
          id: selectedCabinet.id,
          catalogId: selectedCabinet.catalogId ?? catalogItem?.id,
          widthInches: pixelsToInches(selectedCabinet.width),
          depthInches: pixelsToInches(selectedCabinet.depth),
          heightInches:
            selectedCabinet.heightInches ??
            catalogItem?.heightInches ??
            (category === "wall" ? 30 : 36),
          distanceFromFloorInches:
            selectedCabinet.distanceFromFloorInches ??
            (isElevationFloatingCabinet(selectedCabinet) ? 54 : 0),
          ...(wallDistanceMetrics ?? {}),
          category: category ?? undefined,
          image: selectedCabinet.image,
          sinkFixture: selectedCabinet.sinkFixture,
          cooktopFixture: selectedCabinet.cooktopFixture,
          cooktopFrontHeightInches: selectedCabinet.cooktopFrontHeightInches,
          accessoryKind: selectedCabinet.accessoryKind ?? catalogItem?.accessoryKind,
          blindDoorWidthInches: isBlindCabinetImage(selectedCabinet.image)
            ? getBlindCabinetWidthSegments(selectedCabinet).doorWidthInches
            : undefined,
          blindFillerWidthInches: isBlindCabinetImage(selectedCabinet.image)
            ? getBlindCabinetWidthSegments(selectedCabinet).fillerWidthInches
            : undefined,
          ovenCabinetProductLayout: selectedCabinet.ovenCabinetProductLayout ?? "none",
          ovenCabinetProductHeightInches:
            getOvenCabinetHeightSegments(selectedCabinet).productHeightInches,
          ovenCabinetFillerHeightInches:
            getOvenCabinetHeightSegments(selectedCabinet).fillerHeightInches,
          ovenCabinetBottomDrawerHeightInches:
            getOvenCabinetHeightSegments(selectedCabinet).bottomDrawerHeightInches,
        }
      : null;

    window.dispatchEvent(
      new CustomEvent("pelican-cabinet-selection-change", { detail })
    );
  }, [selectedCabinet, walls, cabinets]);

  useEffect(() => {
    const detail = selectedWall
      ? {
          id: selectedWall.id,
          kind: selectedWall.kind ?? "wall",
          elevationViewMode: getWallElevationViewMode(selectedWall),
          cabinetPlacementMode: getWallCabinetPlacementMode(selectedWall),
        }
      : null;

    window.dispatchEvent(
      new CustomEvent("pelican-wall-selection-change", { detail })
    );
  }, [selectedWall]);

  useEffect(() => {
    const handleWindowAttributeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        field: "widthInches" | "heightInches" | "distanceFromFloorInches" | "distanceFromLeftInches" | "distanceFromRightInches";
        value: number;
      }>;

      const { id, field, value } = customEvent.detail ?? {};

      if (!id || !Number.isFinite(value)) return;

      commitWindowsChange((currentWindows) =>
        currentWindows.map((windowItem) => {
          if (windowItem.id !== id) return windowItem;

          if (field === "widthInches") {
            return { ...windowItem, width: inchesToPixels(Math.max(6, value)) };
          }

          if (field === "heightInches") {
            return { ...windowItem, heightInches: Math.max(1, value) };
          }

          if (field === "distanceFromLeftInches" || field === "distanceFromRightInches") {
            const metrics = getOpeningElevationDistanceMetrics(
              windowItem,
              wallsRef.current,
              cabinetsRef.current
            );
            if (!metrics) return windowItem;

            const objectWidthInches = Math.max(
              0,
              metrics.wallWidthInches - metrics.distanceFromLeftInches - metrics.distanceFromRightInches
            );
            const displayStartInches = field === "distanceFromLeftInches"
              ? value
              : metrics.wallWidthInches - objectWidthInches - value;
            const nextT = getOpeningTFromElevationDistance(
              windowItem,
              wallsRef.current,
              displayStartInches,
              cabinetsRef.current
            );

            return nextT === null ? windowItem : { ...windowItem, t: nextT };
          }

          return { ...windowItem, distanceFromFloorInches: Math.max(0, value) };
        })
      );
    };

    const handleWindowDeselect = () => {
      setSelectedWindowId(null);
      updateWindowPreview(null);
    };

    window.addEventListener("pelican-window-attribute-change", handleWindowAttributeChange);
    window.addEventListener("pelican-deselect-window", handleWindowDeselect);

    return () => {
      window.removeEventListener("pelican-window-attribute-change", handleWindowAttributeChange);
      window.removeEventListener("pelican-deselect-window", handleWindowDeselect);
    };
  }, [commitWindowsChange]);

  useEffect(() => {
    const handleWallElevationViewChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        value: WallElevationViewMode;
      }>;

      const { id, value } = customEvent.detail ?? {};
      if (!id || !value) return;

      commitWallsChange((currentWalls) =>
        currentWalls.map((wall) =>
          wall.id === id ? { ...wall, elevationViewMode: value } : wall
        )
      );
    };

    const handleWallNeedCabinetPlacementChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        value: boolean;
      }>;

      const { id, value } = customEvent.detail ?? {};
      if (!id || typeof value !== "boolean") return;

      commitWallsChange((currentWalls) =>
        currentWalls.map((wall) =>
          wall.id === id
            ? {
                ...wall,
                needCabinetPlacement: value,
                cabinetPlacementMode: value
                  ? getWallCabinetPlacementMode(wall) === "none"
                    ? "interior"
                    : getWallCabinetPlacementMode(wall)
                  : "none",
              }
            : wall
        )
      );
    };

    const handleWallCabinetPlacementModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        value: WallCabinetPlacementMode;
      }>;

      const { id, value } = customEvent.detail ?? {};
      if (!id || !value) return;

      commitWallsChange((currentWalls) =>
        currentWalls.map((wall) =>
          wall.id === id ? { ...wall, cabinetPlacementMode: value } : wall
        )
      );
    };

    const handleWallDeselect = () => {
      setSelectedWallId(null);
      setMenuPosition(null);
    };

    window.addEventListener(
      "pelican-wall-elevation-view-change",
      handleWallElevationViewChange
    );
    window.addEventListener(
      "pelican-wall-need-cabinet-placement-change",
      handleWallNeedCabinetPlacementChange
    );
    window.addEventListener(
      "pelican-wall-cabinet-placement-mode-change",
      handleWallCabinetPlacementModeChange
    );
    window.addEventListener("pelican-deselect-wall", handleWallDeselect);

    return () => {
      window.removeEventListener(
        "pelican-wall-elevation-view-change",
        handleWallElevationViewChange
      );
      window.removeEventListener(
        "pelican-wall-need-cabinet-placement-change",
        handleWallNeedCabinetPlacementChange
      );
      window.removeEventListener(
        "pelican-wall-cabinet-placement-mode-change",
        handleWallCabinetPlacementModeChange
      );
      window.removeEventListener("pelican-deselect-wall", handleWallDeselect);
    };
  }, [commitWallsChange]);

  useEffect(() => {
    const handleDoorAttributeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        field: "widthInches" | "heightInches" | "distanceFromFloorInches" | "distanceFromLeftInches" | "distanceFromRightInches";
        value: number;
      }>;

      const { id, field, value } = customEvent.detail ?? {};

      if (!id || !Number.isFinite(value)) return;

      commitDoorsChange((currentDoors) =>
        currentDoors.map((doorItem) => {
          if (doorItem.id !== id) return doorItem;

          if (field === "widthInches") {
            return { ...doorItem, width: inchesToPixels(Math.max(6, value)) };
          }

          if (field === "heightInches") {
            return { ...doorItem, heightInches: Math.max(1, value) };
          }

          if (field === "distanceFromLeftInches" || field === "distanceFromRightInches") {
            const metrics = getOpeningElevationDistanceMetrics(
              doorItem,
              wallsRef.current,
              cabinetsRef.current
            );
            if (!metrics) return doorItem;

            const objectWidthInches = Math.max(
              0,
              metrics.wallWidthInches - metrics.distanceFromLeftInches - metrics.distanceFromRightInches
            );
            const displayStartInches = field === "distanceFromLeftInches"
              ? value
              : metrics.wallWidthInches - objectWidthInches - value;
            const nextT = getOpeningTFromElevationDistance(
              doorItem,
              wallsRef.current,
              displayStartInches,
              cabinetsRef.current
            );

            return nextT === null ? doorItem : { ...doorItem, t: nextT };
          }

          return { ...doorItem, distanceFromFloorInches: Math.max(0, value) };
        })
      );
    };

    const handleDoorDeselect = () => {
      setSelectedDoorId(null);
      updateDoorPreview(null);
    };

    window.addEventListener("pelican-door-attribute-change", handleDoorAttributeChange);
    window.addEventListener("pelican-deselect-door", handleDoorDeselect);

    return () => {
      window.removeEventListener("pelican-door-attribute-change", handleDoorAttributeChange);
      window.removeEventListener("pelican-deselect-door", handleDoorDeselect);
    };
  }, [commitDoorsChange]);

  useEffect(() => {
    const handleCabinetAttributeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        field:
          | "widthInches"
          | "depthInches"
          | "heightInches"
          | "dimensions"
          | "distanceFromFloorInches"
          | "distanceFromLeftInches"
          | "distanceFromRightInches"
          | "sinkFixture"
          | "cooktopFixture"
          | "cooktopFrontHeightInches"
          | "blindDoorWidthInches"
          | "blindFillerWidthInches"
          | "topFixture"
          | "ovenCabinetProductLayout"
          | "ovenCabinetProductHeightInches"
          | "ovenCabinetFillerHeightInches"
          | "ovenCabinetBottomDrawerHeightInches";
        value:
          | number
          | CabinetDimensionSet
          | boolean
          | "surface"
          | "front"
          | "none"
          | OvenCabinetProductLayout
          | null;
      }>;

      const { id, field, value } = customEvent.detail ?? {};

      if (!id) return;

      const isNumericCabinetField =
        field === "widthInches" ||
        field === "depthInches" ||
        field === "heightInches" ||
        field === "distanceFromFloorInches" ||
        field === "distanceFromLeftInches" ||
        field === "distanceFromRightInches" ||
        field === "cooktopFrontHeightInches" ||
        field === "blindDoorWidthInches" ||
        field === "blindFillerWidthInches" ||
        field === "ovenCabinetProductHeightInches" ||
        field === "ovenCabinetFillerHeightInches" ||
        field === "ovenCabinetBottomDrawerHeightInches";

      if (isNumericCabinetField && !Number.isFinite(Number(value))) return;

      commitCabinetsChange((currentCabinets) =>
        currentCabinets.map((cabinetItem) => {
          if (cabinetItem.id !== id) return cabinetItem;

          if (field === "dimensions") {
            const nextDimension = value as CabinetDimensionSet;
            if (
              !nextDimension ||
              !Number.isFinite(nextDimension.widthInches) ||
              !Number.isFinite(nextDimension.heightInches) ||
              !Number.isFinite(nextDimension.depthInches)
            ) {
              return cabinetItem;
            }

            const nextWidthPixels = inchesToPixels(Math.max(isAccessoryCabinetImage(cabinetItem.image) ? 0.25 : 6, nextDimension.widthInches));
            const nextDepthPixels = inchesToPixels(Math.max(1, nextDimension.depthInches));
            const nextHeightInches = Math.max(1, nextDimension.heightInches);

            let nextCabinet = resolveCabinetDimensionChange(
              cabinetItem,
              { ...cabinetItem, width: nextWidthPixels },
              wallsRef.current,
              currentCabinets
            );
            nextCabinet = resolveCabinetDimensionChange(
              nextCabinet,
              { ...nextCabinet, depth: nextDepthPixels },
              wallsRef.current,
              currentCabinets.map((candidate) =>
                candidate.id === id ? nextCabinet : candidate
              )
            );
            nextCabinet = {
              ...nextCabinet,
              heightInches: nextHeightInches,
              distanceFromFloorInches: getSupportTypeForCategory(
                getCabinetElevationCategory(nextCabinet),
                pixelsToInches(nextCabinet.width),
                nextHeightInches
              ) === "floor-supported"
                ? 0
                : nextCabinet.distanceFromFloorInches,
            };
            if (isBlindCabinetImage(nextCabinet.image)) {
              nextCabinet = {
                ...nextCabinet,
                blindDoorWidthInches: getDefaultBlindCabinetDoorWidthInches(
                  nextDimension.widthInches,
                  getCabinetElevationCategory(nextCabinet)
                ),
                blindFillerWidthInches: 3,
              };
            }
            if (isOvenLikeBottomDrawerCabinetImage(nextCabinet.image)) {
              nextCabinet = {
                ...nextCabinet,
                ovenCabinetProductHeightInches: getDefaultOvenCabinetProductHeightInches(
                  nextHeightInches
                ),
                ovenCabinetFillerHeightInches:
                  OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES,
                ovenCabinetBottomDrawerHeightInches:
                  OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES,
              };
            }
            nextCabinet = normalizeSpecialCabinetState(nextCabinet);

            if (isElevationFloatingCabinet(nextCabinet)) {
              const candidateCabinets = currentCabinets.map((candidate) =>
                candidate.id === id ? nextCabinet : candidate
              );
              const stackMessage = getWallCabinetStackOverflowMessage(candidateCabinets, wallsRef.current, id);
              if (stackMessage) {
                showEditorAlert(stackMessage);
                return cabinetItem;
              }
            }

            return nextCabinet;
          }

          if (field === "topFixture") {
            const nextTopFixture =
              value === "surface" || value === "front"
                ? value
                : "none";
            const nextCooktopFixture =
              nextTopFixture === "surface" || nextTopFixture === "front"
                ? nextTopFixture
                : undefined;

            return {
              ...cabinetItem,
              sinkFixture: isBuiltInSinkCabinetImage(cabinetItem.image)
                ? cabinetItem.sinkFixture
                : false,
              cooktopFixture: nextCooktopFixture,
              cooktopFrontHeightInches: nextCooktopFixture === "front"
                ? cabinetItem.cooktopFrontHeightInches ?? 6
                : cabinetItem.cooktopFrontHeightInches,
            };
          }

          if (field === "sinkFixture") {
            const hasSink = Boolean(value);
            return {
              ...cabinetItem,
              sinkFixture: hasSink,
              cooktopFixture: hasSink ? undefined : cabinetItem.cooktopFixture,
            };
          }

          if (field === "cooktopFixture") {
            const nextCooktopFixture = value === "surface" || value === "front" ? value : undefined;
            return {
              ...cabinetItem,
              sinkFixture: nextCooktopFixture ? false : cabinetItem.sinkFixture,
              cooktopFixture: nextCooktopFixture,
              cooktopFrontHeightInches: nextCooktopFixture === "front"
                ? cabinetItem.cooktopFrontHeightInches ?? 6
                : cabinetItem.cooktopFrontHeightInches,
            };
          }

          if (field === "cooktopFrontHeightInches") {
            return {
              ...cabinetItem,
              cooktopFrontHeightInches: Math.max(1, Number(value) || 1),
            };
          }

          if (field === "blindDoorWidthInches") {
            const { widthInches, fillerWidthInches } =
              getBlindCabinetWidthSegments(cabinetItem);
            return normalizeBlindCabinetSettings({
              ...cabinetItem,
              blindDoorWidthInches: clamp(
                Number(value) || 0,
                0,
                Math.max(0, widthInches - fillerWidthInches - 3)
              ),
            });
          }

          if (field === "blindFillerWidthInches") {
            const { widthInches, doorWidthInches } =
              getBlindCabinetWidthSegments(cabinetItem);
            return normalizeBlindCabinetSettings({
              ...cabinetItem,
              blindFillerWidthInches: clamp(
                Number(value) || 0,
                0,
                Math.max(0, widthInches - doorWidthInches - 3)
              ),
            });
          }

          if (field === "ovenCabinetProductLayout") {
            return {
              ...cabinetItem,
              ovenCabinetProductLayout: (value as OvenCabinetProductLayout) ?? "none",
            };
          }

          if (field === "ovenCabinetProductHeightInches") {
            const { totalHeightInches, bottomDrawerHeightInches } =
              getOvenCabinetHeightSegments(cabinetItem);
            const nextProductHeightInches = clamp(
              Number(value) || 0,
              0,
              Math.max(0, totalHeightInches - bottomDrawerHeightInches)
            );
            return {
              ...cabinetItem,
              ovenCabinetProductHeightInches: nextProductHeightInches,
              ovenCabinetFillerHeightInches: Math.max(
                0,
                totalHeightInches -
                  bottomDrawerHeightInches -
                  nextProductHeightInches
              ),
            };
          }

          if (field === "ovenCabinetFillerHeightInches") {
            const { totalHeightInches, bottomDrawerHeightInches } =
              getOvenCabinetHeightSegments(cabinetItem);
            const nextFillerHeightInches = clamp(
              Number(value) || 0,
              0,
              Math.max(0, totalHeightInches - bottomDrawerHeightInches)
            );
            return {
              ...cabinetItem,
              ovenCabinetFillerHeightInches: nextFillerHeightInches,
              ovenCabinetProductHeightInches: Math.max(
                0,
                totalHeightInches -
                  bottomDrawerHeightInches -
                  nextFillerHeightInches
              ),
            };
          }

          if (field === "ovenCabinetBottomDrawerHeightInches") {
            const { totalHeightInches, productHeightInches } =
              getOvenCabinetHeightSegments(cabinetItem);
            const nextDrawerHeightInches = clamp(
              Number(value) || 0,
              0,
              Math.max(0, totalHeightInches - productHeightInches)
            );
            return {
              ...cabinetItem,
              ovenCabinetBottomDrawerHeightInches: nextDrawerHeightInches,
              ovenCabinetFillerHeightInches: Math.max(
                0,
                totalHeightInches -
                  productHeightInches -
                  nextDrawerHeightInches
              ),
            };
          }

          if (field === "distanceFromLeftInches" || field === "distanceFromRightInches") {
            const metrics = getCabinetElevationDistanceMetrics(
              cabinetItem,
              wallsRef.current,
              currentCabinets
            );
            if (!metrics) return cabinetItem;

            const objectWidthInches = Math.max(
              0,
              metrics.wallWidthInches - metrics.distanceFromLeftInches - metrics.distanceFromRightInches
            );
            const displayStartInches = field === "distanceFromLeftInches"
              ? Number(value)
              : metrics.wallWidthInches - objectWidthInches - Number(value);
            const nextCenter = getCabinetCenterFromElevationDistance(
              cabinetItem,
              wallsRef.current,
              currentCabinets,
              displayStartInches
            );

            return nextCenter ? { ...cabinetItem, center: nextCenter } : cabinetItem;
          }

          if (field === "distanceFromFloorInches") {
            if (!isElevationFloatingCabinet(cabinetItem)) {
              return { ...cabinetItem, distanceFromFloorInches: 0 };
            }

            const nextCabinet = {
              ...cabinetItem,
              distanceFromFloorInches: Math.max(0, Number(value)),
            };

            if (isElevationFloatingCabinet(nextCabinet)) {
              const candidateCabinets = currentCabinets.map((candidate) =>
                candidate.id === id ? nextCabinet : candidate
              );
              const stackMessage = getWallCabinetStackOverflowMessage(candidateCabinets, wallsRef.current, id);
              if (stackMessage) {
                showEditorAlert(stackMessage);
                return cabinetItem;
              }
            }

            return nextCabinet;
          }

          if (field === "widthInches") {
            const minWidthInches = isAccessoryCabinetImage(cabinetItem.image) ? 0.25 : 6;
            return resolveCabinetDimensionChange(
              cabinetItem,
              { ...cabinetItem, width: inchesToPixels(Math.max(minWidthInches, Number(value))) },
              wallsRef.current,
              currentCabinets
            );
          }

          if (field === "depthInches") {
            return resolveCabinetDimensionChange(
              cabinetItem,
              { ...cabinetItem, depth: inchesToPixels(Math.max(1, Number(value))) },
              wallsRef.current,
              currentCabinets
            );
          }

          const nextHeightInches = Math.max(1, Number(value));
          const nextCabinet = {
            ...cabinetItem,
            heightInches: nextHeightInches,
            distanceFromFloorInches: getSupportTypeForCategory(
              getCabinetElevationCategory(cabinetItem),
              pixelsToInches(cabinetItem.width),
              nextHeightInches
            ) === "floor-supported"
              ? 0
              : cabinetItem.distanceFromFloorInches,
          };
          const normalizedNextCabinet =
            normalizeSpecialCabinetState(nextCabinet);
          if (isElevationFloatingCabinet(normalizedNextCabinet)) {
            const candidateCabinets = currentCabinets.map((candidate) =>
              candidate.id === id ? normalizedNextCabinet : candidate
            );
            const stackMessage = getWallCabinetStackOverflowMessage(candidateCabinets, wallsRef.current, id);
            if (stackMessage) {
              showEditorAlert(stackMessage);
              return cabinetItem;
            }
          }

          return normalizedNextCabinet;
        })
      );
    };

    const handleCabinetDeselect = () => {
      setSelectedCabinetId(null);
      setGroupSelectedCabinetIds([]);
      updateCabinetPreview(null);
    };

    window.addEventListener("pelican-cabinet-attribute-change", handleCabinetAttributeChange);
    window.addEventListener("pelican-deselect-cabinet", handleCabinetDeselect);

    return () => {
      window.removeEventListener("pelican-cabinet-attribute-change", handleCabinetAttributeChange);
      window.removeEventListener("pelican-deselect-cabinet", handleCabinetDeselect);
    };
  }, [commitCabinetsChange, showEditorAlert, updateCabinetPreview]);

  useEffect(() => {
    if (isDrawingTool(activeTool) && isSelectionMode) {
      setIsSelectionMode(false);
      setGroupSelectedWallIds([]);
      setGroupSelectedCabinetIds([]);
      setGroupContextMenu(null);
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelectingArea(false);
    }
  }, [activeTool, isSelectionMode, setIsSelectionMode]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("pelican-selection-conversion-availability", {
        detail: { canConvert: canConvertGroupThinWalls },
      })
    );
  }, [canConvertGroupThinWalls]);



  useEffect(() => {
    if (!selectedWall) {
      setMenuPosition(null);
      return;
    }

    setMenuPosition((currentPosition) => {
      return currentPosition ?? getWallMenuPosition(selectedWall);
    });
  }, [selectedWall]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left - rect.width / 2;
      const pointerY = event.clientY - rect.top - rect.height / 2;

      const currentScale = scaleRef.current;
      const currentOffset = offsetRef.current;

      const nextScale = clamp(
        currentScale * Math.exp(-event.deltaY * ZOOM_INTENSITY),
        MIN_ZOOM,
        MAX_ZOOM
      );

      const scaleRatio = nextScale / currentScale;

      setScale(nextScale);
      setOffset({
        x: pointerX - (pointerX - currentOffset.x) * scaleRatio,
        y: pointerY - (pointerY - currentOffset.y) * scaleRatio,
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [setOffset, setScale]);

  useEffect(() => {
    const handleUndoButton = () => undoWallChange();
    const handleRedoButton = () => redoWallChange();

    window.addEventListener("pelican-editor-undo", handleUndoButton);
    window.addEventListener("pelican-editor-redo", handleRedoButton);

    return () => {
      window.removeEventListener("pelican-editor-undo", handleUndoButton);
      window.removeEventListener("pelican-editor-redo", handleRedoButton);
    };
  }, [redoWallChange, undoWallChange]);

  useEffect(() => {
    const handleCreateWallExterior = () => createThickWallsFromThinWalls("exterior");
    const handleCreateWallInterior = () => createThickWallsFromThinWalls("interior");

    window.addEventListener("pelican-create-wall-exterior", handleCreateWallExterior);
    window.addEventListener("pelican-create-wall-interior", handleCreateWallInterior);

    return () => {
      window.removeEventListener("pelican-create-wall-exterior", handleCreateWallExterior);
      window.removeEventListener("pelican-create-wall-interior", handleCreateWallInterior);
    };
  }, [createThickWallsFromThinWalls]);

useEffect(() => {
  const cancelDrawWallTool = () => {
    setActiveTool(null);
    activeToolRef.current = null;
    setDrawingStart(null);
    setPreviewPoint(null);
    updateCabinetPreview(null);
    setIsDraggingCanvas(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (editingMeasurement) return;

    const key = event.key.toLowerCase();
    const isUndoShortcut =
      (event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey;
    const isRedoShortcut =
      (event.ctrlKey || event.metaKey) &&
      (key === "y" || (key === "z" && event.shiftKey));

    if (isUndoShortcut) {
      event.preventDefault();
      undoWallChange();
      return;
    }

    if (isRedoShortcut) {
      event.preventDefault();
      redoWallChange();
      return;
    }

    const isCtrlCancel =
      event.key === "Control" ||
      event.code === "ControlLeft" ||
      event.code === "ControlRight";

    if (
      (isCtrlCancel || event.key === "Escape") &&
      (isDrawingTool(activeToolRef.current) || activeToolRef.current === "place-window" || activeToolRef.current === "place-door" || activeToolRef.current === "place-cabinet")
    ) {
      event.preventDefault();
      cancelDrawWallTool();
      return;
    }

    if (event.key === "Escape") {
      if (isSelectionMode) {
        event.preventDefault();
        setIsSelectionMode(false);
      }

      setDrawingStart(null);
      setPreviewPoint(null);
      setSelectedWallId(null);
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setSelectedCabinetId(null);
      setMenuPosition(null);
      setGroupSelectedWallIds([]);
      setGroupSelectedCabinetIds([]);
      setGroupContextMenu(null);
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelectingArea(false);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      (groupSelectedWallIds.length > 0 || groupSelectedCabinetIds.length > 0)
    ) {
      event.preventDefault();

      if (groupSelectedWallIds.length > 0) {
        const wallIdsToDelete = new Set(groupSelectedWallIds);
        commitWallsChange((currentWalls) =>
          currentWalls.filter((wall) => !wallIdsToDelete.has(wall.id))
        );
      }

      if (groupSelectedCabinetIds.length > 0) {
        const selectedCabinetIds = new Set(groupSelectedCabinetIds);
        commitCabinetsChange((currentCabinets) =>
          currentCabinets.filter((cabinetItem) => !selectedCabinetIds.has(cabinetItem.id))
        );
      }

      setSelectedWallId(null);
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setSelectedCabinetId(null);
      setMenuPosition(null);
      setGroupSelectedWallIds([]);
      setGroupSelectedCabinetIds([]);
      setGroupContextMenu(null);
      setSelectionStart(null);
      setSelectionEnd(null);
      setDrawingStart(null);
      setPreviewPoint(null);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      selectedCabinetIdRef.current
    ) {
      event.preventDefault();
      const cabinetId = selectedCabinetIdRef.current;
      commitCabinetsChange((currentCabinets) =>
        currentCabinets.filter((cabinetItem) => cabinetItem.id !== cabinetId)
      );
      setSelectedCabinetId(null);
      setMenuPosition(null);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      selectedDoorIdRef.current
    ) {
      event.preventDefault();
      const doorId = selectedDoorIdRef.current;
      commitDoorsChange((currentDoors) =>
        currentDoors.filter((doorItem) => doorItem.id !== doorId)
      );
      setSelectedDoorId(null);
      setMenuPosition(null);
      setDrawingStart(null);
      setPreviewPoint(null);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      selectedWindowIdRef.current
    ) {
      event.preventDefault();
      const windowId = selectedWindowIdRef.current;
      commitWindowsChange((currentWindows) =>
        currentWindows.filter((windowItem) => windowItem.id !== windowId)
      );
      setSelectedWindowId(null);
      setMenuPosition(null);
      setDrawingStart(null);
      setPreviewPoint(null);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      selectedWallId
    ) {
      event.preventDefault();
      commitWallsChange((currentWalls) =>
        currentWalls.filter((wall) => wall.id !== selectedWallId)
      );

      setSelectedWallId(null);
      setSelectedWindowId(null);
      setMenuPosition(null);
      setDrawingStart(null);
      setPreviewPoint(null);
    }
  };

  window.addEventListener("keydown", handleKeyDown, true);

  return () => window.removeEventListener("keydown", handleKeyDown, true);
}, [commitWallsChange, commitWindowsChange, commitDoorsChange, commitCabinetsChange, editingMeasurement, groupSelectedWallIds, groupSelectedCabinetIds, isSelectionMode, redoWallChange, selectedWallId, setActiveTool, setIsSelectionMode, undoWallChange, updateCabinetPreview]);

  const screenToWorkspace = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;

    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left - rect.width / 2;
    const localY = clientY - rect.top - rect.height / 2;

    return {
      x:
        (localX - offsetRef.current.x) / scaleRef.current +
        WORKSPACE_WIDTH / 2,
      y:
        (localY - offsetRef.current.y) / scaleRef.current +
        WORKSPACE_HEIGHT / 2,
    };
  };

  const isPointerInsideCanvas = (clientX: number, clientY: number): boolean => {
    const canvas = canvasRef.current;

    if (!canvas) return false;

    const rect = canvas.getBoundingClientRect();

    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  const getGuideInfo = (rawPoint: Point, startPoint: Point): GuideInfo => {
    let point = { ...rawPoint };
    let verticalX: number | undefined;
    let horizontalY: number | undefined;

    const alignmentPoints =
      activeToolRef.current === "draw-thin-wall"
        ? getWallEndpoints(thinWalls)
        : activeToolRef.current === "draw-wall" || activeToolRef.current === "draw-penin-wall" || activeToolRef.current === "draw-island-wall"
          ? getWallEndpoints(thickWalls)
          : wallPoints;

    const candidatePoints = [startPoint, ...alignmentPoints];

    for (const candidate of candidatePoints) {
      if (Math.abs(rawPoint.x - candidate.x) <= SNAP_THRESHOLD) {
        point.x = candidate.x;
        verticalX = candidate.x;
        break;
      }
    }

    for (const candidate of candidatePoints) {
      if (Math.abs(rawPoint.y - candidate.y) <= SNAP_THRESHOLD) {
        point.y = candidate.y;
        horizontalY = candidate.y;
        break;
      }
    }

    if (
      verticalX === undefined &&
      Math.abs(point.x - startPoint.x) <= SNAP_THRESHOLD
    ) {
      point.x = startPoint.x;
      verticalX = startPoint.x;
    }

    if (
      horizontalY === undefined &&
      Math.abs(point.y - startPoint.y) <= SNAP_THRESHOLD
    ) {
      point.y = startPoint.y;
      horizontalY = startPoint.y;
    }

    return { point, verticalX, horizontalY };
  };

  const wallHoverPoint = useMemo(() => {
    if (!isDrawingTool(activeTool) || !previewPoint || drawingStart) return null;

    const attachableWalls =
      activeTool === "draw-island-wall" ? [] : activeTool === "draw-thin-wall" ? thinWalls : thickWalls;

    return getWallAttachPoint(previewPoint, attachableWalls);
  }, [activeTool, drawingStart, previewPoint, thickWalls, thinWalls]);

  const rawPreviewPoint = wallHoverPoint ?? previewPoint;

  const currentGuide =
    drawingStart && rawPreviewPoint
      ? getGuideInfo(rawPreviewPoint, drawingStart)
      : null;

  const currentPreviewPoint = currentGuide?.point ?? rawPreviewPoint;

  const startMeasurementEdit = (payload: MeasurementClickPayload) => {
    if (isDrawingTool(activeToolRef.current)) return;

    const wall = wallsRef.current.find(
      (currentWall) =>
        (samePoint(currentWall.start, payload.segmentStart) &&
          samePoint(currentWall.end, payload.segmentEnd)) ||
        (samePoint(currentWall.start, payload.segmentEnd) &&
          samePoint(currentWall.end, payload.segmentStart))
    );

    if (!wall) return;

    setSelectedWallId(wall.id);
    setGroupSelectedWallIds([]);
    setGroupContextMenu(null);
    setMenuPosition(getWallMenuPosition(wall));
    setEditingMeasurement({
      wallId: wall.id,
      segmentStart: payload.segmentStart,
      segmentEnd: payload.segmentEnd,
      side: payload.side,
      currentEdgeLength: payload.currentEdgeLength,
      position: payload.labelPoint,
      rotation: payload.rotation,
      value: formatFeetInchesForInput(payload.currentEdgeLength),
    });
  };

  const applyMeasurementEdit = (value: string) => {
    if (!editingMeasurement) return;

    const targetLength = parseFeetInchesToPixels(value);

    if (!targetLength || targetLength <= 0) {
      setEditingMeasurement(null);
      return;
    }

    const editedWallId = editingMeasurement.wallId;

    commitWallsChange((currentWalls) =>
      resizeWallFromMeasurement(currentWalls, editingMeasurement, targetLength)
    );

    setSelectedWallId(editedWallId);
    setGroupSelectedWallIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
  };

  const selectWall = (wallId: string) => {
    const wall = walls.find((currentWall) => currentWall.id === wallId);

    setSelectedWallId(wallId);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    setGroupSelectedWallIds([]);
    setGroupContextMenu(null);
    setMenuPosition(wall ? getWallMenuPosition(wall) : null);
    setEditingMeasurement(null);
  };

  const handleMenuDragStart = (
    event: React.PointerEvent<HTMLDivElement>,
    startPosition: Point
  ) => {
    event.preventDefault();
    event.stopPropagation();

    menuDragRef.current = {
      pointerId: event.pointerId,
      startClient: {
        x: event.clientX,
        y: event.clientY,
      },
      startPosition,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMenuDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = menuDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const deltaX = (event.clientX - dragState.startClient.x) / scaleRef.current;
    const deltaY = (event.clientY - dragState.startClient.y) / scaleRef.current;

    setMenuPosition({
      x: dragState.startPosition.x + deltaX,
      y: dragState.startPosition.y + deltaY,
    });
  };

  const handleMenuDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = menuDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    menuDragRef.current = null;
  };

  const finishSelectionArea = () => {
    if (!selectionStart || !selectionEnd) {
      setIsSelectingArea(false);
      return;
    }

    const rect = getSelectionRect(selectionStart, selectionEnd);
    const areaWallIds = wallsRef.current
      .filter((wall) => wallIntersectsSelectionRect(wall, rect))
      .map((wall) => wall.id);
    const selectedCabinetIds = cabinetsRef.current
      .filter((cabinetItem) => cabinetIntersectsSelectionRect(cabinetItem, rect))
      .map((cabinetItem) => cabinetItem.id);

    setGroupSelectedWallIds(areaWallIds);
    setGroupSelectedCabinetIds(selectedCabinetIds);
    setGroupContextMenu(null);
    setSelectedWallId(null);
    setSelectedCabinetId(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelectingArea(false);
  };

  const createSelectedThinWalls = useCallback(
    (mode: ThickWallCreationMode) => {
      if (!canConvertGroupThinWalls) return;

      createThickWallsFromThinWalls(
        mode,
        groupSelectedThinWalls.map((wall) => wall.id)
      );
    },
    [canConvertGroupThinWalls, createThickWallsFromThinWalls, groupSelectedThinWalls]
  );

  useEffect(() => {
    const handleCreateSelectedWallExterior = () =>
      createSelectedThinWalls("exterior");
    const handleCreateSelectedWallInterior = () =>
      createSelectedThinWalls("interior");

    window.addEventListener(
      "pelican-create-selected-wall-exterior",
      handleCreateSelectedWallExterior
    );
    window.addEventListener(
      "pelican-create-selected-wall-interior",
      handleCreateSelectedWallInterior
    );

    return () => {
      window.removeEventListener(
        "pelican-create-selected-wall-exterior",
        handleCreateSelectedWallExterior
      );
      window.removeEventListener(
        "pelican-create-selected-wall-interior",
        handleCreateSelectedWallInterior
      );
    };
  }, [createSelectedThinWalls]);

  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelectionMode || !canConvertGroupThinWalls) return;

    event.preventDefault();
    event.stopPropagation();

    const point = screenToWorkspace(event.clientX, event.clientY);

    if (!point) return;

    setSelectedWallId(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    setGroupContextMenu({ position: point });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    if (isSelectionMode) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      const selectedIds = new Set(groupSelectedWallIds);
      const selectedHit = wallsRef.current.some(
        (wall) =>
          selectedIds.has(wall.id) &&
          pointToSegmentDistance(rawPoint, wall.start, wall.end) <=
            (isThinWall(wall) ? 10 : WALL_STROKE_WIDTH + 8)
      );

      if (selectedHit && groupSelectedWallIds.length > 0) {
        groupDragRef.current = {
          pointerId: event.pointerId,
          startPoint: rawPoint,
          startWalls: wallsRef.current,
          selectedIds,
          didMove: false,
        };
        setGroupContextMenu(null);
        setSelectedWallId(null);
        setSelectedCabinetId(null);
        setGroupSelectedCabinetIds([]);
        setMenuPosition(null);
        setEditingMeasurement(null);
        return;
      }

      setSelectionStart(rawPoint);
      setSelectionEnd(rawPoint);
      setIsSelectingArea(true);
      setGroupContextMenu(null);
      setSelectedWallId(null);
      setSelectedDoorId(null);
      setSelectedCabinetId(null);
      setMenuPosition(null);
      setEditingMeasurement(null);
      return;
    }

    if (activeToolRef.current === "place-cabinet") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const preview = rawPoint
        ? getCabinetPlacementPreview(
            rawPoint,
            thickWalls,
            selectedCabinetWidth,
            selectedCabinetDepth,
            0,
            cabinetsRef.current,
            undefined,
            selectedCabinetCategory,
            true,
            false,
            true,
            undefined,
            selectedCabinetCatalogItem.image
          )
        : null;

      if (!preview) {
        updateCabinetPreview(null);
        return;
      }

      updateCabinetPreview(preview);
      return;
    }

    if (activeToolRef.current === "place-door") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getDoorPlacementPreviewForPoint(rawPoint, thickWalls, DEFAULT_DOOR_WIDTH, {
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: cabinetsRef.current,
          })
        : null;

      updateDoorPreview(placement);
      return;
    }

    if (activeToolRef.current === "place-window") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getWindowPlacementPreviewForPoint(rawPoint, thickWalls, DEFAULT_WINDOW_WIDTH, {
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: cabinetsRef.current,
          })
        : null;

      updateWindowPreview(placement);
      return;
    }

    if (isDrawingTool(activeToolRef.current)) {
      const drawingTool = activeToolRef.current;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setSelectedWallId(null);
      setMenuPosition(null);
      setEditingMeasurement(null);
      setGroupSelectedWallIds([]);
      setGroupContextMenu(null);

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      const attachableWalls =
        drawingTool === "draw-thin-wall"
          ? wallsRef.current.filter(isThinWall)
          : drawingTool === "draw-island-wall"
            ? []
            : drawingTool === "draw-penin-wall"
              ? wallsRef.current.filter((wall) => isThickWall(wall) && !isDetachedPanelWall(wall))
              : wallsRef.current.filter(isThickWall);
      const wallAttachPoint = getWallAttachPoint(rawPoint, attachableWalls);

      if (!drawingStart) {
        const startPoint = wallAttachPoint ?? snapToGrid(rawPoint);
        setDrawingStart(startPoint);
        setPreviewPoint(startPoint);
        return;
      }

      const guide = getGuideInfo(wallAttachPoint ?? rawPoint, drawingStart);
      const endPoint = wallAttachPoint ?? guide.point;

      if (distance(drawingStart, endPoint) < 4) return;

      const newWall: Wall = {
        id: crypto.randomUUID(),
        start: drawingStart,
        end: endPoint,
        kind: drawingTool === "draw-thin-wall" ? "thin-wall" : drawingTool === "draw-penin-wall" ? "penin-wall" : drawingTool === "draw-island-wall" ? "island-wall" : "wall",
      };
      const wallToAdd =
        drawingTool === "draw-penin-wall"
          ? getPeninWallMovePreview(newWall, wallsRef.current.filter((wall) => isThickWall(wall) && !isDetachedPanelWall(wall)))
          : newWall;

      if (
        isDetachedPanelWall(wallToAdd) &&
        detachedPanelWallIntersectsFloorCabinet(
          wallToAdd,
          cabinetsRef.current,
          wallsRef.current.filter((wall) => isThickWall(wall) && !isDetachedPanelWall(wall)),
          wallsRef.current
        )
      ) {
        return;
      }

      commitWallsChange((currentWalls) =>
        splitConnectedWallsAndAddWall(currentWalls, wallToAdd)
      );

      setDrawingStart(endPoint);
      setPreviewPoint(endPoint);
      return;
    }

    event.preventDefault();
    setSelectedWallId(null);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedCabinetId(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedCabinetIds([]);
    setGroupContextMenu(null);

    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    dragOffsetStartRef.current = offsetRef.current;

    setIsDraggingCanvas(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const peninWallRotateState = peninWallRotateRef.current;

    if (peninWallRotateState && peninWallRotateState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      event.preventDefault();
      peninWallRotateState.didMove = true;

      const currentAngle = getAngleDegrees(peninWallRotateState.anchorPoint, rawPoint);
      const rawRotation = normalizeDegrees(
        peninWallRotateState.startRotation + currentAngle - peninWallRotateState.startAngle
      );
      const snappedRotationResult = cabinetSnapRotationToTick(
        rawRotation,
        peninWallRotateState.snappedRotation
      );
      peninWallRotateState.snappedRotation = snappedRotationResult.snappedRotation;
      const nextRotation = snappedRotationResult.rotation;
      const radians = degreesToRadians(nextRotation);
      const nextFreePoint = add(peninWallRotateState.anchorPoint, {
        x: Math.cos(radians) * peninWallRotateState.length,
        y: Math.sin(radians) * peninWallRotateState.length,
      });
      const proposedWall: Wall = peninWallRotateState.anchorEndpoint === "start"
        ? { ...peninWallRotateState.startWall, start: peninWallRotateState.anchorPoint, end: nextFreePoint }
        : { ...peninWallRotateState.startWall, start: nextFreePoint, end: peninWallRotateState.anchorPoint };
      const structuralWallsForAttach = peninWallRotateState.startWalls.filter(
        (wall) => wall.id !== peninWallRotateState.id && isThickWall(wall) && !isDetachedPanelWall(wall)
      );
      const rotatedPeninWall = isIslandWall(peninWallRotateState.startWall)
        ? proposedWall
        : getPeninWallMovePreview(proposedWall, structuralWallsForAttach);
      if (detachedPanelWallIntersectsFloorCabinet(rotatedPeninWall, cabinetsRef.current, structuralWallsForAttach, wallsRef.current, peninWallRotateState.id)) {
        return;
      }
      const nextWalls = wallsRef.current.map((wall) =>
        wall.id === peninWallRotateState.id ? rotatedPeninWall : wall
      );

      wallsRef.current = nextWalls;
      setWalls(nextWalls);
      setSelectedWallId(peninWallRotateState.id);
      setMenuPosition(null);
      setEditingMeasurement(null);
      return;
    }

    const peninWallResizeState = peninWallResizeRef.current;

    if (peninWallResizeState && peninWallResizeState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      event.preventDefault();
      const rawLength = dot(sub(rawPoint, peninWallResizeState.fixedPoint), peninWallResizeState.direction);
      const nextLength = Math.max(GRID_SIZE / 2, rawLength);
      const nextMovingPoint = add(peninWallResizeState.fixedPoint, mul(peninWallResizeState.direction, nextLength));
      const movedEnough = Math.abs(nextLength - distance(peninWallResizeState.startWall.start, peninWallResizeState.startWall.end)) > 0.001;
      if (movedEnough) peninWallResizeState.didMove = true;

      const proposedWall: Wall = peninWallResizeState.movingEndpoint === "start"
        ? { ...peninWallResizeState.startWall, start: nextMovingPoint, end: peninWallResizeState.fixedPoint }
        : { ...peninWallResizeState.startWall, start: peninWallResizeState.fixedPoint, end: nextMovingPoint };
      const structuralWallsForAttach = peninWallResizeState.startWalls.filter(
        (wall) => wall.id !== peninWallResizeState.id && isThickWall(wall) && !isDetachedPanelWall(wall)
      );
      const resizedPeninWall = isIslandWall(peninWallResizeState.startWall)
        ? proposedWall
        : getPeninWallMovePreview(proposedWall, structuralWallsForAttach);
      if (detachedPanelWallIntersectsFloorCabinet(resizedPeninWall, cabinetsRef.current, structuralWallsForAttach, wallsRef.current, peninWallResizeState.id)) {
        return;
      }
      const nextWalls = wallsRef.current.map((wall) =>
        wall.id === peninWallResizeState.id ? resizedPeninWall : wall
      );

      wallsRef.current = nextWalls;
      setWalls(nextWalls);
      setSelectedWallId(peninWallResizeState.id);
      setMenuPosition(null);
      setEditingMeasurement(null);
      return;
    }

    const cabinetRotateState = cabinetRotateRef.current;

    if (cabinetRotateState && cabinetRotateState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      event.preventDefault();
      cabinetRotateState.didMove = true;
      const currentAngle = getAngleDegrees(cabinetRotateState.center, rawPoint);
      const rawRotation = normalizeDegrees(
        cabinetRotateState.startRotation + currentAngle - cabinetRotateState.startAngle
      );
      const snappedRotationResult = cabinetSnapRotationToTick(
        rawRotation,
        cabinetRotateState.snappedRotation
      );
      cabinetRotateState.snappedRotation = snappedRotationResult.snappedRotation;
      const nextRotation = snappedRotationResult.rotation;

      const nextCabinets = cabinetsRef.current.map((cabinetItem) => {
        if (cabinetItem.id !== cabinetRotateState.id) return cabinetItem;
        return { ...cabinetItem, rotation: nextRotation };
      });

      cabinetsRef.current = nextCabinets;
      setCabinets(nextCabinets);
      return;
    }

    const cabinetDragState = cabinetDragRef.current;

    if (cabinetDragState && cabinetDragState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      const currentCabinet = cabinetsRef.current.find(
        (cabinetItem) => cabinetItem.id === cabinetDragState.id
      );
      if (!currentCabinet) return;

      const proposedCenter = add(
        cabinetDragState.startCenter,
        sub(rawPoint, cabinetDragState.startPointer)
      );

      const preview = getCabinetPlacementPreview(
        proposedCenter,
        thickWalls,
        currentCabinet.width,
        currentCabinet.depth,
        currentCabinet.rotation,
        cabinetsRef.current,
        currentCabinet.id,
        currentCabinet.category,
        true,
        true,
        false,
        currentCabinet.wallId,
        currentCabinet.image
      );

      if (!preview.isValid) return;

      const initialMovingCandidate: CabinetElement = {
        ...currentCabinet,
        center: preview.center,
        rotation: preview.rotation,
        wallId: preview.wallId ?? currentCabinet.wallId,
        wallFace: preview.wallFace ?? currentCabinet.wallFace,
      };
      const movingCandidateForWallCheck = initialMovingCandidate;
      const resolvedPreview = preview;
      const wallResolvedCenter = getWallOverlapResolvedCabinetCenter(
        resolvedPreview.center,
        thickWalls,
        currentCabinet.width,
        currentCabinet.depth,
        resolvedPreview.rotation,
        resolvedPreview.wallId ?? currentCabinet.wallId
      );
      const edgeSnappedCenter = getCollisionSafeAdjacentCabinetSnappedCenter({
        center: wallResolvedCenter,
        walls: thickWalls,
        cabinets: cabinetsRef.current,
        width: currentCabinet.width,
        depth: currentCabinet.depth,
        rotation: resolvedPreview.rotation,
        cabinetCategory: currentCabinet.category,
        cabinetImage: currentCabinet.image,
        excludedCabinetId: currentCabinet.id,
        preferredWallId: resolvedPreview.wallId ?? currentCabinet.wallId,
      });
      const wallResolvedPreview = {
        ...resolvedPreview,
        center: getWallOverlapResolvedCabinetCenter(
          edgeSnappedCenter,
          thickWalls,
          currentCabinet.width,
          currentCabinet.depth,
          resolvedPreview.rotation,
          resolvedPreview.wallId ?? currentCabinet.wallId
        ),
      };
      const movingCandidateForSupportCheck: CabinetElement = {
        ...movingCandidateForWallCheck,
        center: wallResolvedPreview.center,
        rotation: wallResolvedPreview.rotation,
        wallId: wallResolvedPreview.wallId ?? currentCabinet.wallId,
        wallFace: wallResolvedPreview.wallFace ?? currentCabinet.wallFace,
      };
      const supportedByLowerCabinet = isElevationFloatingCabinet(movingCandidateForSupportCheck) && Boolean(
        getWallCabinetSupportedWall(
          movingCandidateForSupportCheck,
          cabinetsRef.current,
          thickWalls,
          currentCabinet.id
        )
      );

      const wallCollisionMessage = !supportedByLowerCabinet && (
        cabinetIntersectsAnyWall(
          { center: wallResolvedPreview.center, width: currentCabinet.width, depth: currentCabinet.depth, rotation: wallResolvedPreview.rotation },
          thickWalls
        ) ||
        cabinetHandleTabsIntersectAnyWall(
          { ...currentCabinet, center: wallResolvedPreview.center, rotation: wallResolvedPreview.rotation },
          thickWalls
        )
      )
        ? "Cabinet cannot be placed through a wall."
        : undefined;

      const rulePreview = getCabinetPlacementPreview(
        wallResolvedPreview.center,
        thickWalls,
        currentCabinet.width,
        currentCabinet.depth,
        wallResolvedPreview.rotation,
        cabinetsRef.current,
        currentCabinet.id,
        currentCabinet.category,
        false,
        false,
        true,
        wallResolvedPreview.wallId ?? currentCabinet.wallId,
        currentCabinet.image
      );

      const movingCabinetForElevationCheck: CabinetElement = {
        ...currentCabinet,
        center: wallResolvedPreview.center,
        rotation: wallResolvedPreview.rotation,
        wallId: wallResolvedPreview.wallId ?? currentCabinet.wallId,
        wallFace: wallResolvedPreview.wallFace ?? currentCabinet.wallFace,
      };
      const candidateCabinetsForElevationCheck = cabinetsRef.current.map((cabinetItem) =>
        cabinetItem.id === cabinetDragState.id ? movingCabinetForElevationCheck : cabinetItem
      );
      const placementRuleMessage = getCabinetPlacementRuleViolationMessage(
        movingCabinetForElevationCheck,
        candidateCabinetsForElevationCheck,
        thickWalls,
        currentCabinet.id,
        true
      );
      const elevationOverlapMessage = getWallCabinetElevationOverlapMessage(
        movingCabinetForElevationCheck,
        candidateCabinetsForElevationCheck,
        thickWalls,
        currentCabinet.id
      );
      const dragInvalidReason = placementRuleMessage ?? elevationOverlapMessage ?? wallCollisionMessage;
      const dragRulePreview = dragInvalidReason
        ? { ...rulePreview, isValid: false, invalidReason: dragInvalidReason }
        : { ...rulePreview, isValid: true, invalidReason: undefined };

      event.preventDefault();
      cabinetDragState.didMove = true;
      updateCabinetPreview(dragRulePreview);

      const nextCabinets = candidateCabinetsForElevationCheck;

      cabinetsRef.current = nextCabinets;
      setCabinets(nextCabinets);
      return;
    }

    const doorDragState = doorDragRef.current;

    if (doorDragState && doorDragState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      const currentDoor = doorsRef.current.find(
        (doorItem) => doorItem.id === doorDragState.id
      );
      const placement = currentDoor
        ? getDoorPlacementPreviewForPoint(rawPoint, thickWalls, currentDoor.width, {
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: cabinetsRef.current,
            excludeDoorId: currentDoor.id,
          })
        : null;

      if (placement && currentDoor) {
        event.preventDefault();

        doorDragState.didMove = true;
        updateDoorPreview(placement);

        const wall = placement.wall;
        if (placement.isValid && wall) {
          const nextDoors = doorsRef.current.map((doorItem) =>
            doorItem.id === doorDragState.id
              ? {
                  ...doorItem,
                  wallId: wall.id,
                  t: placement.t,
                }
              : doorItem
          );

          doorsRef.current = nextDoors;
          setDoors(nextDoors);
          setMenuPosition(getDoorMenuPosition(currentDoor, wall, placement.t, thickWalls));
        }
      }

      return;
    }

    const windowDragState = windowDragRef.current;

    if (windowDragState && windowDragState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      const currentWindow = windowsRef.current.find(
        (windowItem) => windowItem.id === windowDragState.id
      );
      const placement = currentWindow
        ? getWindowPlacementPreviewForPoint(rawPoint, thickWalls, currentWindow.width, {
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: cabinetsRef.current,
            excludeWindowId: currentWindow.id,
          })
        : null;

      if (placement && currentWindow) {
        event.preventDefault();

        windowDragState.didMove = true;
        updateWindowPreview(placement);

        const wall = placement.wall;
        if (placement.isValid && wall) {
          const nextWindows = windowsRef.current.map((windowItem) =>
            windowItem.id === windowDragState.id
              ? {
                  ...windowItem,
                  wallId: wall.id,
                  t: placement.t,
                }
              : windowItem
          );

          windowsRef.current = nextWindows;
          setWindows(nextWindows);
          setMenuPosition(getWindowMenuPosition(currentWindow, wall, placement.t, thickWalls));
        }
      }

      return;
    }

    const peninWallDragState = peninWallDragRef.current;

    if (peninWallDragState && peninWallDragState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      event.preventDefault();

      const delta = sub(rawPoint, peninWallDragState.startPointer);

      if (Math.abs(delta.x) > 0.001 || Math.abs(delta.y) > 0.001) {
        peninWallDragState.didMove = true;
      }

      const proposedWall: Wall = {
        ...peninWallDragState.startWall,
        start: add(peninWallDragState.startWall.start, delta),
        end: add(peninWallDragState.startWall.end, delta),
      };
      const structuralWallsForAttach = wallsRef.current.filter(
        (wall) => wall.id !== peninWallDragState.id && isThickWall(wall) && !isDetachedPanelWall(wall)
      );
      const movedPeninWall = isIslandWall(peninWallDragState.startWall)
        ? proposedWall
        : getPeninWallMovePreview(proposedWall, structuralWallsForAttach);
      if (detachedPanelWallIntersectsFloorCabinet(movedPeninWall, cabinetsRef.current, structuralWallsForAttach, wallsRef.current, peninWallDragState.id)) {
        return;
      }
      const movedWalls = wallsRef.current.map((wall) =>
        wall.id === peninWallDragState.id ? movedPeninWall : wall
      );

      wallsRef.current = movedWalls;
      setWalls(movedWalls);
      setSelectedWallId(peninWallDragState.id);
      setMenuPosition(null);
      setEditingMeasurement(null);
      return;
    }


    const groupDragState = groupDragRef.current;

    if (groupDragState && groupDragState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      event.preventDefault();

      const delta = sub(rawPoint, groupDragState.startPoint);

      if (Math.abs(delta.x) > 0.001 || Math.abs(delta.y) > 0.001) {
        groupDragState.didMove = true;
      }

      const movedWalls = groupDragState.startWalls.map((wall) =>
        groupDragState.selectedIds.has(wall.id)
          ? {
              ...wall,
              start: add(wall.start, delta),
              end: add(wall.end, delta),
            }
          : wall
      );

      wallsRef.current = movedWalls;
      setWalls(movedWalls);
      setGroupContextMenu(null);
      return;
    }

    if (isSelectionMode && isSelectingArea) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (rawPoint) {
        setSelectionEnd(rawPoint);
      }

      return;
    }

    if (activeToolRef.current === "place-cabinet") {
      event.preventDefault();

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const preview = rawPoint
        ? getCabinetPlacementPreview(
            rawPoint,
            thickWalls,
            selectedCabinetWidth,
            selectedCabinetDepth,
            0,
            cabinetsRef.current,
            undefined,
            selectedCabinetCategory,
            true,
            false,
            true,
            undefined,
            selectedCabinetCatalogItem.image
          )
        : null;

      updateCabinetPreview(preview);
      return;
    }

    if (activeToolRef.current === "place-door") {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getDoorPlacementPreviewForPoint(rawPoint, thickWalls, DEFAULT_DOOR_WIDTH, {
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: cabinetsRef.current,
          })
        : null;

      updateDoorPreview(placement);
      return;
    }

    if (activeToolRef.current === "place-window") {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getWindowPlacementPreviewForPoint(rawPoint, thickWalls, DEFAULT_WINDOW_WIDTH, {
            windows: windowsRef.current,
            doors: doorsRef.current,
            cabinets: cabinetsRef.current,
          })
        : null;

      updateWindowPreview(placement);
      return;
    }

    if (isDrawingTool(activeToolRef.current)) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (rawPoint) {
        setPreviewPoint(rawPoint);
      }

      return;
    }

    if (!isDraggingCanvas) return;

    event.preventDefault();

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;

    setOffset({
      x: dragOffsetStartRef.current.x + deltaX,
      y: dragOffsetStartRef.current.y + deltaY,
    });
  };

  // commitPreviewCabinetPlacement
  const commitPreviewCabinetPlacement = useCallback(() => {
    const placement = cabinetPreviewRef.current;

    if (!placement) return false;

    if (!placement.isValid) {
      if (placement.invalidReason) showEditorAlert(placement.invalidReason);
      return false;
    }

    const newCabinet: CabinetElement = {
      id: crypto.randomUUID(),
      center: placement.center,
      width: placement.width,
      depth: placement.depth,
      rotation: placement.rotation,
      category: selectedCabinetCategory,
      catalogId: selectedCabinetCatalogItem.id,
      image: selectedCabinetCatalogItem.image,
      accessoryKind: selectedCabinetCatalogItem.accessoryKind,
      heightInches: selectedCabinetCatalogItem.heightInches ?? (selectedCabinetCategory === "wall" ? 30 : 36),
      distanceFromFloorInches:
        getSupportTypeForCategory(
          selectedCabinetCategory,
          selectedCabinetCatalogItem.widthInches,
          selectedCabinetCatalogItem.heightInches ?? (selectedCabinetCategory === "wall" ? 30 : 36)
        ) === "floor-supported"
          ? 0
          : selectedCabinetCatalogItem.defaultDistanceFromFloorInches ??
            (selectedCabinetCategory === "wall" ? 54 : 0),
      wallId: placement.wallId,
      wallFace: placement.wallFace,
      sinkFixture: isBuiltInSinkCabinetImage(selectedCabinetCatalogItem.image) ? true : undefined,
      blindDoorWidthInches: isBlindCabinetImage(selectedCabinetCatalogItem.image)
        ? getDefaultBlindCabinetDoorWidthInches(
            selectedCabinetCatalogItem.widthInches,
            selectedCabinetCategory
          )
        : undefined,
      blindFillerWidthInches: isBlindCabinetImage(selectedCabinetCatalogItem.image)
        ? 3
        : undefined,
      ovenCabinetProductLayout:
        getDefaultBottomDrawerProductLayout(selectedCabinetCatalogItem.image),
      ovenCabinetProductHeightInches:
        isOvenLikeBottomDrawerCabinetImage(selectedCabinetCatalogItem.image)
          ? getDefaultOvenCabinetProductHeightInches(
              selectedCabinetCatalogItem.heightInches ?? 36
            )
          : undefined,
      ovenCabinetFillerHeightInches:
        isOvenLikeBottomDrawerCabinetImage(selectedCabinetCatalogItem.image)
          ? OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES
          : undefined,
      ovenCabinetBottomDrawerHeightInches:
        isOvenLikeBottomDrawerCabinetImage(selectedCabinetCatalogItem.image)
          ? OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES
          : undefined,
    };
    const normalizedNewCabinet = normalizeSpecialCabinetState(newCabinet);

    const candidateCabinets = [...cabinetsRef.current, normalizedNewCabinet];
    const placementResult: WallCabinetStackPlacementResult = isElevationFloatingCabinet(normalizedNewCabinet)
      ? applyWallCabinetStackSpacingOnPlacement(
          candidateCabinets,
          wallsRef.current,
          normalizedNewCabinet.id
        )
      : { cabinets: candidateCabinets };

    if (placementResult.message) {
      showEditorAlert(placementResult.message);
      return false;
    }

    commitCabinetsChange(placementResult.cabinets);
    setSelectedCabinetId(normalizedNewCabinet.id);
    setSelectedDoorId(null);
    setSelectedWindowId(null);
    setSelectedWallId(null);
    setMenuPosition(getCabinetMenuPosition(newCabinet));
    setActiveTool(null);
    activeToolRef.current = null;
    updateDoorPreview(null);
    updateWindowPreview(null);
    updateCabinetPreview(null);
    return true;
  }, [commitCabinetsChange, selectedCabinetCategory, selectedCabinetCatalogItem, setActiveTool, showEditorAlert, updateCabinetPreview, updateDoorPreview, updateWindowPreview]);

  const commitPreviewStructurePlacement = useCallback(
    (kind: "door" | "window") => {
      if (kind === "door") {
        const placement = doorPreviewRef.current;
        if (!placement) return false;
        if (!placement.isValid || !placement.wall) {
          if (placement.invalidReason) showEditorAlert(placement.invalidReason);
          return false;
        }

        const newDoor: DoorElement = {
          id: crypto.randomUUID(),
          wallId: placement.wall.id,
          t: placement.t,
          width: DEFAULT_DOOR_WIDTH,
          heightInches: 80,
          distanceFromFloorInches: 0,
        };

        commitDoorsChange((currentDoors) => [...currentDoors, newDoor]);
        setSelectedDoorId(null);
        setSelectedWindowId(null);
        setSelectedWallId(null);
        setMenuPosition(null);
        setActiveTool(null);
        activeToolRef.current = null;
        updateDoorPreview(null);
        updateWindowPreview(null);
        return true;
      }

      const placement = windowPreviewRef.current;
      if (!placement) return false;
      if (!placement.isValid || !placement.wall) {
        if (placement.invalidReason) showEditorAlert(placement.invalidReason);
        return false;
      }

      const newWindow: WindowElement = {
        id: crypto.randomUUID(),
        wallId: placement.wall.id,
        t: placement.t,
        width: DEFAULT_WINDOW_WIDTH,
        heightInches: 36,
        distanceFromFloorInches: 24,
        tabSide: getWindowTabSideFacingMeasurementGuide(placement.wall, thickWalls),
      };

      commitWindowsChange((currentWindows) => [...currentWindows, newWindow]);
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setSelectedWallId(null);
      setMenuPosition(null);
      setActiveTool(null);
      activeToolRef.current = null;
      updateWindowPreview(null);
      updateDoorPreview(null);
      return true;
    },
    [
      commitDoorsChange,
      commitWindowsChange,
      thickWalls,
      showEditorAlert,
      updateDoorPreview,
      updateWindowPreview,
    ]
  );

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    const isPlacementRelease = event.type === "pointerup";
    const isPlacementReleaseInsideCanvas = isPlacementRelease && isPointerInsideCanvas(event.clientX, event.clientY);

    if (activeToolRef.current === "place-cabinet") {
      if (!isPlacementReleaseInsideCanvas) {
        updateCabinetPreview(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }

      if (commitPreviewCabinetPlacement()) return;
      return;
    }

    if (activeToolRef.current === "place-door") {
      if (!isPlacementReleaseInsideCanvas) {
        updateDoorPreview(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }

      if (commitPreviewStructurePlacement("door")) return;
      return;
    }

    if (activeToolRef.current === "place-window") {
      if (!isPlacementReleaseInsideCanvas) {
        updateWindowPreview(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }

      if (commitPreviewStructurePlacement("window")) return;
      return;
    }


    const peninWallRotateState = peninWallRotateRef.current;

    if (peninWallRotateState && peninWallRotateState.pointerId === event.pointerId) {
      if (peninWallRotateState.didMove) {
        undoStackRef.current.push({
          walls: peninWallRotateState.startWalls,
          windows: windowsRef.current,
          doors: doorsRef.current,
          cabinets: cabinetsRef.current,
        });
        redoStackRef.current = [];
      }

      const finishedWall = wallsRef.current.find((wall) => wall.id === peninWallRotateState.id);
      if (finishedWall) {
        setSelectedWallId(finishedWall.id);
        setMenuPosition(getWallMenuPosition(finishedWall));
      }

      peninWallRotateRef.current = null;
      setIsPeninWallRotating(false);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    const peninWallResizeState = peninWallResizeRef.current;

    if (peninWallResizeState && peninWallResizeState.pointerId === event.pointerId) {
      if (peninWallResizeState.didMove) {
        undoStackRef.current.push({
          walls: peninWallResizeState.startWalls,
          windows: windowsRef.current,
          doors: doorsRef.current,
          cabinets: cabinetsRef.current,
        });
        redoStackRef.current = [];
      }

      const finishedWall = wallsRef.current.find((wall) => wall.id === peninWallResizeState.id);
      if (finishedWall) {
        setSelectedWallId(finishedWall.id);
        setMenuPosition(getWallMenuPosition(finishedWall));
      }

      peninWallResizeRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    const cabinetRotateState = cabinetRotateRef.current;

    if (cabinetRotateState && cabinetRotateState.pointerId === event.pointerId) {
      if (cabinetRotateState.didMove) {
        undoStackRef.current.push({
          walls: wallsRef.current,
          windows: windowsRef.current,
          doors: doorsRef.current,
          cabinets: cabinetRotateState.startCabinets,
        });
        redoStackRef.current = [];
      }

      cabinetRotateRef.current = null;
      setIsCabinetRotating(false);
      updateCabinetPreview(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    const cabinetDragState = cabinetDragRef.current;

    if (cabinetDragState && cabinetDragState.pointerId === event.pointerId) {
      if (cabinetDragState.didMove) {
        undoStackRef.current.push({
          walls: wallsRef.current,
          windows: windowsRef.current,
          doors: doorsRef.current,
          cabinets: cabinetDragState.startCabinets,
        });
        redoStackRef.current = [];
      }

      const finishedCabinet = cabinetsRef.current.find((cabinetItem) => cabinetItem.id === cabinetDragState.id);
      if (finishedCabinet) {
        const activeDragPreview = cabinetPreviewRef.current;
        const ruleMessage = activeDragPreview && !activeDragPreview.isValid
          ? activeDragPreview.invalidReason
          : getCabinetPlacementRuleViolationMessage(
              finishedCabinet,
              cabinetsRef.current,
              wallsRef.current,
              finishedCabinet.id,
              true
            ) ?? getWallCabinetElevationOverlapMessage(
              finishedCabinet,
              cabinetsRef.current,
              wallsRef.current,
              finishedCabinet.id
            );
        if (ruleMessage) {
          showEditorAlert(ruleMessage);
          cabinetsRef.current = cabinetDragState.startCabinets;
          setCabinets(cabinetDragState.startCabinets);
          const restoredCabinet = cabinetDragState.startCabinets.find((cabinetItem) => cabinetItem.id === cabinetDragState.id);
          if (restoredCabinet) setMenuPosition(getCabinetMenuPosition(restoredCabinet));
        } else {
          setMenuPosition(getCabinetMenuPosition(finishedCabinet));
        }
      }
      cabinetDragRef.current = null;
      setIsCabinetDragging(false);
      updateCabinetPreview(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }


    const doorDragState = doorDragRef.current;

    if (doorDragState && doorDragState.pointerId === event.pointerId) {
      if (doorDragState.didMove) {
        undoStackRef.current.push({
          walls: wallsRef.current,
          windows: windowsRef.current,
          doors: doorDragState.startDoors,
        });
        redoStackRef.current = [];
      }

      doorDragRef.current = null;
      updateDoorPreview(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    const windowDragState = windowDragRef.current;

    if (windowDragState && windowDragState.pointerId === event.pointerId) {
      if (windowDragState.didMove) {
        undoStackRef.current.push({
          walls: wallsRef.current,
          windows: windowDragState.startWindows,
          doors: doorsRef.current,
        });
        redoStackRef.current = [];
      }

      windowDragRef.current = null;
      updateWindowPreview(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    const peninWallDragState = peninWallDragRef.current;

    if (peninWallDragState && peninWallDragState.pointerId === event.pointerId) {
      if (peninWallDragState.didMove) {
        undoStackRef.current.push({
          walls: peninWallDragState.startWalls,
          windows: windowsRef.current,
          doors: doorsRef.current,
          cabinets: cabinetsRef.current,
        });
        redoStackRef.current = [];
      }

      const finishedWall = wallsRef.current.find((wall) => wall.id === peninWallDragState.id);
      if (finishedWall) {
        setSelectedWallId(finishedWall.id);
        setMenuPosition(getWallMenuPosition(finishedWall));
      }

      peninWallDragRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    const groupDragState = groupDragRef.current;

    if (groupDragState && groupDragState.pointerId === event.pointerId) {
      if (groupDragState.didMove) {
        undoStackRef.current.push({
          walls: groupDragState.startWalls,
          windows: windowsRef.current,
          doors: doorsRef.current,
        });
        redoStackRef.current = [];
      }

      groupDragRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    if (isSelectionMode && isSelectingArea) {
      finishSelectionArea();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    if (!isDraggingCanvas) return;

    setIsDraggingCanvas(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const moveCanvasView = (direction: "up" | "down" | "left" | "right") => {
    setOffset((currentOffset) => {
      switch (direction) {
        case "up":
          return { x: currentOffset.x, y: currentOffset.y + MOVE_STEP };
        case "down":
          return { x: currentOffset.x, y: currentOffset.y - MOVE_STEP };
        case "left":
          return { x: currentOffset.x + MOVE_STEP, y: currentOffset.y };
        case "right":
          return { x: currentOffset.x - MOVE_STEP, y: currentOffset.y };
      }
    });
  };

  const deleteSelectedWall = () => {
    if (!selectedWallId) return;

    commitWallsChange((currentWalls) =>
      currentWalls.filter((wall) => wall.id !== selectedWallId)
    );

    setSelectedWallId(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    setDrawingStart(null);
    setPreviewPoint(null);
  };

  const deleteSelectedWindow = () => {
    if (!selectedWindowId) return;

    commitWindowsChange((currentWindows) =>
      currentWindows.filter((windowItem) => windowItem.id !== selectedWindowId)
    );

    setSelectedWindowId(null);
    setMenuPosition(null);
    updateWindowPreview(null);
  };

  const deleteSelectedDoor = () => {
    if (!selectedDoorId) return;

    commitDoorsChange((currentDoors) =>
      currentDoors.filter((doorItem) => doorItem.id !== selectedDoorId)
    );

    setSelectedDoorId(null);
    setMenuPosition(null);
    updateDoorPreview(null);
  };

  const flipSelectedWindow = () => {
    if (!selectedWindowId) return;

    commitWindowsChange((currentWindows) =>
      currentWindows.map((windowItem) =>
        windowItem.id === selectedWindowId
          ? { ...windowItem, tabSide: (-(windowItem.tabSide ?? 1) as 1 | -1) }
          : windowItem
      )
    );
  };

  // deleteSelectedCabinet
  const deleteSelectedCabinet = () => {
    const cabinetId = selectedCabinetIdRef.current ?? selectedCabinetId;
    if (!cabinetId) return;

    commitCabinetsChange((currentCabinets) =>
      currentCabinets.filter((cabinetItem) => cabinetItem.id !== cabinetId)
    );

    selectedCabinetIdRef.current = null;
    setSelectedCabinetId(null);
    setMenuPosition(null);
    updateCabinetPreview(null);
  };

  const selectedWindowWall = selectedWindow
    ? thickWalls.find((wall) => wall.id === selectedWindow.wallId) ?? null
    : null;

  const selectedDoorWall = selectedDoor
    ? thickWalls.find((wall) => wall.id === selectedDoor.wallId) ?? null
    : null;

  const activeStructureWallId =
    windowPreview?.wall?.id ??
    selectedWindow?.wallId ??
    doorPreview?.wall?.id ??
    selectedDoor?.wallId ??
    null;

  const selectWindowFromElevation = (id: string) => {
    setSelectedWindowId(id);
    setSelectedDoorId(null);
    setSelectedCabinetId(null);
    setSelectedWallId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedCabinetIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updateCabinetPreview(null);
  };

  const selectDoorFromElevation = (id: string) => {
    setSelectedDoorId(id);
    setSelectedWindowId(null);
    setSelectedCabinetId(null);
    setSelectedWallId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedCabinetIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updateCabinetPreview(null);
  };

  const selectCabinetFromElevation = (id: string) => {
    setSelectedCabinetId(id);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedWallId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedCabinetIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updateCabinetPreview(null);
  };

  const updateWindowFromElevation = (
    id: string,
    updates: Partial<Pick<WindowElement, "t" | "distanceFromFloorInches">>
  ) => {
    setWindows((currentWindows) => {
      const nextWindows = currentWindows.map((windowItem) =>
        windowItem.id === id ? { ...windowItem, ...updates } : windowItem
      );
      windowsRef.current = nextWindows;
      return nextWindows;
    });
  };

  const updateDoorFromElevation = (
    id: string,
    updates: Partial<Pick<DoorElement, "t" | "distanceFromFloorInches">>
  ) => {
    setDoors((currentDoors) => {
      const nextDoors = currentDoors.map((doorItem) =>
        doorItem.id === id ? { ...doorItem, ...updates } : doorItem
      );
      doorsRef.current = nextDoors;
      return nextDoors;
    });
  };

  const updateCabinetFromElevation = (
    id: string,
    updates: Partial<Pick<CabinetElement, "center" | "distanceFromFloorInches">>
  ) => {
    setCabinets((currentCabinets) => {
      const nextCabinets = currentCabinets.map((cabinetItem) =>
        cabinetItem.id === id ? { ...cabinetItem, ...updates } : cabinetItem
      );
      cabinetsRef.current = nextCabinets;
      return nextCabinets;
    });
  };

  const updateWallFromElevation = (
    id: string,
    updates: Partial<Pick<Wall, "start" | "end">>
  ) => {
    setWalls((currentWalls) => {
      const nextWalls = currentWalls.map((wallItem) =>
        wallItem.id === id ? { ...wallItem, ...updates } : wallItem
      );
      wallsRef.current = nextWalls;
      return nextWalls;
    });
  };

  const handlePeninWallDragStart = (event: React.PointerEvent<SVGLineElement>, wall: Wall) => {
    event.preventDefault();
    event.stopPropagation();

    const dragStartPoint = screenToWorkspace(event.clientX, event.clientY) ?? wall.start;

    peninWallDragRef.current = {
      id: wall.id,
      pointerId: event.pointerId,
      startPointer: dragStartPoint,
      startWall: wall,
      startWalls: wallsRef.current,
      didMove: false,
    };

    setSelectedWallId(wall.id);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedCabinetId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedCabinetIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updateCabinetPreview(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };


  const getPeninWallAttachmentForControls = (wall: Wall) => {
    if (isIslandWall(wall)) {
      return {
        anchorEndpoint: "start" as const,
        anchorPoint: wall.start,
        freeEndpoint: "end" as const,
        freePoint: wall.end,
      };
    }

    const structuralWallsForAttach = wallsRef.current.filter(
      (candidateWall) => candidateWall.id !== wall.id && isThickWall(candidateWall) && !isDetachedPanelWall(candidateWall)
    );
    const startAttachment = getPeninWallEndpointAttachment(wall.start, structuralWallsForAttach);
    const endAttachment = getPeninWallEndpointAttachment(wall.end, structuralWallsForAttach);

    if (startAttachment && (!endAttachment || startAttachment.distance <= endAttachment.distance)) {
      return {
        anchorEndpoint: "start" as const,
        anchorPoint: startAttachment.point,
        freeEndpoint: "end" as const,
        freePoint: wall.end,
      };
    }

    if (endAttachment) {
      return {
        anchorEndpoint: "end" as const,
        anchorPoint: endAttachment.point,
        freeEndpoint: "start" as const,
        freePoint: wall.start,
      };
    }

    return {
      anchorEndpoint: "start" as const,
      anchorPoint: wall.start,
      freeEndpoint: "end" as const,
      freePoint: wall.end,
    };
  };

  const handlePeninWallRotateStart = (event: React.PointerEvent<SVGPathElement>, wall: Wall) => {
    event.preventDefault();
    event.stopPropagation();

    const controlAttachment = getPeninWallAttachmentForControls(wall);
    const startVector = sub(controlAttachment.freePoint, controlAttachment.anchorPoint);
    const length = Math.max(GRID_SIZE / 2, vectorLength(startVector));
    const pointerPoint = screenToWorkspace(event.clientX, event.clientY) ?? controlAttachment.freePoint;

    peninWallRotateRef.current = {
      id: wall.id,
      pointerId: event.pointerId,
      anchorEndpoint: controlAttachment.anchorEndpoint,
      anchorPoint: controlAttachment.anchorPoint,
      startAngle: getAngleDegrees(controlAttachment.anchorPoint, pointerPoint),
      startRotation: getAngleDegrees(controlAttachment.anchorPoint, controlAttachment.freePoint),
      length,
      startWall: wall,
      startWalls: wallsRef.current,
      didMove: false,
      snappedRotation: null,
    };

    setIsPeninWallRotating(true);
    setSelectedWallId(wall.id);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedCabinetId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedCabinetIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updateCabinetPreview(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePeninWallResizeStart = (
    event: React.PointerEvent<SVGCircleElement>,
    wall: Wall,
    movingEndpoint: "start" | "end"
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const fixedEndpoint = movingEndpoint === "start" ? "end" : "start";
    const fixedPoint = fixedEndpoint === "start" ? wall.start : wall.end;
    const movingPoint = movingEndpoint === "start" ? wall.start : wall.end;
    const direction = normalize(sub(movingPoint, fixedPoint));

    if (!vectorLength(direction)) return;

    peninWallResizeRef.current = {
      id: wall.id,
      pointerId: event.pointerId,
      fixedEndpoint,
      fixedPoint,
      movingEndpoint,
      direction,
      startWall: wall,
      startWalls: wallsRef.current,
      didMove: false,
    };

    setSelectedWallId(wall.id);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedCabinetId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedCabinetIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updateCabinetPreview(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const currentMenuPosition =
    selectedWall && menuPosition
      ? menuPosition
      : selectedWall
        ? getWallMenuPosition(selectedWall)
        : selectedWindow && selectedWindowWall && menuPosition
          ? menuPosition
          : selectedWindow && selectedWindowWall
            ? getWindowMenuPosition(selectedWindow, selectedWindowWall, undefined, thickWalls)
            : selectedDoor && selectedDoorWall && menuPosition
              ? menuPosition
              : selectedDoor && selectedDoorWall
                ? getDoorMenuPosition(selectedDoor, selectedDoorWall, undefined, thickWalls)
                : selectedCabinet
                  ? getCabinetMenuPosition(selectedCabinet)
                  : null;

  if (planViewMode === "elevation") {
    return (
      <>
        <ElevationPlanView
          walls={elevationWalls}
          allWalls={thickWalls}
          windows={windows}
          doors={doors}
          cabinets={cabinets}
          selectedWindowId={selectedWindowId}
          selectedDoorId={selectedDoorId}
          selectedCabinetId={selectedCabinetId}
          selectedWallId={selectedWallId}
          activeIndex={activeElevationIndex}
          showMeasurements={showElevationMeasurements}
          onSelectWindow={selectWindowFromElevation}
          onSelectDoor={selectDoorFromElevation}
          onSelectCabinet={selectCabinetFromElevation}
          onSelectWall={selectWall}
          onUpdateWindow={updateWindowFromElevation}
          onUpdateDoor={updateDoorFromElevation}
          onUpdateCabinet={updateCabinetFromElevation}
          onUpdateWall={updateWallFromElevation}
          onAlert={showEditorAlert}
          onClearSelection={() => {
            setSelectedWallId(null);
            setSelectedWindowId(null);
            setSelectedDoorId(null);
            setSelectedCabinetId(null);
            setGroupSelectedWallIds([]);
            setGroupSelectedCabinetIds([]);
            setGroupContextMenu(null);
            setMenuPosition(null);
          }}
          onPrevious={() => {
            if (elevationWalls.length === 0) return;
            setActiveElevationIndex((currentIndex) =>
              currentIndex <= 0 ? elevationWalls.length - 1 : currentIndex - 1
            );
          }}
          onNext={() => {
            if (elevationWalls.length === 0) return;
            setActiveElevationIndex((currentIndex) =>
              currentIndex >= elevationWalls.length - 1 ? 0 : currentIndex + 1
            );
          }}
        />
        {editorAlert && (
          <EditorAlertModal
            title={editorAlert.title}
            message={editorAlert.message}
            onClose={() => setEditorAlert(null)}
          />
        )}
      </>
    );
  }

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-[#f5f5f5] touch-none select-none",
        isSelectionMode && (groupSelectedWallIds.length > 0 || groupSelectedCabinetIds.length > 0)
          ? "cursor-move"
          : isSelectionMode
            ? "cursor-crosshair"
            : activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-cabinet"
              ? "cursor-crosshair"
              : isDrawingTool(activeTool)
                ? "cursor-crosshair"
              : isDraggingCanvas
                ? "cursor-grabbing"
                : "cursor-default"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={stopDragging}
      onContextMenu={handleCanvasContextMenu}
    >
      <div
        className="editor-grid absolute left-1/2 top-1/2 shadow-[0_0_0_1px_rgba(226,232,240,0.45)]"
        style={{
          width: `${WORKSPACE_WIDTH}px`,
          height: `${WORKSPACE_HEIGHT}px`,
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${WORKSPACE_WIDTH} ${WORKSPACE_HEIGHT}`}
        >
          <RoomInteriorFill chains={wallChains} />
          <RoomInteriorFill chains={thinWallChains} />

          {wallChains.map((chain, index) => (
            <WallChain
              key={`chain-${index}-${chain.points.map(pointKey).join("-")}`}
              points={chain.points}
              sourceWalls={structuralThickWalls}
              connectionMap={connectionMap}
              renderElevationViewDebugLine
              //hideInteriorDetails={isCreatingWallPreview}
              onMeasurementClick={startMeasurementEdit}
              editingMeasurement={editingMeasurement}
              renderMeasurements={false}
            />
          ))}

          {peninWalls.map((wall) => (
            <PeninWallLine
              key={`penin-wall-${wall.id}`}
              wall={wall}
              structuralWalls={structuralThickWalls}
              onMeasurementClick={startMeasurementEdit}
              editingMeasurement={editingMeasurement}
            />
          ))}

          {thinWalls.map((wall) => (
            <ThinWallLine
              key={wall.id}
              wall={wall}
              onMeasurementClick={startMeasurementEdit}
              editingMeasurement={editingMeasurement}
            />
          ))}

          {wallChains.map((chain, index) => (
            <WallChain
              key={`measurement-overlay-${index}-${chain.points.map(pointKey).join("-")}`}
              points={chain.points}
              sourceWalls={structuralThickWalls}
              connectionMap={connectionMap}
              //hideInteriorDetails={isCreatingWallPreview}
              onMeasurementClick={startMeasurementEdit}
              editingMeasurement={editingMeasurement}
              renderWallBody={false}
              getMeasurementLabelOffset={(segmentStart, segmentEnd, side) => {
                if (!activeStructureWallId) return 18;

                const activeStructureWall = structuralThickWalls.find(
                  (wall) => wall.id === activeStructureWallId
                );

                if (!activeStructureWall) return 18;

                return segmentMatchesWall(segmentStart, segmentEnd, activeStructureWall.id, structuralThickWalls) &&
                  measurementSideMatchesStructureGuide(
                    segmentStart,
                    segmentEnd,
                    side,
                    activeStructureWall,
                    structuralThickWalls
                  )
                  ? 46
                  : 18;
              }}
            />
          ))}

          {groupSelectedWalls.map((wall) => (
            isDetachedPanelWall(wall) ? null : <SelectedWallOverlay key={`group-selected-${wall.id}`} wall={wall} walls={thickWalls} />
          ))}

          {selectedWall && !isDetachedPanelWall(selectedWall) && <SelectedWallOverlay wall={selectedWall} walls={thickWalls} />}
          {getOpenEndpoints(structuralThickWalls, connectionMap).map((point) => (
            <OpenEndpoint key={`open-${pointKey(point)}`} point={point} />
          ))}

          <MeasurementGuideAnchorDebugDots
            walls={structuralThickWalls}
            chains={wallChains}
          />

          {getOpenEndpoints(thinWalls, thinConnectionMap).map((point) => (
            <ThinOpenEndpoint key={`thin-open-${pointKey(point)}`} point={point} />
          ))}
          {getConnectedEndpoints(thinWalls, thinConnectionMap).map((point) => (
            <ThinJointDot key={`thin-joint-${pointKey(point)}`} point={point} />
          ))}


          {drawingStart && (activeTool === "draw-wall" || activeTool === "draw-penin-wall" || activeTool === "draw-island-wall") && (
            <WallDrawingOverlay
              start={drawingStart}
              end={currentPreviewPoint ?? drawingStart}
              horizontalY={currentGuide?.horizontalY ?? drawingStart.y}
              verticalX={currentGuide?.verticalX}
              showSerialStart={walls.length > 0}
            />
          )}

          {drawingStart && activeTool === "draw-thin-wall" && (
            <ThinWallDrawingOverlay
              start={drawingStart}
              end={currentPreviewPoint ?? drawingStart}
              horizontalY={currentGuide?.horizontalY ?? drawingStart.y}
              verticalX={currentGuide?.verticalX}
              showSerialStart={walls.length > 0}
            />
          )}

          {isDrawingTool(activeTool) && wallHoverPoint && (
            <WallAttachIndicator point={wallHoverPoint} />
          )}

          {!isSelectionMode ? (
            <WallSelectionHitAreas
              walls={walls}
              activeTool={activeTool}
              selectedWallId={selectedWallId}
              onSelectWall={selectWall}
              onPeninWallDragStart={handlePeninWallDragStart}
            />
          ) : null}

          {selectedWall && isDetachedPanelWall(selectedWall) && (
            <PeninWallSelectionOverlay
              wall={selectedWall}
              structuralWalls={structuralThickWalls}
              showDegree={isPeninWallRotating}
              onRotateStart={(event) => handlePeninWallRotateStart(event, selectedWall)}
              onResizeStart={(event, endpoint) => handlePeninWallResizeStart(event, selectedWall, endpoint)}
            />
          )}

          {doors.map((doorItem) => {
            const wall = thickWalls.find((currentWall) => currentWall.id === doorItem.wallId);
            if (!wall) return null;

            return (
              <DoorOnWall
                key={doorItem.id}
                doorItem={doorItem}
                wall={wall}
                walls={thickWalls}
                selected={doorItem.id === selectedDoorId}
                disabled={activeTool === "place-door" || activeTool === "place-window"}
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setSelectedDoorId(doorItem.id);
                  setSelectedWindowId(null);
                  setSelectedCabinetId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedCabinetIds([]);
                  setGroupContextMenu(null);
                  setMenuPosition(getDoorMenuPosition(doorItem, wall, undefined, thickWalls));
                  updateDoorPreview(null);
                  updateWindowPreview(null);
                }}
                onDragStart={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  doorDragRef.current = {
                    id: doorItem.id,
                    pointerId: event.pointerId,
                    startDoors: doorsRef.current,
                    didMove: false,
                  };

                  setSelectedDoorId(doorItem.id);
                  setSelectedWindowId(null);
                  setSelectedCabinetId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedCabinetIds([]);
                  setGroupContextMenu(null);
                  setMenuPosition(getDoorMenuPosition(doorItem, wall, undefined, thickWalls));
                  updateDoorPreview(null);
                  updateWindowPreview(null);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            );
          })}

          {windows.map((windowItem) => {
            const wall = thickWalls.find((currentWall) => currentWall.id === windowItem.wallId);
            if (!wall) return null;

            return (
              <WindowOnWall
                key={windowItem.id}
                windowItem={windowItem}
                wall={wall}
                walls={thickWalls}
                selected={windowItem.id === selectedWindowId}
                disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-cabinet"}
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setSelectedWindowId(windowItem.id);
                  setSelectedDoorId(null);
                  setSelectedCabinetId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedCabinetIds([]);
                  setGroupContextMenu(null);
                  setMenuPosition(getWindowMenuPosition(windowItem, wall, undefined, thickWalls));
                  updateWindowPreview(null);
                }}
                onDragStart={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  windowDragRef.current = {
                    id: windowItem.id,
                    pointerId: event.pointerId,
                    startWindows: windowsRef.current,
                    didMove: false,
                  };

                  setSelectedWindowId(windowItem.id);
                  setSelectedDoorId(null);
                  setSelectedCabinetId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedCabinetIds([]);
                  setGroupContextMenu(null);
                  setMenuPosition(getWindowMenuPosition(windowItem, wall, undefined, thickWalls));
                  updateWindowPreview(null);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            );
          })}

          {[...cabinets]
            .map((cabinetItem, index) => ({ cabinetItem, index }))
            .sort((left, right) => {
              const leftLayer = getCabinetFloorVisualLayerPriority(left.cabinetItem);
              const rightLayer = getCabinetFloorVisualLayerPriority(right.cabinetItem);
              if (leftLayer !== rightLayer) return leftLayer - rightLayer;
              return left.index - right.index;
            })
            .filter(({ cabinetItem }) => getCabinetFloorVisualLayerPriority(cabinetItem) < 30)
            .map(({ cabinetItem }) => (
            <CabinetOnFloor
              key={cabinetItem.id}
              cabinetItem={cabinetItem}
              walls={thickWalls}
              selected={false}
              dragPreview={cabinetItem.id === selectedCabinetId && isCabinetDragging ? cabinetPreview : null}
              showDegree={false}
              disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-cabinet"}
              onSelect={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setSelectedCabinetId(cabinetItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedCabinetIds([]);
                setGroupContextMenu(null);
                setMenuPosition(getCabinetMenuPosition(cabinetItem));
                updateWindowPreview(null);
                updateDoorPreview(null);
                updateCabinetPreview(null);
              }}
              onDragStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const dragStartPoint = screenToWorkspace(event.clientX, event.clientY) ?? cabinetItem.center;

                cabinetDragRef.current = {
                  id: cabinetItem.id,
                  pointerId: event.pointerId,
                  startPointer: dragStartPoint,
                  startCenter: cabinetItem.center,
                  startCabinets: cabinetsRef.current,
                  didMove: false,
                };

                setSelectedCabinetId(cabinetItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedCabinetIds([]);
                setGroupContextMenu(null);
                setIsCabinetDragging(true);
                setMenuPosition(null);
                updateWindowPreview(null);
                updateDoorPreview(null);
                updateCabinetPreview(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onRotateStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                cabinetRotateRef.current = {
                  id: cabinetItem.id,
                  pointerId: event.pointerId,
                  center: cabinetItem.center,
                  startAngle: getAngleDegrees(cabinetItem.center, screenToWorkspace(event.clientX, event.clientY) ?? cabinetItem.center),
                  startRotation: cabinetItem.rotation,
                  startCabinets: cabinetsRef.current,
                  didMove: false,
                  snappedRotation: null,
                };

                setIsCabinetRotating(true);
                setSelectedCabinetId(cabinetItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedCabinetIds([]);
                setGroupContextMenu(null);
                setMenuPosition(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
            />
          ))}

          {cabinetPreview &&
            activeTool === "place-cabinet" &&
            getCabinetPreviewFloorVisualLayerPriority(cabinetPreview) < 30 && (
              <CabinetPreview preview={cabinetPreview} walls={thickWalls} />
            )}

          {[...cabinets]
            .map((cabinetItem, index) => ({ cabinetItem, index }))
            .sort((left, right) => {
              const leftLayer = getCabinetFloorVisualLayerPriority(left.cabinetItem);
              const rightLayer = getCabinetFloorVisualLayerPriority(right.cabinetItem);
              if (leftLayer !== rightLayer) return leftLayer - rightLayer;
              return left.index - right.index;
            })
            .filter(({ cabinetItem }) => getCabinetFloorVisualLayerPriority(cabinetItem) >= 30)
            .map(({ cabinetItem }) => (
            <CabinetOnFloor
              key={cabinetItem.id}
              cabinetItem={cabinetItem}
              walls={thickWalls}
              selected={false}
              dragPreview={cabinetItem.id === selectedCabinetId && isCabinetDragging ? cabinetPreview : null}
              showDegree={false}
              disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-cabinet"}
              onSelect={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setSelectedCabinetId(cabinetItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedCabinetIds([]);
                setGroupContextMenu(null);
                setMenuPosition(getCabinetMenuPosition(cabinetItem));
                updateWindowPreview(null);
                updateDoorPreview(null);
                updateCabinetPreview(null);
              }}
              onDragStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const dragStartPoint = screenToWorkspace(event.clientX, event.clientY) ?? cabinetItem.center;

                cabinetDragRef.current = {
                  id: cabinetItem.id,
                  pointerId: event.pointerId,
                  startPointer: dragStartPoint,
                  startCenter: cabinetItem.center,
                  startCabinets: cabinetsRef.current,
                  didMove: false,
                };

                setSelectedCabinetId(cabinetItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedCabinetIds([]);
                setGroupContextMenu(null);
                setIsCabinetDragging(true);
                setMenuPosition(null);
                updateWindowPreview(null);
                updateDoorPreview(null);
                updateCabinetPreview(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onRotateStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                cabinetRotateRef.current = {
                  id: cabinetItem.id,
                  pointerId: event.pointerId,
                  center: cabinetItem.center,
                  startAngle: getAngleDegrees(cabinetItem.center, screenToWorkspace(event.clientX, event.clientY) ?? cabinetItem.center),
                  startRotation: cabinetItem.rotation,
                  startCabinets: cabinetsRef.current,
                  didMove: false,
                  snappedRotation: null,
                };

                setIsCabinetRotating(true);
                setSelectedCabinetId(cabinetItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedCabinetIds([]);
                setGroupContextMenu(null);
                setMenuPosition(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
            />
          ))}

          {[...cabinets]
            .map((cabinetItem, index) => ({ cabinetItem, index }))
            .sort((left, right) => {
              const leftSelected = left.cabinetItem.id === selectedCabinetId;
              const rightSelected = right.cabinetItem.id === selectedCabinetId;
              if (leftSelected !== rightSelected) return leftSelected ? 1 : -1;

              const leftLayer = getCabinetFloorVisualLayerPriority(left.cabinetItem);
              const rightLayer = getCabinetFloorVisualLayerPriority(right.cabinetItem);
              if (leftLayer !== rightLayer) return leftLayer - rightLayer;
              return left.index - right.index;
            })
            .map(({ cabinetItem }) => (
              <CabinetFloorInteractionTarget
                key={`cabinet-hit-${cabinetItem.id}`}
                cabinetItem={cabinetItem}
                disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-cabinet"}
                selected={cabinetItem.id === selectedCabinetId}
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setSelectedCabinetId(cabinetItem.id);
                  setSelectedWindowId(null);
                  setSelectedDoorId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedCabinetIds([]);
                  setGroupContextMenu(null);
                  setMenuPosition(getCabinetMenuPosition(cabinetItem));
                  updateWindowPreview(null);
                  updateDoorPreview(null);
                  updateCabinetPreview(null);
                }}
                onDragStart={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  const dragStartPoint = screenToWorkspace(event.clientX, event.clientY) ?? cabinetItem.center;

                  cabinetDragRef.current = {
                    id: cabinetItem.id,
                    pointerId: event.pointerId,
                    startPointer: dragStartPoint,
                    startCenter: cabinetItem.center,
                    startCabinets: cabinetsRef.current,
                    didMove: false,
                  };

                  setSelectedCabinetId(cabinetItem.id);
                  setSelectedWindowId(null);
                  setSelectedDoorId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedCabinetIds([]);
                  setGroupContextMenu(null);
                  setIsCabinetDragging(true);
                  setMenuPosition(null);
                  updateWindowPreview(null);
                  updateDoorPreview(null);
                  updateCabinetPreview(null);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            ))}

          {cabinetPreview &&
            activeTool === "place-cabinet" &&
            getCabinetPreviewFloorVisualLayerPriority(cabinetPreview) >= 30 && (
              <CabinetPreview preview={cabinetPreview} walls={thickWalls} />
            )}

          {groupSelectedCabinets
            .filter((cabinetItem) => cabinetItem.id !== selectedCabinetId)
            .map((cabinetItem) => (
              <CabinetPlanSelectionOverlay
                key={`group-selected-cabinet-${cabinetItem.id}`}
                cabinetItem={cabinetItem}
              />
            ))}

          {selectedCabinet && (
            <CabinetSelectionOverlay
              cabinetItem={selectedCabinet}
              walls={thickWalls}
              dragPreview={selectedCabinet.id === selectedCabinetId && isCabinetDragging ? cabinetPreview : null}
              showDegree={selectedCabinet.id === selectedCabinetId && isCabinetRotating}
              onRotateStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                cabinetRotateRef.current = {
                  id: selectedCabinet.id,
                  pointerId: event.pointerId,
                  center: selectedCabinet.center,
                  startAngle: getAngleDegrees(selectedCabinet.center, screenToWorkspace(event.clientX, event.clientY) ?? selectedCabinet.center),
                  startRotation: selectedCabinet.rotation,
                  startCabinets: cabinetsRef.current,
                  didMove: false,
                  snappedRotation: null,
                };

                setIsCabinetRotating(true);
                setSelectedCabinetId(selectedCabinet.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedCabinetIds([]);
                setGroupContextMenu(null);
                setMenuPosition(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
            />
          )}

          {windowPreview && (activeTool === "place-window" || !windowPreview.isValid) && (
            <WindowPreview
              preview={windowPreview}
              width={DEFAULT_WINDOW_WIDTH}
              walls={thickWalls}
              showWidth
            />
          )}

          {doorPreview && (activeTool === "place-door" || !doorPreview.isValid) && (
            <DoorPreview
              preview={doorPreview}
              width={DEFAULT_DOOR_WIDTH}
              walls={thickWalls}
              showWidth
            />
          )}

          {selectionStart && selectionEnd && (
            <SelectionAreaBox start={selectionStart} end={selectionEnd} />
          )}

          {groupContextMenu && canConvertGroupThinWalls && (
            <ThinWallGroupContextMenu
              position={groupContextMenu.position}
              onCreateExterior={() => createSelectedThinWalls("exterior")}
              onCreateInterior={() => createSelectedThinWalls("interior")}
            />
          )}

          {selectedWall && currentMenuPosition && (
            <SelectedWallContextMenu
              position={currentMenuPosition}
              onDelete={deleteSelectedWall}
              onDragStart={handleMenuDragStart}
              onDragMove={handleMenuDragMove}
              onDragEnd={handleMenuDragEnd}
            />
          )}

          {selectedWindow && currentMenuPosition && (
            <SelectedWindowContextMenu
              position={currentMenuPosition}
              onFlip={flipSelectedWindow}
              onDelete={deleteSelectedWindow}
              onDragStart={handleMenuDragStart}
              onDragMove={handleMenuDragMove}
              onDragEnd={handleMenuDragEnd}
            />
          )}

          {selectedDoor && currentMenuPosition && (
            <SelectedDoorContextMenu
              position={currentMenuPosition}
              onDelete={deleteSelectedDoor}
              onDragStart={handleMenuDragStart}
              onDragMove={handleMenuDragMove}
              onDragEnd={handleMenuDragEnd}
            />
          )}

          {selectedCabinet && currentMenuPosition && !isCabinetRotating && !isCabinetDragging && (
            <SelectedCabinetContextMenu
              position={currentMenuPosition}
              onDelete={deleteSelectedCabinet}
              onDragStart={handleMenuDragStart}
              onDragMove={handleMenuDragMove}
              onDragEnd={handleMenuDragEnd}
            />
          )}
        </svg>
      </div>

      <MoveControl
        onMoveUp={() => moveCanvasView("up")}
        onMoveDown={() => moveCanvasView("down")}
        onMoveLeft={() => moveCanvasView("left")}
        onMoveRight={() => moveCanvasView("right")}
      />

      {editingMeasurement && (
        <MeasurementEditModal
          edit={editingMeasurement}
          onCancel={() => setEditingMeasurement(null)}
          onApply={applyMeasurementEdit}
        />
      )}

      {editorAlert && (
        <EditorAlertModal
          title={editorAlert.title}
          message={editorAlert.message}
          onClose={() => setEditorAlert(null)}
        />
      )}
    </div>
  );
}



// CabinetElevationPlacement
type CabinetElevationPlacement = {
  cabinet: CabinetElement;
  category: CabinetCategory;
  startInches: number;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
  depthFromWallInches: number;
  stackOverflow?: boolean;
  stackOverflowMessage?: string;
};

type ElevationOpeningLayout = {
  startInches: number;
  centerInches: number;
  widthInches: number;
};

type PeninWallElevationPlacement = {
  wall: Wall;
  centerInches: number;
  startInches: number;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
};

type ElevationWallAxis = {
  start: Point;
  end: Point;
  direction: Point;
  normal: Point;
  length: number;
};

function getElevationWallAxis(wall: Wall): ElevationWallAxis {
  const isMostlyHorizontal = Math.abs(wall.end.x - wall.start.x) >= Math.abs(wall.end.y - wall.start.y);
  const shouldFlip = isMostlyHorizontal
    ? wall.start.x > wall.end.x
    : wall.start.y > wall.end.y;
  const start = shouldFlip ? wall.end : wall.start;
  const end = shouldFlip ? wall.start : wall.end;
  const length = distance(start, end);
  const direction = length > 0.001 ? normalize(sub(end, start)) : { x: 1, y: 0 };
  const normal = perp(direction);

  return {
    start,
    end,
    direction,
    normal,
    length,
  };
}

function getElevationWallElementCenterInches(wall: Wall, t: number) {
  const axis = getElevationWallAxis(wall);
  const wallLength = distance(wall.start, wall.end);
  const wallDirection = wallLength > 0.001 ? normalize(sub(wall.end, wall.start)) : axis.direction;
  const floorPlanCenter = add(wall.start, mul(wallDirection, clamp(t, 0, 1) * wallLength));
  const centerPixels = clamp(dot(sub(floorPlanCenter, axis.start), axis.direction), 0, axis.length);

  return pixelsToInches(centerPixels);
}

function getInteriorMeasurementGuideSide(
  wall: Wall,
  walls: Wall[] = []
): Exclude<MeasurementSide, "length"> {
  const direction = normalize(sub(wall.end, wall.start));
  if (!vectorLength(direction)) return "left";

  // Interior/exterior cannot be derived from a fixed screen normal. For example,
  // a top wall and a bottom wall both may be drawn left-to-right, but their room
  // interiors are on opposite sides. The reliable signal is the measurement run:
  // for thick-wall rooms, the interior guide is the side with the shorter usable
  // run between mitered/connected wall faces (15'11", 12', 20'5", etc.), while
  // the exterior guide includes the wall thickness and is longer.
  if (walls.length) {
    const measurementWalls = walls.filter(isThickWall);
    const leftLength = getWallSideGuideRunLength(wall, measurementWalls, "left");
    const rightLength = getWallSideGuideRunLength(wall, measurementWalls, "right");
    const tolerance = 0.5;

    if (leftLength + tolerance < rightLength) return "left";
    if (rightLength + tolerance < leftLength) return "right";
  }

  const baseNormal = normalize(perp(direction));
  const interiorNormal = mul(getPreferredNormal(wall.start, wall.end), -1);

  return dot(interiorNormal, baseNormal) >= 0 ? "left" : "right";
}

function getWallElevationViewMode(wall: Wall): WallElevationViewMode {
  return wall.elevationViewMode === "exterior" ? "exterior" : "interior";
}

function getWallCabinetPlacementMode(wall: Wall): WallCabinetPlacementMode {
  return wall.cabinetPlacementMode === "none" ||
    wall.cabinetPlacementMode === "both" ||
    wall.cabinetPlacementMode === "interior" ||
    wall.cabinetPlacementMode === "exterior"
    ? wall.cabinetPlacementMode
    : "interior";
}

function getWallCabinetPlacementGuideSides(
  wall: Wall,
  walls: Wall[]
): Exclude<MeasurementSide, "length">[] {
  if (getWallCabinetPlacementMode(wall) === "none") {
    return [];
  }

  const interiorSide = getInteriorMeasurementGuideSide(wall, walls);
  const exteriorSide = interiorSide === "left" ? "right" : "left";
  const mode = getWallCabinetPlacementMode(wall);

  if (mode === "both") {
    return [interiorSide, exteriorSide];
  }

  return [mode === "exterior" ? exteriorSide : interiorSide];
}

function getWallCabinetPlacementDebugLines(
  wall: Wall,
  walls: Wall[]
): Array<{ key: string; start: Point; end: Point }> {
  const thickWalls = walls.filter(isThickWall);
  if (!thickWalls.length || getWallCabinetPlacementMode(wall) === "none") {
    return [];
  }

  const geometry = getWallSegmentBlackDotGeometry(wall.start, wall.end, thickWalls);
  const interiorSide = getInteriorMeasurementGuideSide(wall, thickWalls);
  const exteriorSide = interiorSide === "left" ? "right" : "left";
  const mode = getWallCabinetPlacementMode(wall);

  const lineForSide = (side: Exclude<MeasurementSide, "length">) =>
    side === "left"
      ? {
          key: `${wall.id}-left`,
          start: geometry.startLeft,
          end: geometry.endLeft,
        }
      : {
          key: `${wall.id}-right`,
          start: geometry.startRight,
          end: geometry.endRight,
        };

  if (mode === "both") {
    return [lineForSide(interiorSide), lineForSide(exteriorSide)];
  }

  return [lineForSide(mode === "exterior" ? exteriorSide : interiorSide)];
}

function getWallElevationGuideSide(
  wall: Wall,
  walls: Wall[]
): Exclude<MeasurementSide, "length"> {
  const interiorSide = getInteriorMeasurementGuideSide(wall, walls);
  const mode = getWallElevationViewMode(wall);

  if (mode === "exterior") {
    return interiorSide === "left" ? "right" : "left";
  }

  return interiorSide;
}

function getWallElevationDebugGuideSide(
  wall: Wall,
  walls: Wall[]
): Exclude<MeasurementSide, "length"> | null {
  return getWallCabinetPlacementGuideSides(wall, walls)[0] ?? null;
}

function measurementSideToWallFaceSide(
  wall: Wall,
  side: Exclude<MeasurementSide, "length">
): WallFaceSide {
  const wallDirection = normalize(sub(wall.end, wall.start));
  const axisDirection = getElevationWallAxis(wall).direction;

  if (!vectorLength(wallDirection) || !vectorLength(axisDirection)) {
    return side;
  }

  // Cabinet wall-face attachments are stored in the elevation-axis left/right
  // system. When the elevation axis flips a wall for reading order, the raw
  // floor-plan left/right side must be mirrored to stay on the same physical
  // wall face.
  if (dot(wallDirection, axisDirection) < 0) {
    return side === "left" ? "right" : "left";
  }

  return side;
}

function getWallProjectedFaceForElevation(
  wall: Wall,
  walls: Wall[]
): WallFaceSide | null {
  return measurementSideToWallFaceSide(
    wall,
    getWallElevationGuideSide(wall, walls)
  );
}

function getElevationViewRightDirection(
  wall: Wall,
  walls: Wall[]
): Point | null {
  const axis = getElevationWallAxis(wall);
  if (axis.length < 0.001) return null;

  const projectedFace = getWallProjectedFaceForElevation(
    wall,
    walls.length ? walls : [wall]
  );
  if (!projectedFace) return null;

  // The projected face is the red/visible face of the wall. In elevation we are
  // standing on that face and looking straight back toward the wall. The screen
  // x-axis must therefore follow the viewer's right-hand direction, not a fixed
  // floor-plan reading order. Without this, cabinets on a north/east-facing
  // wall are mirrored to the wrong side of the wall elevation.
  const faceNormal =
    projectedFace === "left" ? axis.normal : mul(axis.normal, -1);
  const viewDirection = mul(faceNormal, -1);
  const viewerRight = perp(viewDirection);

  return vectorLength(viewerRight) ? normalize(viewerRight) : axis.direction;
}

function shouldMirrorElevationDisplay(wall: Wall, walls: Wall[] = []) {
  const axis = getElevationWallAxis(wall);
  if (axis.length < 0.001) return false;

  if (!walls.length) {
    return getWallElevationViewMode(wall) === "exterior";
  }

  const viewerRight = getElevationViewRightDirection(wall, walls);
  if (!viewerRight) return false;

  return dot(axis.direction, viewerRight) < 0;
}

function getElevationDisplayStartInches(
  wall: Wall,
  wallLengthInches: number,
  startInches: number,
  widthInches: number,
  walls: Wall[] = []
) {
  if (!shouldMirrorElevationDisplay(wall, walls)) return startInches;
  return Math.max(0, wallLengthInches - (startInches + widthInches));
}

function getElevationActualStartInches(
  wall: Wall,
  wallLengthInches: number,
  displayStartInches: number,
  widthInches: number,
  walls: Wall[] = []
) {
  if (!shouldMirrorElevationDisplay(wall, walls)) return displayStartInches;
  return Math.max(0, wallLengthInches - (displayStartInches + widthInches));
}

type ElevationWallDistanceContext = {
  wall: Wall;
  axis: ElevationWallAxis;
  displayWalls: Wall[];
  wallStartOffsetInches: number;
  wallWidthInches: number;
};

type ElevationObjectDistanceMetrics = {
  distanceFromLeftInches: number;
  distanceFromRightInches: number;
  wallWidthInches: number;
};

function getElevationWallDistanceContext(
  wall: Wall,
  walls: Wall[],
  cabinets: CabinetElement[] = []
): ElevationWallDistanceContext | null {
  const structuralWalls = walls.filter(
    (candidateWall) => isThickWall(candidateWall) && !isDetachedPanelWall(candidateWall)
  );
  const displayWalls = structuralWalls.length ? structuralWalls : walls.filter(isThickWall);
  const isPeninElevationWall = isDetachedPanelWall(wall);
  const peninElevationSegment = isPeninElevationWall
    ? getPeninWallVisibleSegment(wall, structuralWalls)
    : null;
  const elevationWallForMeasurement = peninElevationSegment
    ? { ...wall, start: peninElevationSegment.start, end: peninElevationSegment.end }
    : wall;
  const axis = getElevationWallAxis(elevationWallForMeasurement);

  if (axis.length < 0.001) return null;

  const span = isPeninElevationWall
    ? {
        startScalar: 0,
        endScalar: axis.length,
        length: axis.length,
        startAnchor: axis.start,
        endAnchor: axis.end,
      }
    : getElevationWallInteriorSpan(wall, displayWalls.length ? displayWalls : [wall], cabinets);

  const wallWidthInches = pixelsToInches(span.length);
  if (wallWidthInches <= 0.001) return null;

  return {
    wall,
    axis: getElevationWallAxis(wall),
    displayWalls,
    wallStartOffsetInches: pixelsToInches(span.startScalar),
    wallWidthInches,
  };
}

function getElevationObjectDistanceMetricsFromStart(
  wall: Wall,
  wallWidthInches: number,
  actualStartInches: number,
  widthInches: number,
  displayWalls: Wall[]
): ElevationObjectDistanceMetrics {
  const boundedWidthInches = Math.max(0, widthInches);
  const maxStartInches = Math.max(0, wallWidthInches - boundedWidthInches);
  const boundedActualStartInches = clamp(actualStartInches, 0, maxStartInches);
  const displayStartInches = clamp(
    getElevationDisplayStartInches(
      wall,
      wallWidthInches,
      boundedActualStartInches,
      boundedWidthInches,
      displayWalls
    ),
    0,
    maxStartInches
  );

  return {
    distanceFromLeftInches: displayStartInches,
    distanceFromRightInches: Math.max(0, wallWidthInches - (displayStartInches + boundedWidthInches)),
    wallWidthInches,
  };
}

function getOpeningElevationDistanceMetrics(
  opening: Pick<WindowElement | DoorElement, "wallId" | "t" | "width">,
  walls: Wall[],
  cabinets: CabinetElement[] = []
): ElevationObjectDistanceMetrics | null {
  const wall = walls.find((candidateWall) => candidateWall.id === opening.wallId);
  if (!wall) return null;

  const context = getElevationWallDistanceContext(wall, walls, cabinets);
  if (!context) return null;

  const actualLayout = getElevationOpeningLayoutFromCenter(
    context.wallWidthInches,
    opening.width,
    getElevationWallElementCenterInches(wall, opening.t) - context.wallStartOffsetInches
  );

  return getElevationObjectDistanceMetricsFromStart(
    wall,
    context.wallWidthInches,
    actualLayout.startInches,
    actualLayout.widthInches,
    context.displayWalls
  );
}

function getWallTFromElevationAxisScalarInches(
  wall: Wall,
  axisScalarInches: number
) {
  const wallLength = distance(wall.start, wall.end);
  if (wallLength < 0.001) return 0;

  const axis = getElevationWallAxis(wall);
  const wallDirection = normalize(sub(wall.end, wall.start));
  const targetPoint = add(axis.start, mul(axis.direction, inchesToPixels(axisScalarInches)));
  return clamp(dot(sub(targetPoint, wall.start), wallDirection) / wallLength, 0, 1);
}

function getOpeningTFromElevationDistance(
  opening: Pick<WindowElement | DoorElement, "wallId" | "width">,
  walls: Wall[],
  displayStartInches: number,
  cabinets: CabinetElement[] = []
): number | null {
  const wall = walls.find((candidateWall) => candidateWall.id === opening.wallId);
  if (!wall) return null;

  const context = getElevationWallDistanceContext(wall, walls, cabinets);
  if (!context) return null;

  const widthInches = pixelsToInches(opening.width);
  const maxStartInches = Math.max(0, context.wallWidthInches - widthInches);
  const boundedDisplayStartInches = clamp(displayStartInches, 0, maxStartInches);
  const actualStartInches = getElevationActualStartInches(
    wall,
    context.wallWidthInches,
    boundedDisplayStartInches,
    widthInches,
    context.displayWalls
  );
  const centerAxisScalarInches =
    context.wallStartOffsetInches + actualStartInches + widthInches / 2;

  return getWallTFromElevationAxisScalarInches(wall, centerAxisScalarInches);
}

function getCabinetDistanceWall(
  cabinetItem: CabinetElement,
  walls: Wall[],
  cabinets: CabinetElement[] = []
): Wall | null {
  const thickWalls = walls.filter(isThickWall);
  if (cabinetItem.wallId) {
    const persistedWall = thickWalls.find((wall) => wall.id === cabinetItem.wallId);
    if (persistedWall) return persistedWall;
  }

  const bestAttachment = getBestCabinetWallAttachment(
    cabinetItem,
    thickWalls,
    Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
  );
  if (bestAttachment) return bestAttachment.wall;

  const supportedWall = getWallCabinetSupportedWall(
    cabinetItem,
    cabinets,
    thickWalls,
    cabinetItem.id
  );
  return supportedWall;
}

function getCabinetElevationDistanceMetrics(
  cabinetItem: CabinetElement,
  walls: Wall[],
  cabinets: CabinetElement[]
): ElevationObjectDistanceMetrics | null {
  const wall = getCabinetDistanceWall(cabinetItem, walls, cabinets);
  if (!wall) return null;

  const context = getElevationWallDistanceContext(wall, walls, cabinets);
  if (!context) return null;

  const placement = getCabinetElevationPlacementsForWall(
    wall,
    cabinets,
    context.displayWalls
  ).find((candidatePlacement) => candidatePlacement.cabinet.id === cabinetItem.id);

  if (!placement) return null;

  const relativeStartInches = clamp(
    placement.startInches - context.wallStartOffsetInches,
    0,
    Math.max(0, context.wallWidthInches - placement.widthInches)
  );

  return getElevationObjectDistanceMetricsFromStart(
    wall,
    context.wallWidthInches,
    relativeStartInches,
    placement.widthInches,
    context.displayWalls
  );
}

function getCabinetCenterFromElevationDistance(
  cabinetItem: CabinetElement,
  walls: Wall[],
  cabinets: CabinetElement[],
  displayStartInches: number
): Point | null {
  const wall = getCabinetDistanceWall(cabinetItem, walls, cabinets);
  if (!wall) return null;

  const context = getElevationWallDistanceContext(wall, walls, cabinets);
  if (!context) return null;

  const placement = getCabinetElevationPlacementsForWall(
    wall,
    cabinets,
    context.displayWalls
  ).find((candidatePlacement) => candidatePlacement.cabinet.id === cabinetItem.id);

  if (!placement) return null;

  const maxStartInches = Math.max(0, context.wallWidthInches - placement.widthInches);
  const boundedDisplayStartInches = clamp(displayStartInches, 0, maxStartInches);
  const actualRelativeStartInches = getElevationActualStartInches(
    wall,
    context.wallWidthInches,
    boundedDisplayStartInches,
    placement.widthInches,
    context.displayWalls
  );
  const nextAbsoluteStartInches = context.wallStartOffsetInches + actualRelativeStartInches;
  const deltaInches = nextAbsoluteStartInches - placement.startInches;

  if (Math.abs(deltaInches) < 0.001) return cabinetItem.center;

  return add(cabinetItem.center, mul(context.axis.direction, inchesToPixels(deltaInches)));
}

function getCabinetWallFaceOnWall(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> &
    Partial<Pick<CabinetElement, "wallId" | "wallFace">>,
  wall: Wall,
  walls: Wall[]
): WallFaceSide | null {
  if (cabinetItem.wallId && cabinetItem.wallId !== wall.id) return null;
  if (cabinetItem.wallId === wall.id && cabinetItem.wallFace) {
    return cabinetItem.wallFace;
  }

  const attachment = getCabinetWallAttachments(cabinetItem, walls).find(
    (candidate) => candidate.wall.id === wall.id
  );

  return attachment?.wallFace ?? null;
}

function getWallSideGuideRunLength(
  wall: Wall,
  walls: Wall[],
  side: Exclude<MeasurementSide, "length">
) {
  const runEndpoints = getStructureGuideEndpointsFromMeasurementRun(
    wall,
    walls,
    side
  );

  if (runEndpoints) {
    return distance(runEndpoints.startAnchor, runEndpoints.endAnchor);
  }

  return distance(wall.start, wall.end);
}

type ElevationWallInteriorSpan = {
  startScalar: number;
  endScalar: number;
  length: number;
  startAnchor: Point;
  endAnchor: Point;
};

function getCabinetFacingMeasurementGuideSide(
  wall: Wall,
  cabinets: CabinetElement[],
  walls: Wall[]
): Exclude<MeasurementSide, "length"> | null {
  const thickWalls = walls.filter(isThickWall);
  const attachmentTolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8);
  const wallDirection = normalize(sub(wall.end, wall.start));

  if (!vectorLength(wallDirection)) return null;

  const wallNormal = normalize(perp(wallDirection));
  const votes = { left: 0, right: 0 } as Record<Exclude<MeasurementSide, "length">, number>;

  cabinets.forEach((cabinetItem) => {
    const isAttachedToWall = cabinetItem.wallId === wall.id
      ? true
      : !cabinetItem.wallId && getCabinetWallAttachments(cabinetItem, thickWalls, attachmentTolerance)
        .some((attachment) => attachment.wall.id === wall.id);

    if (!isAttachedToWall) return;

    const corners = getRotatedRectCorners(
      cabinetItem.center,
      cabinetItem.width,
      cabinetItem.depth,
      cabinetItem.rotation
    );
    const normalValues = corners.map((corner) => dot(sub(corner, wall.start), wallNormal));
    const minNormal = Math.min(...normalValues);
    const maxNormal = Math.max(...normalValues);

    // Use the cabinet edge that is physically closest to one of the wall faces.
    // This keeps the elevation width tied to the wall side that the cabinet is
    // actually attached to instead of falling back to the larger/opposite face.
    const leftFaceDistance = Math.min(Math.abs(minNormal - WALL_THICKNESS / 2), Math.abs(maxNormal - WALL_THICKNESS / 2));
    const rightFaceDistance = Math.min(Math.abs(minNormal + WALL_THICKNESS / 2), Math.abs(maxNormal + WALL_THICKNESS / 2));
    const side: Exclude<MeasurementSide, "length"> = leftFaceDistance <= rightFaceDistance ? "left" : "right";
    votes[side] += 1;
  });

  if (!votes.left && !votes.right) return null;
  return votes.left >= votes.right ? "left" : "right";
}

function getElevationWallInteriorSpan(
  wall: Wall,
  walls: Wall[],
  cabinets: CabinetElement[] = []
): ElevationWallInteriorSpan {
  const axis = getElevationWallAxis(wall);
  const fallback = {
    startScalar: 0,
    endScalar: axis.length,
    length: axis.length,
    startAnchor: axis.start,
    endAnchor: axis.end,
  };

  if (axis.length < 0.001) return fallback;

  const thickWalls = walls.filter(isThickWall);
  const guideSide =
    getCabinetFacingMeasurementGuideSide(wall, cabinets, thickWalls) ??
    getWallElevationGuideSide(wall, walls);
  const runEndpoints = getStructureGuideEndpointsFromMeasurementRun(
    wall,
    thickWalls,
    guideSide
  );

  if (!runEndpoints) return fallback;

  const startScalar = dot(sub(runEndpoints.startAnchor, axis.start), axis.direction);
  const endScalar = dot(sub(runEndpoints.endAnchor, axis.start), axis.direction);
  const spanStart = Math.min(startScalar, endScalar);
  const spanEnd = Math.max(startScalar, endScalar);

  if (spanEnd - spanStart < 0.001) return fallback;

  return {
    startScalar: spanStart,
    endScalar: spanEnd,
    length: spanEnd - spanStart,
    startAnchor: runEndpoints.startAnchor,
    endAnchor: runEndpoints.endAnchor,
  };
}


function getPeninWallAttachmentToWall(
  peninWall: Wall,
  hostWall: Wall,
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, PENIN_WALL_THICKNESS)
): { endpoint: "start" | "end"; point: Point; normalSign: number; length: number } | null {
  const wallLength = distance(hostWall.start, hostWall.end);
  if (wallLength < 0.001) return null;

  const direction = normalize(sub(hostWall.end, hostWall.start));
  const normal = normalize(perp(direction));
  if (!vectorLength(normal)) return null;

  const candidates: Array<{ endpoint: "start" | "end"; endpointPoint: Point; freePoint: Point }> = [
    { endpoint: "start", endpointPoint: peninWall.start, freePoint: peninWall.end },
    { endpoint: "end", endpointPoint: peninWall.end, freePoint: peninWall.start },
  ];

  let best: { endpoint: "start" | "end"; point: Point; normalSign: number; length: number; distance: number } | null = null;

  for (const candidate of candidates) {
    const projectedPoint = closestPointOnSegment(candidate.endpointPoint, hostWall.start, hostWall.end);
    const scalar = dot(sub(projectedPoint, hostWall.start), direction);
    const endpointDistance = distance(candidate.endpointPoint, projectedPoint);
    if (endpointDistance > tolerance || scalar < -tolerance || scalar > wallLength + tolerance) {
      continue;
    }

    const freeVector = sub(candidate.freePoint, projectedPoint);
    const normalSign = dot(freeVector, normal) >= 0 ? 1 : -1;
    const length = Math.max(GRID_SIZE / 2, vectorLength(freeVector));
    if (!best || endpointDistance < best.distance) {
      best = {
        endpoint: candidate.endpoint,
        point: projectedPoint,
        normalSign,
        length,
        distance: endpointDistance,
      };
    }
  }

  if (!best) return null;
  return {
    endpoint: best.endpoint,
    point: best.point,
    normalSign: best.normalSign,
    length: best.length,
  };
}

function getPeninWallEndpointAttachment(
  endpoint: Point,
  structuralWalls: Wall[],
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 2)
): { wall: Wall; point: Point; distance: number } | null {
  let bestAttachment: { wall: Wall; point: Point; distance: number } | null = null;

  for (const wall of structuralWalls) {
    if (isDetachedPanelWall(wall)) continue;

    const wallLength = distance(wall.start, wall.end);
    if (wallLength < 0.001) continue;

    const direction = normalize(sub(wall.end, wall.start));
    const projectedPoint = closestPointOnSegment(endpoint, wall.start, wall.end);
    const scalar = dot(sub(projectedPoint, wall.start), direction);
    const endpointDistance = distance(endpoint, projectedPoint);

    if (endpointDistance > tolerance || scalar < -tolerance || scalar > wallLength + tolerance) continue;
    if (!bestAttachment || endpointDistance < bestAttachment.distance) {
      bestAttachment = { wall, point: projectedPoint, distance: endpointDistance };
    }
  }

  return bestAttachment;
}

function getPeninWallVisibleSegment(wall: Wall, structuralWalls: Wall[] = []): { start: Point; end: Point } {
  if (isIslandWall(wall)) return { start: wall.start, end: wall.end };

  const length = distance(wall.start, wall.end);
  if (length < 0.001) return { start: wall.start, end: wall.end };

  const direction = normalize(sub(wall.end, wall.start));
  const attachOffset = WALL_THICKNESS / 2;
  let start = wall.start;
  let end = wall.end;

  if (getPeninWallEndpointAttachment(wall.start, structuralWalls)) {
    start = add(start, mul(direction, attachOffset));
  }

  if (getPeninWallEndpointAttachment(wall.end, structuralWalls)) {
    end = add(end, mul(direction, -attachOffset));
  }

  if (dot(sub(end, start), direction) <= 2) {
    return { start: wall.start, end: wall.end };
  }

  return { start, end };
}

function getClosestPeninWallEndpointAttachment(
  endpoint: Point,
  structuralWalls: Wall[]
): { wall: Wall; point: Point; distance: number } | null {
  let bestAttachment: { wall: Wall; point: Point; distance: number } | null = null;

  for (const wall of structuralWalls) {
    if (isDetachedPanelWall(wall)) continue;

    const wallLength = distance(wall.start, wall.end);
    if (wallLength < 0.001) continue;

    const projectedPoint = closestPointOnSegment(endpoint, wall.start, wall.end);
    const endpointDistance = distance(endpoint, projectedPoint);

    if (!bestAttachment || endpointDistance < bestAttachment.distance) {
      bestAttachment = { wall, point: projectedPoint, distance: endpointDistance };
    }
  }

  return bestAttachment;
}

function getPeninWallMovePreview(wall: Wall, structuralWalls: Wall[]): Wall {
  const startAttachment = getClosestPeninWallEndpointAttachment(wall.start, structuralWalls);
  const endAttachment = getClosestPeninWallEndpointAttachment(wall.end, structuralWalls);

  if (!startAttachment && !endAttachment) return wall;

  const useStartAttachment = Boolean(
    startAttachment && (!endAttachment || startAttachment.distance <= endAttachment.distance)
  );
  const attachment = useStartAttachment ? startAttachment : endAttachment;

  if (!attachment) return wall;

  const currentAnchorPoint = useStartAttachment ? wall.start : wall.end;
  const currentFreePoint = useStartAttachment ? wall.end : wall.start;
  const anchorDelta = sub(attachment.point, currentAnchorPoint);
  const desiredFreePoint = add(currentFreePoint, anchorDelta);
  const currentLength = distance(wall.start, wall.end);
  const nextLength = Math.max(GRID_SIZE / 2, currentLength);
  const hostDirection = normalize(sub(attachment.wall.end, attachment.wall.start));
  if (!vectorLength(hostDirection)) {
    return {
      ...wall,
      start: add(wall.start, anchorDelta),
      end: add(wall.end, anchorDelta),
    };
  }

  const normal = normalize(perp(hostDirection));
  const firstFreePoint = add(attachment.point, mul(normal, nextLength));
  const secondFreePoint = add(attachment.point, mul(normal, -nextLength));
  const freePoint = distance(firstFreePoint, desiredFreePoint) <= distance(secondFreePoint, desiredFreePoint)
    ? firstFreePoint
    : secondFreePoint;

  return useStartAttachment
    ? { ...wall, start: attachment.point, end: freePoint }
    : { ...wall, start: freePoint, end: attachment.point };
}


function getPeninWallAttachmentPointForElevationWall(
  peninWall: Wall,
  wall: Wall,
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, PENIN_WALL_THICKNESS)
): Point | null {
  const wallLength = distance(wall.start, wall.end);
  if (wallLength < 0.001) return null;

  for (const endpoint of [peninWall.start, peninWall.end]) {
    const projectedPoint = closestPointOnSegment(endpoint, wall.start, wall.end);
    const scalar = dot(sub(projectedPoint, wall.start), normalize(sub(wall.end, wall.start)));
    const endpointDistance = distance(endpoint, projectedPoint);

    if (endpointDistance <= tolerance && scalar >= -tolerance && scalar <= wallLength + tolerance) {
      return projectedPoint;
    }
  }

  return null;
}

function getPeninWallElevationPlacementsForWall(
  wall: Wall,
  walls: Wall[]
): PeninWallElevationPlacement[] {
  const axis = getElevationWallAxis(wall);
  const wallLength = distance(wall.start, wall.end);
  if (wallLength < 0.001) return [];

  return walls
    .filter((candidate) => isPeninWall(candidate) && candidate.id !== wall.id)
    .map((peninWall): PeninWallElevationPlacement | null => {
      const peninLength = distance(peninWall.start, peninWall.end);
      if (peninLength < 0.001) return null;

      const peninDirection = normalize(sub(peninWall.end, peninWall.start));
      const attachmentPoint = getPeninWallAttachmentPointForElevationWall(peninWall, wall);
      if (!attachmentPoint) return null;

      // A peninsula wall is shown as a front-facing fixed panel on the wall it
      // attaches to. Parallel wall runs are not treated as peninsula faces.
      if (Math.abs(dot(peninDirection, axis.direction)) > 0.35) return null;

      const centerPixels = clamp(dot(sub(attachmentPoint, axis.start), axis.direction), 0, axis.length);
      const centerInches = pixelsToInches(centerPixels);
      const widthInches = Math.max(
        PENIN_WALL_ELEVATION_FACE_WIDTH_INCHES,
        pixelsToInches(PENIN_WALL_THICKNESS)
      );

      return {
        wall: peninWall,
        centerInches,
        startInches: centerInches - widthInches / 2,
        widthInches,
        heightInches: PENIN_WALL_ELEVATION_HEIGHT_INCHES,
        distanceFromFloorInches: 0,
      };
    })
    .filter((placement): placement is PeninWallElevationPlacement => Boolean(placement));
}

function getElevationOpeningLayoutFromCenter(
  wallLengthInches: number,
  openingWidthPixels: number,
  centerInches: number
): ElevationOpeningLayout {
  const requestedWidthInches = pixelsToInches(openingWidthPixels);
  const halfWidthInches = Math.min(requestedWidthInches / 2, wallLengthInches / 2);
  const clampedCenterInches = clamp(
    centerInches,
    halfWidthInches,
    wallLengthInches - halfWidthInches
  );

  return {
    startInches: clampedCenterInches - halfWidthInches,
    centerInches: clampedCenterInches,
    widthInches: halfWidthInches * 2,
  };
}


function ElevationPeninWallFace({
  x,
  y,
  width,
  height,
  selected = false,
  className,
  onPointerDown,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  className?: string;
  onPointerDown?: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const inset = Math.max(7, Math.min(14, Math.min(width, height) * 0.12));
  const stroke = selected ? "#22bfd6" : "#111827";
  const strokeWidth = selected ? 3 : 2.25;
  return (
    <g className={className} onPointerDown={onPointerDown}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#f1ede4"
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={x + inset}
        y={y + inset}
        width={Math.max(0, width - inset * 2)}
        height={Math.max(0, height - inset * 2)}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

// ElevationCabinetOnWall
function ElevationCabinetOnWall({
  x,
  y,
  width,
  height,
  category,
  image,
  selected = false,
  invalid = false,
  cabinet,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  category: CabinetCategory;
  image?: CabinetImage;
  selected?: boolean;
  invalid?: boolean;
  cabinet?: CabinetElement;
}) {
  const outerStroke = invalid ? "#ef4444" : selected ? "#22bfd6" : "#111827";
  const outerStrokeWidth = selected ? 3 : 2;
  const innerStroke = invalid ? "#fca5a5" : selected ? "#67e8f9" : "#64748b";
  const cabinetImage = image ?? getDefaultCabinetImageForCategory(category);
  if (isAccessoryCabinetImage(cabinetImage)) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={invalid ? "#fee2e2" : selected ? "#d9f8fd" : "#fafaf7"}
          stroke={innerStroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const frontControlExtraInches =
    cabinet &&
    category === "base" &&
    cabinet.cooktopFixture === "front" &&
    !isProductCabinetImage(cabinetImage)
      ? Math.max(1, cabinet.cooktopFrontHeightInches ?? 6)
      : 0;
  const baseHeightInches = cabinet
    ? Math.max(1, getCabinetElevationSpec(cabinet, category).heightInches)
    : 0;
  const toeKickHeight =
    cabinet && cabinetHasToeKick(cabinet) && baseHeightInches > 0
      ? clamp((CABINET_TOE_KICK_HEIGHT_INCHES / baseHeightInches) * height, 0, Math.max(0, height - 1))
      : 0;
  const frontControlBlockHeight = frontControlExtraInches > 0 && baseHeightInches > 0
    ? clamp((frontControlExtraInches / baseHeightInches) * height, 0, height * 0.8)
    : 0;
  const bodyY = y;
  const bodyHeight = Math.max(1, height - toeKickHeight);
  const inset = Math.min(10, Math.max(4, Math.min(width, bodyHeight) * 0.08));
  const handleStroke = "#111827";
  const handleHeight = Math.min(bodyHeight * 0.42, Math.max(18, bodyHeight * 0.22));
  const handleTop = bodyY + bodyHeight / 2 - handleHeight / 2;
  const singleHandleX = x + width - inset - Math.max(6, width * 0.08);
  const renderStandaloneProduct = isStandaloneBaseProductElevationImage(cabinetImage);
  const innerX = x;
  const innerY = bodyY;
  const innerWidth = width;
  const innerHeight = bodyHeight;

  return (
    <g>
      {(selected || invalid) && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={outerStroke}
          strokeWidth={outerStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {category !== "wall" ? (
        <ElevationBaseCabinetDetails
          cabinet={cabinet}
          image={cabinetImage}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          inset={inset}
          innerX={innerX}
          innerY={innerY}
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          handleTop={handleTop}
          handleHeight={handleHeight}
          singleHandleX={singleHandleX}
        />
      ) : (
        <ElevationWallCabinetDetails
          cabinet={cabinet}
          image={cabinetImage}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          innerX={innerX}
          innerY={innerY}
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          handleTop={handleTop}
          handleHeight={handleHeight}
        />
      )}
      {toeKickHeight > 0 && (
        <rect
          x={x}
          y={y + height - toeKickHeight}
          width={width}
          height={toeKickHeight}
          fill="#f1ede4"
          stroke={innerStroke}
          strokeWidth="1.55"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {cabinet && (
        <ElevationCabinetAccessoryDetails
          cabinet={cabinet}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          frontControlBlockHeight={frontControlBlockHeight}
        />
      )}
    </g>
  );
}

function ElevationWallCabinetDetails({
  cabinet,
  image,
  x,
  y,
  width,
  height,
  innerX,
  innerY,
  innerWidth,
  innerHeight,
  innerStroke,
  handleStroke,
  handleTop,
  handleHeight,
}: {
  cabinet?: CabinetElement;
  image: CabinetImage;
  x: number;
  y: number;
  width: number;
  height: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleTop: number;
  handleHeight: number;
}) {
  const handleOffsetFromCenter = Math.max(6, Math.min(16, width * 0.08));
  const leftCenterX = x + width / 2 - handleOffsetFromCenter;
  const rightCenterX = x + width / 2 + handleOffsetFromCenter;
  const panelFill = "#fafaf7";
  const panelGap = Math.max(2, Math.min(6, innerWidth * 0.04));
  const panelStrokeWidth = 1.5;

  const renderSingleDoorTopSection = (sectionHeight: number) => {
    const dividerY = innerY + sectionHeight;
    const panelInsetX = Math.max(4, innerWidth * 0.06);
    const panelInsetY = Math.max(3, sectionHeight * 0.12);
    const panelX = innerX + panelInsetX;
    const panelY = innerY + panelInsetY;
    const panelWidth = innerWidth - panelInsetX * 2;
    const panelHeight = Math.max(0, sectionHeight - panelInsetY * 2);
    const singleDoorHandleX = panelX + panelWidth - Math.max(6, panelWidth * 0.12);
    const singleDoorHandleHeight = Math.max(12, Math.min(24, panelHeight * 0.38));
    const singleDoorHandleTop = panelY + panelHeight * 0.42 - singleDoorHandleHeight / 2;

    return {
      dividerY,
      topSection: (
        <g>
          <line
            x1={innerX}
            y1={dividerY}
            x2={innerX + innerWidth}
            y2={dividerY}
            stroke={innerStroke}
            strokeWidth="1.35"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={panelX}
            y={panelY}
            width={panelWidth}
            height={panelHeight}
            fill="none"
            stroke={innerStroke}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={singleDoorHandleX}
            y1={singleDoorHandleTop}
            x2={singleDoorHandleX}
            y2={singleDoorHandleTop + singleDoorHandleHeight}
            stroke={handleStroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ),
    };
  };


  if (image === "base-refrigerator") {
    const bodyX = innerX;
    const bodyY = innerY;
    const bodyWidth = innerWidth;
    const bodyHeight = innerHeight;
    const panelInsetX = Math.max(2.2, bodyWidth * 0.035);
    const panelInsetY = Math.max(2.2, bodyHeight * 0.028);
    const panelX = bodyX + panelInsetX;
    const panelY = bodyY + panelInsetY;
    const panelWidth = bodyWidth - panelInsetX * 2;
    const panelHeight = bodyHeight - panelInsetY * 2;
    const topSectionHeight = panelHeight * 0.63;
    const freezerTopY = panelY + topSectionHeight;
    const centerGap = Math.max(1.5, panelWidth * 0.022);
    const doorWidth = panelWidth / 2 - centerGap / 2;
    const leftDoorX = panelX;
    const rightDoorX = panelX + doorWidth + centerGap;
    const handleTopY = panelY + topSectionHeight * 0.24;
    const handleBottomY = panelY + topSectionHeight * 0.72;
    const dispenserX = leftDoorX + doorWidth * 0.13;
    const dispenserY = panelY + topSectionHeight * 0.30;
    const dispenserWidth = doorWidth * 0.26;
    const dispenserHeight = topSectionHeight * 0.18;
    return (
      <g>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={leftDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={rightDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={panelX} y={freezerTopY} width={panelWidth} height={panelHeight - topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={dispenserX} y={dispenserY} width={dispenserWidth} height={dispenserHeight} rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" opacity="0.55" vectorEffect="non-scaling-stroke" />
        <line x1={leftDoorX + doorWidth * 0.76} y1={handleTopY} x2={leftDoorX + doorWidth * 0.76} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={rightDoorX + doorWidth * 0.24} y1={handleTopY} x2={rightDoorX + doorWidth * 0.24} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={panelX} y1={freezerTopY} x2={panelX + panelWidth} y2={freezerTopY} stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "wall-microwave") {
    const frameInset = Math.max(5, Math.min(10, width * 0.06));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const controlWidth = Math.max(10, frameWidth * 0.18);
    return (
      <g>
        <rect x={frameX} y={frameY} width={frameWidth} height={frameHeight} rx="3" fill="#d1d5db" vectorEffect="non-scaling-stroke" />
        <rect x={frameX + frameWidth * 0.08} y={frameY + frameHeight * 0.18} width={frameWidth - controlWidth - frameWidth * 0.14} height={frameHeight * 0.64} rx="2" fill="#94a3b8" opacity="0.55" stroke="#64748b" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={frameX + frameWidth - controlWidth - 3} y={frameY + frameHeight * 0.12} width={controlWidth} height={frameHeight * 0.76} rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {Array.from({ length: 9 }).map((_, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          return <circle key={`mw-standalone-btn-${index}`} cx={frameX + frameWidth - controlWidth + 3 + col * (controlWidth / 4)} cy={frameY + frameHeight * 0.28 + row * (frameHeight * 0.13)} r="0.9" fill="#64748b" />;
        })}
      </g>
    );
  }

  if (image === "wall-double-oven") {
    const frameInset = Math.max(4, Math.min(8, width * 0.05));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const ovenGap = Math.max(3, frameHeight * 0.045);
    const controlHeight = Math.max(5, frameHeight * 0.085);
    const ovenHeight = (frameHeight - ovenGap) / 2;

    const renderOven = (ovenY: number, index: number) => {
      const handleY = ovenY + controlHeight + Math.max(2, ovenHeight * 0.08);
      const windowY = ovenY + controlHeight + ovenHeight * 0.2;
      const windowHeight = ovenHeight * 0.42;
      return (
        <g key={`double-wall-oven-${index}`}>
          <rect
            x={frameX}
            y={ovenY}
            width={frameWidth}
            height={ovenHeight}
            rx="2"
            fill="#d1d5db"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={frameX + frameWidth * 0.08}
            y={ovenY + controlHeight * 0.18}
            width={frameWidth * 0.84}
            height={controlHeight}
            rx="1.5"
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
          {[0.18, 0.31, 0.69, 0.82].map((ratio) => (
            <circle
              key={`double-wall-oven-knob-${index}-${ratio}`}
              cx={frameX + frameWidth * ratio}
              cy={ovenY + controlHeight * 0.7}
              r={Math.max(1.1, frameWidth * 0.023)}
              fill={handleStroke}
            />
          ))}
          <rect
            x={frameX + frameWidth * 0.16}
            y={windowY}
            width={frameWidth * 0.68}
            height={windowHeight}
            rx="2"
            fill="#111827"
            opacity="0.72"
            stroke="#64748b"
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={frameX + frameWidth * 0.12}
            y1={handleY}
            x2={frameX + frameWidth * 0.88}
            y2={handleY}
            stroke={handleStroke}
            strokeWidth="1.7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    };

    return (
      <g>
        {renderOven(frameY, 0)}
        {renderOven(frameY + ovenHeight + ovenGap, 1)}
      </g>
    );
  }

  if (image === "wall-oven") {
    const frameInset = Math.max(4, Math.min(8, width * 0.05));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const controlHeight = Math.max(5, frameHeight * 0.11);
    const handleY = frameY + controlHeight + Math.max(2, frameHeight * 0.1);
    const windowY = frameY + controlHeight + frameHeight * 0.22;
    const windowHeight = frameHeight * 0.34;
    return (
      <g>
        <rect
          x={frameX}
          y={frameY}
          width={frameWidth}
          height={frameHeight}
          rx="2"
          fill="#d1d5db"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={frameX + frameWidth * 0.08}
          y={frameY + controlHeight * 0.18}
          width={frameWidth * 0.84}
          height={controlHeight}
          rx="1.5"
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
        {[0.18, 0.31, 0.69, 0.82].map((ratio) => (
          <circle
            key={`single-wall-oven-knob-${ratio}`}
            cx={frameX + frameWidth * ratio}
            cy={frameY + controlHeight * 0.7}
            r={Math.max(1.1, frameWidth * 0.023)}
            fill={handleStroke}
          />
        ))}
        <rect
          x={frameX + frameWidth * 0.16}
          y={windowY}
          width={frameWidth * 0.68}
          height={windowHeight}
          rx="2"
          fill="#111827"
          opacity="0.72"
          stroke="#64748b"
          strokeWidth="0.9"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={frameX + frameWidth * 0.12}
          y1={handleY}
          x2={frameX + frameWidth * 0.88}
          y2={handleY}
          stroke={handleStroke}
          strokeWidth="1.7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-hood") {
    const hoodTopWidth = innerWidth * 0.35;
    const hoodBottomWidth = innerWidth * 0.92;
    const hoodCenterX = innerX + innerWidth / 2;
    const chimneyY = innerY;
    const chimneyHeight = innerHeight * 0.42;
    const hoodY = innerY + chimneyHeight * 0.78;
    return (
      <g>
        <rect x={hoodCenterX - hoodTopWidth / 2} y={chimneyY} width={hoodTopWidth} height={chimneyHeight} fill="#e5e7eb" stroke={innerStroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        <path d={`M ${hoodCenterX - hoodTopWidth / 2} ${hoodY} L ${hoodCenterX + hoodTopWidth / 2} ${hoodY} L ${hoodCenterX + hoodBottomWidth / 2} ${innerY + innerHeight * 0.9} L ${hoodCenterX - hoodBottomWidth / 2} ${innerY + innerHeight * 0.9} Z`} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={hoodCenterX - hoodBottomWidth * 0.35} y={innerY + innerHeight * 0.86} width={hoodBottomWidth * 0.7} height={innerHeight * 0.04} rx="1.5" fill="#111827" opacity="0.85" />
      </g>
    );
  }

  if (image === "wall-blind-left" || image === "wall-blind-right") {
    return renderBlindCabinetElevationFront({
      cabinet,
      image,
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      innerStroke,
      handleStroke,
      handleHeight,
    });
  }

  if (image === "pantry-one-door") {
    const panelX = innerX;
    const panelY = innerY;
    const panelWidth = innerWidth;
    const panelHeight = innerHeight;
    const singleDoorHandleX = panelX + panelWidth - Math.max(8, panelWidth * 0.14);

    return (
      <g>
        <rect
          x={panelX}
          y={panelY}
          width={panelWidth}
          height={panelHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={singleDoorHandleX}
          y1={panelY + panelHeight * 0.3}
          x2={singleDoorHandleX}
          y2={panelY + panelHeight * 0.3 + Math.min(handleHeight, panelHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-one-door") {
    const panelX = innerX;
    const panelY = innerY;
    const panelWidth = innerWidth;
    const panelHeight = innerHeight;
    const singleDoorHandleX = panelX + panelWidth - Math.max(10, panelWidth * 0.16);

    return (
      <g>
        <rect
          x={panelX}
          y={panelY}
          width={panelWidth}
          height={panelHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={singleDoorHandleX}
          y1={panelY + panelHeight * 0.3}
          x2={singleDoorHandleX}
          y2={panelY + panelHeight * 0.3 + Math.min(handleHeight, panelHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-microwave-one-door") {
    const topSectionHeight = innerHeight * 0.34;
    const { dividerY, topSection } = renderSingleDoorTopSection(topSectionHeight);
    const lowerSectionY = dividerY + Math.max(2, innerHeight * 0.03);
    const lowerSectionHeight = innerY + innerHeight - lowerSectionY - Math.max(2, innerHeight * 0.03);
    const microwaveInsetX = Math.max(4, innerWidth * 0.05);
    const microwaveX = innerX + microwaveInsetX;
    const microwaveWidth = innerWidth - microwaveInsetX * 2;
    const microwaveFrameHeight = Math.min(lowerSectionHeight * 0.8, microwaveWidth * 0.58);
    const microwaveFrameY = lowerSectionY + (lowerSectionHeight - microwaveFrameHeight) / 2;
    const doorWidth = microwaveWidth * 0.74;
    const controlWidth = microwaveWidth - doorWidth;
    const controlX = microwaveX + doorWidth;
    const glassInset = Math.max(2.8, microwaveWidth * 0.045);
    const glassX = microwaveX + glassInset;
    const glassY = microwaveFrameY + glassInset;
    const glassWidth = Math.max(0, doorWidth - glassInset * 1.55);
    const glassHeight = Math.max(0, microwaveFrameHeight - glassInset * 2);
    const keypadPaddingX = Math.max(2.1, controlWidth * 0.14);
    const keypadPaddingY = Math.max(2.4, microwaveFrameHeight * 0.09);
    const keypadX = controlX + keypadPaddingX;
    const keypadY = microwaveFrameY + keypadPaddingY;
    const keypadWidth = Math.max(0, controlWidth - keypadPaddingX * 2);
    const keypadHeight = Math.max(0, microwaveFrameHeight - keypadPaddingY * 2);
    const buttonCols = 3;
    const buttonRows = 4;
    const buttonGapX = Math.max(1.0, keypadWidth * 0.08);
    const buttonGapY = Math.max(1.2, keypadHeight * 0.07);
    const displayHeight = Math.max(3.2, keypadHeight * 0.16);
    const remainingButtonAreaHeight = Math.max(0, keypadHeight - displayHeight - buttonGapY * 1.4);
    const buttonWidth = Math.max(1.4, (keypadWidth - buttonGapX * (buttonCols - 1)) / buttonCols);
    const buttonHeight = Math.max(1.4, (remainingButtonAreaHeight - buttonGapY * (buttonRows - 1)) / buttonRows);

    return (
      <g>
        {topSection}
        <rect
          x={microwaveX}
          y={microwaveFrameY}
          width={microwaveWidth}
          height={microwaveFrameHeight}
          rx={Math.max(2, Math.min(4, width * 0.025))}
          fill="#d1d5db"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={glassX}
          y={glassY}
          width={glassWidth}
          height={glassHeight}
          rx={Math.max(1.6, Math.min(3.5, glassHeight * 0.08))}
          fill="#cad5df"
          stroke="#94a3b8"
          strokeWidth="0.95"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={glassX + glassWidth * 0.08}
          y={glassY + glassHeight * 0.12}
          width={glassWidth * 0.84}
          height={glassHeight * 0.76}
          rx={Math.max(1.4, Math.min(2.8, glassHeight * 0.06))}
          fill="#9aa7b5"
          opacity="0.42"
        />
        <line
          x1={controlX}
          y1={microwaveFrameY + 2}
          x2={controlX}
          y2={microwaveFrameY + microwaveFrameHeight - 2}
          stroke="#9ca3af"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={keypadX}
          y={keypadY}
          width={keypadWidth}
          height={displayHeight}
          rx="1.1"
          fill="#111827"
          opacity="0.86"
        />
        {Array.from({ length: buttonRows * buttonCols }).map((_, index) => {
          const column = index % buttonCols;
          const row = Math.floor(index / buttonCols);
          const buttonX = keypadX + column * (buttonWidth + buttonGapX);
          const buttonY = keypadY + displayHeight + buttonGapY * 1.4 + row * (buttonHeight + buttonGapY);
          return (
            <rect
              key={`mw-button-${index}`}
              x={buttonX}
              y={buttonY}
              width={buttonWidth}
              height={buttonHeight}
              rx="0.85"
              fill="#f8fafc"
              stroke="#9ca3af"
              strokeWidth="0.55"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
    );
  }

  if (image === "wall-hood-one-door") {
    const topSectionHeight = innerHeight * 0.34;
    const { dividerY, topSection } = renderSingleDoorTopSection(topSectionHeight);
    const hoodTopY = dividerY + Math.max(1.5, innerHeight * 0.02);
    const hoodBottomY = y + height - 1;
    const hoodCenterX = x + width / 2;
    const topWidth = innerWidth * 0.44;
    const bottomWidth = width - 4;
    const topLeftX = hoodCenterX - topWidth / 2;
    const topRightX = hoodCenterX + topWidth / 2;
    const bottomLeftX = hoodCenterX - bottomWidth / 2;
    const bottomRightX = hoodCenterX + bottomWidth / 2;

    return (
      <g>
        {topSection}
        <path
          d={`M ${topLeftX} ${hoodTopY} L ${topRightX} ${hoodTopY} L ${bottomRightX} ${hoodBottomY} L ${bottomLeftX} ${hoodBottomY} Z`}
          fill="#d7dbe0"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={Math.max(0, innerWidth / 2 - panelGap / 2)}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={innerX + innerWidth / 2 + panelGap / 2}
        y={innerY}
        width={Math.max(0, innerWidth / 2 - panelGap / 2)}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={x + width / 2}
        y1={innerY}
        x2={x + width / 2}
        y2={innerY + innerHeight}
        stroke={innerStroke}
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={leftCenterX}
        y1={handleTop}
        x2={leftCenterX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={rightCenterX}
        y1={handleTop}
        x2={rightCenterX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function ElevationSinkFixture({
  x,
  y,
  width,
  height,
  innerStroke,
  fixtureScale = 1,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  innerStroke: string;
  fixtureScale?: number;
}) {
  const sinkCenterX = x + width / 2;
  const sinkY = y - Math.max(1.4, Math.min(4.5, height * 0.035));
  const sinkRadiusX = Math.max(8, Math.min(width * 0.2, 18));
  const sinkRadiusY = Math.max(2.2, Math.min(height * 0.04, 4.8));

  // Keep the faucet shape consistent across every sink cabinet.
  // Tool card previews can pass a smaller scale so the faucet fits inside the card image.
  const clampedFixtureScale = Math.max(0.55, Math.min(1, fixtureScale));
  const faucetWidth = 11 * clampedFixtureScale;
  const faucetHeight = 24 * clampedFixtureScale;
  const floatingLegHeight = 10 * clampedFixtureScale;
  const archLift = 3.5 * clampedFixtureScale;
  const faucetStrokeWidth = 4.8 * clampedFixtureScale;
  const faucetHighlightStrokeWidth = Math.max(0.8, clampedFixtureScale);
  const rightX = sinkCenterX + 2.5;
  const rightBottomY = sinkY - sinkRadiusY * 0.98;
  const rightTopY = rightBottomY - faucetHeight;
  const leftX = rightX - faucetWidth;
  const leftTopY = rightTopY + 2.8;
  const leftBottomY = leftTopY + floatingLegHeight;
  const archControlY = rightTopY - archLift;

  return (
    <g>
      <ellipse
        cx={sinkCenterX}
        cy={sinkY}
        rx={sinkRadiusX}
        ry={sinkRadiusY}
        fill="#f8fafc"
        stroke={innerStroke}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${rightX} ${rightBottomY} L ${rightX} ${rightTopY} C ${rightX} ${archControlY} ${leftX} ${archControlY} ${leftX} ${leftTopY} L ${leftX} ${leftBottomY}`}
        fill="none"
        stroke="#111827"
        strokeWidth={faucetStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${rightX - 0.8} ${rightBottomY - 0.2} L ${rightX - 0.8} ${rightTopY + 1.5} C ${rightX - 0.8} ${archControlY + 1.2} ${leftX + 0.8} ${archControlY + 1.2} ${leftX + 0.8} ${leftTopY + 1}`}
        fill="none"
        stroke="#475579"
        strokeWidth={faucetHighlightStrokeWidth}
        strokeLinecap="round"
        opacity="0.28"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function ElevationBaseCabinetDetails({
  cabinet,
  image,
  x,
  y,
  width,
  height,
  inset: _inset,
  innerX,
  innerY,
  innerWidth,
  innerHeight,
  innerStroke,
  handleStroke,
  handleTop,
  handleHeight,
  singleHandleX,
}: {
  cabinet?: CabinetElement;
  image: CabinetImage;
  x: number;
  y: number;
  width: number;
  height: number;
  inset: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleTop: number;
  handleHeight: number;
  singleHandleX: number;
}) {
  const doorDividerX = x + width / 2;
  const handleOffsetFromCenter = Math.max(6, Math.min(16, width * 0.08));
  const leftHandleX = doorDividerX - handleOffsetFromCenter;
  const rightHandleX = doorDividerX + handleOffsetFromCenter;
  const drawerHandleWidth = Math.max(12, Math.min(34, width * 0.26));
  const drawerHandleX1 = x + width / 2 - drawerHandleWidth / 2;
  const drawerHandleX2 = x + width / 2 + drawerHandleWidth / 2;
  const panelFill = "#fafaf7";
  const panelStrokeWidth = 1.5;
  const panelGap = Math.max(2, Math.min(6, innerWidth * 0.04));

  const renderDoubleDoorLowerSection = (topY: number, lowerHeight: number) => {
    const leftPanelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    const rightPanelX = innerX + innerWidth / 2 + panelGap / 2;
    return (
      <>
        <rect
          x={innerX}
          y={topY}
          width={leftPanelWidth}
          height={lowerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={rightPanelX}
          y={topY}
          width={leftPanelWidth}
          height={lowerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={doorDividerX}
          y1={topY}
          x2={doorDividerX}
          y2={topY + lowerHeight}
          stroke={innerStroke}
          strokeWidth="1.35"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={leftHandleX}
          y1={topY + lowerHeight * 0.3}
          x2={leftHandleX}
          y2={topY + lowerHeight * 0.3 + Math.min(handleHeight, lowerHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={rightHandleX}
          y1={topY + lowerHeight * 0.3}
          x2={rightHandleX}
          y2={topY + lowerHeight * 0.3 + Math.min(handleHeight, lowerHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </>
    );
  };

  const renderSinkBaseFront = (variant: "standard" | "farm") => {
    const topSectionHeight = innerHeight * 0.24;
    const lowerTop = innerY + topSectionHeight;
    const lowerHeight = innerHeight - topSectionHeight;
    const apronInsetX = Math.max(4, innerWidth * 0.09);
    const apronX = innerX + apronInsetX;
    const apronWidth = innerWidth - apronInsetX * 2;
    const apronHeight = Math.max(0, topSectionHeight * 0.86);
    const apronY = innerY + Math.max(1.5, topSectionHeight * 0.06);

    return (
      <g>
        {variant === "farm" ? (
          <path
            d={`M ${apronX} ${apronY} L ${apronX + apronWidth} ${apronY} L ${apronX + apronWidth} ${apronY + apronHeight * 0.72} Q ${innerX + innerWidth / 2} ${apronY + apronHeight} ${apronX} ${apronY + apronHeight * 0.72} Z`}
            fill="#f8fafc"
            stroke={innerStroke}
            strokeWidth={panelStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <rect
            x={innerX}
            y={innerY}
            width={innerWidth}
            height={topSectionHeight}
            fill={panelFill}
            stroke={innerStroke}
            strokeWidth={panelStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {renderDoubleDoorLowerSection(lowerTop, lowerHeight)}
      </g>
    );
  };

  const renderFullHeightSingleFront = (showBins = false) => (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={innerWidth}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {showBins && (
        <>
          {[0.3, 0.7].map((ratio) => (
            <rect
              key={`trash-bin-${ratio}`}
              x={innerX + innerWidth * (ratio - 0.14)}
              y={innerY + innerHeight * 0.26}
              width={innerWidth * 0.22}
              height={innerHeight * 0.34}
              rx="2"
              fill="none"
              stroke={innerStroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </>
      )}
      <line
        x1={singleHandleX}
        y1={handleTop}
        x2={singleHandleX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );

  if (image === "base-corner") {
    const returnSectionWidth = Math.max(12, Math.min(innerWidth * 0.24, 26));
    const mainSectionX = innerX + returnSectionWidth;
    const mainSectionWidth = Math.max(0, innerWidth - returnSectionWidth);
    const mainPanelInsetX = Math.max(4, mainSectionWidth * 0.05);
    const mainPanelInsetY = Math.max(4, innerHeight * 0.06);
    const mainPanelX = mainSectionX + mainPanelInsetX;
    const mainPanelY = innerY + mainPanelInsetY;
    const mainPanelWidth = Math.max(0, mainSectionWidth - mainPanelInsetX * 2);
    const mainPanelHeight = Math.max(0, innerHeight - mainPanelInsetY * 2);
    const returnPanelInsetX = Math.max(2.5, returnSectionWidth * 0.12);
    const returnPanelInsetY = Math.max(4, innerHeight * 0.08);
    const returnPanelX = innerX + returnPanelInsetX;
    const returnPanelY = innerY + returnPanelInsetY;
    const returnPanelWidth = Math.max(0, returnSectionWidth - returnPanelInsetX * 1.5);
    const returnPanelHeight = Math.max(0, innerHeight - returnPanelInsetY * 2);
    const mainDoorDividerX = mainPanelX + mainPanelWidth / 2;
    const leftDoorHandleX = mainDoorDividerX - Math.max(6, Math.min(13, mainPanelWidth * 0.11));
    const rightDoorHandleX = mainDoorDividerX + Math.max(6, Math.min(13, mainPanelWidth * 0.11));
    const seamY = innerY + Math.max(4, innerHeight * 0.1);
    const seamDrop = Math.max(5, Math.min(12, innerHeight * 0.14));
    const returnKnobR = Math.max(1.2, Math.min(2.2, width * 0.015));

    return (
      <g>
        <line
          x1={mainSectionX}
          y1={innerY}
          x2={mainSectionX}
          y2={innerY + innerHeight}
          stroke={innerStroke}
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={innerX + returnSectionWidth * 0.3}
          y1={seamY}
          x2={mainSectionX}
          y2={seamY + seamDrop}
          stroke={innerStroke}
          strokeWidth="1.15"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={returnPanelX}
          y={returnPanelY}
          width={returnPanelWidth}
          height={returnPanelHeight}
          fill="none"
          stroke={innerStroke}
          strokeWidth="1.15"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={returnPanelX + Math.max(3.5, returnPanelWidth * 0.2)}
          cy={returnPanelY + returnPanelHeight * 0.42}
          r={returnKnobR}
          fill={handleStroke}
        />
        <rect
          x={mainPanelX}
          y={mainPanelY}
          width={mainPanelWidth}
          height={mainPanelHeight}
          fill="none"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={mainDoorDividerX}
          y1={mainPanelY}
          x2={mainDoorDividerX}
          y2={mainPanelY + mainPanelHeight}
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={leftDoorHandleX}
          y1={handleTop}
          x2={leftDoorHandleX}
          y2={handleTop + handleHeight}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={rightDoorHandleX}
          y1={handleTop}
          x2={rightDoorHandleX}
          y2={handleTop + handleHeight}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "base-drawer") {
    return (
      <g>
        {Array.from({ length: 3 }, (_, index) => {
          const drawerY = innerY + (innerHeight * index) / 3;
          const drawerHeight = innerHeight / 3;
          const centerY = innerY + (innerHeight * (index + 0.5)) / 3;
          return (
            <g key={`elev-drawer-${index}`}>
              <rect
                x={innerX}
                y={drawerY}
                width={innerWidth}
                height={drawerHeight}
                fill={panelFill}
                stroke={innerStroke}
                strokeWidth={panelStrokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={drawerHandleX1}
                y1={centerY}
                x2={drawerHandleX2}
                y2={centerY}
                stroke={handleStroke}
                strokeWidth="1.6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </g>
    );
  }

  if (image === "base-sink-cabinet" || image === "base-farm-sink-cabinet") {
    return renderSinkBaseFront(image === "base-farm-sink-cabinet" ? "farm" : "standard");
  }


  if (image === "base-dishwasher") {
    const panelInset = Math.max(4, Math.min(8, width * 0.06));
    const panelX = innerX + panelInset;
    const panelY = innerY + panelInset;
    const panelWidth = innerWidth - panelInset * 2;
    const panelHeight = innerHeight - panelInset * 2;
    return (
      <g>
        <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={panelX} y={panelY} width={panelWidth} height={panelHeight} rx="2" fill="#e5e7eb" stroke="#94a3b8" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={panelX + panelWidth * 0.1} y={panelY + panelHeight * 0.08} width={panelWidth * 0.8} height={Math.max(4, panelHeight * 0.08)} rx="2" fill="#9ca3af" opacity="0.65" />
        <rect x={x} y={y + height * 0.88} width={width} height={height * 0.12} fill="#111827" opacity="0.9" />
      </g>
    );
  }

  if (image === "base-refrigerator") {
    const bodyX = innerX;
    const bodyY = innerY;
    const bodyWidth = innerWidth;
    const bodyHeight = innerHeight;
    const panelInsetX = Math.max(2.2, bodyWidth * 0.035);
    const panelInsetY = Math.max(2.2, bodyHeight * 0.028);
    const panelX = bodyX + panelInsetX;
    const panelY = bodyY + panelInsetY;
    const panelWidth = bodyWidth - panelInsetX * 2;
    const panelHeight = bodyHeight - panelInsetY * 2;
    const topSectionHeight = panelHeight * 0.63;
    const freezerTopY = panelY + topSectionHeight;
    const centerGap = Math.max(1.5, panelWidth * 0.022);
    const doorWidth = panelWidth / 2 - centerGap / 2;
    const leftDoorX = panelX;
    const rightDoorX = panelX + doorWidth + centerGap;
    const handleTopY = panelY + topSectionHeight * 0.24;
    const handleBottomY = panelY + topSectionHeight * 0.72;
    const dispenserX = leftDoorX + doorWidth * 0.14;
    const dispenserY = panelY + topSectionHeight * 0.32;
    const dispenserWidth = doorWidth * 0.24;
    const dispenserHeight = topSectionHeight * 0.2;
    return (
      <g>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={leftDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={rightDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={panelX} y={freezerTopY} width={panelWidth} height={panelHeight - topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={dispenserX} y={dispenserY} width={dispenserWidth} height={dispenserHeight} rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" opacity="0.55" vectorEffect="non-scaling-stroke" />
        <line x1={leftDoorX + doorWidth * 0.76} y1={handleTopY} x2={leftDoorX + doorWidth * 0.76} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={rightDoorX + doorWidth * 0.24} y1={handleTopY} x2={rightDoorX + doorWidth * 0.24} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={panelX} y1={freezerTopY} x2={panelX + panelWidth} y2={freezerTopY} stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-range") {
    const controlBottom = innerY + innerHeight * 0.2;
    const ovenX = innerX + innerWidth * 0.12;
    const ovenY = innerY + innerHeight * 0.42;
    const ovenWidth = innerWidth * 0.76;
    const ovenHeight = innerHeight * 0.38;
    return (
      <g>
        <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} fill="#e5e7eb" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1={innerX} y1={controlBottom} x2={innerX + innerWidth} y2={controlBottom} stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        {[0.18,0.34,0.5,0.66,0.82].map((ratio) => <circle key={`range-elev-knob-${ratio}`} cx={innerX + innerWidth * ratio} cy={innerY + innerHeight * 0.1} r={Math.max(1.5, innerWidth * 0.025)} fill={handleStroke} />)}
        <rect x={ovenX} y={ovenY} width={ovenWidth} height={ovenHeight} rx="2" fill="#111827" opacity="0.64" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={ovenX + ovenWidth * 0.15} y1={ovenY - innerHeight * 0.08} x2={ovenX + ovenWidth * 0.85} y2={ovenY - innerHeight * 0.08} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <rect x={innerX + innerWidth * 0.08} y={innerY + innerHeight * 0.24} width={innerWidth * 0.84} height={innerHeight * 0.12} rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-appliance") {
    return (
      <g>
        <rect x={innerX + innerWidth * 0.12} y={innerY + innerHeight * 0.22} width={innerWidth * 0.76} height={innerHeight * 0.42} fill="none" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1={innerX + innerWidth * 0.18} y1={innerY + innerHeight * 0.14} x2={innerX + innerWidth * 0.82} y2={innerY + innerHeight * 0.14} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={x} y1={y + height * 0.78} x2={x + width} y2={y + height * 0.78} stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <circle cx={x + width / 2} cy={y + height * 0.88} r={Math.max(1.4, Math.min(3, width * 0.025))} fill="#6b7280" />
      </g>
    );
  }

  if (image === "base-oven-bottom-drawer" || image === "base-microwave-bottom-drawer") {
    const {
      totalHeightInches,
      bottomDrawerHeightInches,
      productHeightInches,
      fillerHeightInches,
    } = getOvenCabinetHeightSegments(cabinet ?? { heightInches: 36 });
    const fillerHeight = totalHeightInches > 0 ? (fillerHeightInches / totalHeightInches) * innerHeight : 0;
    const drawerHeight = totalHeightInches > 0 ? (bottomDrawerHeightInches / totalHeightInches) * innerHeight : 0;
    const productHeight = Math.max(0, innerHeight - fillerHeight - drawerHeight);
    const fillerBottom = innerY + fillerHeight;
    const productY = fillerBottom;
    const drawerTop = innerY + innerHeight - drawerHeight;
    const productX = innerX;
    const productWidth = innerWidth;
    const productInnerX = productX + productWidth * 0.12;
    const drawerHandleWidth = Math.max(10, Math.min(28, innerWidth * 0.28));
    const productLayout =
      cabinet?.ovenCabinetProductLayout ??
      getDefaultBottomDrawerProductLayout(image) ??
      "none";

    const renderSingleOven = (ovenY: number, ovenHeight: number, key: string) => (
      <g key={key}>
        <rect x={productX} y={ovenY} width={productWidth} height={ovenHeight} rx={Math.max(2, Math.min(6, width * 0.03))} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={productInnerX} y={ovenY + ovenHeight * 0.16} width={productWidth * 0.76} height={ovenHeight * 0.6} rx={Math.max(2, Math.min(5, height * 0.02))} fill="#eceff3" stroke="#9ca3af" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={productX + productWidth * 0.22} y1={ovenY + ovenHeight * 0.08} x2={productX + productWidth * 0.78} y2={ovenY + ovenHeight * 0.08} stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );

    const renderMicrowave = (microwaveY: number, microwaveHeight: number) => (
      <g>
        <rect x={productX} y={microwaveY} width={productWidth} height={microwaveHeight} rx="2" fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={productX + productWidth * 0.08} y={microwaveY + microwaveHeight * 0.18} width={productWidth * 0.54} height={microwaveHeight * 0.46} rx="2" fill="#94a3b8" opacity="0.55" stroke="#64748b" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={productX + productWidth * 0.68} y={microwaveY + microwaveHeight * 0.12} width={productWidth * 0.18} height={microwaveHeight * 0.62} rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </g>
    );

    return (
      <g>
        {fillerHeight > 0 && (
          <rect x={innerX} y={innerY} width={innerWidth} height={fillerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        )}
        {productHeight > 0 && productLayout === "none" && (
          <rect
            x={productX}
            y={productY}
            width={productWidth}
            height={productHeight}
            fill="#111827"
            stroke={innerStroke}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {productHeight > 0 && productLayout === "single-oven" && renderSingleOven(productY, productHeight, "single-oven")}
        {productHeight > 0 && productLayout === "double-oven" && (
          <>
            {renderSingleOven(productY, productHeight / 2 - 1, "double-oven-top")}
            {renderSingleOven(productY + productHeight / 2 + 1, productHeight / 2 - 1, "double-oven-bottom")}
          </>
        )}
        {productHeight > 0 && productLayout === "single-microwave" && renderMicrowave(productY, productHeight)}
        {productHeight > 0 && productLayout === "microwave-oven" && (() => {
          const microwaveHeight = Math.min(productHeight * 0.42, productHeight * 0.48);
          const ovenHeight = Math.max(productHeight - microwaveHeight - 2, productHeight * 0.5);
          return (
            <>
              {renderMicrowave(productY, microwaveHeight)}
              {renderSingleOven(productY + microwaveHeight + 2, ovenHeight, "microwave-oven-bottom")}
            </>
          );
        })()}
        <rect x={innerX} y={drawerTop} width={innerWidth} height={drawerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <line x1={x + width / 2 - drawerHandleWidth / 2} y1={drawerTop + drawerHeight * 0.5} x2={x + width / 2 + drawerHandleWidth / 2} y2={drawerTop + drawerHeight * 0.5} stroke={handleStroke} strokeWidth="1.55" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-two-door-one-drawer" || image === "base-one-door-one-drawer" || image === "base-two-door-two-drawer") {
    const isSingleDoor = image === "base-one-door-one-drawer";
    const hasTwoDrawers = image === "base-two-door-two-drawer";
    const drawerBottom = innerY + innerHeight * 0.24;
    const drawerMidX = innerX + innerWidth / 2;
    const drawerHandleY = innerY + innerHeight * 0.12;
    const drawerHandleWidthLocal = Math.max(8, Math.min(24, innerWidth * 0.2));
    const doorTop = drawerBottom;
    const doorHeight = innerY + innerHeight - doorTop;
    const leftPanelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    const rightPanelX = innerX + innerWidth / 2 + panelGap / 2;

    return (
      <g>
        {hasTwoDrawers ? (
          <>
            <rect x={innerX} y={innerY} width={innerWidth / 2} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
            <rect x={drawerMidX} y={innerY} width={innerWidth / 2} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <rect x={innerX} y={innerY} width={innerWidth} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        )}
        {hasTwoDrawers ? (
          <>
            <line x1={innerX + innerWidth * 0.15} y1={drawerHandleY} x2={innerX + innerWidth * 0.35} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={innerX + innerWidth * 0.65} y1={drawerHandleY} x2={innerX + innerWidth * 0.85} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <line x1={x + width / 2 - drawerHandleWidthLocal / 2} y1={drawerHandleY} x2={x + width / 2 + drawerHandleWidthLocal / 2} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
        {isSingleDoor ? (
          <rect x={innerX} y={doorTop} width={innerWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        ) : (
          <>
            <rect x={innerX} y={doorTop} width={leftPanelWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
            <rect x={rightPanelX} y={doorTop} width={leftPanelWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
          </>
        )}
        {!isSingleDoor && (
          <line x1={doorDividerX} y1={doorTop} x2={doorDividerX} y2={doorTop + doorHeight} stroke={innerStroke} strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
        )}
        {isSingleDoor ? (
          <line x1={singleHandleX} y1={doorTop + doorHeight * 0.3} x2={singleHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ) : (
          <>
            <line x1={leftHandleX} y1={doorTop + doorHeight * 0.3} x2={leftHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={rightHandleX} y1={doorTop + doorHeight * 0.3} x2={rightHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </g>
    );
  }

  if (image === "base-two-drawer" || image === "base-four-drawer") {
    const drawerCount = image === "base-two-drawer" ? 2 : 4;
    return (
      <g>
        {Array.from({ length: drawerCount }, (_, index) => {
          const drawerY = innerY + (innerHeight * index) / drawerCount;
          const drawerHeight = innerHeight / drawerCount;
          const centerY = innerY + (innerHeight * (index + 0.5)) / drawerCount;
          const localHandleWidth = Math.max(10, Math.min(28, innerWidth * 0.32));
          return (
            <g key={`elev-new-drawer-pull-${index}`}>
              <rect
                x={innerX}
                y={drawerY}
                width={innerWidth}
                height={drawerHeight}
                fill={panelFill}
                stroke={innerStroke}
                strokeWidth={panelStrokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={x + width / 2 - localHandleWidth / 2}
                y1={centerY}
                x2={x + width / 2 + localHandleWidth / 2}
                y2={centerY}
                stroke={handleStroke}
                strokeWidth="1.55"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </g>
    );
  }

  if (image === "base-spice-rack") {
    return renderFullHeightSingleFront(false);
  }

  if (image === "base-trash-can") {
    return renderFullHeightSingleFront(true);
  }

  if (
    image === "base-blind-left-one-drawer" ||
    image === "base-blind-right-one-drawer" ||
    image === "base-blind-left" ||
    image === "base-blind-right"
  ) {
    return renderBlindCabinetElevationFront({
      cabinet,
      image,
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      innerStroke,
      handleStroke,
      handleHeight,
    });
  }

  if (image === "base" || image === "pantry-two-door") {
    const panelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    return (
      <g>
        <rect
          x={innerX}
          y={innerY}
          width={panelWidth}
          height={innerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={innerX + innerWidth / 2 + panelGap / 2}
          y={innerY}
          width={panelWidth}
          height={innerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line x1={doorDividerX} y1={innerY} x2={doorDividerX} y2={innerY + innerHeight} stroke={innerStroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <line x1={leftHandleX} y1={handleTop} x2={leftHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={rightHandleX} y1={handleTop} x2={rightHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={innerWidth}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line x1={singleHandleX} y1={handleTop} x2={singleHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function renderBlindCabinetElevationFront(params: {
  cabinet?: CabinetElement;
  image: CabinetImage;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleHeight: number;
}) {
  const {
    cabinet,
    image,
    innerX,
    innerY,
    innerWidth,
    innerHeight,
    innerStroke,
    handleStroke,
    handleHeight,
  } = params;
  const panelFill = "#fafaf7";
  const panelStrokeWidth = 1.5;
  const widthScale = innerWidth / Math.max(1, cabinet?.width ? pixelsToInches(cabinet.width) : innerWidth);
  const blindWidths = cabinet
    ? getBlindCabinetWidthSegments(cabinet)
    : {
        widthInches: innerWidth,
        doorWidthInches: innerWidth * 0.36,
        fillerWidthInches: 3,
        blindWidthInches: innerWidth * 0.64,
        side: getBlindCabinetSide(image),
      };
  const side = blindWidths.side ?? "left";
  const doorWidth = blindWidths.doorWidthInches * widthScale;
  const fillerWidth = blindWidths.fillerWidthInches * widthScale;
  const blindWidth = Math.max(0, innerWidth - doorWidth - fillerWidth);

  if (side === "right") {
    const doorX = innerX;
    const fillerX = doorX + doorWidth;
    const blindX = fillerX + fillerWidth;
    const doorHandleX = doorX + Math.max(7, doorWidth * 0.16);
    return (
      <g>
        <rect x={blindX} y={innerY} width={blindWidth} height={innerHeight} fill="#111827" stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <rect x={fillerX} y={innerY} width={fillerWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <rect x={doorX} y={innerY} width={doorWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <line x1={doorHandleX} y1={innerY + innerHeight * 0.28} x2={doorHandleX} y2={innerY + innerHeight * 0.28 + Math.min(handleHeight, innerHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  const blindX = innerX;
  const fillerX = blindX + blindWidth;
  const doorX = fillerX + fillerWidth;
  const doorHandleX = doorX + doorWidth - Math.max(7, doorWidth * 0.16);
  return (
    <g>
      <rect x={blindX} y={innerY} width={blindWidth} height={innerHeight} fill="#111827" stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <rect x={fillerX} y={innerY} width={fillerWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <rect x={doorX} y={innerY} width={doorWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <line x1={doorHandleX} y1={innerY + innerHeight * 0.28} x2={doorHandleX} y2={innerY + innerHeight * 0.28 + Math.min(handleHeight, innerHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}


type CabinetWallAttachment = {
  wall: Wall;
  wallFace: WallFaceSide;
  startProjection: number;
  endProjection: number;
  depthFromWallFace: number;
  overlap: number;
  gap: number;
};

function getCabinetWallAttachments(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation">,
  walls: Wall[],
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 6)
): CabinetWallAttachment[] {
  const corners = getRotatedRectCorners(
    cabinetItem.center,
    cabinetItem.width,
    cabinetItem.depth,
    cabinetItem.rotation
  );
  const widthEdges = [
    { start: corners[0], end: corners[1] },
    { start: corners[3], end: corners[2] },
  ];
  const wallFaceOffset = WALL_THICKNESS / 2;
  const parallelTolerance = 0.08;
  const attachments: CabinetWallAttachment[] = [];

  for (const wall of walls.filter(isThickWall)) {
    const axis = getElevationWallAxis(wall);
    if (axis.length < 0.001) continue;
    const segmentGeometry = getWallSegmentBlackDotGeometry(
      wall.start,
      wall.end,
      walls.filter(isThickWall)
    );

    for (const edge of widthEdges) {
      const edgeLength = distance(edge.start, edge.end);
      if (edgeLength < 0.001) continue;

      const edgeDirection = normalize(sub(edge.end, edge.start));
      const parallelAmount = Math.abs(cross(edgeDirection, axis.direction));
      if (parallelAmount > parallelTolerance) continue;

      const sideDistanceStart = dot(sub(edge.start, axis.start), axis.normal);
      const sideDistanceEnd = dot(sub(edge.end, axis.start), axis.normal);
      if (Math.abs(sideDistanceStart - sideDistanceEnd) > tolerance) continue;

      const sideDistance = (sideDistanceStart + sideDistanceEnd) / 2;
      const projectionA = dot(sub(edge.start, axis.start), axis.direction);
      const projectionB = dot(sub(edge.end, axis.start), axis.direction);
      const rawStartProjection = Math.min(projectionA, projectionB);
      const rawEndProjection = Math.max(projectionA, projectionB);
      const attachedStartProjection = clamp(rawStartProjection, 0, axis.length);
      const attachedEndProjection = clamp(rawEndProjection, 0, axis.length);
      const overlap = attachedEndProjection - attachedStartProjection;
      if (overlap <= Math.max(1, edgeLength * 0.2)) continue;

      for (const faceSign of [-1, 1] as const) {
        const faceDistance = faceSign * wallFaceOffset;
        const gap = sideDistance - faceDistance;
        if (Math.abs(gap) > tolerance) continue;
        const wallFace: WallFaceSide = faceSign === 1 ? "left" : "right";
        const faceStartAnchor =
          wallFace === "left"
            ? segmentGeometry.startLeft
            : segmentGeometry.startRight;
        const faceEndAnchor =
          wallFace === "left"
            ? segmentGeometry.endLeft
            : segmentGeometry.endRight;
        const faceStartScalar = dot(
          sub(faceStartAnchor, axis.start),
          axis.direction
        );
        const faceEndScalar = dot(sub(faceEndAnchor, axis.start), axis.direction);
        const faceIntervalStart = Math.min(faceStartScalar, faceEndScalar);
        const faceIntervalEnd = Math.max(faceStartScalar, faceEndScalar);
        const faceIntervalLength = faceIntervalEnd - faceIntervalStart;
        if (faceIntervalLength <= 0.5) continue;

        const displayWidthPixels = Math.min(
          rawEndProjection - rawStartProjection,
          faceIntervalLength
        );
        if (displayWidthPixels <= 0.5) continue;

        let startProjection = rawStartProjection;
        let endProjection = rawEndProjection;

        if (displayWidthPixels >= faceIntervalLength) {
          startProjection = faceIntervalStart;
          endProjection = faceIntervalEnd;
        } else {
          if (startProjection < faceIntervalStart) {
            endProjection += faceIntervalStart - startProjection;
            startProjection = faceIntervalStart;
          }

          if (endProjection > faceIntervalEnd) {
            startProjection -= endProjection - faceIntervalEnd;
            endProjection = faceIntervalEnd;
          }

          startProjection = clamp(
            startProjection,
            faceIntervalStart,
            faceIntervalEnd - displayWidthPixels
          );
          endProjection = startProjection + displayWidthPixels;
        }

        // Only bind to the left/right end of the elevation wall when the cabinet
        // is truly almost touching that end. The old threshold used the wall
        // attachment tolerance, which was intentionally large and made cabinets
        // jump to the rectangle edge even when the user wanted to leave a small
        // reveal/gap near the left or right side of the elevation wall.
        const wallEndBindThreshold = inchesToPixels(0.35);
        if (startProjection - faceIntervalStart <= wallEndBindThreshold) {
          startProjection = faceIntervalStart;
          endProjection = Math.min(
            faceIntervalStart + displayWidthPixels,
            faceIntervalEnd
          );
        } else if (faceIntervalEnd - endProjection <= wallEndBindThreshold) {
          endProjection = faceIntervalEnd;
          startProjection = Math.max(
            faceIntervalStart,
            faceIntervalEnd - displayWidthPixels
          );
        }

        const centerSideDistance = dot(sub(cabinetItem.center, axis.start), axis.normal);
        const depthFromWallFace = Math.max(
          0,
          Math.abs(centerSideDistance - faceDistance) - cabinetItem.depth / 2
        );

        attachments.push({
          wall,
          wallFace,
          startProjection,
          endProjection,
          depthFromWallFace,
          overlap,
          gap: Math.abs(gap),
        });
      }
    }
  }

  return attachments.sort((left, right) => {
    if (Math.abs(left.gap - right.gap) > 0.001) return left.gap - right.gap;
    if (Math.abs(left.depthFromWallFace - right.depthFromWallFace) > 0.001) {
      return left.depthFromWallFace - right.depthFromWallFace;
    }
    return right.overlap - left.overlap;
  });
}

function getBestCabinetWallAttachment(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation">,
  walls: Wall[],
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 6)
): CabinetWallAttachment | null {
  return getCabinetWallAttachments(cabinetItem, walls, tolerance)[0] ?? null;
}

// getCabinetElevationPlacementsForWall
function getCabinetElevationPlacementsForWall(
  wall: Wall,
  cabinets: CabinetElement[],
  walls: Wall[] = []
): CabinetElevationPlacement[] {
  const axis = getElevationWallAxis(wall);
  const wallLength = axis.length;
  if (wallLength < 0.001) return [];

  const allWalls = walls.length ? walls.filter(isThickWall) : [wall];
  const projectedFace = getWallProjectedFaceForElevation(wall, allWalls);
  if (!projectedFace) return [];
  const attachmentTolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8);

  const placements = cabinets
    .map((cabinetItem) => {
      // Prefer the persisted wall id, the same way doors/windows do. For older
      // saved cabinets that do not yet have wallId, infer it from the cabinet
      // edge that is actually touching a wall face. This avoids projecting a
      // cabinet from the opposite wall into the current elevation while still
      // allowing valid cabinets to appear.
      if (cabinetItem.wallId && cabinetItem.wallId !== wall.id) return null;

      const category = getCabinetElevationCategory(cabinetItem);
      const attachments = getCabinetWallAttachments(cabinetItem, allWalls, attachmentTolerance);
      const cabinetWallFace = getCabinetWallFaceOnWall(cabinetItem, wall, allWalls);
      if (cabinetWallFace && cabinetWallFace !== projectedFace) return null;
      const attachment = attachments.find(
        (candidate) =>
          candidate.wall.id === wall.id && candidate.wallFace === projectedFace
      ) ?? null;
      const supportedWall = isElevationFloatingCabinet(cabinetItem)
        ? getWallCabinetSupportedWall(cabinetItem, cabinets, allWalls, cabinetItem.id)
        : null;

      if (!attachment && supportedWall?.id !== wall.id) return null;
      if (!attachment && !supportedWall) return null;
      if (!cabinetItem.wallId && attachment) {
        const bestAttachment = attachments[0] ?? null;
        if (
          !bestAttachment ||
          bestAttachment.wall.id !== wall.id ||
          bestAttachment.wallFace !== projectedFace
        ) {
          return null;
        }
      }

      const projection = attachment
        ? {
            startProjection: attachment.startProjection,
            endProjection: attachment.endProjection,
            depthFromWallFace: attachment.depthFromWallFace,
          }
        : getCabinetProjectionOnWallAxis(cabinetItem, wall);

      if (!projection) return null;

      const widthPixels = projection.endProjection - projection.startProjection;
      if (widthPixels <= 0.5) return null;

      const spec = getCabinetElevationSpec(cabinetItem, category);

      return {
        cabinet: cabinetItem,
        category,
        startInches: pixelsToInches(projection.startProjection),
        widthInches: pixelsToInches(widthPixels),
        heightInches: spec.heightInches,
        distanceFromFloorInches: spec.distanceFromFloorInches,
        depthFromWallInches: pixelsToInches(Math.max(0, projection.depthFromWallFace)),
      };
    })
    .filter((placement): placement is CabinetElevationPlacement => Boolean(placement));

  // Each cabinet elevation position must stay tied to that cabinet's own
  // floor-plan projection. Do not auto-stack here. Wall-cabinet stack spacing is
  // applied once at placement time and then stored on the cabinet, so later
  // manual elevation edits do not get overwritten by a render-time equalizer.
  return placements.sort((left, right) => {
    if (left.depthFromWallInches !== right.depthFromWallInches) {
      return left.depthFromWallInches - right.depthFromWallInches;
    }

    if (left.distanceFromFloorInches !== right.distanceFromFloorInches) {
      return left.distanceFromFloorInches - right.distanceFromFloorInches;
    }

    return left.startInches - right.startInches;
  });
}

function stackOverlappingWallCabinetPlacements(
  placements: CabinetElevationPlacement[],
  wallHeightInches = DEFAULT_ELEVATION_WALL_HEIGHT_INCHES,
  targetCabinetId?: string
): CabinetElevationPlacement[] {
  const nextPlacements = placements.map((placement) => ({ ...placement }));
  const depthPathToleranceInches = 3;
  const overlapToleranceInches = 0.25;

  const horizontalOverlap = (first: CabinetElevationPlacement, second: CabinetElevationPlacement) => {
    const firstStart = first.startInches;
    const firstEnd = first.startInches + first.widthInches;
    const secondStart = second.startInches;
    const secondEnd = second.startInches + second.widthInches;
    return Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart);
  };

  const sameDepthPath = (first: CabinetElevationPlacement, second: CabinetElevationPlacement) =>
    Math.abs(first.depthFromWallInches - second.depthFromWallInches) <= depthPathToleranceInches;

  const wallCabinetIndexes = nextPlacements
    .map((placement, index) => ({ placement, index }))
    .filter(({ placement }) => placement.category === "wall")
    .map(({ index }) => index);

  const visited = new Set<number>();

  wallCabinetIndexes.forEach((startIndex) => {
    if (visited.has(startIndex)) return;

    const group: number[] = [];
    const queue = [startIndex];
    visited.add(startIndex);

    while (queue.length) {
      const currentIndex = queue.shift() as number;
      const currentPlacement = nextPlacements[currentIndex];
      group.push(currentIndex);

      wallCabinetIndexes.forEach((candidateIndex) => {
        if (visited.has(candidateIndex)) return;

        const candidatePlacement = nextPlacements[candidateIndex];
        if (!sameDepthPath(currentPlacement, candidatePlacement)) return;
        if (horizontalOverlap(currentPlacement, candidatePlacement) <= overlapToleranceInches) return;

        visited.add(candidateIndex);
        queue.push(candidateIndex);
      });
    }

    if (
      targetCabinetId &&
      !group.some((index) => nextPlacements[index].cabinet.id === targetCabinetId)
    ) {
      return;
    }

    const groupPlacements = group.map((index) => nextPlacements[index]);
    const groupStart = Math.min(...groupPlacements.map((placement) => placement.startInches));
    const groupEnd = Math.max(...groupPlacements.map((placement) => placement.startInches + placement.widthInches));
    const groupDepth = groupPlacements.reduce((sum, placement) => sum + placement.depthFromWallInches, 0) / groupPlacements.length;

    const groundObstacles = nextPlacements.filter((placement) => {
      if (placement.category === "wall") return false;
      if (Math.abs(placement.depthFromWallInches - groupDepth) > depthPathToleranceInches) return false;

      const placementStart = placement.startInches;
      const placementEnd = placement.startInches + placement.widthInches;
      return Math.min(groupEnd, placementEnd) - Math.max(groupStart, placementStart) > overlapToleranceInches;
    });

    const bottomLimitInches = Math.max(
      0,
      ...groundObstacles.map(
        (placement) => placement.distanceFromFloorInches + placement.heightInches
      )
    );

    const shouldAutoStack = group.length > 1 || bottomLimitInches > 0;
    if (!shouldAutoStack) return;

    const totalStackHeight = groupPlacements.reduce(
      (sum, placement) => sum + placement.heightInches,
      0
    );
    const availableHeight = Math.max(0, wallHeightInches - bottomLimitInches);

    if (totalStackHeight > availableHeight + 0.001) {
      const message = NOT_ENOUGH_VERTICAL_WALL_SPACE_MESSAGE;
      group.forEach((index) => {
        nextPlacements[index].stackOverflow = true;
        nextPlacements[index].stackOverflowMessage = message;
      });
      return;
    }

    const sortedGroup = group.slice().sort((leftIndex, rightIndex) => {
      const left = nextPlacements[leftIndex];
      const right = nextPlacements[rightIndex];
      if (left.distanceFromFloorInches !== right.distanceFromFloorInches) {
        return left.distanceFromFloorInches - right.distanceFromFloorInches;
      }
      return placements.findIndex((placement) => placement.cabinet.id === left.cabinet.id) -
        placements.findIndex((placement) => placement.cabinet.id === right.cabinet.id);
    });

    const gap = (availableHeight - totalStackHeight) / (sortedGroup.length + 1);
    let nextDistanceFromFloor = bottomLimitInches + gap;

    sortedGroup.forEach((index) => {
      const placement = nextPlacements[index];
      placement.distanceFromFloorInches = nextDistanceFromFloor;
      nextDistanceFromFloor += placement.heightInches + gap;
    });
  });

  return nextPlacements;
}

function getWallCabinetStackOverflowMessage(
  cabinets: CabinetElement[],
  walls: Wall[],
  targetCabinetId?: string
) {
  const stackResult = resolveWallCabinetStackPlacement(
    cabinets,
    walls,
    targetCabinetId
  );

  return stackResult.message ?? null;
}

type WallCabinetStackPlacementResult = {
  cabinets: CabinetElement[];
  message?: string;
};

function applyWallCabinetStackSpacingOnPlacement(
  cabinets: CabinetElement[],
  walls: Wall[],
  placedCabinetId: string
): WallCabinetStackPlacementResult {
  return resolveWallCabinetStackPlacement(cabinets, walls, placedCabinetId);
}

function resolveWallCabinetStackPlacement(
  cabinets: CabinetElement[],
  walls: Wall[],
  placedCabinetId?: string
): WallCabinetStackPlacementResult {
  const placedCabinet = placedCabinetId
    ? cabinets.find((cabinetItem) => cabinetItem.id === placedCabinetId)
    : null;

  if (!placedCabinet || getCabinetElevationCategory(placedCabinet) !== "wall") {
    return { cabinets };
  }

  const thickWalls = walls.filter(isThickWall);
  const nextCabinets = cabinets.map((cabinetItem) => ({ ...cabinetItem }));
  const depthPathToleranceInches = 3;
  const overlapToleranceInches = 0.25;

  for (const wall of thickWalls) {
    const placements = getCabinetElevationPlacementsForWall(wall, nextCabinets, thickWalls);
    const placedPlacement = placements.find(
      (placement) => placement.cabinet.id === placedCabinet.id && placement.category === "wall"
    );

    if (!placedPlacement) continue;

    const placedStart = placedPlacement.startInches;
    const placedEnd = placedPlacement.startInches + placedPlacement.widthInches;

    const horizontalOverlap = (placement: CabinetElevationPlacement) => {
      const placementStart = placement.startInches;
      const placementEnd = placement.startInches + placement.widthInches;
      return Math.min(placedEnd, placementEnd) - Math.max(placedStart, placementStart);
    };

    const sameDepthPath = (placement: CabinetElevationPlacement) =>
      Math.abs(placement.depthFromWallInches - placedPlacement.depthFromWallInches) <= depthPathToleranceInches;

    const stackObstacles = placements.filter((placement) => {
      if (placement.cabinet.id === placedCabinet.id) return false;
      if (!sameDepthPath(placement)) return false;
      return horizontalOverlap(placement) > overlapToleranceInches;
    });

    if (stackObstacles.length === 0) continue;

    const nextDistanceFromFloorInches = Math.max(
      placedPlacement.distanceFromFloorInches,
      ...stackObstacles.map(
        (placement) => placement.distanceFromFloorInches + placement.heightInches
      )
    );
    const nextTopInches = nextDistanceFromFloorInches + placedPlacement.heightInches;

    if (nextTopInches > DEFAULT_ELEVATION_WALL_HEIGHT_INCHES + 0.001) {
      return {
        cabinets,
        message:
          "Cannot stack this wall cabinet because it would go beyond the ceiling height.",
      };
    }

    return {
      cabinets: nextCabinets.map((cabinetItem) =>
        cabinetItem.id === placedCabinet.id
          ? {
              ...cabinetItem,
              distanceFromFloorInches: nextDistanceFromFloorInches,
              wallId: placedPlacement.cabinet.wallId ?? wall.id,
            }
          : cabinetItem
      ),
    };
  }

  return { cabinets: nextCabinets };
}

function normalizeCabinetElevationPlacementsFromFloorPlan(
  placements: CabinetElevationPlacement[],
  axis: ElevationWallAxis,
  wallLengthInches: number,
  adjacencyTolerancePixels: number,
  wallBoundaryTolerancePixels: number
): CabinetElevationPlacement[] {
  const nextPlacements = placements.map((placement) => ({ ...placement }));
  const rawStartInches = placements.map((placement) => placement.startInches);
  const adjacencyList = nextPlacements.map(() => [] as { to: number; offsetInches: number }[]);

  for (let firstIndex = 0; firstIndex < nextPlacements.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < nextPlacements.length; secondIndex += 1) {
      const firstPlacement = nextPlacements[firstIndex];
      const secondPlacement = nextPlacements[secondIndex];
      const adjacency = getCabinetElevationAxisAdjacency(
        firstPlacement.cabinet,
        secondPlacement.cabinet,
        axis,
        adjacencyTolerancePixels
      );

      if (!adjacency) continue;

      if (adjacency === "first-before-second") {
        adjacencyList[firstIndex].push({
          to: secondIndex,
          offsetInches: firstPlacement.widthInches,
        });
        adjacencyList[secondIndex].push({
          to: firstIndex,
          offsetInches: -firstPlacement.widthInches,
        });
      } else {
        adjacencyList[secondIndex].push({
          to: firstIndex,
          offsetInches: secondPlacement.widthInches,
        });
        adjacencyList[firstIndex].push({
          to: secondIndex,
          offsetInches: -secondPlacement.widthInches,
        });
      }
    }
  }

  const visited = new Array(nextPlacements.length).fill(false);

  for (let index = 0; index < nextPlacements.length; index += 1) {
    if (visited[index]) continue;

    const component: number[] = [];
    const stack = [index];
    visited[index] = true;

    while (stack.length > 0) {
      const currentIndex = stack.pop() as number;
      component.push(currentIndex);

      adjacencyList[currentIndex].forEach((edge) => {
        if (visited[edge.to]) return;
        visited[edge.to] = true;
        stack.push(edge.to);
      });
    }

    const startTouchingIndex = component
      .filter((placementIndex) =>
        cabinetTouchesWallBoundaryOnElevation(
          nextPlacements[placementIndex].cabinet,
          axis,
          "start",
          wallBoundaryTolerancePixels
        )
      )
      .sort((left, right) => rawStartInches[left] - rawStartInches[right])[0];

    const endTouchingIndex = component
      .filter((placementIndex) =>
        cabinetTouchesWallBoundaryOnElevation(
          nextPlacements[placementIndex].cabinet,
          axis,
          "end",
          wallBoundaryTolerancePixels
        )
      )
      .sort((left, right) => rawStartInches[right] - rawStartInches[left])[0];

    const anchorIndex = startTouchingIndex ?? endTouchingIndex ?? component
      .slice()
      .sort((left, right) => rawStartInches[left] - rawStartInches[right])[0];

    const anchorStart = startTouchingIndex !== undefined
      ? 0
      : endTouchingIndex !== undefined
        ? Math.max(0, wallLengthInches - nextPlacements[anchorIndex].widthInches)
        : rawStartInches[anchorIndex];

    const solvedStarts = new Map<number, number>();
    solvedStarts.set(anchorIndex, anchorStart);
    const queue = [anchorIndex];

    while (queue.length > 0) {
      const currentIndex = queue.shift() as number;
      const currentStart = solvedStarts.get(currentIndex) ?? rawStartInches[currentIndex];

      adjacencyList[currentIndex].forEach((edge) => {
        if (solvedStarts.has(edge.to)) return;
        solvedStarts.set(edge.to, currentStart + edge.offsetInches);
        queue.push(edge.to);
      });
    }

    component.forEach((placementIndex) => {
      nextPlacements[placementIndex].startInches = solvedStarts.get(placementIndex) ?? rawStartInches[placementIndex];
    });

    let componentStart = Infinity;
    let componentEnd = -Infinity;

    component.forEach((placementIndex) => {
      const placement = nextPlacements[placementIndex];
      componentStart = Math.min(componentStart, placement.startInches);
      componentEnd = Math.max(componentEnd, placement.startInches + placement.widthInches);
    });

    let componentShift = 0;
    if (componentStart < 0) {
      componentShift = -componentStart;
    }
    if (componentEnd + componentShift > wallLengthInches) {
      componentShift += wallLengthInches - (componentEnd + componentShift);
    }

    component.forEach((placementIndex) => {
      const placement = nextPlacements[placementIndex];
      placement.startInches = clamp(
        placement.startInches + componentShift,
        0,
        Math.max(0, wallLengthInches - placement.widthInches)
      );
    });
  }

  return nextPlacements;
}

function cabinetProjectionRange(cabinetItem: CabinetElement, direction: Point) {
  const corners = getRotatedRectCorners(
    cabinetItem.center,
    cabinetItem.width,
    cabinetItem.depth,
    cabinetItem.rotation
  );
  const values = corners.map((corner) => dot(corner, direction));

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function cabinetProjectionRangeRelativeToWallAxis(
  cabinetItem: CabinetElement,
  axis: ElevationWallAxis
) {
  const corners = getRotatedRectCorners(
    cabinetItem.center,
    cabinetItem.width,
    cabinetItem.depth,
    cabinetItem.rotation
  );
  const values = corners.map((corner) => dot(sub(corner, axis.start), axis.direction));

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function cabinetTouchesWallBoundaryOnElevation(
  cabinetItem: CabinetElement,
  axis: ElevationWallAxis,
  boundary: "start" | "end",
  tolerancePixels: number
) {
  const range = cabinetProjectionRangeRelativeToWallAxis(cabinetItem, axis);

  if (boundary === "start") {
    return range.min <= tolerancePixels;
  }

  return axis.length - range.max <= tolerancePixels;
}

function getCabinetElevationAxisAdjacency(
  firstCabinet: CabinetElement,
  secondCabinet: CabinetElement,
  axis: ElevationWallAxis,
  tolerance: number
): "first-before-second" | "second-before-first" | null {
  const firstAxisRange = cabinetProjectionRangeRelativeToWallAxis(firstCabinet, axis);
  const secondAxisRange = cabinetProjectionRangeRelativeToWallAxis(secondCabinet, axis);
  const firstNormalRange = cabinetProjectionRange(firstCabinet, axis.normal);
  const secondNormalRange = cabinetProjectionRange(secondCabinet, axis.normal);
  const normalGap = Math.max(
    firstNormalRange.min - secondNormalRange.max,
    secondNormalRange.min - firstNormalRange.max,
    0
  );

  // Cabinets can sit side-by-side in elevation even when one is slightly in
  // front of the other in floor plan. Treat normal-axis touching/near-touching
  // as the same elevation path so their wall-axis edges solve edge-to-edge.
  if (normalGap > tolerance) return null;

  if (firstAxisRange.max <= secondAxisRange.min) {
    return secondAxisRange.min - firstAxisRange.max <= tolerance
      ? "first-before-second"
      : null;
  }

  if (secondAxisRange.max <= firstAxisRange.min) {
    return firstAxisRange.min - secondAxisRange.max <= tolerance
      ? "second-before-first"
      : null;
  }

  return null;
}

function resolveCabinetElevationMoveStartSamePath(
  movingCabinetId: string,
  requestedStartInches: number,
  movingWidthInches: number,
  movingDistanceFromFloorInches: number,
  movingHeightInches: number,
  placements: CabinetElevationPlacement[],
  wallStartOffsetInches: number,
  wallLengthInches: number
): number | null {
  const movingPlacement = placements.find(
    (placement) => placement.cabinet.id === movingCabinetId
  );

  if (!movingPlacement) return requestedStartInches;

  const maxStartInches = Math.max(0, wallLengthInches - movingWidthInches);
  const depthPathToleranceInches = 3;
  const overlapToleranceInches = 0.25;
  const snapToleranceInches = 2;
  const movingTopInches = movingDistanceFromFloorInches + movingHeightInches;

  const samePathObstacles = placements
    .filter((placement) => {
      if (placement.cabinet.id === movingCabinetId) return false;

      if (
        Math.abs(placement.depthFromWallInches - movingPlacement.depthFromWallInches) >
        depthPathToleranceInches
      ) {
        return false;
      }

      const otherTopInches =
        placement.distanceFromFloorInches + placement.heightInches;
      const verticalOverlap =
        Math.min(movingTopInches, otherTopInches) -
        Math.max(movingDistanceFromFloorInches, placement.distanceFromFloorInches);

      return verticalOverlap > overlapToleranceInches;
    })
    .map((placement) => {
      const start = clamp(
        placement.startInches - wallStartOffsetInches,
        0,
        Math.max(0, wallLengthInches - placement.widthInches)
      );

      return {
        start,
        end: start + placement.widthInches,
        center: start + placement.widthInches / 2,
      };
    })
    .sort((left, right) => left.start - right.start);

  let resolvedStart = clamp(requestedStartInches, 0, maxStartInches);

  // First, provide edge snap suggestions when the moving cabinet is close to a
  // same-depth neighbor. This aligns to left/right edges without ever changing
  // the neighbor's position.
  for (const obstacle of samePathObstacles) {
    const snapToLeftOfObstacle = obstacle.start - movingWidthInches;
    const snapToRightOfObstacle = obstacle.end;

    if (
      snapToLeftOfObstacle >= 0 &&
      Math.abs(resolvedStart - snapToLeftOfObstacle) <= snapToleranceInches
    ) {
      resolvedStart = snapToLeftOfObstacle;
      break;
    }

    if (
      snapToRightOfObstacle <= maxStartInches &&
      Math.abs(resolvedStart - snapToRightOfObstacle) <= snapToleranceInches
    ) {
      resolvedStart = snapToRightOfObstacle;
      break;
    }
  }

  const overlapsObstacle = (start: number, obstacle: { start: number; end: number }) => {
    const end = start + movingWidthInches;
    return Math.min(end, obstacle.end) - Math.max(start, obstacle.start) > overlapToleranceInches;
  };

  // If the pointer moves through an occupied same-depth range, place the moving
  // cabinet on the side of that obstacle indicated by the pointer center. This
  // lets users move a pantry cabinet from the right side of a base cabinet to the
  // left side without overlap and without dragging the base cabinet along.
  const requestedCenter = requestedStartInches + movingWidthInches / 2;
  for (let iteration = 0; iteration < samePathObstacles.length + 2; iteration += 1) {
    const blockingObstacle = samePathObstacles.find((obstacle) =>
      overlapsObstacle(resolvedStart, obstacle)
    );

    if (!blockingObstacle) break;

    const leftCandidate = blockingObstacle.start - movingWidthInches;
    const rightCandidate = blockingObstacle.end;
    const preferLeft = requestedCenter <= blockingObstacle.center;
    const primaryCandidate = preferLeft ? leftCandidate : rightCandidate;
    const fallbackCandidate = preferLeft ? rightCandidate : leftCandidate;

    if (primaryCandidate >= 0 && primaryCandidate <= maxStartInches) {
      resolvedStart = primaryCandidate;
    } else if (fallbackCandidate >= 0 && fallbackCandidate <= maxStartInches) {
      resolvedStart = fallbackCandidate;
    } else {
      return null;
    }
  }

  const stillOverlaps = samePathObstacles.some((obstacle) =>
    overlapsObstacle(resolvedStart, obstacle)
  );

  return stillOverlaps ? null : clamp(resolvedStart, 0, maxStartInches);
}

// getCabinetElevationCategory
function getCabinetElevationCategory(cabinetItem: CabinetElement): CabinetCategory {
  if (cabinetItem.category) return cabinetItem.category;

  const widthInches = pixelsToInches(cabinetItem.width);
  const depthInches = pixelsToInches(cabinetItem.depth);

  if (depthInches <= 15) return "wall";
  return "base";
}

// getCabinetFloorVisualLayerPriority
function getCabinetFloorVisualLayerPriority(cabinetItem: Pick<CabinetElement, "category" | "width" | "depth">): number {
  const category = getCabinetElevationCategory(cabinetItem as CabinetElement);
  if (category === "wall") return 30;
  if (category === "pantry") return 20;
  return 10;
}

// getCabinetPreviewFloorVisualLayerPriority
function getCabinetPreviewFloorVisualLayerPriority(preview: CabinetPlacementPreview): number {
  return getCabinetFloorVisualLayerPriority({
    category: preview.category,
    width: preview.width,
    depth: preview.depth,
  });
}

// getCabinetElevationSpec
function getCabinetElevationSpec(cabinetItem: CabinetElement, category: CabinetCategory) {
  // This is the cabinet BODY size only. Accessories like the front-control
  // cooktop are drawn as an add-on block above the cabinet body, so editing
  // cooktopFrontHeightInches never changes/stretches the cabinet itself.
  const supportType = getCabinetSupportType(cabinetItem);
  const defaultHeightInches =
    category === "pantry" ? 84 : category === "wall" ? 30 : 36;
  const heightInches = cabinetItem.heightInches ?? defaultHeightInches;

  if (supportType === "floor-supported") {
    return {
      heightInches,
      distanceFromFloorInches: 0,
    };
  }

  if (cabinetItem.heightInches !== undefined || cabinetItem.distanceFromFloorInches !== undefined) {
    return {
      heightInches,
      distanceFromFloorInches: cabinetItem.distanceFromFloorInches ?? (category === "wall" ? 54 : 0),
    };
  }

  if (category === "pantry") {
    return {
      heightInches,
      distanceFromFloorInches: 0,
    };
  }

  if (category === "wall") {
    return {
      heightInches,
      distanceFromFloorInches: 54,
    };
  }

  return {
    heightInches,
    distanceFromFloorInches: 0,
  };
}

function getCabinetTopAccessoryExtraHeightInches(cabinetItem: CabinetElement) {
  const category = getCabinetElevationCategory(cabinetItem);
  const image = cabinetItem.image ?? getDefaultCabinetImageForCategory(category);

  if (
    category === "base" &&
    cabinetItem.cooktopFixture === "front" &&
    !isProductCabinetImage(image)
  ) {
    return Math.max(1, cabinetItem.cooktopFrontHeightInches ?? 6);
  }

  return 0;
}

type ElevationCornerReservationSeverity = "taken" | "caution";

type ElevationCornerReservation = {
  key: string;
  sourceCabinet: CabinetElement;
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

function getCabinetDisplayTitle(cabinetItem: CabinetElement) {
  const catalogMatch = getCabinetCatalogItemByIdentity(cabinetItem);
  if (catalogMatch?.title) return catalogMatch.title;

  if (cabinetItem.image) {
    return cabinetItem.image
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const category = getCabinetElevationCategory(cabinetItem);
  return category === "wall" ? "Wall cabinet" : category === "pantry" ? "Pantry cabinet" : "Base cabinet";
}

function isLShapedCornerCabinet(cabinetItem: Partial<Pick<CabinetElement, "image" | "category">>) {
  return getCabinetImage(cabinetItem) === "base-corner";
}

function getCabinetPlanBodyPolygon(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "image" | "category">>
): Point[] {
  const radians = degreesToRadians(cabinetItem.rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const halfWidth = cabinetItem.width / 2;
  const halfDepth = cabinetItem.depth / 2;
  const left = -halfWidth;
  const right = halfWidth;
  const top = -halfDepth;
  const bottom = halfDepth;
  const image = getCabinetImage(cabinetItem);
  const localPoints = image === "base-corner"
    ? [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left + cabinetItem.width * 0.48, y: bottom },
        { x: left + cabinetItem.width * 0.48, y: top + cabinetItem.depth * 0.54 },
        { x: left, y: top + cabinetItem.depth * 0.54 },
      ]
    : [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];

  return localPoints.map((point) => ({
    x: cabinetItem.center.x + point.x * cosValue - point.y * sinValue,
    y: cabinetItem.center.y + point.x * sinValue + point.y * cosValue,
  }));
}

function rangesOverlapOrTouchInches(firstStart: number, firstEnd: number, secondStart: number, secondEnd: number, tolerance = 0) {
  return firstStart <= secondEnd + tolerance && secondStart <= firstEnd + tolerance;
}

function getCabinetAttachedWallForElevationFootprint(
  cabinetItem: CabinetElement,
  walls: Wall[],
  attachmentTolerance: number
): Wall | null {
  if (cabinetItem.wallId) {
    return walls.find((candidateWall) => candidateWall.id === cabinetItem.wallId) ?? null;
  }

  return getBestCabinetWallAttachment(cabinetItem, walls, attachmentTolerance)?.wall ?? null;
}

function getCoveredSameWallCornerCabinetIdsForElevation(
  wall: Wall,
  cabinets: CabinetElement[],
  walls: Wall[]
): Set<string> {
  const coveredIds = new Set<string>();
  const axis = getElevationWallAxis(wall);
  if (axis.length < 0.001) return coveredIds;

  const thickWalls = walls.filter(isThickWall);
  const attachmentTolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8);
  const sharedEndpointTolerance = Math.max(2, WALL_THICKNESS + 4);
  const cornerTouchTolerancePixels = Math.max(inchesToPixels(3), WALL_THICKNESS + 8);
  const bodyTouchTolerancePixels = Math.max(2, inchesToPixels(0.75));
  const elevationOverlapToleranceInches = 1.5;
  const perpendicularTolerance = 0.12;

  cabinets.forEach((cornerCabinet) => {
    if (!isLShapedCornerCabinet(cornerCabinet)) return;

    const cornerAttachedWall = getCabinetAttachedWallForElevationFootprint(
      cornerCabinet,
      thickWalls,
      attachmentTolerance
    );
    if (!cornerAttachedWall || cornerAttachedWall.id !== wall.id) return;

    const cornerPlacement = getCabinetElevationPlacementsForWall(wall, [cornerCabinet], thickWalls)[0] ?? null;
    if (!cornerPlacement) return;

    const cornerStart = cornerPlacement.startInches;
    const cornerEnd = cornerPlacement.startInches + cornerPlacement.widthInches;
    const touchesStartBoundary = cornerStart <= pixelsToInches(cornerTouchTolerancePixels);
    const touchesEndBoundary = pixelsToInches(axis.length) - cornerEnd <= pixelsToInches(cornerTouchTolerancePixels);
    if (!touchesStartBoundary && !touchesEndBoundary) return;

    const cornerPolygon = getCabinetPlanBodyPolygon(cornerCabinet);

    const hasCoveringBaseCabinet = cabinets.some((otherCabinet) => {
      if (otherCabinet.id === cornerCabinet.id) return false;
      if (isLShapedCornerCabinet(otherCabinet)) return false;
      if (getCabinetElevationCategory(otherCabinet) === "wall") return false;

      const otherAttachedWall = getCabinetAttachedWallForElevationFootprint(
        otherCabinet,
        thickWalls,
        attachmentTolerance
      );
      if (!otherAttachedWall) return false;

      if (otherAttachedWall.id === wall.id) {
        const otherPlacement = getCabinetElevationPlacementsForWall(wall, [otherCabinet], thickWalls)[0] ?? null;
        if (!otherPlacement) return false;

        const otherStart = otherPlacement.startInches;
        const otherEnd = otherPlacement.startInches + otherPlacement.widthInches;
        const touchesCornerInElevation = rangesOverlapOrTouchInches(
          cornerStart,
          cornerEnd,
          otherStart,
          otherEnd,
          elevationOverlapToleranceInches
        );
        if (!touchesCornerInElevation) return false;

        return polygonsOverlapForCabinetBlocking(
          cornerPolygon,
          getCabinetPlanBodyPolygon(otherCabinet)
        ) || Math.max(
          getCabinetPlanOccupiedBounds(cornerCabinet).minX - getCabinetPlanOccupiedBounds(otherCabinet).maxX,
          getCabinetPlanOccupiedBounds(otherCabinet).minX - getCabinetPlanOccupiedBounds(cornerCabinet).maxX,
          getCabinetPlanOccupiedBounds(cornerCabinet).minY - getCabinetPlanOccupiedBounds(otherCabinet).maxY,
          getCabinetPlanOccupiedBounds(otherCabinet).minY - getCabinetPlanOccupiedBounds(cornerCabinet).maxY,
          0
        ) <= bodyTouchTolerancePixels;
      }

      const sharedEndpoint = getSharedWallEndpoint(wall, otherAttachedWall, sharedEndpointTolerance);
      if (!sharedEndpoint) return false;

      const otherAxis = getElevationWallAxis(otherAttachedWall);
      if (otherAxis.length < 0.001) return false;
      const parallelAmount = Math.abs(dot(axis.direction, otherAxis.direction));
      if (parallelAmount > perpendicularTolerance) return false;

      const cornerRangeOnActiveWall = cabinetProjectionRangeRelativeToWallAxis(cornerCabinet, axis);
      const sharedScalarOnActiveWall = dot(sub(sharedEndpoint, axis.start), axis.direction);
      const cornerReachesSharedEndpoint = Math.max(
        cornerRangeOnActiveWall.min - sharedScalarOnActiveWall,
        sharedScalarOnActiveWall - cornerRangeOnActiveWall.max,
        0
      ) <= cornerTouchTolerancePixels;
      if (!cornerReachesSharedEndpoint) return false;

      const otherRangeOnAttachedWall = cabinetProjectionRangeRelativeToWallAxis(otherCabinet, otherAxis);
      const sharedScalarOnAttachedWall = dot(sub(sharedEndpoint, otherAxis.start), otherAxis.direction);
      const otherReachesSharedEndpoint = Math.max(
        otherRangeOnAttachedWall.min - sharedScalarOnAttachedWall,
        sharedScalarOnAttachedWall - otherRangeOnAttachedWall.max,
        0
      ) <= Math.max(cornerTouchTolerancePixels, Math.max(cornerCabinet.width, cornerCabinet.depth));

      if (!otherReachesSharedEndpoint) return false;

      return polygonsOverlapForCabinetBlocking(
        cornerPolygon,
        getCabinetPlanBodyPolygon(otherCabinet)
      ) || Math.max(
        getCabinetPlanOccupiedBounds(cornerCabinet).minX - getCabinetPlanOccupiedBounds(otherCabinet).maxX,
        getCabinetPlanOccupiedBounds(otherCabinet).minX - getCabinetPlanOccupiedBounds(cornerCabinet).maxX,
        getCabinetPlanOccupiedBounds(cornerCabinet).minY - getCabinetPlanOccupiedBounds(otherCabinet).maxY,
        getCabinetPlanOccupiedBounds(otherCabinet).minY - getCabinetPlanOccupiedBounds(cornerCabinet).maxY,
        0
      ) <= bodyTouchTolerancePixels;
    });

    if (hasCoveringBaseCabinet) {
      coveredIds.add(cornerCabinet.id);
    }
  });

  return coveredIds;
}

function wallsShareEndpoint(firstWall: Wall, secondWall: Wall, tolerance = 2) {
  return [firstWall.start, firstWall.end].some((firstPoint) =>
    [secondWall.start, secondWall.end].some((secondPoint) =>
      distance(firstPoint, secondPoint) <= tolerance
    )
  );
}

function getSharedWallEndpoint(firstWall: Wall, secondWall: Wall, tolerance = 2): Point | null {
  for (const firstPoint of [firstWall.start, firstWall.end]) {
    for (const secondPoint of [secondWall.start, secondWall.end]) {
      if (distance(firstPoint, secondPoint) <= tolerance) {
        return {
          x: (firstPoint.x + secondPoint.x) / 2,
          y: (firstPoint.y + secondPoint.y) / 2,
        };
      }
    }
  }

  return null;
}

function getReservationBoundaryForWall(
  reservation: Pick<ElevationCornerReservation, "startInches" | "widthInches" | "boundary">,
  wallLengthInches: number
): "start" | "end" {
  if (reservation.boundary) return reservation.boundary;

  const endInches = reservation.startInches + reservation.widthInches;
  return reservation.startInches <= wallLengthInches - endInches ? "start" : "end";
}

function getReservationBoundaryDistanceInches(
  reservation: Pick<ElevationCornerReservation, "startInches" | "widthInches" | "boundary" | "boundaryDistanceInches">,
  wallLengthInches: number
): number {
  if (reservation.boundaryDistanceInches !== undefined) {
    return reservation.boundaryDistanceInches;
  }

  const boundary = getReservationBoundaryForWall(reservation, wallLengthInches);
  return boundary === "start"
    ? reservation.startInches
    : Math.max(0, wallLengthInches - (reservation.startInches + reservation.widthInches));
}

function compareElevationCornerReservations(
  left: ElevationCornerReservation,
  right: ElevationCornerReservation,
  wallLengthInches: number
): number {
  const leftWallFaceGap = left.wallFaceGapPixels ?? 0;
  const rightWallFaceGap = right.wallFaceGapPixels ?? 0;
  if (Math.abs(leftWallFaceGap - rightWallFaceGap) > 0.001) {
    return leftWallFaceGap - rightWallFaceGap;
  }

  const leftSharedCornerDistance = left.distanceToSharedCornerPixels ?? inchesToPixels(
    getReservationBoundaryDistanceInches(left, wallLengthInches)
  );
  const rightSharedCornerDistance = right.distanceToSharedCornerPixels ?? inchesToPixels(
    getReservationBoundaryDistanceInches(right, wallLengthInches)
  );
  if (Math.abs(leftSharedCornerDistance - rightSharedCornerDistance) > 0.001) {
    return leftSharedCornerDistance - rightSharedCornerDistance;
  }

  const leftBoundaryDistance = getReservationBoundaryDistanceInches(left, wallLengthInches);
  const rightBoundaryDistance = getReservationBoundaryDistanceInches(right, wallLengthInches);
  if (Math.abs(leftBoundaryDistance - rightBoundaryDistance) > 0.001) {
    return leftBoundaryDistance - rightBoundaryDistance;
  }

  const leftCoveredCorner = left.coveredSameWallCorner ? 0 : 1;
  const rightCoveredCorner = right.coveredSameWallCorner ? 0 : 1;
  if (leftCoveredCorner !== rightCoveredCorner) {
    return leftCoveredCorner - rightCoveredCorner;
  }

  const leftIsCorner = isLShapedCornerCabinet(left.sourceCabinet) ? 0 : 1;
  const rightIsCorner = isLShapedCornerCabinet(right.sourceCabinet) ? 0 : 1;
  if (leftIsCorner !== rightIsCorner) {
    return leftIsCorner - rightIsCorner;
  }

  return right.widthInches - left.widthInches;
}

function dedupeElevationCornerReservationsByClosestCabinet(
  reservations: ElevationCornerReservation[],
  wallLengthInches: number
): ElevationCornerReservation[] {
  const verticalOverlapToleranceInches = 1;
  const boundaryClusterToleranceInches = Math.max(6, pixelsToInches(WALL_THICKNESS) + 2);
  const groups: ElevationCornerReservation[][] = [];

  reservations.forEach((reservation) => {
    const boundary = getReservationBoundaryForWall(reservation, wallLengthInches);
    const bottom = reservation.distanceFromFloorInches;
    const top = reservation.distanceFromFloorInches + reservation.heightInches;
    const boundaryDistance = getReservationBoundaryDistanceInches(reservation, wallLengthInches);

    const group = groups.find((existingGroup) => {
      const existing = existingGroup[0];
      const existingBoundary = getReservationBoundaryForWall(existing, wallLengthInches);
      if (existingBoundary !== boundary) return false;

      const existingBottom = existing.distanceFromFloorInches;
      const existingTop = existing.distanceFromFloorInches + existing.heightInches;
      const overlapsVertically = rangesOverlapOrTouchInches(
        bottom,
        top,
        existingBottom,
        existingTop,
        verticalOverlapToleranceInches
      );
      if (!overlapsVertically) return false;

      const existingBoundaryDistance = getReservationBoundaryDistanceInches(existing, wallLengthInches);
      return Math.min(boundaryDistance, existingBoundaryDistance) <= boundaryClusterToleranceInches;
    });

    if (group) {
      group.push(reservation);
    } else {
      groups.push([reservation]);
    }
  });

  return groups.map((group) =>
    [...group].sort((left, right) => compareElevationCornerReservations(left, right, wallLengthInches))[0]
  );
}

function getElevationCornerReservationsForWall(
  wall: Wall,
  cabinets: CabinetElement[],
  walls: Wall[],
  coveredSameWallCornerCabinetIds: Set<string> = new Set()
): ElevationCornerReservation[] {
  const axis = getElevationWallAxis(wall);
  const wallInteriorSpan = getElevationWallInteriorSpan(wall, walls);
  const wallStartOffsetInches = pixelsToInches(wallInteriorSpan.startScalar);
  const wallLengthInches = pixelsToInches(wallInteriorSpan.length);
  if (axis.length < 0.001 || wallLengthInches <= 0.001) return [];

  const thickWalls = walls.filter(isThickWall);
  const perpendicularTolerance = 0.12;
  const boundaryToleranceInches = Math.max(2, pixelsToInches(WALL_THICKNESS) + 1);
  const touchTolerancePixels = Math.max(1.5, inchesToPixels(0.75));
  const attachmentTolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8);
  const sharedEndpointTolerance = Math.max(2, WALL_THICKNESS + 4);

  type ReservationCandidate = ElevationCornerReservation & {
    attachedWallId: string;
    boundary: "start" | "end";
    distanceToSharedCornerPixels: number;
    boundaryDistanceInches: number;
    projectedWidthInches: number;
  };

  const candidates: ReservationCandidate[] = [];

  thickWalls.forEach((attachedWall) => {
    if (attachedWall.id === wall.id) return;

    const sharedEndpoint = getSharedWallEndpoint(wall, attachedWall, sharedEndpointTolerance);
    if (!sharedEndpoint) return;

    const attachedAxis = getElevationWallAxis(attachedWall);
    if (attachedAxis.length < 0.001) return;

    const parallelAmount = Math.abs(dot(axis.direction, attachedAxis.direction));
    if (parallelAmount > perpendicularTolerance) return;

    const sharedScalarOnWall = dot(sub(sharedEndpoint, axis.start), axis.direction);
    const sharedInchesOnWall = clamp(
      pixelsToInches(sharedScalarOnWall) - wallStartOffsetInches,
      0,
      wallLengthInches
    );
    const boundary: "start" | "end" =
      sharedInchesOnWall <= wallLengthInches - sharedInchesOnWall ? "start" : "end";

    const sharedScalarOnAttachedWall = dot(
      sub(sharedEndpoint, attachedAxis.start),
      attachedAxis.direction
    );

    cabinets.forEach((cabinetItem) => {
      // A footprint on this elevation represents the cabinet face/depth that is
      // occupied by a cabinet on the perpendicular, connected wall. Cabinets
      // already attached to the active wall are drawn normally, not as a
      // footprint. For legacy cabinets without wallId, infer the best wall the
      // same way the elevation placement code does.
      if (cabinetItem.wallId === wall.id) return;

      const cabinetAttachedWall = cabinetItem.wallId
        ? thickWalls.find((candidateWall) => candidateWall.id === cabinetItem.wallId) ?? null
        : getBestCabinetWallAttachment(cabinetItem, thickWalls, attachmentTolerance)?.wall ?? null;

      if (!cabinetAttachedWall || cabinetAttachedWall.id !== attachedWall.id) return;

      const axisRange = cabinetProjectionRangeRelativeToWallAxis(cabinetItem, axis);
      const rawStartInches = pixelsToInches(axisRange.min) - wallStartOffsetInches;
      const rawEndInches = pixelsToInches(axisRange.max) - wallStartOffsetInches;
      const projectedStartInches = clamp(rawStartInches, 0, wallLengthInches);
      const projectedEndInches = clamp(rawEndInches, 0, wallLengthInches);
      const projectedWidthInches = projectedEndInches - projectedStartInches;
      if (projectedWidthInches <= 0.5) return;

      const boundaryDistanceInches = boundary === "start"
        ? projectedStartInches
        : wallLengthInches - projectedEndInches;

      // Only use cabinets whose perpendicular projection actually reaches the
      // shared corner of this elevation wall. This prevents a cabinet farther
      // down the same perpendicular wall from leaving a stale footprint on the
      // wrong elevation.
      if (boundaryDistanceInches > boundaryToleranceInches) return;

      const attachedRange = cabinetProjectionRangeRelativeToWallAxis(cabinetItem, attachedAxis);
      const distanceToSharedCornerPixels = Math.max(
        attachedRange.min - sharedScalarOnAttachedWall,
        sharedScalarOnAttachedWall - attachedRange.max,
        0
      );

      const cabinetCorners = getRotatedRectCorners(
        cabinetItem.center,
        cabinetItem.width,
        cabinetItem.depth,
        cabinetItem.rotation
      );
      const normalValues = cabinetCorners.map((corner) =>
        dot(sub(corner, axis.start), axis.normal)
      );
      const normalMin = Math.min(...normalValues);
      const normalMax = Math.max(...normalValues);
      const nearestDistanceToWallCenterline = normalMin <= 0 && normalMax >= 0
        ? 0
        : Math.min(Math.abs(normalMin), Math.abs(normalMax));
      const gapToWallFace = Math.max(0, nearestDistanceToWallCenterline - WALL_THICKNESS / 2);
      const severity: ElevationCornerReservationSeverity = gapToWallFace <= touchTolerancePixels
        ? "taken"
        : "caution";

      const category = getCabinetElevationCategory(cabinetItem);
      const spec = getCabinetElevationSpec(cabinetItem, category);
      const startInches = boundary === "start"
        ? 0
        : Math.max(0, wallLengthInches - projectedWidthInches);

      candidates.push({
        key: `corner-reservation-${wall.id}-${attachedWall.id}-${boundary}-${cabinetItem.id}`,
        sourceCabinet: cabinetItem,
        title: getCabinetDisplayTitle(cabinetItem),
        severity,
        startInches,
        widthInches: projectedWidthInches,
        heightInches: spec.heightInches,
        distanceFromFloorInches: spec.distanceFromFloorInches,
        boundary,
        boundaryDistanceInches,
        distanceToSharedCornerPixels,
        wallFaceGapPixels: gapToWallFace,
        attachedWallId: attachedWall.id,
        projectedWidthInches,
      });
    });
  });

  // Keep separate reservations for distinct vertical bands on the same attached
  // wall/boundary pair. A wall blind and a base blind at the same corner should
  // both show their taken areas on the neighboring elevation instead of one
  // suppressing the other before vertical dedupe happens.
  const perpendicularReservations = [...candidates]
    .sort((left, right) => {
      if (left.attachedWallId !== right.attachedWallId) {
        return left.attachedWallId.localeCompare(right.attachedWallId);
      }
      if (left.boundary !== right.boundary) return left.boundary === "start" ? -1 : 1;
      if (Math.abs(left.distanceFromFloorInches - right.distanceFromFloorInches) > 0.001) {
        return left.distanceFromFloorInches - right.distanceFromFloorInches;
      }
      if (Math.abs(left.distanceToSharedCornerPixels - right.distanceToSharedCornerPixels) > 0.001) {
        return left.distanceToSharedCornerPixels - right.distanceToSharedCornerPixels;
      }
      return left.startInches - right.startInches;
    })
    .map(({ attachedWallId, projectedWidthInches, ...reservation }) => reservation);

  const sameWallCoveredCornerReservations = cabinets
    .filter((cabinetItem) => coveredSameWallCornerCabinetIds.has(cabinetItem.id))
    .map((cabinetItem): ElevationCornerReservation | null => {
      const placement = getCabinetElevationPlacementsForWall(wall, [cabinetItem], thickWalls)[0] ?? null;
      if (!placement) return null;

      const relativeStartInches = clamp(
        placement.startInches - wallStartOffsetInches,
        0,
        Math.max(0, wallLengthInches - placement.widthInches)
      );

      const coveredBoundary = getReservationBoundaryForWall(
        { startInches: relativeStartInches, widthInches: placement.widthInches },
        wallLengthInches
      );

      return {
        key: `covered-corner-reservation-${wall.id}-${cabinetItem.id}`,
        sourceCabinet: cabinetItem,
        title: getCabinetDisplayTitle(cabinetItem),
        severity: "taken",
        startInches: relativeStartInches,
        widthInches: placement.widthInches,
        heightInches: placement.heightInches,
        distanceFromFloorInches: placement.distanceFromFloorInches,
        boundary: coveredBoundary,
        boundaryDistanceInches: coveredBoundary === "start"
          ? relativeStartInches
          : Math.max(0, wallLengthInches - (relativeStartInches + placement.widthInches)),
        distanceToSharedCornerPixels: 0,
        wallFaceGapPixels: 0,
        coveredSameWallCorner: true,
      };
    })
    .filter((reservation): reservation is ElevationCornerReservation => Boolean(reservation));

  return dedupeElevationCornerReservationsByClosestCabinet(
    [...perpendicularReservations, ...sameWallCoveredCornerReservations].map(
      (reservation) => {
        const displayStartInches = getElevationDisplayStartInches(
          wall,
          wallLengthInches,
          reservation.startInches,
          reservation.widthInches,
          thickWalls
        );
        const boundary = getReservationBoundaryForWall(
          {
            startInches: displayStartInches,
            widthInches: reservation.widthInches,
          },
          wallLengthInches
        );

        return {
          ...reservation,
          startInches: displayStartInches,
          boundary,
          boundaryDistanceInches:
            boundary === "start"
              ? displayStartInches
              : Math.max(
                  0,
                  wallLengthInches -
                    (displayStartInches + reservation.widthInches)
                ),
        };
      }
    ),
    wallLengthInches
  ).sort((left, right) => left.startInches - right.startInches);
}


function ElevationPlanView({
  walls,
  allWalls,
  windows,
  doors,
  cabinets,
  selectedWindowId,
  selectedDoorId,
  selectedCabinetId,
  selectedWallId,
  activeIndex,
  showMeasurements,
  onSelectWindow,
  onSelectDoor,
  onSelectCabinet,
  onSelectWall,
  onUpdateWindow,
  onUpdateDoor,
  onUpdateCabinet,
  onUpdateWall,
  onAlert,
  onClearSelection,
  onPrevious,
  onNext,
}: {
  walls: Wall[];
  allWalls?: Wall[];
  windows: WindowElement[];
  doors: DoorElement[];
  cabinets: CabinetElement[];
  selectedWindowId: string | null;
  selectedDoorId: string | null;
  selectedCabinetId: string | null;
  selectedWallId: string | null;
  activeIndex: number;
  showMeasurements: boolean;
  onSelectWindow: (id: string) => void;
  onSelectDoor: (id: string) => void;
  onSelectCabinet: (id: string) => void;
  onSelectWall: (id: string) => void;
  onUpdateWindow: (
    id: string,
    updates: Partial<Pick<WindowElement, "t" | "distanceFromFloorInches">>
  ) => void;
  onUpdateDoor: (
    id: string,
    updates: Partial<Pick<DoorElement, "t" | "distanceFromFloorInches">>
  ) => void;
  onUpdateCabinet: (
    id: string,
    updates: Partial<Pick<CabinetElement, "center" | "distanceFromFloorInches">>
  ) => void;
  onUpdateWall: (
    id: string,
    updates: Partial<Pick<Wall, "start" | "end">>
  ) => void;
  onAlert: (message: string, title?: string) => void;
  onClearSelection: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const elevationDragRef = useRef<ElevationDragState | null>(null);
  const elevationDragAlertRef = useRef<string | null>(null);
  const elevationInvalidCabinetDragRef = useRef<{ id: string; message: string } | null>(null);
  const [isElevationDragging, setIsElevationDragging] = useState(false);
  const [elevationAlignmentGuides, setElevationAlignmentGuides] = useState<ElevationAlignmentGuide[]>([]);
  const [elevationInvalidCabinetDrag, setElevationInvalidCabinetDrag] = useState<{ id: string; message: string } | null>(null);
  const measurementDisplayUnit = useMeasurementDisplayUnit();

  const updateElevationInvalidCabinetDrag = (state: { id: string; message: string } | null) => {
    elevationInvalidCabinetDragRef.current = state;
    setElevationInvalidCabinetDrag(state);
  };

  if (walls.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f5f5f5]">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-pelican-navy">Elevation plan</h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Draw or generate at least one thick wall in the floor plan first, then switch back to Elevation plan to browse each wall side.
          </p>
        </div>
      </div>
    );
  }

  const calculationWalls = allWalls ?? walls;
  const elevationStructureWalls = calculationWalls.filter((candidateWall) => !isDetachedPanelWall(candidateWall));
  const wall = walls[activeIndex] ?? walls[0];
  const currentElevationViewMode = getWallElevationViewMode(wall);
  const isPeninElevationWall = isDetachedPanelWall(wall);
  const peninElevationSegment = isPeninElevationWall
    ? getPeninWallVisibleSegment(wall, elevationStructureWalls)
    : null;
  const elevationWallForMeasurement = peninElevationSegment
    ? { ...wall, start: peninElevationSegment.start, end: peninElevationSegment.end }
    : wall;
  const wallWindows = windows
    .filter((windowItem) => windowItem.wallId === wall.id)
    .sort(
      (left, right) =>
        getElevationWallElementCenterInches(wall, left.t) -
        getElevationWallElementCenterInches(wall, right.t)
    );
  const wallDoors = doors
    .filter((doorItem) => doorItem.wallId === wall.id)
    .sort(
      (left, right) =>
        getElevationWallElementCenterInches(wall, left.t) -
        getElevationWallElementCenterInches(wall, right.t)
    );
  const coveredSameWallCornerCabinetIds = getCoveredSameWallCornerCabinetIdsForElevation(
    wall,
    cabinets,
    elevationStructureWalls
  );
  const wallCabinets = getCabinetElevationPlacementsForWall(wall, cabinets, elevationStructureWalls)
    .filter((placement) => !coveredSameWallCornerCabinetIds.has(placement.cabinet.id));

  const elevationWallAxis = getElevationWallAxis(elevationWallForMeasurement);
  const elevationWallInteriorSpan = isPeninElevationWall
    ? {
        startScalar: 0,
        endScalar: elevationWallAxis.length,
        length: elevationWallAxis.length,
        startAnchor: elevationWallAxis.start,
        endAnchor: elevationWallAxis.end,
      }
    : getElevationWallInteriorSpan(wall, elevationStructureWalls, cabinets);
  const wallStartOffsetInches = pixelsToInches(elevationWallInteriorSpan.startScalar);
  const wallLengthInches = pixelsToInches(elevationWallInteriorSpan.length);
  const wallHeightInches = DEFAULT_ELEVATION_WALL_HEIGHT_INCHES;
  const drawingWidth = ELEVATION_VIEWBOX_WIDTH - 220;
  const drawingHeight = ELEVATION_VIEWBOX_HEIGHT - 260;
  const renderScale = Math.min(
    drawingWidth / Math.max(wallLengthInches, 1),
    drawingHeight / wallHeightInches
  );
  const wallRenderWidth = wallLengthInches * renderScale;
  const wallRenderHeight = wallHeightInches * renderScale;
  const wallLeft = (ELEVATION_VIEWBOX_WIDTH - wallRenderWidth) / 2;
  const wallRight = wallLeft + wallRenderWidth;
  const wallTop = 190;
  const wallBottom = wallTop + wallRenderHeight;
  const toElevationDisplayStartInches = (startInches: number, widthInches: number) =>
    getElevationDisplayStartInches(
      wall,
      wallLengthInches,
      startInches,
      widthInches,
      elevationStructureWalls
    );
  const toCabinetDisplayStartInches = toElevationDisplayStartInches;
  const toCabinetActualStartInches = (
    displayStartInches: number,
    widthInches: number
  ) =>
    getElevationActualStartInches(
      wall,
      wallLengthInches,
      displayStartInches,
      widthInches,
      elevationStructureWalls
    );
  const toElevationActualCenterInches = (
    displayCenterInches: number,
    widthInches: number
  ) =>
    toCabinetActualStartInches(
      displayCenterInches - widthInches / 2,
      widthInches
    ) +
    widthInches / 2;
  const overallLengthLabel = formatMeasurementFromInches(wallLengthInches, measurementDisplayUnit);
  const overallHeightLabel = formatMeasurementFromInches(wallHeightInches, measurementDisplayUnit);

  const cabinetRenderItems = wallCabinets.map((cabinetPlacement) => {
    const relativeStartInches = clamp(
      cabinetPlacement.startInches - wallStartOffsetInches,
      0,
      Math.max(0, wallLengthInches - cabinetPlacement.widthInches)
    );
    const width = cabinetPlacement.widthInches * renderScale;
    const height = cabinetPlacement.heightInches * renderScale;
    // Elevation view is an orthographic projection onto the selected wall.
    // Preserve the cabinet's floor-plan distance from the wall in data, but do
    // not shift the drawing sideways because that makes cabinets that touch in
    // floor plan look separated in elevation and misaligns their width guides.
    const depthVisualOffsetInches = 0;
    const depthShiftXInches = 0;
    const displayStartInches = toCabinetDisplayStartInches(
      relativeStartInches,
      cabinetPlacement.widthInches
    );
    const boundedDistanceFromFloorInches = clamp(
      cabinetPlacement.distanceFromFloorInches,
      0,
      Math.max(0, wallHeightInches - cabinetPlacement.heightInches)
    );
    const left = wallLeft + displayStartInches * renderScale;
    const boundedBottom = wallBottom - boundedDistanceFromFloorInches * renderScale;
    const top = boundedBottom - height;

    return {
      key: cabinetPlacement.cabinet.id,
      type: 'cabinet' as const,
      placement: cabinetPlacement,
      relativeStartInches,
      displayStartInches,
      dimensionLeft: left,
      dimensionRight: left + width,
      left,
      right: left + width,
      width,
      top,
      bottom: boundedBottom,
      height,
      depthShiftXInches,
      depthVisualOffsetInches,
    };
  });

  const selfPeninWallRenderItem = isPeninElevationWall
    ? {
        key: `penin-wall-self-elevation-${wall.id}`,
        left: wallLeft,
        right: wallRight,
        width: wallRenderWidth,
        height: PENIN_WALL_ELEVATION_HEIGHT_INCHES * renderScale,
        top: wallBottom - PENIN_WALL_ELEVATION_HEIGHT_INCHES * renderScale,
        bottom: wallBottom,
      }
    : null;

  const peninWallRenderItems = getPeninWallElevationPlacementsForWall(wall, calculationWalls).map((placement) => {
    const relativeStartInches = clamp(
      placement.startInches - wallStartOffsetInches,
      0,
      Math.max(0, wallLengthInches - placement.widthInches)
    );
    const displayStartInches = toElevationDisplayStartInches(
      relativeStartInches,
      placement.widthInches
    );
    const width = placement.widthInches * renderScale;
    const height = placement.heightInches * renderScale;
    const left = wallLeft + displayStartInches * renderScale;
    const bottom = wallBottom - placement.distanceFromFloorInches * renderScale;
    const top = bottom - height;

    return {
      key: `penin-wall-elevation-${placement.wall.id}`,
      placement,
      left,
      right: left + width,
      width,
      top,
      bottom,
      height,
    };
  });

  const elevationCornerReservations = getElevationCornerReservationsForWall(
    wall,
    cabinets,
    elevationStructureWalls,
    coveredSameWallCornerCabinetIds
  );
  const reservationRenderItems = elevationCornerReservations.map((reservation) => {
    const clampedStartInches = clamp(
      reservation.startInches,
      0,
      Math.max(0, wallLengthInches - reservation.widthInches)
    );
    const width = reservation.widthInches * renderScale;
    const height = reservation.heightInches * renderScale;
    const left = wallLeft + clampedStartInches * renderScale;
    const bottom = wallBottom - reservation.distanceFromFloorInches * renderScale;
    const top = bottom - height;

    return {
      key: reservation.key,
      type: 'reservation' as const,
      reservation,
      displayStartInches: clampedStartInches,
      left,
      right: left + width,
      width,
      top,
      bottom,
      height,
    };
  });

  const cabinetBodyItems = [...cabinetRenderItems].sort((left, right) => {
    if (left.placement.depthFromWallInches !== right.placement.depthFromWallInches) {
      return left.placement.depthFromWallInches - right.placement.depthFromWallInches;
    }

    if (left.placement.distanceFromFloorInches !== right.placement.distanceFromFloorInches) {
      return left.placement.distanceFromFloorInches - right.placement.distanceFromFloorInches;
    }

    return left.placement.startInches - right.placement.startInches;
  });
  const cabinetDrawItems = [...cabinetBodyItems].sort((left, right) => {
    const leftSelected = left.key === selectedCabinetId;
    const rightSelected = right.key === selectedCabinetId;
    if (leftSelected !== rightSelected) return leftSelected ? 1 : -1;
    return 0;
  });

  const windowRenderItems = wallWindows.map((windowItem) => {
    const actualLayout = getElevationOpeningLayoutFromCenter(
      wallLengthInches,
      windowItem.width,
      getElevationWallElementCenterInches(wall, windowItem.t) - wallStartOffsetInches
    );
    const displayStartInches = toElevationDisplayStartInches(
      actualLayout.startInches,
      actualLayout.widthInches
    );
    const layout = {
      ...actualLayout,
      startInches: displayStartInches,
      centerInches: displayStartInches + actualLayout.widthInches / 2,
    };
    const width = layout.widthInches * renderScale;
    const height = windowItem.heightInches * renderScale;
    const left = wallLeft + layout.startInches * renderScale;
    const top = wallBottom - (windowItem.distanceFromFloorInches + windowItem.heightInches) * renderScale;
    const sillY = wallBottom - windowItem.distanceFromFloorInches * renderScale;

    return {
      key: windowItem.id,
      type: 'window' as const,
      windowItem,
      layout,
      left,
      right: left + width,
      width,
      top,
      bottom: sillY,
      height,
    };
  });

  const doorRenderItems = wallDoors.map((doorItem) => {
    const actualLayout = getElevationOpeningLayoutFromCenter(
      wallLengthInches,
      doorItem.width,
      getElevationWallElementCenterInches(wall, doorItem.t) - wallStartOffsetInches
    );
    const displayStartInches = toElevationDisplayStartInches(
      actualLayout.startInches,
      actualLayout.widthInches
    );
    const layout = {
      ...actualLayout,
      startInches: displayStartInches,
      centerInches: displayStartInches + actualLayout.widthInches / 2,
    };
    const width = layout.widthInches * renderScale;
    const height = doorItem.heightInches * renderScale;
    const left = wallLeft + layout.startInches * renderScale;
    const top = wallBottom - (doorItem.distanceFromFloorInches + doorItem.heightInches) * renderScale;

    return {
      key: doorItem.id,
      type: 'door' as const,
      doorItem,
      layout,
      left,
      right: left + width,
      width,
      top,
      bottom: wallBottom - doorItem.distanceFromFloorInches * renderScale,
      height,
    };
  });

  const toElevationObjectBox = (item: { key: string; left: number; right: number; top: number; bottom: number }): ElevationObjectBox => ({
    key: item.key,
    left: item.left,
    right: item.right,
    top: item.top,
    bottom: item.bottom,
    centerX: (item.left + item.right) / 2,
    centerY: (item.top + item.bottom) / 2,
  });

  const elevationObjectBoxes: ElevationObjectBox[] = [
    ...cabinetRenderItems.map(toElevationObjectBox),
    ...reservationRenderItems.map(toElevationObjectBox),
    ...windowRenderItems.map(toElevationObjectBox),
    ...doorRenderItems.map(toElevationObjectBox),
  ];

  const rangesOverlapOrTouch = (minA: number, maxA: number, minB: number, maxB: number, tolerance = 0) =>
    minA <= maxB + tolerance && minB <= maxA + tolerance;

  const getElevationAlignmentGuidesForBox = (movingBox: ElevationObjectBox, movingKey: string): ElevationAlignmentGuide[] => {
    const snapThreshold = 9;
    const guideColorPadding = 34;
    const guides: ElevationAlignmentGuide[] = [];
    const otherBoxes = elevationObjectBoxes.filter((box) => box.key !== movingKey);
    const wallCenterX = (wallLeft + wallRight) / 2;
    const wallCenterY = (wallTop + wallBottom) / 2;

    const pushGuide = (guide: ElevationAlignmentGuide) => {
      const guideKey = guide.kind === "vertical"
        ? `v-${Math.round(guide.x)}-${Math.round(guide.y1)}-${Math.round(guide.y2)}-${guide.label ?? ""}`
        : `h-${Math.round(guide.y)}-${Math.round(guide.x1)}-${Math.round(guide.x2)}-${guide.label ?? ""}`;
      const alreadyExists = guides.some((existingGuide) => {
        const existingKey = existingGuide.kind === "vertical"
          ? `v-${Math.round(existingGuide.x)}-${Math.round(existingGuide.y1)}-${Math.round(existingGuide.y2)}-${existingGuide.label ?? ""}`
          : `h-${Math.round(existingGuide.y)}-${Math.round(existingGuide.x1)}-${Math.round(existingGuide.x2)}-${existingGuide.label ?? ""}`;
        return existingKey === guideKey;
      });
      if (!alreadyExists) guides.push(guide);
    };

    if (Math.abs(movingBox.centerX - wallCenterX) <= snapThreshold) {
      pushGuide({
        kind: "vertical",
        x: wallCenterX,
        y1: wallTop - guideColorPadding,
        y2: wallBottom + guideColorPadding,
      });
    }

    if (Math.abs(movingBox.centerY - wallCenterY) <= snapThreshold) {
      pushGuide({
        kind: "horizontal",
        y: wallCenterY,
        x1: wallLeft - guideColorPadding,
        x2: wallRight + guideColorPadding,
      });
    }

    const xAnchors = [
      { name: "left", value: movingBox.left },
      { name: "center", value: movingBox.centerX },
      { name: "right", value: movingBox.right },
    ];
    const yAnchors = [
      { name: "top", value: movingBox.top },
      { name: "center", value: movingBox.centerY },
      { name: "bottom", value: movingBox.bottom },
    ];

    let bestVertical: (ElevationAlignmentGuide & { distance: number }) | null = null;
    let bestHorizontal: (ElevationAlignmentGuide & { distance: number }) | null = null;
    const horizontalSpacingGuides: Array<ElevationAlignmentGuide & { sortDistance: number }> = [];
    const verticalSpacingGuides: Array<ElevationAlignmentGuide & { sortDistance: number }> = [];

    otherBoxes.forEach((otherBox) => {
      const otherXAnchors = [
        { name: "left", value: otherBox.left },
        { name: "center", value: otherBox.centerX },
        { name: "right", value: otherBox.right },
      ];
      const otherYAnchors = [
        { name: "top", value: otherBox.top },
        { name: "center", value: otherBox.centerY },
        { name: "bottom", value: otherBox.bottom },
      ];

      xAnchors.forEach((movingAnchor) => {
        otherXAnchors.forEach((otherAnchor) => {
          const delta = Math.abs(movingAnchor.value - otherAnchor.value);
          if (delta > snapThreshold) return;
          const y1 = Math.min(movingBox.top, otherBox.top) - guideColorPadding;
          const y2 = Math.max(movingBox.bottom, otherBox.bottom) + guideColorPadding;
          if (!bestVertical || delta < bestVertical.distance) {
            bestVertical = { kind: "vertical", x: otherAnchor.value, y1, y2, distance: delta };
          }
        });
      });

      yAnchors.forEach((movingAnchor) => {
        otherYAnchors.forEach((otherAnchor) => {
          const delta = Math.abs(movingAnchor.value - otherAnchor.value);
          if (delta > snapThreshold) return;
          const x1 = Math.min(movingBox.left, otherBox.left) - guideColorPadding;
          const x2 = Math.max(movingBox.right, otherBox.right) + guideColorPadding;
          if (!bestHorizontal || delta < bestHorizontal.distance) {
            bestHorizontal = { kind: "horizontal", y: otherAnchor.value, x1, x2, distance: delta };
          }
        });
      });

      const sameHorizontalBand =
        Math.abs(movingBox.centerY - otherBox.centerY) <= snapThreshold ||
        Math.abs(movingBox.top - otherBox.top) <= snapThreshold ||
        Math.abs(movingBox.bottom - otherBox.bottom) <= snapThreshold ||
        rangesOverlapOrTouch(movingBox.top, movingBox.bottom, otherBox.top, otherBox.bottom, snapThreshold);

      if (sameHorizontalBand) {
        const gap = movingBox.left >= otherBox.right
          ? movingBox.left - otherBox.right
          : otherBox.left >= movingBox.right
            ? otherBox.left - movingBox.right
            : 0;

        if (gap > 8) {
          const x1 = movingBox.left >= otherBox.right ? otherBox.right : movingBox.right;
          const x2 = movingBox.left >= otherBox.right ? movingBox.left : otherBox.left;
          const y = Math.max(movingBox.bottom, otherBox.bottom) + 14;
          horizontalSpacingGuides.push({
            kind: "horizontal",
            y,
            x1,
            x2,
            label: formatMeasurementFromInches(Math.max(0, gap / renderScale), measurementDisplayUnit),
            labelX: (x1 + x2) / 2,
            labelY: y - 14,
            sortDistance: gap,
          });
        }
      }

      const sameVerticalBand =
        Math.abs(movingBox.centerX - otherBox.centerX) <= snapThreshold ||
        Math.abs(movingBox.left - otherBox.left) <= snapThreshold ||
        Math.abs(movingBox.right - otherBox.right) <= snapThreshold ||
        rangesOverlapOrTouch(movingBox.left, movingBox.right, otherBox.left, otherBox.right, snapThreshold);

      if (sameVerticalBand) {
        const gap = movingBox.top >= otherBox.bottom
          ? movingBox.top - otherBox.bottom
          : otherBox.top >= movingBox.bottom
            ? otherBox.top - movingBox.bottom
            : 0;

        if (gap > 8) {
          const y1 = movingBox.top >= otherBox.bottom ? otherBox.bottom : movingBox.bottom;
          const y2 = movingBox.top >= otherBox.bottom ? movingBox.top : otherBox.top;
          const x = Math.max(movingBox.right, otherBox.right) + 16;
          verticalSpacingGuides.push({
            kind: "vertical",
            x,
            y1,
            y2,
            label: formatMeasurementFromInches(Math.max(0, gap / renderScale), measurementDisplayUnit),
            labelX: x + 18,
            labelY: (y1 + y2) / 2,
            sortDistance: gap,
          });
        }
      }
    });

    if (bestVertical) pushGuide(bestVertical);
    if (bestHorizontal) pushGuide(bestHorizontal);

    horizontalSpacingGuides
      .sort((left, right) => left.sortDistance - right.sortDistance)
      .slice(0, 2)
      .forEach((guide) => pushGuide(guide));

    verticalSpacingGuides
      .sort((left, right) => left.sortDistance - right.sortDistance)
      .slice(0, 2)
      .forEach((guide) => pushGuide(guide));

    return guides;
  };

  const topHorizontalDimensionMap = new Map<string, {
    key: string;
    left: number;
    right: number;
    anchorY: number;
    label: string;
  }>();

  const bottomHorizontalDimensionMap = new Map<string, {
    key: string;
    left: number;
    right: number;
    anchorY: number;
    label: string;
  }>();

  const addHorizontalDimension = (
    map: Map<string, { key: string; left: number; right: number; anchorY: number; label: string }>,
    item: { key: string; left: number; right: number; anchorY: number; label: string }
  ) => {
    const left = Math.min(item.left, item.right);
    const right = Math.max(item.left, item.right);
    if (right - left < 2) return;

    const dedupeKey = `${Math.round(left)}:${Math.round(right)}:${item.label}`;
    if (!map.has(dedupeKey)) {
      map.set(dedupeKey, { ...item, left, right });
    }
  };

  cabinetRenderItems.forEach((item) => {
    const dimensionItem = {
      key: `cabinet-width-${item.key}`,
      left: item.dimensionLeft,
      right: item.dimensionRight,
      anchorY: item.placement.category === "base" ? item.bottom : item.top,
      label: formatMeasurementFromInches(item.placement.widthInches, measurementDisplayUnit),
    };

    if (item.placement.category === "base") {
      addHorizontalDimension(bottomHorizontalDimensionMap, dimensionItem);
    } else {
      addHorizontalDimension(topHorizontalDimensionMap, dimensionItem);
    }
  });

  windowRenderItems.forEach((item) => {
    addHorizontalDimension(topHorizontalDimensionMap, {
      key: `window-width-${item.key}`,
      left: item.left,
      right: item.right,
      anchorY: item.top,
      label: formatMeasurementFromInches(item.layout.widthInches, measurementDisplayUnit),
    });
  });

  doorRenderItems.forEach((item) => {
    addHorizontalDimension(bottomHorizontalDimensionMap, {
      key: `door-width-${item.key}`,
      left: item.left,
      right: item.right,
      anchorY: item.bottom,
      label: formatMeasurementFromInches(item.layout.widthInches, measurementDisplayUnit),
    });
  });

  const topHorizontalDimensionItems = Array.from(topHorizontalDimensionMap.values()).sort((left, right) => {
    if (left.left !== right.left) return left.left - right.left;
    return left.right - right.right;
  });
  const bottomHorizontalDimensionItems = Array.from(bottomHorizontalDimensionMap.values()).sort((left, right) => {
    if (left.left !== right.left) return left.left - right.left;
    return left.right - right.right;
  });

  const topDetailDimensionY = wallTop - 42;
  const topOverallDimensionY = wallTop - 88;
  const bottomDetailDimensionY = wallBottom + 34;
  const bottomOverallDimensionY = wallBottom + 78;
  const leftDetailDimensionX = wallLeft - 50;
  const leftOverallDimensionX = wallLeft - 96;

  const clearanceDimensionMap = new Map<string, {
    key: string;
    top: number;
    bottom: number;
    referenceX: number;
    label: string;
  }>();

  [
    ...cabinetRenderItems
      .filter((item) => item.placement.distanceFromFloorInches > 0)
      .map((item) => ({
        key: `cabinet-floor-${item.key}`,
        top: item.bottom,
        bottom: wallBottom,
        referenceX: wallLeft,
        label: formatMeasurementFromInches(item.placement.distanceFromFloorInches, measurementDisplayUnit),
      })),
    ...windowRenderItems
      .filter((item) => item.windowItem.distanceFromFloorInches > 0)
      .map((item) => ({
        key: `window-sill-${item.key}`,
        top: item.bottom,
        bottom: wallBottom,
        referenceX: wallLeft,
        label: formatMeasurementFromInches(item.windowItem.distanceFromFloorInches, measurementDisplayUnit),
      })),
    ...doorRenderItems
      .filter((item) => item.doorItem.distanceFromFloorInches > 0)
      .map((item) => ({
        key: `door-floor-${item.key}`,
        top: item.bottom,
        bottom: wallBottom,
        referenceX: wallLeft,
        label: formatMeasurementFromInches(item.doorItem.distanceFromFloorInches, measurementDisplayUnit),
      })),
  ].forEach((item) => {
    const top = Math.min(item.top, item.bottom);
    const bottom = Math.max(item.top, item.bottom);
    if (bottom - top < 2) return;

    const dedupeKey = `${Math.round(top)}:${Math.round(bottom)}:${item.label}`;
    const existing = clearanceDimensionMap.get(dedupeKey);
    if (!existing || item.referenceX < existing.referenceX) {
      clearanceDimensionMap.set(dedupeKey, { ...item, top, bottom });
    }
  });

  const heightDimensionMap = new Map<string, {
    key: string;
    top: number;
    bottom: number;
    referenceX: number;
    label: string;
  }>();

  [
    ...cabinetRenderItems.map((item) => ({
      key: `cabinet-height-${item.key}`,
      top: item.top,
      bottom: item.bottom,
      referenceX: wallLeft,
      label: formatMeasurementFromInches(item.placement.heightInches, measurementDisplayUnit),
    })),
    ...windowRenderItems.map((item) => ({
      key: `window-height-${item.key}`,
      top: item.top,
      bottom: item.bottom,
      referenceX: wallLeft,
      label: formatMeasurementFromInches(item.windowItem.heightInches, measurementDisplayUnit),
    })),
    ...doorRenderItems.map((item) => ({
      key: `door-height-${item.key}`,
      top: item.top,
      bottom: item.bottom,
      referenceX: wallLeft,
      label: formatMeasurementFromInches(item.doorItem.heightInches, measurementDisplayUnit),
    })),
  ].forEach((item) => {
    const top = Math.min(item.top, item.bottom);
    const bottom = Math.max(item.top, item.bottom);
    if (bottom - top < 2) return;

    const dedupeKey = `${Math.round(top)}:${Math.round(bottom)}:${item.label}`;
    const existing = heightDimensionMap.get(dedupeKey);
    if (!existing || item.referenceX < existing.referenceX) {
      heightDimensionMap.set(dedupeKey, { ...item, top, bottom });
    }
  });

  const verticalDetailDimensionItems = [
    ...Array.from(heightDimensionMap.values()),
    ...Array.from(clearanceDimensionMap.values()),
  ].sort((left, right) => {
    if (left.top !== right.top) return left.top - right.top;
    if (left.bottom !== right.bottom) return left.bottom - right.bottom;
    return left.label.localeCompare(right.label);
  });

  const getElevationSvgPoint = (event: React.PointerEvent<SVGElement>): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    return {
      x: ((event.clientX - rect.left) / rect.width) * ELEVATION_VIEWBOX_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * ELEVATION_VIEWBOX_HEIGHT,
    };
  };

  const getWallTFromElevationRelativeCenterInches = (centerInches: number) => {
    const wallLength = distance(wall.start, wall.end);
    if (wallLength < 0.001) return 0;

    const wallDirection = normalize(sub(wall.end, wall.start));
    const axisScalarPixels = inchesToPixels(wallStartOffsetInches + centerInches);
    const floorPoint = add(
      elevationWallAxis.start,
      mul(elevationWallAxis.direction, axisScalarPixels)
    );

    return clamp(dot(sub(floorPoint, wall.start), wallDirection) / wallLength, 0, 1);
  };

  const getPeninWallMoveAlongCurrentElevationWall = (
    peninWall: Wall,
    anchorEndpoint: "start" | "end",
    normalSign: number,
    length: number,
    centerInches: number
  ): Wall => {
    const clampedCenterInches = clamp(centerInches, 0, wallLengthInches);
    const anchorPoint = add(
      elevationWallAxis.start,
      mul(elevationWallAxis.direction, inchesToPixels(wallStartOffsetInches + clampedCenterInches))
    );
    const hostDirection = normalize(sub(wall.end, wall.start));
    const hostNormal = normalize(perp(hostDirection));
    if (!vectorLength(hostNormal)) return peninWall;

    const freePoint = add(anchorPoint, mul(hostNormal, length * normalSign));
    return anchorEndpoint === "start"
      ? { ...peninWall, start: anchorPoint, end: freePoint }
      : { ...peninWall, start: freePoint, end: anchorPoint };
  };

  const beginElevationDrag = (
    event: React.PointerEvent<SVGGElement>,
    dragState: ElevationDragState
  ) => {
    event.preventDefault();
    event.stopPropagation();
    elevationDragRef.current = dragState;
    elevationDragAlertRef.current = null;
    updateElevationInvalidCabinetDrag(null);
    setIsElevationDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  type ElevationCabinetDragResolution = {
    startInches: number;
    distanceFromFloorInches: number;
    blocked?: boolean;
    message?: string;
  };

  const getCabinetElevationDragResolution = (
    movingId: string,
    desiredStartInches: number,
    desiredDistanceFromFloorInches: number,
    widthInches: number,
    heightInches: number,
    category: CabinetCategory
  ): ElevationCabinetDragResolution => {
    const snapThresholdInches = 3;
    const overlapToleranceInches = 0.25;
    const minUsefulOverlapInches = 1;
    const wallEdgeBindingSnapThresholdInches = 0.35;

    const maxStartInches = Math.max(0, wallLengthInches - widthInches);
    const maxDistanceFromFloorInches = Math.max(0, wallHeightInches - heightInches);

    const resolveWallEdgeBoundedValue = (value: number, maxValue: number) => {
      if (value <= 0) return 0;
      if (value >= maxValue) return maxValue;
      if (value <= wallEdgeBindingSnapThresholdInches) return 0;
      if (maxValue - value <= wallEdgeBindingSnapThresholdInches) return maxValue;
      return value;
    };

    let startInches = resolveWallEdgeBoundedValue(desiredStartInches, maxStartInches);
    let distanceFromFloorInches = isElevationFloatingCabinet({ category, widthInches: widthInches })
      ? resolveWallEdgeBoundedValue(desiredDistanceFromFloorInches, maxDistanceFromFloorInches)
      : 0;

    type ElevationObstacleBox = {
      key: string;
      startInches: number;
      endInches: number;
      bottomInches: number;
      topInches: number;
      widthInches: number;
      heightInches: number;
      reservationSeverity?: ElevationCornerReservationSeverity;
      sourceCabinet?: CabinetElement;
    };

    const movingCabinet = cabinets.find((cabinetItem) => cabinetItem.id === movingId) ?? null;
    const movingRenderItem = cabinetRenderItems.find((item) => item.key === movingId) ?? null;

    const otherObstacleBoxes: ElevationObstacleBox[] = [
      ...cabinetRenderItems
        .filter((item) => item.key !== movingId)
        .map((item) => ({
          key: item.key,
          startInches: item.displayStartInches,
          endInches: item.displayStartInches + item.placement.widthInches,
          bottomInches: item.placement.distanceFromFloorInches,
          topInches: item.placement.distanceFromFloorInches + item.placement.heightInches,
          widthInches: item.placement.widthInches,
          heightInches: item.placement.heightInches,
        })),
      ...elevationCornerReservations.map((reservation) => ({
        key: reservation.key,
        startInches: reservation.startInches,
        endInches: reservation.startInches + reservation.widthInches,
        bottomInches: reservation.distanceFromFloorInches,
        topInches: reservation.distanceFromFloorInches + reservation.heightInches,
        widthInches: reservation.widthInches,
        heightInches: reservation.heightInches,
        reservationSeverity: reservation.severity,
        sourceCabinet: reservation.sourceCabinet,
      })),
    ];

    const getHorizontalOverlap = (candidateStart: number, other: ElevationObstacleBox) => {
      const candidateEnd = candidateStart + widthInches;
      return Math.min(candidateEnd, other.endInches) - Math.max(candidateStart, other.startInches);
    };

    const getVerticalOverlap = (candidateBottom: number, other: ElevationObstacleBox) => {
      const candidateTop = candidateBottom + heightInches;
      return Math.min(candidateTop, other.topInches) - Math.max(candidateBottom, other.bottomInches);
    };

    const buildCandidateCabinet = (candidateStart: number): CabinetElement | null => {
      if (!movingCabinet || !movingRenderItem) return null;
      const candidateActualStart = toCabinetActualStartInches(
        candidateStart,
        widthInches
      );
      const deltaPixels = inchesToPixels(
        candidateActualStart - movingRenderItem.relativeStartInches
      );
      return {
        ...movingCabinet,
        center: add(movingCabinet.center, mul(elevationWallAxis.direction, deltaPixels)),
      };
    };

    const cabinetPlanBoundsOverlap = (
      firstCabinet: Pick<CabinetElement, "center" | "width" | "depth" | "rotation">,
      secondCabinet: Pick<CabinetElement, "center" | "width" | "depth" | "rotation">
    ) => {
      const firstBounds = getRotatedRectBounds(
        firstCabinet.center,
        Math.max(1, firstCabinet.width - 1),
        Math.max(1, firstCabinet.depth - 1),
        firstCabinet.rotation
      );
      const secondBounds = getRotatedRectBounds(
        secondCabinet.center,
        Math.max(1, secondCabinet.width - 1),
        Math.max(1, secondCabinet.depth - 1),
        secondCabinet.rotation
      );
      const overlapX = Math.min(firstBounds.maxX, secondBounds.maxX) - Math.max(firstBounds.minX, secondBounds.minX);
      const overlapY = Math.min(firstBounds.maxY, secondBounds.maxY) - Math.max(firstBounds.minY, secondBounds.minY);
      return overlapX > 0.5 && overlapY > 0.5;
    };

    const candidateOverlapsObstacle = (
      candidateStart: number,
      candidateBottom: number,
      other: ElevationObstacleBox
    ) => {
      const horizontalOverlap = getHorizontalOverlap(candidateStart, other);
      const verticalOverlap = getVerticalOverlap(candidateBottom, other);
      if (horizontalOverlap <= overlapToleranceInches || verticalOverlap <= overlapToleranceInches) return false;
      if (!other.sourceCabinet) return true;
      if (other.reservationSeverity === "taken") return true;
      const candidateCabinet = buildCandidateCabinet(candidateStart);
      if (!candidateCabinet) return false;
      return cabinetPlanBoundsOverlap(candidateCabinet, other.sourceCabinet);
    };

    let bestHorizontalSnap: { startInches: number; distance: number } | null = null;
    otherObstacleBoxes.forEach((other) => {
      if (getVerticalOverlap(distanceFromFloorInches, other) <= minUsefulOverlapInches) return;

      const snapToOtherLeft = other.startInches - widthInches;
      const snapToOtherRight = other.endInches;
      const leftDistance = Math.abs(startInches - snapToOtherLeft);
      const rightDistance = Math.abs(startInches - snapToOtherRight);

      if (leftDistance <= snapThresholdInches && snapToOtherLeft >= 0 && snapToOtherLeft <= maxStartInches) {
        bestHorizontalSnap = !bestHorizontalSnap || leftDistance < bestHorizontalSnap.distance
          ? { startInches: snapToOtherLeft, distance: leftDistance }
          : bestHorizontalSnap;
      }

      if (rightDistance <= snapThresholdInches && snapToOtherRight >= 0 && snapToOtherRight <= maxStartInches) {
        bestHorizontalSnap = !bestHorizontalSnap || rightDistance < bestHorizontalSnap.distance
          ? { startInches: snapToOtherRight, distance: rightDistance }
          : bestHorizontalSnap;
      }
    });

    const horizontalSnap = bestHorizontalSnap as { startInches: number; distance: number } | null;
    if (horizontalSnap) {
      startInches = clamp(horizontalSnap.startInches, 0, Math.max(0, wallLengthInches - widthInches));
    }

    if (isElevationFloatingCabinet({ category, widthInches: widthInches })) {
      let bestVerticalSnap: { bottomInches: number; distance: number; message?: string } | null = null;

      otherObstacleBoxes.forEach((other) => {
        if (getHorizontalOverlap(startInches, other) <= minUsefulOverlapInches) return;

        const snapAboveBottom = other.topInches;
        const snapUnderBottom = other.bottomInches - heightInches;
        const aboveDistance = Math.abs(distanceFromFloorInches - snapAboveBottom);
        const underDistance = Math.abs(distanceFromFloorInches - snapUnderBottom);

        if (aboveDistance <= snapThresholdInches) {
          const message = snapAboveBottom + heightInches > wallHeightInches + overlapToleranceInches
            ? "Cannot stack this wall cabinet because it would go beyond the ceiling height."
            : undefined;
          if (message || (snapAboveBottom >= 0 && snapAboveBottom <= maxDistanceFromFloorInches)) {
            bestVerticalSnap = !bestVerticalSnap || aboveDistance < bestVerticalSnap.distance
              ? { bottomInches: snapAboveBottom, distance: aboveDistance, message }
              : bestVerticalSnap;
          }
        }

        if (underDistance <= snapThresholdInches && snapUnderBottom >= 0 && snapUnderBottom <= maxDistanceFromFloorInches) {
          bestVerticalSnap = !bestVerticalSnap || underDistance < bestVerticalSnap.distance
            ? { bottomInches: snapUnderBottom, distance: underDistance }
            : bestVerticalSnap;
        }
      });

      const selectedVerticalSnap = bestVerticalSnap as { bottomInches: number; distance: number; message?: string } | null;
      if (selectedVerticalSnap?.message) {
        return { startInches, distanceFromFloorInches, blocked: true, message: selectedVerticalSnap.message };
      }

      if (selectedVerticalSnap) {
        distanceFromFloorInches = clamp(selectedVerticalSnap.bottomInches, 0, Math.max(0, wallHeightInches - heightInches));
      }
    }

    const hasCabinetOverlap = (candidateStart: number, candidateBottom: number) =>
      otherObstacleBoxes.some((other) => candidateOverlapsObstacle(candidateStart, candidateBottom, other));

    if (hasCabinetOverlap(startInches, distanceFromFloorInches)) {
      type ElevationResolutionCandidate = {
        startInches: number;
        distanceFromFloorInches: number;
        distance: number;
        message?: string;
      };

      const verticalResolutionCandidates: ElevationResolutionCandidate[] = isElevationFloatingCabinet({ category, widthInches: widthInches })
        ? otherObstacleBoxes.reduce<ElevationResolutionCandidate[]>((candidates, other) => {
            if (getHorizontalOverlap(startInches, other) <= minUsefulOverlapInches) return candidates;
            candidates.push(
              {
                startInches,
                distanceFromFloorInches: other.topInches,
                distance: Math.abs(distanceFromFloorInches - other.topInches),
                message: other.topInches + heightInches > wallHeightInches + overlapToleranceInches
                  ? "Cannot stack this wall cabinet because it would go beyond the ceiling height."
                  : undefined,
              },
              {
                startInches,
                distanceFromFloorInches: other.bottomInches - heightInches,
                distance: Math.abs(distanceFromFloorInches - (other.bottomInches - heightInches)),
              }
            );
            return candidates;
          }, [])
        : [];

      const horizontalResolutionCandidates: ElevationResolutionCandidate[] = otherObstacleBoxes.reduce<ElevationResolutionCandidate[]>((candidates, other) => {
        if (getVerticalOverlap(distanceFromFloorInches, other) <= minUsefulOverlapInches) return candidates;
        candidates.push(
          {
            startInches: other.startInches - widthInches,
            distanceFromFloorInches,
            distance: Math.abs(startInches - (other.startInches - widthInches)),
          },
          {
            startInches: other.endInches,
            distanceFromFloorInches,
            distance: Math.abs(startInches - other.endInches),
          }
        );
        return candidates;
      }, []);

      const resolutionCandidate = [...verticalResolutionCandidates, ...horizontalResolutionCandidates]
        .filter((candidate) => {
          if (candidate.message) return true;
          if (candidate.startInches < -overlapToleranceInches) return false;
          if (candidate.startInches + widthInches > wallLengthInches + overlapToleranceInches) return false;
          if (candidate.distanceFromFloorInches < -overlapToleranceInches) return false;
          if (candidate.distanceFromFloorInches + heightInches > wallHeightInches + overlapToleranceInches) return false;
          return !hasCabinetOverlap(
            clamp(candidate.startInches, 0, Math.max(0, wallLengthInches - widthInches)),
            clamp(candidate.distanceFromFloorInches, 0, Math.max(0, wallHeightInches - heightInches))
          );
        })
        .sort((left, right) => left.distance - right.distance)[0];

      if (resolutionCandidate?.message) {
        return { startInches, distanceFromFloorInches, blocked: true, message: resolutionCandidate.message };
      }

      if (resolutionCandidate) {
        return {
          startInches: clamp(resolutionCandidate.startInches, 0, Math.max(0, wallLengthInches - widthInches)),
          distanceFromFloorInches: isElevationFloatingCabinet({ category, widthInches: widthInches })
            ? clamp(resolutionCandidate.distanceFromFloorInches, 0, Math.max(0, wallHeightInches - heightInches))
            : 0,
        };
      }

      return { startInches, distanceFromFloorInches, blocked: true };
    }

    return { startInches, distanceFromFloorInches };
  };

  const getElevationGuideSnappedCabinetDrag = (
    movingId: string,
    startInches: number,
    distanceFromFloorInches: number,
    widthInches: number,
    heightInches: number,
    category: CabinetCategory,
    depthVisualOffsetInches: number
  ): ElevationCabinetDragResolution & { didSnap: boolean } => {
    const snapThresholdPx = 9;
    const maxStartInches = Math.max(0, wallLengthInches - widthInches);
    const maxDistanceFromFloorInches = Math.max(0, wallHeightInches - heightInches);
    const displayStartInches =
      toCabinetDisplayStartInches(startInches, widthInches) +
      depthVisualOffsetInches;
    const left = wallLeft + displayStartInches * renderScale;
    const right = left + widthInches * renderScale;
    const centerX = left + (widthInches * renderScale) / 2;
    const bottom = wallBottom - distanceFromFloorInches * renderScale;
    const top = bottom - heightInches * renderScale;
    const centerY = top + (heightInches * renderScale) / 2;

    let snappedStartInches = startInches;
    let snappedDistanceFromFloorInches = distanceFromFloorInches;
    let bestXDistance = snapThresholdPx + 1;
    let bestYDistance = snapThresholdPx + 1;

    const otherBoxes = elevationObjectBoxes.filter((box) => box.key !== movingId);
    const xReferences = [
      ...otherBoxes.flatMap((box) => [box.left, box.centerX, box.right]),
      (wallLeft + wallRight) / 2,
    ];
    const yReferences = [
      ...otherBoxes.flatMap((box) => [box.top, box.centerY, box.bottom]),
      (wallTop + wallBottom) / 2,
    ];

    const xCandidates = [
      {
        value: left,
        toStartInches: (target: number) =>
          toCabinetActualStartInches(
            (target - wallLeft) / renderScale - depthVisualOffsetInches,
            widthInches
          ),
      },
      {
        value: centerX,
        toStartInches: (target: number) =>
          toCabinetActualStartInches(
            (target - wallLeft) / renderScale -
              widthInches / 2 -
              depthVisualOffsetInches,
            widthInches
          ),
      },
      {
        value: right,
        toStartInches: (target: number) =>
          toCabinetActualStartInches(
            (target - wallLeft) / renderScale -
              widthInches -
              depthVisualOffsetInches,
            widthInches
          ),
      },
    ];

    xCandidates.forEach((candidate) => {
      xReferences.forEach((referenceX) => {
        const distancePx = Math.abs(candidate.value - referenceX);
        if (distancePx <= snapThresholdPx && distancePx < bestXDistance) {
          bestXDistance = distancePx;
          snappedStartInches = clamp(candidate.toStartInches(referenceX), 0, maxStartInches);
        }
      });
    });

    if (isElevationFloatingCabinet({ category, widthInches: widthInches })) {
      const yCandidates = [
        {
          value: top,
          toDistanceFromFloorInches: (target: number) =>
            (wallBottom - target) / renderScale - heightInches,
        },
        {
          value: centerY,
          toDistanceFromFloorInches: (target: number) =>
            (wallBottom - target) / renderScale - heightInches / 2,
        },
        {
          value: bottom,
          toDistanceFromFloorInches: (target: number) =>
            (wallBottom - target) / renderScale,
        },
      ];

      yCandidates.forEach((candidate) => {
        yReferences.forEach((referenceY) => {
          const distancePx = Math.abs(candidate.value - referenceY);
          if (distancePx <= snapThresholdPx && distancePx < bestYDistance) {
            bestYDistance = distancePx;
            snappedDistanceFromFloorInches = clamp(
              candidate.toDistanceFromFloorInches(referenceY),
              0,
              maxDistanceFromFloorInches
            );
          }
        });
      });
    }

    if (
      Math.abs(snappedStartInches - startInches) <= 0.001 &&
      Math.abs(snappedDistanceFromFloorInches - distanceFromFloorInches) <= 0.001
    ) {
      return { startInches, distanceFromFloorInches, didSnap: false };
    }

    const snappedResolution = getCabinetElevationDragResolution(
      movingId,
      snappedStartInches,
      snappedDistanceFromFloorInches,
      widthInches,
      heightInches,
      category
    );

    if (snappedResolution.blocked) {
      return { startInches, distanceFromFloorInches, didSnap: false };
    }

    return {
      ...snappedResolution,
      didSnap:
        Math.abs(snappedResolution.startInches - startInches) > 0.001 ||
        Math.abs(snappedResolution.distanceFromFloorInches - distanceFromFloorInches) > 0.001,
    };
  };

  const handleElevationPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = elevationDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const point = getElevationSvgPoint(event);
    if (!point) return;

    event.preventDefault();

    if (dragState.kind === "window") {
      const halfWidth = Math.min(dragState.widthInches / 2, wallLengthInches / 2);
      const nextCenterInches = clamp(
        (point.x - wallLeft) / renderScale - dragState.grabOffsetCenterXInches,
        halfWidth,
        Math.max(halfWidth, wallLengthInches - halfWidth)
      );
      const nextDistanceFromFloor = clamp(
        (wallBottom - point.y) / renderScale - dragState.grabOffsetBottomYInches,
        0,
        Math.max(0, wallHeightInches - dragState.heightInches)
      );

      const nextWindowLayout = getElevationOpeningLayoutFromCenter(
        wallLengthInches,
        dragState.widthInches,
        nextCenterInches
      );
      const nextWindowLeft = wallLeft + nextWindowLayout.startInches * renderScale;
      const nextWindowRight = nextWindowLeft + nextWindowLayout.widthInches * renderScale;
      const nextWindowBottom = wallBottom - nextDistanceFromFloor * renderScale;
      const nextWindowTop = nextWindowBottom - dragState.heightInches * renderScale;
      setElevationAlignmentGuides(getElevationAlignmentGuidesForBox({
        key: dragState.id,
        left: nextWindowLeft,
        right: nextWindowRight,
        top: nextWindowTop,
        bottom: nextWindowBottom,
        centerX: (nextWindowLeft + nextWindowRight) / 2,
        centerY: (nextWindowTop + nextWindowBottom) / 2,
      }, dragState.id));

      const nextActualCenterInches = toElevationActualCenterInches(
        nextCenterInches,
        dragState.widthInches
      );

      onUpdateWindow(dragState.id, {
        t: getWallTFromElevationRelativeCenterInches(nextActualCenterInches),
        distanceFromFloorInches: nextDistanceFromFloor,
      });
      elevationDragRef.current = dragState;
      return;
    }

    if (dragState.kind === "door") {
      const halfWidth = Math.min(dragState.widthInches / 2, wallLengthInches / 2);
      const nextCenterInches = clamp(
        (point.x - wallLeft) / renderScale - dragState.grabOffsetCenterXInches,
        halfWidth,
        Math.max(halfWidth, wallLengthInches - halfWidth)
      );
      const nextDistanceFromFloor = clamp(
        (wallBottom - point.y) / renderScale - dragState.grabOffsetBottomYInches,
        0,
        Math.max(0, wallHeightInches - dragState.heightInches)
      );

      const nextDoorLayout = getElevationOpeningLayoutFromCenter(
        wallLengthInches,
        dragState.widthInches,
        nextCenterInches
      );
      const nextDoorLeft = wallLeft + nextDoorLayout.startInches * renderScale;
      const nextDoorRight = nextDoorLeft + nextDoorLayout.widthInches * renderScale;
      const nextDoorBottom = wallBottom - nextDistanceFromFloor * renderScale;
      const nextDoorTop = nextDoorBottom - dragState.heightInches * renderScale;
      setElevationAlignmentGuides(getElevationAlignmentGuidesForBox({
        key: dragState.id,
        left: nextDoorLeft,
        right: nextDoorRight,
        top: nextDoorTop,
        bottom: nextDoorBottom,
        centerX: (nextDoorLeft + nextDoorRight) / 2,
        centerY: (nextDoorTop + nextDoorBottom) / 2,
      }, dragState.id));

      const nextActualCenterInches = toElevationActualCenterInches(
        nextCenterInches,
        dragState.widthInches
      );

      onUpdateDoor(dragState.id, {
        t: getWallTFromElevationRelativeCenterInches(nextActualCenterInches),
        distanceFromFloorInches: nextDistanceFromFloor,
      });
      elevationDragRef.current = dragState;
      return;
    }

    if (dragState.kind === "penin-wall") {
      if (isPeninElevationWall) return;

      const halfWidth = Math.min(dragState.widthInches / 2, wallLengthInches / 2);
      const nextCenterInches = clamp(
        (point.x - wallLeft) / renderScale - dragState.grabOffsetCenterXInches,
        halfWidth,
        Math.max(halfWidth, wallLengthInches - halfWidth)
      );
      const nextActualCenterInches = toElevationActualCenterInches(
        nextCenterInches,
        dragState.widthInches
      );
      const movedPeninWall = getPeninWallMoveAlongCurrentElevationWall(
        dragState.startWall,
        dragState.anchorEndpoint,
        dragState.normalSign,
        dragState.length,
        nextActualCenterInches
      );
      if (
        detachedPanelWallIntersectsFloorCabinet(
          movedPeninWall,
          cabinets,
          calculationWalls.filter((candidateWall) => isThickWall(candidateWall) && !isDetachedPanelWall(candidateWall)),
          calculationWalls,
          dragState.id
        )
      ) {
        return;
      }

      const nextLeft = wallLeft + (nextCenterInches - dragState.widthInches / 2) * renderScale;
      const nextRight = nextLeft + dragState.widthInches * renderScale;
      const nextBottom = wallBottom;
      const nextTop = wallBottom - PENIN_WALL_ELEVATION_HEIGHT_INCHES * renderScale;
      setElevationAlignmentGuides(getElevationAlignmentGuidesForBox({
        key: dragState.id,
        left: nextLeft,
        right: nextRight,
        top: nextTop,
        bottom: nextBottom,
        centerX: (nextLeft + nextRight) / 2,
        centerY: (nextTop + nextBottom) / 2,
      }, dragState.id));

      onUpdateWall(dragState.id, {
        start: movedPeninWall.start,
        end: movedPeninWall.end,
      });
      elevationDragRef.current = dragState;
      return;
    }

    // Elevation drag only moves the cabinet along the viewed wall and in height.
    // It intentionally preserves the wall-normal depth from the floor plan.
    // Keep the original pointer-to-cabinet grab offset while dragging. Do not
    // rebase the drag start on every pointer move, because wall-edge clamping or
    // snapping would otherwise change that grab offset and make the cabinet
    // visibly drift away from the cursor.
    const desiredDisplayStartInches = (point.x - wallLeft) / renderScale - dragState.grabOffsetXInches;
    const desiredStartInches = toCabinetActualStartInches(
      desiredDisplayStartInches - dragState.depthVisualOffsetInches,
      dragState.widthInches
    );
    const desiredDistanceFromFloor = isElevationFloatingCabinet({ category: dragState.category, widthInches: dragState.widthInches })
      ? (wallBottom - point.y) / renderScale - dragState.grabOffsetBottomYInches
      : 0;

    const resolvedCabinetDrag = getCabinetElevationDragResolution(
      dragState.id,
      desiredStartInches,
      desiredDistanceFromFloor,
      dragState.widthInches,
      dragState.heightInches,
      dragState.category
    );

    if (resolvedCabinetDrag.blocked) {
      setElevationAlignmentGuides([]);
      updateElevationInvalidCabinetDrag({
        id: dragState.id,
        message: resolvedCabinetDrag.message ?? WALL_CABINET_ELEVATION_OVERLAP_MESSAGE,
      });
      return;
    }

    updateElevationInvalidCabinetDrag(null);
    const snappedCabinetDrag = getElevationGuideSnappedCabinetDrag(
      dragState.id,
      resolvedCabinetDrag.startInches,
      resolvedCabinetDrag.distanceFromFloorInches,
      dragState.widthInches,
      dragState.heightInches,
      dragState.category,
      dragState.depthVisualOffsetInches
    );
    const finalCabinetDrag = snappedCabinetDrag.didSnap ? snappedCabinetDrag : resolvedCabinetDrag;
    const resolvedStartInches = finalCabinetDrag.startInches;
    const nextDistanceFromFloor = finalCabinetDrag.distanceFromFloorInches;
    const resolvedDisplayStartInches = clamp(
      toCabinetDisplayStartInches(
        resolvedStartInches,
        dragState.widthInches
      ) + dragState.depthVisualOffsetInches,
      0,
      Math.max(0, wallLengthInches - dragState.widthInches)
    );

    const startDeltaPixels = inchesToPixels(resolvedStartInches - dragState.startStartInches);
    const nextCenter = add(
      dragState.startCenter,
      mul(elevationWallAxis.direction, startDeltaPixels)
    );

    const nextCabinetLeft = wallLeft + resolvedDisplayStartInches * renderScale;
    const nextCabinetRight = nextCabinetLeft + dragState.widthInches * renderScale;
    const nextCabinetBottom = wallBottom - nextDistanceFromFloor * renderScale;
    const nextCabinetTop = nextCabinetBottom - dragState.heightInches * renderScale;
    setElevationAlignmentGuides(getElevationAlignmentGuidesForBox({
      key: dragState.id,
      left: nextCabinetLeft,
      right: nextCabinetRight,
      top: nextCabinetTop,
      bottom: nextCabinetBottom,
      centerX: (nextCabinetLeft + nextCabinetRight) / 2,
      centerY: (nextCabinetTop + nextCabinetBottom) / 2,
    }, dragState.id));

    onUpdateCabinet(dragState.id, {
      center: nextCenter,
      distanceFromFloorInches: nextDistanceFromFloor,
    });
    elevationDragRef.current = dragState;
  };

  const stopElevationDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = elevationDragRef.current;
    if (dragState && dragState.pointerId === event.pointerId) {
      if (dragState.kind === "cabinet") {
        const invalidDrag = elevationInvalidCabinetDragRef.current;
        if (invalidDrag?.id === dragState.id) {
          onAlert(invalidDrag.message);
          onUpdateCabinet(dragState.id, {
            center: dragState.startCenter,
            distanceFromFloorInches: dragState.startDistanceFromFloorInches,
          });
        } else {
          const finishedCabinet = cabinets.find((cabinetItem) => cabinetItem.id === dragState.id);
          if (finishedCabinet) {
            const ruleMessage = getCabinetPlacementRuleViolationMessage(
              finishedCabinet,
              cabinets,
              calculationWalls,
              finishedCabinet.id,
              true
            );
            if (ruleMessage) {
              onAlert(ruleMessage);
              onUpdateCabinet(dragState.id, {
                center: dragState.startCenter,
                distanceFromFloorInches: dragState.startDistanceFromFloorInches,
              });
            }
          }
        }
      }

      elevationDragRef.current = null;
      elevationDragAlertRef.current = null;
      updateElevationInvalidCabinetDrag(null);
      setIsElevationDragging(false);
      setElevationAlignmentGuides([]);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f5f5f5]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-pelican-navy">
            Wall {activeIndex + 1} of {walls.length}
          </div>
          <div className="hidden text-xs text-slate-500">
            Wall {activeIndex + 1} of {walls.length} · {overallLengthLabel} wide
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex w-full max-w-[240px] flex-col items-center gap-1">
            <label
              htmlFor="elevation-plan-view-mode"
              className="text-[11px] font-bold uppercase tracking-wide text-pelican-navy"
            >
              Elevation view
            </label>
            <select
              id="elevation-plan-view-mode"
              value={currentElevationViewMode}
              onChange={(event) => {
                window.dispatchEvent(
                  new CustomEvent("pelican-wall-elevation-view-change", {
                    detail: {
                      id: wall.id,
                      value: event.target.value as WallElevationViewMode,
                    },
                  })
                );
              }}
              disabled={!isThickWall(wall)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-pelican-teal"
            >
              <option value="interior">Interior side</option>
              <option value="exterior">Exterior side</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Previous wall elevation"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Next wall elevation"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-6">
        <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <svg
            ref={svgRef}
            className={cn("h-full w-full", isElevationDragging && "cursor-grabbing")}
            viewBox={`0 0 ${ELEVATION_VIEWBOX_WIDTH} ${ELEVATION_VIEWBOX_HEIGHT}`}
            onPointerDown={(event) => {
              if (event.button !== 0 || isElevationDragging) return;
              onClearSelection();
            }}
            onPointerMove={handleElevationPointerMove}
            onPointerUp={stopElevationDrag}
            onPointerCancel={stopElevationDrag}
            onPointerLeave={stopElevationDrag}
          >
            <defs>
              <pattern id="elevation-reservation-cabinet-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#64748b" strokeWidth="2" opacity="0.3" />
              </pattern>
              <pattern id="elevation-reservation-caution-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#64748b" strokeWidth="2" opacity="0.3" />
              </pattern>
              <pattern id="elevation-reservation-taken-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#64748b" strokeWidth="2" opacity="0.3" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={ELEVATION_VIEWBOX_WIDTH} height={ELEVATION_VIEWBOX_HEIGHT} fill="#ffffff" />

            <line x1={wallLeft} y1={wallBottom} x2={wallLeft + wallRenderWidth} y2={wallBottom} stroke="#d1d5db" strokeWidth="2" />
            <rect
              x={wallLeft}
              y={wallTop}
              width={wallRenderWidth}
              height={wallRenderHeight}
              fill="#d9d9d9"
              stroke="#9ca3af"
              strokeWidth="2"
            />

            {isPeninElevationWall && (
              <text
                x={wallLeft + wallRenderWidth / 2}
                y={wallTop + Math.max(36, Math.min(90, wallRenderHeight * 0.18))}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#334155"
                fontSize="20"
                fontWeight="700"
                pointerEvents="none"
              >
                {isIslandWall(wall) ? "Island" : "Peninsula Wall"}
              </text>
            )}

            {selfPeninWallRenderItem && (
              <ElevationPeninWallFace
                key={selfPeninWallRenderItem.key}
                x={selfPeninWallRenderItem.left}
                y={selfPeninWallRenderItem.top}
                width={selfPeninWallRenderItem.width}
                height={selfPeninWallRenderItem.height}
              />
            )}

            {peninWallRenderItems.map((item) => {
              const selected = item.placement.wall.id === selectedWallId;
              return (
                <ElevationPeninWallFace
                  key={item.key}
                  x={item.left}
                  y={item.top}
                  width={item.width}
                  height={item.height}
                  selected={selected}
                  className={isElevationDragging ? "cursor-grabbing" : "cursor-move"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startPointer = getElevationSvgPoint(event);
                    const attachment = getPeninWallAttachmentToWall(item.placement.wall, wall);
                    onSelectWall(item.placement.wall.id);
                    if (!startPointer || !attachment) return;
                    beginElevationDrag(event, {
                      kind: "penin-wall",
                      id: item.placement.wall.id,
                      pointerId: event.pointerId,
                      startPointer,
                      startWall: item.placement.wall,
                      hostWallId: wall.id,
                      anchorEndpoint: attachment.endpoint,
                      normalSign: attachment.normalSign,
                      length: attachment.length,
                      grabOffsetCenterXInches: (startPointer.x - (item.left + item.width / 2)) / renderScale,
                      widthInches: item.placement.widthInches,
                      startWalls: calculationWalls,
                    });
                  }}
                />
              );
            })}

            {reservationRenderItems.map((item) => {
              const isTaken = item.reservation.severity === "taken";
              const fill = "rgba(148, 163, 184, 0.18)";
              const hatch = "url(#elevation-reservation-cabinet-hatch)";
              const stroke = "#64748b";
              const labelColor = "#334155";
              const lineGap = Math.min(22, Math.max(14, item.height * 0.18));
              const titleY = item.top + item.height / 2 - lineGap / 2;
              const subtitleY = item.top + item.height / 2 + lineGap / 2;
              const titleFontSize = Math.max(10, Math.min(16, item.width * 0.08));
              const subtitleFontSize = Math.max(9, titleFontSize - 2);
              return (
                <g key={item.key} pointerEvents="none">
                  <rect
                    x={item.left}
                    y={item.top}
                    width={item.width}
                    height={item.height}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="10 8"
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={item.left}
                    y={item.top}
                    width={item.width}
                    height={item.height}
                    fill={hatch}
                    opacity={isTaken ? 1 : 0.95}
                  />
                  <text
                    x={item.left + item.width / 2}
                    y={titleY}
                    textAnchor="middle"
                    fontSize={titleFontSize}
                    fontWeight="700"
                    fill={labelColor}
                  >
                    {item.reservation.title}
                  </text>
                  <text
                    x={item.left + item.width / 2}
                    y={subtitleY}
                    textAnchor="middle"
                    fontSize={subtitleFontSize}
                    fontStyle="italic"
                    fill={labelColor}
                    opacity="0.95"
                  >
                    {isTaken ? "taken area" : "cabinet here"}
                  </text>
                </g>
              );
            })}

            {showMeasurements && (
              <>
                <ElevationDimensionLine
                  x1={wallLeft}
                  y1={topOverallDimensionY}
                  x2={wallLeft + wallRenderWidth}
                  y2={topOverallDimensionY}
                  label={overallLengthLabel}
                  textOffset={-12}
                />

                <ElevationDimensionLine
                  x1={wallLeft}
                  y1={bottomOverallDimensionY}
                  x2={wallLeft + wallRenderWidth}
                  y2={bottomOverallDimensionY}
                  label={overallLengthLabel}
                  textOffset={16}
                />

                <ElevationDimensionLine
                  x1={leftOverallDimensionX}
                  y1={wallTop}
                  x2={leftOverallDimensionX}
                  y2={wallBottom}
                  label={overallHeightLabel}
                  rotateText
                  textOffset={-30}
                />
              </>
            )}

            {windowRenderItems.map((windowItem) => {
              const selected = windowItem.key === selectedWindowId;
              const stroke = selected ? "#22bfd6" : "#111827";
              const strokeWidth = selected ? 3 : 2;
              return (
                <g
                  key={windowItem.key}
                  className={isElevationDragging ? "cursor-grabbing" : "cursor-move"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startPointer = getElevationSvgPoint(event);
                    onSelectWindow(windowItem.key);
                    if (!startPointer) return;
                    beginElevationDrag(event, {
                      kind: "window",
                      id: windowItem.key,
                      pointerId: event.pointerId,
                      startPointer,
                      startCenterInches: windowItem.layout.centerInches,
                      startDistanceFromFloorInches: windowItem.windowItem.distanceFromFloorInches,
                      grabOffsetCenterXInches: (startPointer.x - (wallLeft + windowItem.layout.centerInches * renderScale)) / renderScale,
                      grabOffsetBottomYInches: ((wallBottom - windowItem.windowItem.distanceFromFloorInches * renderScale) - startPointer.y) / renderScale,
                      widthInches: windowItem.layout.widthInches,
                      heightInches: windowItem.windowItem.heightInches,
                    });
                  }}
                >
                  <rect x={windowItem.left} y={windowItem.top} width={windowItem.width} height={windowItem.height} fill="#f1ede4" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
                  <rect x={windowItem.left + 8} y={windowItem.top + 8} width={Math.max(0, windowItem.width - 16)} height={Math.max(0, windowItem.height - 16)} fill="#fafaf9" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <line x1={windowItem.left + windowItem.width / 2} y1={windowItem.top + 8} x2={windowItem.left + windowItem.width / 2} y2={windowItem.top + windowItem.height - 8} stroke="#111827" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <line x1={windowItem.left + 8} y1={windowItem.top + windowItem.height / 2} x2={windowItem.left + windowItem.width - 8} y2={windowItem.top + windowItem.height / 2} stroke="#111827" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}

            {doorRenderItems.map((doorItem) => {
              const selected = doorItem.key === selectedDoorId;
              const stroke = selected ? "#22bfd6" : "#111827";
              const strokeWidth = selected ? 3 : 2;
              return (
                <g
                  key={doorItem.key}
                  className={isElevationDragging ? "cursor-grabbing" : "cursor-move"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startPointer = getElevationSvgPoint(event);
                    onSelectDoor(doorItem.key);
                    if (!startPointer) return;
                    beginElevationDrag(event, {
                      kind: "door",
                      id: doorItem.key,
                      pointerId: event.pointerId,
                      startPointer,
                      startCenterInches: doorItem.layout.centerInches,
                      startDistanceFromFloorInches: doorItem.doorItem.distanceFromFloorInches,
                      grabOffsetCenterXInches: (startPointer.x - (wallLeft + doorItem.layout.centerInches * renderScale)) / renderScale,
                      grabOffsetBottomYInches: ((wallBottom - doorItem.doorItem.distanceFromFloorInches * renderScale) - startPointer.y) / renderScale,
                      widthInches: doorItem.layout.widthInches,
                      heightInches: doorItem.doorItem.heightInches,
                    });
                  }}
                >
                  <rect x={doorItem.left} y={doorItem.top} width={doorItem.width} height={doorItem.height} fill="#d6dee8" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
                  <rect x={doorItem.left + 10} y={doorItem.top + 10} width={Math.max(0, doorItem.width - 20)} height={Math.max(0, doorItem.height - 20)} fill="#f8fafc" opacity="0.65" />
                  <circle cx={doorItem.left + doorItem.width - 14} cy={doorItem.top + doorItem.height / 2} r="4" fill="#6b7280" />
                </g>
              );
            })}

            {cabinetDrawItems.map((cabinetItem) => {
              const selected = cabinetItem.key === selectedCabinetId;
              return (
                <g
                  key={`elevation-cabinet-body-${cabinetItem.key}`}
                  className={isElevationDragging ? "cursor-grabbing" : "cursor-move"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startPointer = getElevationSvgPoint(event);
                    onSelectCabinet(cabinetItem.key);
                    if (!startPointer) return;
                    beginElevationDrag(event, {
                      kind: "cabinet",
                      id: cabinetItem.key,
                      pointerId: event.pointerId,
                      startPointer,
                      startCenter: cabinetItem.placement.cabinet.center,
                      startStartInches: cabinetItem.relativeStartInches,
                      startDisplayStartInches: cabinetItem.displayStartInches,
                      depthVisualOffsetInches: cabinetItem.depthShiftXInches,
                      startDistanceFromFloorInches: cabinetItem.placement.distanceFromFloorInches,
                      grabOffsetXInches: (startPointer.x - (wallLeft + cabinetItem.displayStartInches * renderScale)) / renderScale,
                      grabOffsetBottomYInches: ((wallBottom - cabinetItem.placement.distanceFromFloorInches * renderScale) - startPointer.y) / renderScale,
                      widthInches: cabinetItem.placement.widthInches,
                      heightInches: cabinetItem.placement.heightInches,
                      category: cabinetItem.placement.category,
                      startCabinets: cabinets,
                    });
                  }}
                >
                  <ElevationCabinetOnWall
                    x={cabinetItem.left}
                    y={cabinetItem.top}
                    width={cabinetItem.width}
                    height={cabinetItem.height}
                    category={cabinetItem.placement.category}
                    image={cabinetItem.placement.cabinet.image}
                    cabinet={cabinetItem.placement.cabinet}
                    selected={selected}
                    invalid={Boolean(cabinetItem.placement.stackOverflow) || elevationInvalidCabinetDrag?.id === cabinetItem.key}
                  />
                </g>
              );
            })}

            {elevationAlignmentGuides.map((guideItem, index) => (
              <ElevationAlignmentGuideOverlay key={`elevation-alignment-${index}`} guide={guideItem} />
            ))}

            {showMeasurements && topHorizontalDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key} pointerEvents="none">
                <line x1={dimensionItem.left} y1={dimensionItem.anchorY} x2={dimensionItem.left} y2={topDetailDimensionY} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <line x1={dimensionItem.right} y1={dimensionItem.anchorY} x2={dimensionItem.right} y2={topDetailDimensionY} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <ElevationDimensionLine
                  x1={dimensionItem.left}
                  y1={topDetailDimensionY}
                  x2={dimensionItem.right}
                  y2={topDetailDimensionY}
                  label={dimensionItem.label}
                  textOffset={-10}
                  extensionTop={10}
                  extensionBottom={10}
                />
              </g>
            ))}

            {showMeasurements && bottomHorizontalDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key} pointerEvents="none">
                <line x1={dimensionItem.left} y1={dimensionItem.anchorY} x2={dimensionItem.left} y2={bottomDetailDimensionY} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <line x1={dimensionItem.right} y1={dimensionItem.anchorY} x2={dimensionItem.right} y2={bottomDetailDimensionY} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <ElevationDimensionLine
                  x1={dimensionItem.left}
                  y1={bottomDetailDimensionY}
                  x2={dimensionItem.right}
                  y2={bottomDetailDimensionY}
                  label={dimensionItem.label}
                  textOffset={16}
                  extensionTop={10}
                  extensionBottom={10}
                />
              </g>
            ))}

            {showMeasurements && verticalDetailDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key} pointerEvents="none">
                <line x1={leftDetailDimensionX} y1={dimensionItem.top} x2={wallLeft} y2={dimensionItem.top} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <line x1={leftDetailDimensionX} y1={dimensionItem.bottom} x2={wallLeft} y2={dimensionItem.bottom} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <ElevationDimensionLine
                  x1={leftDetailDimensionX}
                  y1={dimensionItem.top}
                  x2={leftDetailDimensionX}
                  y2={dimensionItem.bottom}
                  label={dimensionItem.label}
                  rotateText
                  textOffset={-32}
                  extensionTop={8}
                  extensionBottom={8}
                />
              </g>
            ))}

            <text
              x={ELEVATION_VIEWBOX_WIDTH / 2}
              y={ELEVATION_VIEWBOX_HEIGHT - 38}
              textAnchor="middle"
              className="fill-slate-700 text-[20px] font-semibold"
            >
              Wall {activeIndex + 1}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

function ElevationDimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  rotateText = false,
  textOffset = -10,
  extensionTop = 12,
  extensionBottom = 12,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  rotateText?: boolean;
  textOffset?: number;
  extensionTop?: number;
  extensionBottom?: number;
}) {
  const isVertical = Math.abs(x1 - x2) < Math.abs(y1 - y2);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const labelX = rotateText ? midX + textOffset : midX;
  const labelY = rotateText ? midY : midY + textOffset;
  const approxLabelWidth = Math.max(34, label.length * 12);
  const labelPaddingX = 8;
  const labelPaddingY = 5;
  const labelBoxWidth = approxLabelWidth + labelPaddingX * 2;
  const labelBoxHeight = rotateText ? 46 : 22 + labelPaddingY * 2;

  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4f46e5" strokeWidth="1.6" />
      {isVertical ? (
        <>
          <line x1={x1 - extensionBottom / 2} y1={y1} x2={x1 + extensionBottom / 2} y2={y1} stroke="#4f46e5" strokeWidth="1.6" />
          <line x1={x2 - extensionTop / 2} y1={y2} x2={x2 + extensionTop / 2} y2={y2} stroke="#4f46e5" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - extensionBottom / 2} x2={x1} y2={y1 + extensionBottom / 2} stroke="#4f46e5" strokeWidth="1.6" />
          <line x1={x2} y1={y2 - extensionTop / 2} x2={x2} y2={y2 + extensionTop / 2} stroke="#4f46e5" strokeWidth="1.6" />
        </>
      )}
      <g transform={rotateText ? `rotate(-90 ${labelX} ${labelY})` : undefined}>
        <rect
          x={labelX - labelBoxWidth / 2}
          y={labelY - labelBoxHeight / 2}
          width={labelBoxWidth}
          height={labelBoxHeight}
          rx="4"
          fill="#ffffff"
          fillOpacity="0.96"
          pointerEvents="none"
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-[20px] font-semibold"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinejoin="round"
        >
          {label}
        </text>
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-indigo-700 text-[20px] font-semibold"
        >
          {label}
        </text>
      </g>
    </g>
  );
}


function ElevationAlignmentGuideOverlay({ guide }: { guide: ElevationAlignmentGuide }) {
  const stroke = "#d946ef";

  return (
    <g pointerEvents="none">
      {guide.kind === "vertical" ? (
        <line
          x1={guide.x}
          y1={guide.y1}
          x2={guide.x}
          y2={guide.y2}
          stroke={stroke}
          strokeWidth="1.5"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <line
          x1={guide.x1}
          y1={guide.y}
          x2={guide.x2}
          y2={guide.y}
          stroke={stroke}
          strokeWidth="1.5"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {guide.label && guide.labelX !== undefined && guide.labelY !== undefined && (
        <g>
          <rect
            x={guide.labelX - 22}
            y={guide.labelY - 13}
            width={44}
            height={26}
            rx="10"
            fill={stroke}
            opacity="0.95"
          />
          <text
            x={guide.labelX}
            y={guide.labelY}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white text-[14px] font-bold"
          >
            {guide.label}
          </text>
        </g>
      )}
    </g>
  );
}


function SelectionAreaBox({ start, end }: { start: Point; end: Point }) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(14, 165, 233, 0.10)"
      stroke="#0ea5e9"
      strokeWidth={1.5}
      strokeDasharray="6 5"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );
}


function DoorOnWall({
  doorItem,
  wall,
  walls,
  selected,
  disabled = false,
  onSelect,
  onDragStart,
}: {
  doorItem: DoorElement;
  wall: Wall;
  walls: Wall[];
  selected: boolean;
  disabled?: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const geometry = getDoorGeometry(doorItem, wall);

  if (!geometry) return null;

  return (
    <g
      className={selected ? "cursor-move" : "cursor-pointer"}
      pointerEvents={disabled ? "none" : undefined}
      onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
    >
      <DoorShapeOnWall geometry={geometry} wall={wall} selected={selected} />

      {selected && (
        <WindowPlacementMeasurements
          wall={wall}
          walls={walls}
          center={geometry.center}
          width={doorItem.width}
          showWidth
        />
      )}

      <line
        x1={geometry.start.x}
        y1={geometry.start.y}
        x2={geometry.end.x}
        y2={geometry.end.y}
        stroke="transparent"
        strokeWidth={WALL_STROKE_WIDTH + 14}
        strokeLinecap="butt"
        pointerEvents="stroke"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function DoorShapeOnWall({
  geometry,
  wall,
  selected = false,
  preview = false,
}: {
  geometry: NonNullable<ReturnType<typeof getDoorGeometry>>;
  wall: Wall;
  selected?: boolean;
  preview?: boolean;
}) {
  const normal = getPreferredNormal(wall.start, wall.end);
  const halfHeight = preview ? 8 : 7;
  const outerPoints = [
    add(geometry.start, mul(normal, halfHeight)),
    add(geometry.end, mul(normal, halfHeight)),
    add(geometry.end, mul(normal, -halfHeight)),
    add(geometry.start, mul(normal, -halfHeight)),
  ];

  if (preview) {
    return (
      <g pointerEvents="none">
        <polygon
          points={outerPoints.map(toSvgPoint).join(" ")}
          fill="#35bed0"
          stroke="#0891b2"
          strokeWidth={1.4}
          opacity={0.9}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const innerInset = 2;
  const innerPoints = [
    add(geometry.start, mul(normal, halfHeight - innerInset)),
    add(geometry.end, mul(normal, halfHeight - innerInset)),
    add(geometry.end, mul(normal, -(halfHeight - innerInset))),
    add(geometry.start, mul(normal, -(halfHeight - innerInset))),
  ];
  const outlineStroke = selected ? "#0891b2" : "#111827";
  const innerStroke = selected ? "#0891b2" : "#6b7280";
  const fill = selected ? "#35bed0" : "#ffffff";

  return (
    <g pointerEvents="none">
      <polygon
        points={outerPoints.map(toSvgPoint).join(" ")}
        fill={fill}
        stroke={outlineStroke}
        strokeWidth={2}
        opacity={selected ? 0.9 : 1}
        vectorEffect="non-scaling-stroke"
      />
      {!selected && (
        <polygon
          points={innerPoints.map(toSvgPoint).join(" ")}
          fill="none"
          stroke={innerStroke}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}

function FreeStructurePlacementPreview({
  center,
  width,
  kind,
}: {
  center: Point;
  width: number;
  kind: "door" | "window";
}) {
  const halfWidth = width / 2;
  const halfHeight = kind === "window" ? 8 : 8;
  const stroke = "#ef4444";
  const fill = "#fee2e2";

  return (
    <g pointerEvents="none" opacity={0.78}>
      <rect
        x={center.x - halfWidth}
        y={center.y - halfHeight}
        width={width}
        height={halfHeight * 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={center.x - halfWidth + 5}
        y1={center.y}
        x2={center.x + halfWidth - 5}
        y2={center.y}
        stroke={stroke}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function DoorPreview({
  preview,
  width,
  walls,
  showWidth = false,
}: {
  preview: DoorPlacementPreview;
  width: number;
  walls: Wall[];
  showWidth?: boolean;
}) {
  if (!preview.isValid || !preview.wall) {
    return <FreeStructurePlacementPreview center={preview.point} width={width} kind="door" />;
  }

  const geometry = getDoorGeometry(
    {
      id: "preview",
      wallId: preview.wall.id,
      t: preview.t,
      width,
      heightInches: 80,
      distanceFromFloorInches: 0,
    },
    preview.wall
  );

  if (!geometry) return null;

  return (
    <g pointerEvents="none">
      <DoorShapeOnWall
        geometry={geometry}
        wall={preview.wall}
        preview
      />

      <WindowPlacementMeasurements
        wall={preview.wall}
        walls={walls}
        center={geometry.center}
        width={width}
        showWidth={showWidth}
      />
    </g>
  );
}

function SelectedDoorContextMenu({
  position,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  position: Point;
  onDelete: () => void;
  onDragStart: (
    event: React.PointerEvent<HTMLDivElement>,
    startPosition: Point
  ) => void;
  onDragMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={82}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[74px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected door menu"
          className="flex w-6 shrink-0 cursor-grab items-center justify-center bg-[#0fb8d2] active:cursor-grabbing"
          onPointerDown={(event) => onDragStart(event, position)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex flex-col gap-1">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>

        <button
          type="button"
          aria-label="Delete selected door"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </foreignObject>
  );
}

function WindowOnWall({
  windowItem,
  wall,
  walls,
  selected,
  disabled = false,
  onSelect,
  onDragStart,
}: {
  windowItem: WindowElement;
  wall: Wall;
  walls: Wall[];
  selected: boolean;
  disabled?: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const geometry = getWindowGeometry(windowItem, wall);

  if (!geometry) return null;

  return (
    <g
      className={selected ? "cursor-move" : "cursor-pointer"}
      pointerEvents={disabled ? "none" : undefined}
      onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
    >
      <WindowShapeOnWall
        geometry={geometry}
        wall={wall}
        selected={selected}
        tabSide={windowItem.tabSide ?? getWindowTabSideFacingMeasurementGuide(wall, walls)}
      />

      {selected && (
        <WindowPlacementMeasurements
          wall={wall}
          walls={walls}
          center={geometry.center}
          width={windowItem.width}
          showWidth
        />
      )}

      <line
        x1={geometry.start.x}
        y1={geometry.start.y}
        x2={geometry.end.x}
        y2={geometry.end.y}
        stroke="transparent"
        strokeWidth={WALL_STROKE_WIDTH + 14}
        strokeLinecap="butt"
        pointerEvents="stroke"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}


function WindowShapeOnWall({
  geometry,
  wall,
  selected = false,
  preview = false,
  tabSide = 1,
}: {
  geometry: NonNullable<ReturnType<typeof getWindowGeometry>>;
  wall: Wall;
  selected?: boolean;
  preview?: boolean;
  tabSide?: 1 | -1;
}) {
  const normal = getPreferredNormal(wall.start, wall.end);
  const tabNormal = mul(normal, tabSide);
  const halfHeight = preview ? 8 : 7;
  const tabLength = preview ? 10 : 8;
  const tabWidth = preview ? 14 : 12;
  const center = geometry.center;
  const outerPoints = [
    add(geometry.start, mul(normal, halfHeight)),
    add(geometry.end, mul(normal, halfHeight)),
    add(geometry.end, mul(normal, -halfHeight)),
    add(geometry.start, mul(normal, -halfHeight)),
  ];
  const innerInset = 2;
  const innerPoints = [
    add(geometry.start, mul(normal, halfHeight - innerInset)),
    add(geometry.end, mul(normal, halfHeight - innerInset)),
    add(geometry.end, mul(normal, -(halfHeight - innerInset))),
    add(geometry.start, mul(normal, -(halfHeight - innerInset))),
  ];
  const tabBaseCenter = add(center, mul(tabNormal, halfHeight));
  const tabDirectionA = normalize(sub(wall.start, wall.end));
  const tabDirectionB = normalize(sub(wall.end, wall.start));
  const tabBaseLeft = add(tabBaseCenter, mul(tabDirectionA, tabWidth / 2));
  const tabBaseRight = add(tabBaseCenter, mul(tabDirectionB, tabWidth / 2));
  const tabTipLeft = add(tabBaseLeft, mul(tabNormal, tabLength));
  const tabTipRight = add(tabBaseRight, mul(tabNormal, tabLength));

  if (preview) {
    return (
      <g pointerEvents="none">
        <polygon
          points={outerPoints.map(toSvgPoint).join(" ")}
          fill="#35bed0"
          stroke="#0891b2"
          strokeWidth={1.4}
          opacity={0.9}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M ${tabBaseLeft.x} ${tabBaseLeft.y} L ${tabTipLeft.x} ${tabTipLeft.y} L ${tabTipRight.x} ${tabTipRight.y} L ${tabBaseRight.x} ${tabBaseRight.y}`}
          fill="#35bed0"
          stroke="#0891b2"
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const outlineStroke = selected ? "#0891b2" : "#111827";
  const innerStroke = selected ? "#0891b2" : "#6b7280";
  const fill = selected ? "#35bed0" : "#ffffff";

  return (
    <g pointerEvents="none">
      <polygon
        points={outerPoints.map(toSvgPoint).join(" ")}
        fill={fill}
        stroke={outlineStroke}
        strokeWidth={2}
        opacity={selected ? 0.9 : 1}
        vectorEffect="non-scaling-stroke"
      />
      {!selected && (
        <polygon
          points={innerPoints.map(toSvgPoint).join(" ")}
          fill="none"
          stroke={innerStroke}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={`M ${tabBaseLeft.x} ${tabBaseLeft.y} L ${tabTipLeft.x} ${tabTipLeft.y} L ${tabTipRight.x} ${tabTipRight.y} L ${tabBaseRight.x} ${tabBaseRight.y}`}
        fill={fill}
        stroke={outlineStroke}
        strokeWidth={2}
        opacity={selected ? 0.9 : 1}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function WindowPreview({
  preview,
  width,
  walls,
  showWidth = false,
}: {
  preview: WindowPlacementPreview;
  width: number;
  walls: Wall[];
  showWidth?: boolean;
}) {
  if (!preview.isValid || !preview.wall) {
    return <FreeStructurePlacementPreview center={preview.point} width={width} kind="window" />;
  }

  const geometry = getWindowGeometry(
    {
      id: "preview",
      wallId: preview.wall.id,
      t: preview.t,
      width,
      heightInches: 36,
      distanceFromFloorInches: 24,
    },
    preview.wall
  );

  if (!geometry) return null;

  return (
    <g pointerEvents="none">
      <WindowShapeOnWall
        geometry={geometry}
        wall={preview.wall}
        preview
        tabSide={getWindowTabSideFacingMeasurementGuide(preview.wall, walls)}
      />

      <WindowPlacementMeasurements
        wall={preview.wall}
        walls={walls}
        center={geometry.center}
        width={width}
        showWidth={showWidth}
      />
    </g>
  );
}

function WindowPlacementMeasurements({
  wall,
  walls,
  center,
  width,
  showWidth,
}: {
  wall: Wall;
  walls?: Wall[];
  center: Point;
  width: number;
  showWidth: boolean;
}) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const measurementWalls = walls?.length ? walls : [wall];
  const guideSide = getInteriorMeasurementGuideSide(wall, measurementWalls);
  const normal = guideSide === "left" ? baseNormal : mul(baseNormal, -1);
  const halfWidth = width / 2;
  const guideEndpoints = getStructureGuideEndpointsFromSideAnchors(
    wall,
    measurementWalls,
    guideSide,
    center,
    width
  );

  const startAnchor = guideEndpoints.startAnchor;
  const endAnchor = guideEndpoints.endAnchor;
  const startScalar = dot(sub(startAnchor, wall.start), direction);
  const endScalar = dot(sub(endAnchor, wall.start), direction);
  const rawCenterScalar = dot(sub(center, wall.start), direction);
  const centerScalar = clamp(
    rawCenterScalar,
    startScalar + halfWidth,
    Math.max(startScalar + halfWidth, endScalar - halfWidth)
  );
  const windowStart = add(wall.start, add(mul(direction, centerScalar - halfWidth), mul(normal, WALL_THICKNESS / 2)));
  const windowEnd = add(wall.start, add(mul(direction, centerScalar + halfWidth), mul(normal, WALL_THICKNESS / 2)));
  const offset = 30;
  const bracketStart = add(startAnchor, mul(normal, offset));
  const bracketWindowStart = add(windowStart, mul(normal, offset));
  const bracketWindowEnd = add(windowEnd, mul(normal, offset));
  const bracketEnd = add(endAnchor, mul(normal, offset));
  const tick = 12;
  const rotation = getTextRotation(wall.start, wall.end);

  const segmentLabel = (a: Point, b: Point) => {
    const mid = midpoint(a, b);
    return add(mid, mul(normal, 12));
  };

  return (
    <g pointerEvents="none">
      <BracketSegment start={bracketStart} end={bracketWindowStart} normal={normal} tick={tick} />
      <BracketSegment start={bracketWindowStart} end={bracketWindowEnd} normal={normal} tick={tick} />
      <BracketSegment start={bracketWindowEnd} end={bracketEnd} normal={normal} tick={tick} />

      <SvgTextHalo
        x={segmentLabel(bracketStart, bracketWindowStart).x}
        y={segmentLabel(bracketStart, bracketWindowStart).y}
        text={formatFeetInches(distance(startAnchor, windowStart), measurementDisplayUnit)}
        rotate={rotation}
        className="fill-slate-950 text-[12px] font-bold"
      />
      {showWidth && (
        <SvgTextHalo
          x={segmentLabel(bracketWindowStart, bracketWindowEnd).x}
          y={segmentLabel(bracketWindowStart, bracketWindowEnd).y}
          text={formatFeetInches(width, measurementDisplayUnit)}
          rotate={rotation}
          className="fill-slate-950 text-[12px] font-bold"
        />
      )}
      <SvgTextHalo
        x={segmentLabel(bracketWindowEnd, bracketEnd).x}
        y={segmentLabel(bracketWindowEnd, bracketEnd).y}
        text={formatFeetInches(distance(windowEnd, endAnchor), measurementDisplayUnit)}
        rotate={rotation}
        className="fill-slate-950 text-[12px] font-bold"
      />
    </g>
  );
}

function getStructureGuideEndpointsFromSideAnchors(
  wall: Wall,
  walls: Wall[],
  guideSide: Exclude<MeasurementSide, "length">,
  center: Point,
  width: number
) {
  const runEndpoints = getStructureGuideEndpointsFromMeasurementRun(
    wall,
    walls,
    guideSide
  );

  if (runEndpoints) return runEndpoints;

  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const normal = guideSide === "left" ? baseNormal : mul(baseNormal, -1);
  const halfWidth = width / 2;
  const centerScalar = dot(sub(center, wall.start), direction);
  const windowStartScalar = centerScalar - halfWidth;
  const windowEndScalar = centerScalar + halfWidth;
  const sideFaceBase = add(wall.start, mul(normal, WALL_THICKNESS / 2));
  const rawCandidates = getStructureGuideAnchorScalars(wall, walls, normal);
  const candidates = rawCandidates.length
    ? rawCandidates
    : [
        dot(sub(wall.start, wall.start), direction),
        dot(sub(wall.end, wall.start), direction),
      ];

  const uniqueCandidates = Array.from(
    new Set(candidates.map((value) => Math.round(value * 1000) / 1000))
  ).sort((a, b) => a - b);

  const before =
    [...uniqueCandidates]
      .reverse()
      .find((value) => value <= windowStartScalar + 0.001) ??
    uniqueCandidates[0];
  const after =
    uniqueCandidates.find((value) => value >= windowEndScalar - 0.001) ??
    uniqueCandidates[uniqueCandidates.length - 1];

  const startScalar = Math.min(before, after);
  const endScalar = Math.max(before, after);

  return {
    startAnchor: add(sideFaceBase, mul(direction, startScalar)),
    endAnchor: add(sideFaceBase, mul(direction, endScalar)),
  };
}

function getStructureGuideEndpointsFromMeasurementRun(
  wall: Wall,
  walls: Wall[],
  guideSide: Exclude<MeasurementSide, "length">
) {
  const chains = buildWallChains(walls.filter(isThickWall));
  const direction = normalize(sub(wall.end, wall.start));

  if (!vectorLength(direction)) return null;

  const baseNormal = normalize(perp(direction));
  const normal = guideSide === "left" ? baseNormal : mul(baseNormal, -1);
  const sideFaceBase = add(wall.start, mul(normal, WALL_THICKNESS / 2));
  const wallLineOffset = 14;

  for (const chain of chains) {
    const points = chain.points;
    let segmentIndex = -1;
    let isReversedInChain = false;

    for (let index = 0; index < points.length - 1; index += 1) {
      if (
        samePoint(points[index], wall.start) &&
        samePoint(points[index + 1], wall.end)
      ) {
        segmentIndex = index;
        isReversedInChain = false;
        break;
      }

      if (
        samePoint(points[index], wall.end) &&
        samePoint(points[index + 1], wall.start)
      ) {
        segmentIndex = index;
        isReversedInChain = true;
        break;
      }
    }

    if (segmentIndex < 0) continue;

    const chainGuideSide = isReversedInChain
      ? getOppositeMeasurementSide(guideSide)
      : guideSide;
    let runStart = segmentIndex;
    let runEnd = segmentIndex;

    while (
      runStart > 0 &&
      shouldMergeMeasurementRun(points, runStart - 1, chainGuideSide, walls)
    ) {
      runStart -= 1;
    }

    while (
      runEnd < points.length - 2 &&
      shouldMergeMeasurementRun(points, runEnd, chainGuideSide, walls)
    ) {
      runEnd += 1;
    }

    const firstLayout = getWallSideMeasurementLayout(
      points[runStart],
      points[runStart + 1],
      chainGuideSide,
      walls
    );
    const lastLayout = getWallSideMeasurementLayout(
      points[runEnd],
      points[runEnd + 1],
      chainGuideSide,
      walls
    );
    const mergedLayout = getMergedMeasurementLayout(firstLayout, lastLayout);

    // The structure guide should be a straight line with the same along-wall
    // endpoints as the wall's blue dotted measurement guide. Project both
    // dotted-line endpoints onto the hovered wall direction and rebuild them
    // on the same side-face line to avoid skew/diagonal brackets.
    const startScalar = dot(
      sub(add(mergedLayout.lineStart, mul(normal, -wallLineOffset)), wall.start),
      direction
    );
    const endScalar = dot(
      sub(add(mergedLayout.lineEnd, mul(normal, -wallLineOffset)), wall.start),
      direction
    );
    const minScalar = Math.min(startScalar, endScalar);
    const maxScalar = Math.max(startScalar, endScalar);

    return {
      startAnchor: add(sideFaceBase, mul(direction, minScalar)),
      endAnchor: add(sideFaceBase, mul(direction, maxScalar)),
    };
  }

  return null;
}

function getOppositeMeasurementSide(
  side: Exclude<MeasurementSide, "length">
): Exclude<MeasurementSide, "length"> {
  return side === "left" ? "right" : "left";
}


function getStructureGuideAnchorScalars(wall: Wall, walls: Wall[], normal: Point) {
  const direction = normalize(sub(wall.end, wall.start));
  const wallLineTolerance = WALL_THICKNESS + 3;
  const candidates: number[] = [];

  for (const currentWall of walls.filter(isThickWall)) {
    const currentDirection = normalize(sub(currentWall.end, currentWall.start));

    if (!vectorLength(currentDirection)) continue;
    if (Math.abs(dot(currentDirection, direction)) < 0.999) continue;

    const startDistanceToLine = Math.abs(dot(sub(currentWall.start, wall.start), normal));
    const endDistanceToLine = Math.abs(dot(sub(currentWall.end, wall.start), normal));

    if (startDistanceToLine > wallLineTolerance || endDistanceToLine > wallLineTolerance) {
      continue;
    }

    const endpointPairs: Array<[Point, Point]> = [
      [currentWall.start, currentWall.end],
      [currentWall.end, currentWall.start],
    ];

    for (const [endpoint, neighbor] of endpointPairs) {
      const anchor = getMeasurementGuideAnchor(endpoint, neighbor, normal, walls);
      const scalar = dot(sub(anchor, wall.start), direction);
      candidates.push(scalar);
    }
  }

  // Always include the hovered wall endpoints as a safe fallback.
  candidates.push(dot(sub(wall.start, wall.start), direction));
  candidates.push(dot(sub(wall.end, wall.start), direction));

  return candidates;
}


function BracketSegment({
  start,
  end,
  normal,
  tick,
}: {
  start: Point;
  end: Point;
  normal: Point;
  tick: number;
}) {
  return (
    <g>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#111827"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={start.x}
        y1={start.y}
        x2={start.x - normal.x * tick}
        y2={start.y - normal.y * tick}
        stroke="#111827"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={end.x}
        y1={end.y}
        x2={end.x - normal.x * tick}
        y2={end.y - normal.y * tick}
        stroke="#111827"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function SelectedWindowContextMenu({
  position,
  onFlip,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  position: Point;
  onFlip: () => void;
  onDelete: () => void;
  onDragStart: (
    event: React.PointerEvent<HTMLDivElement>,
    startPosition: Point
  ) => void;
  onDragMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={120}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[112px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected window menu"
          className="flex w-6 shrink-0 cursor-grab items-center justify-center bg-[#0fb8d2] active:cursor-grabbing"
          onPointerDown={(event) => onDragStart(event, position)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex flex-col gap-1">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>

        <button
          type="button"
          aria-label="Flip window handle"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onFlip();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeftRight className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label="Delete selected window"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </foreignObject>
  );
}

function WallAttachIndicator({ point }: { point: Point }) {
  return (
    <g pointerEvents="none">
      <circle
        cx={point.x}
        cy={point.y}
        r={15}
        fill="#43b3c8"
        vectorEffect="non-scaling-stroke"
      />

      <line
        x1={point.x - 7.5}
        y1={point.y}
        x2={point.x + 7.5}
        y2={point.y}
        stroke="white"
        strokeWidth={5}
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />

      <line
        x1={point.x}
        y1={point.y - 7.5}
        x2={point.x}
        y2={point.y + 7.5}
        stroke="white"
        strokeWidth={5}
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

// RoomInteriorFill
function RoomInteriorFill({ chains }: { chains: { points: Point[] }[] }) {
  return (
    <g pointerEvents="none">
      {chains.map((chain, index) => {
        if (chain.points.length < 4) return null;

        const firstPoint = chain.points[0];
        const lastPoint = chain.points[chain.points.length - 1];

        if (!samePoint(firstPoint, lastPoint)) return null;

        const polygonPoints = chain.points.slice(0, -1);

        return (
          <polygon
            key={`room-interior-fill-${index}-${polygonPoints.map(pointKey).join("-")}`}
            points={polygonPoints.map(toSvgPoint).join(" ")}
            fill="#fbfbfb"
          />
        );
      })}
    </g>
  );
}

function ThinWallLine({
  wall,
  onMeasurementClick,
  editingMeasurement: _editingMeasurement,
}: {
  wall: Wall;
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  editingMeasurement?: MeasurementEditState | null;
}) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const layout = getThinWallMeasurementLayout(wall.start, wall.end);
  const length = distance(wall.start, wall.end);
  const payload: MeasurementClickPayload = {
    segmentStart: wall.start,
    segmentEnd: wall.end,
    side: "length",
    currentEdgeLength: length,
    labelPoint: layout.labelPoint,
    rotation: layout.rotation,
  };
  return (
    <g>
      <line
        x1={wall.start.x}
        y1={wall.start.y}
        x2={wall.end.x}
        y2={wall.end.y}
        stroke="#6b7280"
        strokeWidth={THIN_WALL_STROKE_WIDTH}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <MeasurementLabelOnly
        layout={layout}
        label={formatFeetInches(length, measurementDisplayUnit)}
        onClick={onMeasurementClick ? () => onMeasurementClick(payload) : undefined}
      />
    </g>
  );
}


function PeninWallLine({
  wall,
  structuralWalls = [],
  onMeasurementClick,
  editingMeasurement,
}: {
  wall: Wall;
  structuralWalls?: Wall[];
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  editingMeasurement?: MeasurementEditState | null;
}) {
  const visibleSegment = getPeninWallVisibleSegment(wall, structuralWalls);
  const visibleWall = { ...wall, start: visibleSegment.start, end: visibleSegment.end };
  const length = distance(visibleWall.start, visibleWall.end);
  const direction = length > 0.001 ? normalize(sub(visibleWall.end, visibleWall.start)) : { x: 1, y: 0 };
  const normal = normalize(perp(direction));
  const halfThickness = PENIN_WALL_THICKNESS / 2;
  const endInset = Math.min(10, Math.max(0, length / 5));
  const insetHalfThickness = Math.max(2, halfThickness - 5);
  const start = add(visibleWall.start, mul(direction, endInset));
  const end = add(visibleWall.end, mul(direction, -endInset));
  const outerPolygon = [
    add(visibleWall.start, mul(normal, halfThickness)),
    add(visibleWall.end, mul(normal, halfThickness)),
    add(visibleWall.end, mul(normal, -halfThickness)),
    add(visibleWall.start, mul(normal, -halfThickness)),
  ];
  const innerPolygon = [
    add(start, mul(normal, insetHalfThickness)),
    add(end, mul(normal, insetHalfThickness)),
    add(end, mul(normal, -insetHalfThickness)),
    add(start, mul(normal, -insetHalfThickness)),
  ];

  return (
    <g>
      <polygon
        points={outerPolygon.map(toSvgPoint).join(" ")}
        fill="#f1ede4"
        stroke="#334155"
        strokeWidth="2.25"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={innerPolygon.map(toSvgPoint).join(" ")}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
      <WallChain
        points={[visibleWall.start, visibleWall.end]}
        sourceWalls={[visibleWall]}
        connectionMap={new Map()}
        onMeasurementClick={onMeasurementClick}
        editingMeasurement={editingMeasurement}
        renderWallBody={false}
      />
    </g>
  );
}


function PeninWallSelectionOverlay({
  wall,
  structuralWalls,
  showDegree = false,
  onRotateStart,
  onResizeStart,
}: {
  wall: Wall;
  structuralWalls: Wall[];
  showDegree?: boolean;
  onRotateStart: (event: React.PointerEvent<SVGPathElement>) => void;
  onResizeStart: (event: React.PointerEvent<SVGCircleElement>, endpoint: "start" | "end") => void;
}) {
  const visibleSegment = getPeninWallVisibleSegment(wall, structuralWalls);
  const visibleWall = { ...wall, start: visibleSegment.start, end: visibleSegment.end };
  const length = distance(visibleWall.start, visibleWall.end);
  if (length < 0.001) return null;

  const direction = normalize(sub(visibleWall.end, visibleWall.start));
  const normal = normalize(perp(direction));
  const center = midpoint(visibleWall.start, visibleWall.end);
  const rotation = getAngleDegrees(visibleWall.start, visibleWall.end);
  const halfThickness = PENIN_WALL_THICKNESS / 2;
  const selectedStroke = "#22bfd6";
  const handleFill = "#22bfd6";
  const startAttachment = isIslandWall(wall) ? null : getPeninWallEndpointAttachment(wall.start, structuralWalls);
  const endAttachment = isIslandWall(wall) ? null : getPeninWallEndpointAttachment(wall.end, structuralWalls);
  const canResizeStart = !startAttachment || Boolean(endAttachment);
  const canResizeEnd = !endAttachment || Boolean(startAttachment);
  const resizeStartPoint = startAttachment ? visibleWall.start : wall.start;
  const resizeEndPoint = endAttachment ? visibleWall.end : wall.end;
  const pseudoCabinet: CabinetElement = {
    id: wall.id,
    center,
    width: length,
    depth: PENIN_WALL_THICKNESS,
    rotation,
    category: "base",
  };
  const outlinePoints = [
    add(visibleWall.start, mul(normal, halfThickness)),
    add(visibleWall.end, mul(normal, halfThickness)),
    add(visibleWall.end, mul(normal, -halfThickness)),
    add(visibleWall.start, mul(normal, -halfThickness)),
  ];

  return (
    <g>
      <polygon
        points={outlinePoints.map(toSvgPoint).join(" ")}
        fill="none"
        stroke={selectedStroke}
        strokeWidth="2.6"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {canResizeStart && (
        <circle
          cx={resizeStartPoint.x}
          cy={resizeStartPoint.y}
          r="5"
          fill={handleFill}
          stroke="#ffffff"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          onPointerDown={(event) => onResizeStart(event, "start")}
          style={{ cursor: "ew-resize" }}
        />
      )}
      {canResizeEnd && (
        <circle
          cx={resizeEndPoint.x}
          cy={resizeEndPoint.y}
          r="5"
          fill={handleFill}
          stroke="#ffffff"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          onPointerDown={(event) => onResizeStart(event, "end")}
          style={{ cursor: "ew-resize" }}
        />
      )}
      <CabinetMoveRotateControl
        cabinetItem={pseudoCabinet}
        onRotateStart={onRotateStart}
        showDegree={showDegree}
      />
    </g>
  );
}

function WallChain({
  points,
  sourceWalls,
  connectionMap,
  hideInteriorDetails = false,
  onMeasurementClick,
  editingMeasurement: _editingMeasurement,
  renderWallBody = true,
  renderMeasurements = true,
  renderElevationViewDebugLine = false,
  getMeasurementLabelOffset,
}: {
  points: Point[];
  sourceWalls: Wall[];
  connectionMap: ConnectionMap;
  hideInteriorDetails?: boolean;
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  editingMeasurement?: MeasurementEditState | null;
  renderWallBody?: boolean;
  renderMeasurements?: boolean;
  renderElevationViewDebugLine?: boolean;
  getMeasurementLabelOffset?: (
    segmentStart: Point,
    segmentEnd: Point,
    side: "left" | "right",
    index: number
  ) => number;
}) {
  if (points.length < 2) return null;

  const geometry = buildBlackDotWallBand(points, sourceWalls);
  const chainWalls = sourceWalls.filter((wall) =>
    points.some(
      (point, index) =>
        index < points.length - 1 &&
        segmentMatchesWall(points[index], points[index + 1], wall.id, sourceWalls)
    )
  );
  const elevationViewDebugLines = renderElevationViewDebugLine
    ? chainWalls
        .flatMap((wall) => getWallCabinetPlacementDebugLines(wall, sourceWalls))
        .filter((line): line is { key: string; start: Point; end: Point } => Boolean(line))
        .filter((line) => distance(line.start, line.end) > 0.001)
    : [];

  return (
    <g>
      {renderWallBody && (
        <g>
          {geometry.segmentGeometries.map((segment, segmentIndex) => (
            <polygon
              key={`black-dot-wall-body-${segmentIndex}-${segment.polygon.map(pointKey).join("-")}`}
              points={segment.polygon.map(toSvgPoint).join(" ")}
              fill="#c9c9c9"
            />
          ))}
        </g>
      )}

      {elevationViewDebugLines.length > 0 && (
        <g pointerEvents="none">
          {elevationViewDebugLines.map((line) => (
            <line
              key={`elevation-view-debug-${line.key}`}
              x1={line.start.x}
              y1={line.start.y}
              x2={line.end.x}
              y2={line.end.y}
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}

      {renderMeasurements && (
        <WallMeasurementRuns
          points={points}
          edges={geometry.leftEdges}
          side="left"
          sourceWalls={sourceWalls}
          onMeasurementClick={onMeasurementClick}
          getMeasurementLabelOffset={getMeasurementLabelOffset}
        />
      )}

      {renderMeasurements && !hideInteriorDetails && (
        <WallMeasurementRuns
          points={points}
          edges={geometry.rightEdges}
          side="right"
          sourceWalls={sourceWalls}
          onMeasurementClick={onMeasurementClick}
          getMeasurementLabelOffset={getMeasurementLabelOffset}
        />
      )}

      {points.map((point) => {
        const isEndpointOpen = !isConnected(point, connectionMap);

        if (isEndpointOpen) return null;

        return null;
      })}
    </g>
  );
}

function MeasurementGuideAnchorDebugDots({
  walls,
  chains,
}: {
  walls: Wall[];
  chains: { points: Point[] }[];
}) {
  const debugDots: Point[] = [];

  for (const chain of chains) {
    const points = chain.points;

    for (let index = 0; index < points.length - 1; index += 1) {
      const segmentStart = points[index];
      const segmentEnd = points[index + 1];

      for (const side of ["left", "right"] as const) {
        const startAnchor = getWallSideMeasurementAnchor(
          segmentStart,
          segmentEnd,
          side,
          walls
        );
        const endAnchor = getWallSideMeasurementAnchor(
          segmentEnd,
          segmentStart,
          side,
          walls
        );

        debugDots.push(startAnchor);
        debugDots.push(endAnchor);
      }
    }
  }

  const uniqueDots = uniqueDebugPointsByDistance(debugDots, 1);

  if (uniqueDots.length === 0) return null;

  return (
    <g pointerEvents="none">
      {uniqueDots.map((point) => (
        <circle
          key={`measurement-black-dot-${pointKey(point)}`}
          cx={point.x}
          cy={point.y}
          r={3.25}
          fill="#000000"
          stroke="#000000"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

function uniqueDebugPointsByDistance(points: Point[], tolerance = 1) {
  const unique: Point[] = [];

  for (const point of points) {
    if (unique.some((existingPoint) => distance(existingPoint, point) <= tolerance)) {
      continue;
    }

    unique.push(point);
  }

  return unique;
}

function attachWallDebugDotsForExport(walls: Wall[]) {
  const thickWalls = walls.filter(isThickWall);
  return walls.map((wall) => {
    if (!isThickWall(wall)) return wall;
    const geometry = getWallSegmentBlackDotGeometry(
      wall.start,
      wall.end,
      thickWalls
    );

    return {
      ...wall,
      debugDots: {
        left: {
          start: geometry.startLeft,
          end: geometry.endLeft,
        },
        right: {
          start: geometry.startRight,
          end: geometry.endRight,
        },
      },
    };
  });
}

function getWallSideMeasurementAnchor(
  segmentStart: Point,
  segmentEnd: Point,
  side: Exclude<MeasurementSide, "length">,
  walls: Wall[]
) {
  const direction = normalize(sub(segmentEnd, segmentStart));
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);

  return getMeasurementGuideAnchor(segmentStart, segmentEnd, normal, walls);
}

function WallMeasurementRuns({
  points,
  edges,
  side,
  sourceWalls,
  onMeasurementClick,
  getMeasurementLabelOffset,
}: {
  points: Point[];
  edges: { a: Point; b: Point }[];
  side: Exclude<MeasurementSide, "length">;
  sourceWalls: Wall[];
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  getMeasurementLabelOffset?: (
    segmentStart: Point,
    segmentEnd: Point,
    side: "left" | "right",
    index: number
  ) => number;
}) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const measurementLines: React.ReactNode[] = [];
  let index = 0;

  while (index < edges.length) {
    let endIndex = index;

    while (
      endIndex < edges.length - 1 &&
      shouldMergeMeasurementRun(points, endIndex, side, sourceWalls)
    ) {
      endIndex += 1;
    }

    const labelOffset =
      getMeasurementLabelOffset?.(points[index], points[index + 1], side, index) ??
      18;
    const firstLayout = getWallSideMeasurementLayout(
      points[index],
      points[index + 1],
      side,
      sourceWalls,
      labelOffset
    );
    const lastLayout = getWallSideMeasurementLayout(
      points[endIndex],
      points[endIndex + 1],
      side,
      sourceWalls,
      labelOffset
    );
    const layout = getMergedMeasurementLayout(firstLayout, lastLayout);
    const edgeLength = distance(layout.lineStart, layout.lineEnd);
    const displayLength =
      getConvertedMeasurementRunDisplayLength(
        points,
        index,
        endIndex,
        side,
        sourceWalls
      ) ?? edgeLength;

    const payload: MeasurementClickPayload = {
      segmentStart: points[index],
      segmentEnd: points[endIndex + 1],
      side,
      currentEdgeLength: displayLength,
      labelPoint: layout.labelPoint,
      rotation: layout.rotation,
    };

    measurementLines.push(
      <MeasurementLine
        key={`${side}-measure-run-${index}-${endIndex}`}
        layout={layout}
        label={formatFeetInches(displayLength, measurementDisplayUnit)}
        onClick={onMeasurementClick ? () => onMeasurementClick(payload) : undefined}
      />
    );

    index = endIndex + 1;
  }

  return <>{measurementLines}</>;
}

function JointIndicators({
  points,
  geometry,
  connectionMap,
  hideInteriorDetails = false,
}: {
  points: Point[];
  geometry: WallBandGeometry;
  connectionMap: ConnectionMap;
  hideInteriorDetails?: boolean;
}) {
  return (
    <g>
      {points.slice(1, -1).map((center, index) => {
        if ((connectionMap.get(pointKey(center)) ?? 0) > 2) {
          return null;
        }

        const pointIndex = index + 1;
        const previous = points[pointIndex - 1];
        const next = points[pointIndex + 1];

        const previousDir = normalize(sub(previous, center));
        const nextDir = normalize(sub(next, center));

        const leftCorner = geometry.left[pointIndex];
        const rightCorner = geometry.right[pointIndex];

        return (
          <g key={`joint-${pointIndex}-${center.x}-${center.y}`}>
            <CornerJointMarker
              point={leftCorner}
              previousDir={previousDir}
              nextDir={nextDir}
            />

            {!hideInteriorDetails && (
              <CornerJointMarker
                point={rightCorner}
                previousDir={previousDir}
                nextDir={nextDir}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function CornerJointMarker({
  point,
  previousDir,
  nextDir,
}: {
  point: Point;
  previousDir: Point;
  nextDir: Point;
}) {
  const previousTick = add(point, mul(previousDir, JOINT_TICK_LENGTH));
  const nextTick = add(point, mul(nextDir, JOINT_TICK_LENGTH));

  return (
    <g>
      <line
        x1={point.x}
        y1={point.y}
        x2={previousTick.x}
        y2={previousTick.y}
        stroke="#43b3c8"
        strokeWidth={4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      <line
        x1={point.x}
        y1={point.y}
        x2={nextTick.x}
        y2={nextTick.y}
        stroke="#43b3c8"
        strokeWidth={4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      <circle
        cx={point.x}
        cy={point.y}
        r={JOINT_DOT_RADIUS}
        fill="#43b3c8"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function MultiConnectionJointIndicators({
  walls,
  connectionMap,
}: {
  walls: Wall[];
  connectionMap: ConnectionMap;
}) {
  const junctionPoints = getMultiConnectedEndpoints(walls, connectionMap);

  return (
    <g>
      {junctionPoints.map((point) => {
        const arms = getConnectedWallArmsAtPoint(point, walls);
        const markerSegments = getJunctionEdgeMarkerSegments(point, arms);

        return (
          <g key={`multi-joint-${pointKey(point)}`}>
            {markerSegments.map((segment, index) => (
              <g key={`multi-joint-edge-${pointKey(point)}-${index}`}>
                <line
                  x1={segment.start.x}
                  y1={segment.start.y}
                  x2={segment.end.x}
                  y2={segment.end.y}
                  stroke="#43b3c8"
                  strokeWidth={4}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />

                <circle
                  cx={segment.start.x}
                  cy={segment.start.y}
                  r={JOINT_DOT_RADIUS - 1}
                  fill="#43b3c8"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
}

type JunctionArm = {
  wall: Wall;
  direction: Point;
};

type JunctionMarkerSegment = {
  start: Point;
  end: Point;
};

type JunctionMarkerCandidate = {
  wall: Wall;
  direction: Point;
  normal: Point;
  start: Point;
};

function getConnectedWallArmsAtPoint(point: Point, walls: Wall[]): JunctionArm[] {
  const arms: JunctionArm[] = [];

  for (const wall of walls) {
    let direction: Point | null = null;

    if (samePoint(point, wall.start)) {
      direction = normalize(sub(wall.end, wall.start));
    } else if (samePoint(point, wall.end)) {
      direction = normalize(sub(wall.start, wall.end));
    }

    if (!direction || !vectorLength(direction)) continue;

    arms.push({ wall, direction });
  }

  return arms;
}

function getJunctionEdgeMarkerSegments(point: Point, arms: JunctionArm[]) {
  const candidates = getJunctionMarkerCandidates(point, arms);
  const segments: JunctionMarkerSegment[] = [];

  for (const candidate of candidates) {
    const segment = getVisibleJunctionMarkerSegment(candidate, arms);
    if (!segment) continue;

    if (isDuplicateJunctionMarkerSegment(segments, segment.start, segment.end)) {
      continue;
    }

    segments.push(segment);
  }

  return segments;
}

function getJunctionMarkerCandidates(point: Point, arms: JunctionArm[]) {
  const halfThickness = WALL_THICKNESS / 2;
  const edgeOffset = 0.9;
  const candidates: JunctionMarkerCandidate[] = [];

  for (const arm of arms) {
    const normals = [normalize(perp(arm.direction)), normalize(mul(perp(arm.direction), -1))];

    for (const normal of normals) {
      candidates.push({
        wall: arm.wall,
        direction: normalize(arm.direction),
        normal,
        start: add(point, mul(normal, halfThickness + edgeOffset)),
      });
    }
  }

  return candidates;
}

function getVisibleJunctionMarkerSegment(
  candidate: JunctionMarkerCandidate,
  arms: JunctionArm[]
) {
  const maxDistance = JOINT_TICK_LENGTH;
  const step = 0.75;
  const outwardProbe = 2.75;
  const minVisibleLength = 4.5;

  let firstVisibleDistance: number | null = null;
  let lastVisibleDistance: number | null = null;

  for (let distanceAlongEdge = 0; distanceAlongEdge <= maxDistance; distanceAlongEdge += step) {
    const sample = add(candidate.start, mul(candidate.direction, distanceAlongEdge));
    const outsideSample = add(sample, mul(candidate.normal, outwardProbe));

    const blocked = arms.some((arm) => {
      if (arm.wall.id === candidate.wall.id) return false;

      return (
        pointIsInsideWallBody(sample, arm.wall, 0.15) ||
        pointIsInsideWallBody(outsideSample, arm.wall, 0.15)
      );
    });

    if (!blocked) {
      if (firstVisibleDistance === null) firstVisibleDistance = distanceAlongEdge;
      lastVisibleDistance = distanceAlongEdge;
    } else if (firstVisibleDistance !== null) {
      break;
    }
  }

  if (firstVisibleDistance === null || lastVisibleDistance === null) {
    return null;
  }

  const visibleLength = lastVisibleDistance - firstVisibleDistance + step;
  if (visibleLength < minVisibleLength) {
    return null;
  }

  return {
    start: add(candidate.start, mul(candidate.direction, firstVisibleDistance)),
    end: add(
      candidate.start,
      mul(candidate.direction, Math.min(maxDistance, lastVisibleDistance + step))
    ),
  };
}

function pointIsInsideWallBody(point: Point, wall: Wall, tolerance = 0) {
  const projectedPoint = closestPointOnSegment(point, wall.start, wall.end);
  const distanceFromCenterline = distance(point, projectedPoint);

  if (distanceFromCenterline > WALL_THICKNESS / 2 + tolerance) return false;

  const wallLength = distance(wall.start, wall.end);
  const startDistance = distance(wall.start, projectedPoint);
  const endDistance = distance(projectedPoint, wall.end);

  return startDistance <= wallLength + tolerance && endDistance <= wallLength + tolerance;
}

function isDuplicateJunctionMarkerSegment(
  segments: JunctionMarkerSegment[],
  start: Point,
  end: Point
) {
  return segments.some((segment) => {
    return (
      (distance(segment.start, start) < 1 && distance(segment.end, end) < 1) ||
      (distance(segment.start, end) < 1 && distance(segment.end, start) < 1)
    );
  });
}

function SelectedWallOverlay({ wall, walls = [wall] }: { wall: Wall; walls?: Wall[] }) {
  if (isThinWall(wall)) {
    return (
      <g>
        <line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} stroke="#00aee6" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={wall.start.x} cy={wall.start.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        <circle cx={wall.end.x} cy={wall.end.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  const geometry = getWallSegmentBlackDotGeometry(
    wall.start,
    wall.end,
    walls.filter(isThickWall)
  );
  const polygonPoints = geometry.polygon.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <g>
      <polygon
        points={polygonPoints}
        fill="#b7edf4"
        fillOpacity="0.72"
        stroke="#00aee6"
        strokeWidth={2.8}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={geometry.startLeft.x}
        y1={geometry.startLeft.y}
        x2={geometry.endLeft.x}
        y2={geometry.endLeft.y}
        stroke="#00aee6"
        strokeWidth={2}
        strokeLinecap="butt"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={geometry.startRight.x}
        y1={geometry.startRight.y}
        x2={geometry.endRight.x}
        y2={geometry.endRight.y}
        stroke="#00aee6"
        strokeWidth={2}
        strokeLinecap="butt"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function WallSelectionHitAreas({
  walls,
  activeTool,
  selectedWallId,
  onSelectWall,
  onPeninWallDragStart,
}: {
  walls: Wall[];
  activeTool: Tool;
  selectedWallId?: string | null;
  onSelectWall: (id: string) => void;
  onPeninWallDragStart?: (event: React.PointerEvent<SVGLineElement>, wall: Wall) => void;
}) {
  if (isDrawingTool(activeTool) || activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-cabinet") return null;

  return (
    <g>
      {walls.map((wall) => (
        <line
          key={`hit-${wall.id}`}
          x1={wall.start.x}
          y1={wall.start.y}
          x2={wall.end.x}
          y2={wall.end.y}
          stroke="transparent"
          strokeWidth={isThinWall(wall) ? 26 : Math.max(WALL_STROKE_WIDTH + 22, 34)}
          strokeLinecap="round"
          pointerEvents="stroke"
          vectorEffect="non-scaling-stroke"
          style={{ cursor: isDetachedPanelWall(wall) && selectedWallId === wall.id && onPeninWallDragStart ? "move" : "pointer" }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isDetachedPanelWall(wall) && selectedWallId === wall.id && onPeninWallDragStart) {
              onPeninWallDragStart(event, wall);
              return;
            }
            onSelectWall(wall.id);
          }}
        />
      ))}
    </g>
  );
}

function SelectedWallContextMenu({
  position,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  position: Point;
  onDelete: () => void;
  onDragStart: (
    event: React.PointerEvent<HTMLDivElement>,
    startPosition: Point
  ) => void;
  onDragMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={82}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[74px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected wall menu"
          className="flex w-6 shrink-0 cursor-grab items-center justify-center bg-[#0fb8d2] active:cursor-grabbing"
          onPointerDown={(event) => onDragStart(event, position)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex flex-col gap-1">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>

        <button
          type="button"
          aria-label="Delete selected wall"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </foreignObject>
  );
}

function getWallMenuPosition(wall: Wall): Point {
  const menuHeight = 46;
  const endpointGap = 18;

  const start = wall.start;
  const end = wall.end;

  // Pick the endpoint that is visually more to the right.
  // If the wall is vertical, pick the lower endpoint so the menu still appears
  // beside a clear wall point instead of floating in the middle.
  const rightSidePoint =
    end.x > start.x
      ? end
      : start.x > end.x
        ? start
        : end.y >= start.y
          ? end
          : start;

  return {
    x: rightSidePoint.x + endpointGap,
    y: rightSidePoint.y - menuHeight / 2,
  };
}

function MeasurementLine({
  layout,
  label,
  onClick,
}: {
  layout: MeasurementLayout;
  label: string;
  onClick?: () => void;
}) {
  return (
    <g>
      <line
        x1={layout.lineStart.x}
        y1={layout.lineStart.y}
        x2={layout.lineEnd.x}
        y2={layout.lineEnd.y}
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeDasharray="4 9"
        pointerEvents="none"
        vectorEffect="non-scaling-stroke"
      />

      <MeasurementEndCap
        point={layout.lineStart}
        lineStart={layout.lineStart}
        lineEnd={layout.lineEnd}
      />
      <MeasurementEndCap
        point={layout.lineEnd}
        lineStart={layout.lineStart}
        lineEnd={layout.lineEnd}
      />

      <g
        className={onClick ? "cursor-pointer" : undefined}
        onPointerDown={(event) => {
          if (!onClick) return;

          event.preventDefault();
          event.stopPropagation();
          onClick();
        }}
      >
        <SvgTextHalo
          x={layout.labelPoint.x}
          y={layout.labelPoint.y}
          text={label}
          rotate={layout.rotation}
          className="fill-slate-950 text-[14px] font-bold"
        />
      </g>
    </g>
  );
}

function MeasurementEndCap({
  point,
  lineStart,
  lineEnd,
}: {
  point: Point;
  lineStart: Point;
  lineEnd: Point;
}) {
  const direction = normalize(sub(lineEnd, lineStart));
  const normal = perp(direction);
  const capHalfLength = 5;
  const start = add(point, mul(normal, capHalfLength));
  const end = add(point, mul(normal, -capHalfLength));

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke="#38bdf8"
      strokeWidth={2}
      strokeLinecap="square"
      pointerEvents="none"
      vectorEffect="non-scaling-stroke"
    />
  );
}

function MeasurementLabelOnly({
  layout,
  label,
  onClick,
}: {
  layout: MeasurementLayout;
  label: string;
  onClick?: () => void;
}) {
  return (
    <g
      className={onClick ? "cursor-pointer" : undefined}
      onPointerDown={(event) => {
        if (!onClick) return;

        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <SvgTextHalo
        x={layout.labelPoint.x}
        y={layout.labelPoint.y}
        text={label}
        rotate={layout.rotation}
        className="fill-slate-950 text-[14px] font-bold"
      />
    </g>
  );
}


function MeasurementEditModal({
  edit,
  onCancel,
  onApply,
}: {
  edit: MeasurementEditState;
  onCancel: () => void;
  onApply: (value: string) => void;
}) {
  const initialParts = formatFeetInchesParts(edit.currentEdgeLength);
  const [feet, setFeet] = useState(initialParts.feet);
  const [inches, setInches] = useState(initialParts.inches);

  useEffect(() => {
    const nextParts = formatFeetInchesParts(edit.currentEdgeLength);
    setFeet(nextParts.feet);
    setInches(nextParts.inches);
  }, [edit.wallId, edit.side, edit.currentEdgeLength]);


  const applyCurrentValue = () => {
    onApply(`${feet || "0"} ${inches || "0"}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      event.preventDefault();
      applyCurrentValue();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  const handleFeetChange = (value: string) => {
    setFeet(value.replace(/[^0-9.]/g, ""));
  };

  const handleInchesChange = (value: string) => {
    setInches(value.replace(/[^0-9.]/g, ""));
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/20"
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="w-[360px] rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-pelican-navy">
              Edit measurement
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Update the selected wall length.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close measurement editor"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Length
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Feet
              </div>
              <div className="flex h-11 items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
                <input
                  aria-label="Feet"
                  value={feet}
                  onChange={(event) => handleFeetChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold text-slate-950 outline-none"
                />
                <span className="ml-2 text-lg font-bold text-slate-500">'</span>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Inches
              </div>
              <div className="flex h-11 items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
                <input
                  aria-label="Inches"
                  value={inches}
                  onChange={(event) => handleInchesChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold text-slate-950 outline-none"
                />
                <span className="ml-2 text-lg font-bold text-slate-500">&quot;</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={applyCurrentValue}
            className="h-9 rounded-md bg-pelican-teal px-4 text-sm font-semibold text-white shadow-sm hover:brightness-95"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}


function WallDrawingOverlay({
  start,
  end,
  horizontalY,
  verticalX,
  showSerialStart,
}: {
  start: Point;
  end: Point;
  horizontalY?: number;
  verticalX?: number;
  showSerialStart: boolean;
}) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const length = distance(start, end);
  const hasLength = length > 4;
  const label = formatFeetInches(length, measurementDisplayUnit);

  const measure = getMeasurementLayout(start, end, "exterior");
  const angleGuide = getAngleGuideLayout(start, end);

  return (
    <g>
      {horizontalY !== undefined && (
        <line
          x1={0}
          y1={horizontalY}
          x2={WORKSPACE_WIDTH}
          y2={horizontalY}
          stroke="#ef4444"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {verticalX !== undefined && (
        <line
          x1={verticalX}
          y1={0}
          x2={verticalX}
          y2={WORKSPACE_HEIGHT}
          stroke="#ef4444"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hasLength && angleGuide.mode === "full" && (
        <circle
          cx={start.x}
          cy={start.y}
          r={length}
          fill="none"
          stroke="#777"
          strokeWidth={1.25}
          opacity={0.85}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hasLength && angleGuide.mode !== "full" && (
        <path
          d={describeHalfArc(start, length, angleGuide.mode)}
          fill="none"
          stroke="#777"
          strokeWidth={1.25}
          opacity={0.85}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hasLength && (
        <>
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#c9c9c9"
            strokeWidth={WALL_STROKE_WIDTH}
            strokeLinecap="butt"
            vectorEffect="non-scaling-stroke"
          />

          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#31bde2"
            strokeWidth={WALL_STROKE_WIDTH}
            strokeLinecap="butt"
            opacity={0.28}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {hasLength && <MeasurementLine layout={measure} label={label} />}

      {hasLength &&
        angleGuide.labels.map((item) => (
          <SvgTextHalo
            key={`${item.text}-${item.point.x}-${item.point.y}`}
            x={item.point.x}
            y={item.point.y}
            text={item.text}
            className="fill-slate-950 text-[14px] font-bold"
          />
        ))}

      <PointHandle point={start} variant={showSerialStart ? "serial" : "blue"} />

      {hasLength && <PointHandle point={end} variant="blue" />}
    </g>
  );
}

function ThinWallDrawingOverlay({ start, end, horizontalY, verticalX, showSerialStart: _showSerialStart }: { start: Point; end: Point; horizontalY?: number; verticalX?: number; showSerialStart: boolean }) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  const length = distance(start, end);
  const hasLength = length > 4;
  const measure = getThinWallMeasurementLayout(start, end);
  const angleGuide = getAngleGuideLayout(start, end);
  return (
    <g>
      {horizontalY !== undefined && <line x1={0} y1={horizontalY} x2={WORKSPACE_WIDTH} y2={horizontalY} stroke="#ef4444" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      {verticalX !== undefined && <line x1={verticalX} y1={0} x2={verticalX} y2={WORKSPACE_HEIGHT} stroke="#ef4444" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      {hasLength && angleGuide.mode === "full" && <circle cx={start.x} cy={start.y} r={length} fill="none" stroke="#777" strokeWidth={1.25} opacity={0.85} vectorEffect="non-scaling-stroke" />}
      {hasLength && angleGuide.mode !== "full" && <path d={describeHalfArc(start, length, angleGuide.mode)} fill="none" stroke="#777" strokeWidth={1.25} opacity={0.85} vectorEffect="non-scaling-stroke" />}
      {hasLength && <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#31bde2" strokeWidth={THIN_WALL_STROKE_WIDTH} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {hasLength && <MeasurementLabelOnly layout={measure} label={formatFeetInches(length, measurementDisplayUnit)} />}
      {hasLength && angleGuide.labels.map((item) => <SvgTextHalo key={`${item.text}-${item.point.x}-${item.point.y}`} x={item.point.x} y={item.point.y} text={item.text} className="fill-slate-950 text-[14px] font-bold" />)}
      <ThinPointHandle point={start} variant="red" />
      {hasLength && <ThinPointHandle point={end} variant="blue" />}
    </g>
  );
}

function OpenEndpoint({ point }: { point: Point }) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={13}
      fill="#ff9b9b"
      fillOpacity={0.72}
      stroke="#ff7b7b"
      strokeWidth={3}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function ThinOpenEndpoint({ point }: { point: Point }) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={8}
      fill="#ff9b9b"
      fillOpacity={0.72}
      stroke="#ff7b7b"
      strokeWidth={3}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function ThinJointDot({ point }: { point: Point }) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={4}
      fill="#43b3c8"
      vectorEffect="non-scaling-stroke"
    />
  );
}

function SvgTextHalo({
  x,
  y,
  text,
  rotate = 0,
  className,
}: {
  x: number;
  y: number;
  text: string;
  rotate?: number;
  className?: string;
}) {
  const transform = `rotate(${rotate} ${x} ${y})`;

  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={transform}
        className={cn("text-[14px] font-bold", className)}
        stroke="white"
        strokeWidth={7}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {text}
      </text>

      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={transform}
        className={cn("text-[14px] font-bold", className)}
      >
        {text}
      </text>
    </g>
  );
}

function PointHandle({
  point,
  variant,
}: {
  point: Point;
  variant: "blue" | "serial";
}) {
  if (variant === "serial") {
    return (
      <g>
        <line
          x1={point.x - 18}
          y1={point.y}
          x2={point.x + 18}
          y2={point.y}
          stroke="#ef4444"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        <line
          x1={point.x}
          y1={point.y - 18}
          x2={point.x}
          y2={point.y + 18}
          stroke="#ef4444"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        <circle
          cx={point.x}
          cy={point.y}
          r={13}
          fill="none"
          stroke="#00aee6"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={13}
      fill="white"
      stroke="#00aee6"
      strokeWidth={3}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function ThinPointHandle({ point, variant }: { point: Point; variant: "blue" | "serial" | "red" }) {
  if (variant === "red") {
    return <circle cx={point.x} cy={point.y} r={8} fill="#ff9b9b" fillOpacity={0.72} stroke="#ff7b7b" strokeWidth={3} vectorEffect="non-scaling-stroke" />;
  }

  if (variant === "serial") {
    return <g><line x1={point.x - 14} y1={point.y} x2={point.x + 14} y2={point.y} stroke="#ef4444" strokeWidth={2} vectorEffect="non-scaling-stroke" /><line x1={point.x} y1={point.y - 14} x2={point.x} y2={point.y + 14} stroke="#ef4444" strokeWidth={2} vectorEffect="non-scaling-stroke" /><circle cx={point.x} cy={point.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" /></g>;
  }

  return <circle cx={point.x} cy={point.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />;
}

function MoveControl({
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  return (
    <div
      className="absolute left-10 top-10 z-10 h-[86px] w-[86px] cursor-default"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="absolute inset-0 rotate-45 rounded-md bg-white shadow-soft" />

      <button
        type="button"
        aria-label="Move canvas view up"
        onClick={onMoveUp}
        className="absolute left-1/2 top-1 flex h-8 w-8 -translate-x-1/2 items-center justify-center text-slate-400 hover:text-pelican-navy"
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      <button
        type="button"
        aria-label="Move canvas view left"
        onClick={onMoveLeft}
        className="absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-pelican-navy"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      </div>

      <button
        type="button"
        aria-label="Move canvas view right"
        onClick={onMoveRight}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-pelican-navy"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <button
        type="button"
        aria-label="Move canvas view down"
        onClick={onMoveDown}
        className="absolute bottom-1 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center text-slate-400 hover:text-pelican-navy"
      >
        <ChevronDownIcon className="h-5 w-5" />
      </button>
    </div>
  );
}



function DoorPropertiesPanel({
  selectedDoor,
  onBack,
}: {
  selectedDoor: DoorSelectionDetail;
  onBack: () => void;
}) {
  const updateDoorNumber = (
    field: "widthInches" | "heightInches" | "distanceFromFloorInches" | "distanceFromLeftInches" | "distanceFromRightInches",
    value: string
  ) => {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) return;

    window.dispatchEvent(
      new CustomEvent("pelican-door-attribute-change", {
        detail: {
          id: selectedDoor.id,
          field,
          value: nextValue,
        },
      })
    );
  };


  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pelican-navy hover:text-pelican-teal"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="space-y-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <SimpleDoorShape />
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Doors
            </div>
            <div className="text-sm font-bold text-slate-700">
              Simple Door
            </div>
          </div>
        </div>

        <WindowPropertyInput
          label="Width"
          value={roundToQuarter(selectedDoor.widthInches)}
          unit="in"
          onChange={(value) => updateDoorNumber("widthInches", value)}
        />
        <WindowPropertyInput
          label="Height"
          value={roundToQuarter(selectedDoor.heightInches)}
          unit="in"
          onChange={(value) => updateDoorNumber("heightInches", value)}
        />
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Position on wall
          </div>

          {selectedDoor.distanceFromLeftInches !== undefined &&
            selectedDoor.distanceFromRightInches !== undefined &&
            selectedDoor.wallWidthInches !== undefined && (
              <>
                <WindowPropertyInput
                  label="Distance from left"
                  value={roundToQuarter(selectedDoor.distanceFromLeftInches)}
                  unit="in"
                  max={Math.max(0, selectedDoor.wallWidthInches - selectedDoor.widthInches)}
                  onChange={(value) =>
                    updateDoorNumber("distanceFromLeftInches", value)
                  }
                />
                <WindowPropertyInput
                  label="Distance from right"
                  value={roundToQuarter(selectedDoor.distanceFromRightInches)}
                  unit="in"
                  max={Math.max(0, selectedDoor.wallWidthInches - selectedDoor.widthInches)}
                  onChange={(value) =>
                    updateDoorNumber("distanceFromRightInches", value)
                  }
                />
              </>
            )}

          <WindowPropertyInput
            label="Distance from bottom"
            value={roundToQuarter(selectedDoor.distanceFromFloorInches)}
            unit="in"
            onChange={(value) =>
              updateDoorNumber("distanceFromFloorInches", value)
            }
          />
        </div>

        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Door finish
          </div>
          <FinishCard label="Decorator's White" subLabel="Benjamin Moore" />
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Hardware finish
          </div>
          <FinishCard label="Stainless Steel" subLabel="Matcap" />
        </div>
      </div>
    </aside>
  );
}

function WindowPropertiesPanel({
  selectedWindow,
  onBack,
}: {
  selectedWindow: WindowSelectionDetail;
  onBack: () => void;
}) {
  const updateWindowNumber = (
    field: "widthInches" | "heightInches" | "distanceFromFloorInches" | "distanceFromLeftInches" | "distanceFromRightInches",
    value: string
  ) => {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) return;

    window.dispatchEvent(
      new CustomEvent("pelican-window-attribute-change", {
        detail: {
          id: selectedWindow.id,
          field,
          value: nextValue,
        },
      })
    );
  };

  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pelican-navy hover:text-pelican-teal"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="space-y-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <SimpleWindowShape />
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Windows
            </div>
            <div className="text-sm font-bold text-slate-700">
              Simple Window
            </div>
          </div>
        </div>

        <WindowPropertyInput
          label="Width"
          value={roundToQuarter(selectedWindow.widthInches)}
          unit="in"
          onChange={(value) => updateWindowNumber("widthInches", value)}
        />
        <WindowPropertyInput
          label="Height"
          value={roundToQuarter(selectedWindow.heightInches)}
          unit="in"
          onChange={(value) => updateWindowNumber("heightInches", value)}
        />
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Position on wall
          </div>

          {selectedWindow.distanceFromLeftInches !== undefined &&
            selectedWindow.distanceFromRightInches !== undefined &&
            selectedWindow.wallWidthInches !== undefined && (
              <>
                <WindowPropertyInput
                  label="Distance from left"
                  value={roundToQuarter(selectedWindow.distanceFromLeftInches)}
                  unit="in"
                  max={Math.max(0, selectedWindow.wallWidthInches - selectedWindow.widthInches)}
                  onChange={(value) =>
                    updateWindowNumber("distanceFromLeftInches", value)
                  }
                />
                <WindowPropertyInput
                  label="Distance from right"
                  value={roundToQuarter(selectedWindow.distanceFromRightInches)}
                  unit="in"
                  max={Math.max(0, selectedWindow.wallWidthInches - selectedWindow.widthInches)}
                  onChange={(value) =>
                    updateWindowNumber("distanceFromRightInches", value)
                  }
                />
              </>
            )}

          <WindowPropertyInput
            label="Distance from bottom"
            value={roundToQuarter(selectedWindow.distanceFromFloorInches)}
            unit="in"
            onChange={(value) =>
              updateWindowNumber("distanceFromFloorInches", value)
            }
          />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Frame style
          </div>
          <div className="flex h-14 items-center justify-between rounded-md border border-slate-200 bg-white px-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-slate-100" />
              <div className="text-sm font-bold text-slate-800">Basic</div>
            </div>
            <PencilLine className="h-4 w-4 text-slate-300" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Window finish
          </div>
          <FinishCard label="Decorator's White" subLabel="Benjamin Moore" />
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Frame finish
          </div>
          <FinishCard label="Decorator's White" subLabel="Benjamin Moore" />
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Hardware finish
          </div>
          <FinishCard label="Stainless Steel" subLabel="Matcap" />
        </div>
      </div>
    </aside>
  );
}

function WallPropertiesPanel({
  selectedWall,
  onBack,
}: {
  selectedWall: WallSelectionDetail;
  onBack: () => void;
}) {
  const isThickWallSelection = selectedWall.kind !== "thin-wall";

  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pelican-navy hover:text-pelican-teal"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="space-y-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-100 text-pelican-navy">
            <BrickWall className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Walls
            </div>
            <div className="text-sm font-bold text-slate-700">
              {selectedWall.kind === "thin-wall"
                ? "Thin Wall"
                : selectedWall.kind === "penin-wall"
                  ? "Peninsula Wall"
                  : selectedWall.kind === "island-wall"
                    ? "Island Wall"
                    : "Wall"}
            </div>
          </div>
        </div>

        {isThickWallSelection ? (
          <div className="space-y-2">
            <label
              htmlFor="wall-cabinet-placement-mode"
              className="text-[11px] font-bold uppercase text-pelican-navy"
            >
              Cabinet placement side
            </label>
            <select
              id="wall-cabinet-placement-mode"
              value={selectedWall.cabinetPlacementMode ?? "interior"}
              onChange={(event) => {
                window.dispatchEvent(
                  new CustomEvent("pelican-wall-cabinet-placement-mode-change", {
                    detail: {
                      id: selectedWall.id,
                      value: event.target.value as WallCabinetPlacementMode,
                    },
                  })
                );
              }}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-pelican-teal"
            >
              <option value="none">None</option>
              <option value="both">Both</option>
              <option value="interior">Interior</option>
              <option value="exterior">Exterior</option>
            </select>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function CabinetPropertiesPanel({
  selectedCabinet,
  onBack,
}: {
  selectedCabinet: CabinetSelectionDetail;
  onBack: () => void;
}) {
  const [customDimensionCabinetIds, setCustomDimensionCabinetIds] = useState<Set<string>>(() => new Set());
  const isSelectedAccessory = isAccessoryCabinetImage(selectedCabinet.image);
  const selectedCabinetDimensions: CabinetDimensionSet = {
    widthInches: roundToQuarter(selectedCabinet.widthInches),
    heightInches: roundToQuarter(selectedCabinet.heightInches),
    depthInches: roundToQuarter(selectedCabinet.depthInches),
  };
  const selectedCatalogItem = getCabinetCatalogItemByIdentity({
    catalogId: selectedCabinet.catalogId,
    image: selectedCabinet.image,
  });
  const dimensionOptions = selectedCatalogItem && !isSelectedAccessory
    ? getCatalogDimensionOptions(selectedCatalogItem)
    : {
        widths: [selectedCabinetDimensions.widthInches],
        heights: [selectedCabinetDimensions.heightInches],
        depths: [selectedCabinetDimensions.depthInches],
      };
  const matchesStandardDimensionOptions =
    matchesDimensionOption(dimensionOptions.widths, selectedCabinetDimensions.widthInches) &&
    matchesDimensionOption(dimensionOptions.heights, selectedCabinetDimensions.heightInches) &&
    matchesDimensionOption(dimensionOptions.depths, selectedCabinetDimensions.depthInches);
  const isForcedCustomDimension = customDimensionCabinetIds.has(selectedCabinet.id);
  const showCustomDimensionSliders =
    isSelectedAccessory || isForcedCustomDimension || !matchesStandardDimensionOptions;
  const isSelectedProduct = isProductCabinetImage(selectedCabinet.image);
  const selectedObjectName = selectedCatalogItem?.title ?? (isSelectedAccessory ? "Accessory" : isSelectedProduct ? "Product" : "Cabinet");
  const selectedObjectType = isSelectedAccessory
    ? "Accessories"
    : isSelectedProduct
      ? `${selectedCabinet.category === "wall" ? "Wall" : "Base"} Product`
      : `${selectedCabinet.category === "wall" ? "Wall" : "Base"} Cabinet`;

  const updateCabinetNumber = (
    field: "widthInches" | "depthInches" | "heightInches" | "distanceFromFloorInches" | "distanceFromLeftInches" | "distanceFromRightInches",
    value: string
  ) => {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) return;

    window.dispatchEvent(
      new CustomEvent("pelican-cabinet-attribute-change", {
        detail: {
          id: selectedCabinet.id,
          field,
          value: nextValue,
        },
      })
    );
  };

  const updateCabinetDimensionDropdownField = (
    field: "widthInches" | "heightInches" | "depthInches",
    value: string
  ) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;

    setCustomDimensionCabinetIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(selectedCabinet.id);
      return nextIds;
    });

    window.dispatchEvent(
      new CustomEvent("pelican-cabinet-attribute-change", {
        detail: {
          id: selectedCabinet.id,
          field: "dimensions",
          value: {
            ...selectedCabinetDimensions,
            [field]: nextValue,
          },
        },
      })
    );
  };

  const updateCustomDimensionToggle = (checked: boolean) => {
    setCustomDimensionCabinetIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (checked) {
        nextIds.add(selectedCabinet.id);
      } else {
        nextIds.delete(selectedCabinet.id);
      }
      return nextIds;
    });

    if (!checked && !matchesStandardDimensionOptions && selectedCatalogItem) {
      window.dispatchEvent(
        new CustomEvent("pelican-cabinet-attribute-change", {
        detail: {
          id: selectedCabinet.id,
          field: "dimensions",
          value: {
            widthInches: getDefaultDimensionFromOptions(selectedCatalogItem, "width"),
            heightInches: getDefaultDimensionFromOptions(selectedCatalogItem, "height"),
              depthInches: getDefaultDimensionFromOptions(selectedCatalogItem, "depth"),
            },
          },
        })
      );
    }
  };

  const updateCabinetAccessory = (
    field:
      | "sinkFixture"
      | "cooktopFixture"
      | "cooktopFrontHeightInches"
      | "blindDoorWidthInches"
      | "blindFillerWidthInches"
      | "topFixture"
      | "ovenCabinetProductLayout"
      | "ovenCabinetProductHeightInches"
      | "ovenCabinetFillerHeightInches"
      | "ovenCabinetBottomDrawerHeightInches",
    value:
      | boolean
      | "surface"
      | "front"
      | "none"
      | OvenCabinetProductLayout
      | null
      | number
  ) => {
    window.dispatchEvent(
      new CustomEvent("pelican-cabinet-attribute-change", {
        detail: {
          id: selectedCabinet.id,
          field,
          value,
        },
      })
    );
  };

  const canAddCabinetTopFixtures =
    selectedCabinet.category === "base" &&
    !isProductCabinetImage(selectedCabinet.image) &&
    !isSelectedAccessory &&
    canHaveBaseTopFixtureControls(selectedCabinet.image);
  const canEditCabinetBottomDistance = isElevationFloatingCabinet({
    category: selectedCabinet.category,
    widthInches: selectedCabinet.widthInches,
    heightInches: selectedCabinet.heightInches,
    image: selectedCabinet.image,
  });
  const isSelectedBlindCabinet = isBlindCabinetImage(selectedCabinet.image);
  const isSelectedOvenBottomDrawerCabinet = isOvenLikeBottomDrawerCabinetImage(selectedCabinet.image);
  const blindCabinetWidths = isSelectedBlindCabinet
    ? getBlindCabinetWidthSegments({
        image: selectedCabinet.image,
        category: selectedCabinet.category,
        width: inchesToPixels(selectedCabinet.widthInches),
        blindDoorWidthInches: selectedCabinet.blindDoorWidthInches,
        blindFillerWidthInches: selectedCabinet.blindFillerWidthInches,
      })
    : null;
  const ovenCabinetHeights = getOvenCabinetHeightSegments(selectedCabinet);

  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pelican-navy hover:text-pelican-teal"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="space-y-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <CabinetCatalogImage
            image={selectedCabinet.image ?? getDefaultCabinetImageForCategory(selectedCabinet.category ?? (selectedCabinet.depthInches <= 15 ? "wall" : "base"))}
            category={selectedCabinet.category ?? (selectedCabinet.depthInches <= 15 ? "wall" : "base")}
            widthInches={selectedCabinet.widthInches}
            heightInches={selectedCabinet.heightInches}
            blindDoorWidthInches={selectedCabinet.blindDoorWidthInches}
            blindFillerWidthInches={selectedCabinet.blindFillerWidthInches}
            ovenCabinetProductLayout={selectedCabinet.ovenCabinetProductLayout}
            ovenCabinetProductHeightInches={selectedCabinet.ovenCabinetProductHeightInches}
            ovenCabinetFillerHeightInches={selectedCabinet.ovenCabinetFillerHeightInches}
            ovenCabinetBottomDrawerHeightInches={selectedCabinet.ovenCabinetBottomDrawerHeightInches}
          />
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">
              {selectedObjectType}
            </div>
            <div className="text-sm font-bold text-slate-700">
              {selectedObjectName}
            </div>
          </div>
        </div>

        {!isSelectedAccessory && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Standard dimension
            </div>

            {showCustomDimensionSliders ? (
              <>
                <WindowPropertyInput
                  label="Width"
                  value={roundToQuarter(selectedCabinet.widthInches)}
                  unit="in"
                  min={6}
                  onChange={(value) => updateCabinetNumber("widthInches", value)}
                />
                <WindowPropertyInput
                  label="Height"
                  value={roundToQuarter(selectedCabinet.heightInches)}
                  unit="in"
                  min={1}
                  onChange={(value) => updateCabinetNumber("heightInches", value)}
                />
                <WindowPropertyInput
                  label="Depth"
                  value={roundToQuarter(selectedCabinet.depthInches)}
                  unit="in"
                  min={1}
                  onChange={(value) => updateCabinetNumber("depthInches", value)}
                />
              </>
            ) : (
              <>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Width
                  </span>
                  <select
                    value={roundToQuarter(selectedCabinet.widthInches)}
                    onChange={(event) =>
                      updateCabinetDimensionDropdownField("widthInches", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
                  >
                    {dimensionOptions.widths.map((dimension) => (
                      <option key={`width-${dimension}`} value={dimension}>
                        {formatDimensionOptionNumber(dimension)} in
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Height
                  </span>
                  <select
                    value={roundToQuarter(selectedCabinet.heightInches)}
                    onChange={(event) =>
                      updateCabinetDimensionDropdownField("heightInches", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
                  >
                    {dimensionOptions.heights.map((dimension) => (
                      <option key={`height-${dimension}`} value={dimension}>
                        {formatDimensionOptionNumber(dimension)} in
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Depth
                  </span>
                  <select
                    value={roundToQuarter(selectedCabinet.depthInches)}
                    onChange={(event) =>
                      updateCabinetDimensionDropdownField("depthInches", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
                  >
                    {dimensionOptions.depths.map((dimension) => (
                      <option key={`depth-${dimension}`} value={dimension}>
                        {formatDimensionOptionNumber(dimension)} in
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showCustomDimensionSliders}
                onChange={(event) => updateCustomDimensionToggle(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-pelican-teal focus:ring-pelican-teal"
              />
              <span>
                <span className="block text-[11px] font-bold uppercase text-pelican-navy">
                  Customize dimension
                </span>
                <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
                  Turn this on to manually adjust width, height, and depth with sliders.
                </span>
              </span>
            </label>
          </div>
        )}

        {showCustomDimensionSliders && isSelectedAccessory && (
          <>
            <WindowPropertyInput
              label="Width"
              value={roundToQuarter(selectedCabinet.widthInches)}
              unit="in"
              min={0.25}
              onChange={(value) => updateCabinetNumber("widthInches", value)}
            />
            <WindowPropertyInput
              label="Height"
              value={roundToQuarter(selectedCabinet.heightInches)}
              unit="in"
              min={1}
              onChange={(value) => updateCabinetNumber("heightInches", value)}
            />
            <WindowPropertyInput
              label="Depth"
              value={roundToQuarter(selectedCabinet.depthInches)}
              unit="in"
              min={1}
              onChange={(value) => updateCabinetNumber("depthInches", value)}
            />
          </>
        )}

        {(selectedCabinet.distanceFromLeftInches !== undefined || canEditCabinetBottomDistance) && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Position on wall
            </div>

            {selectedCabinet.distanceFromLeftInches !== undefined &&
              selectedCabinet.distanceFromRightInches !== undefined &&
              selectedCabinet.wallWidthInches !== undefined && (
                <>
                  <WindowPropertyInput
                    label="Distance from left"
                    value={roundToQuarter(selectedCabinet.distanceFromLeftInches)}
                    unit="in"
                    max={Math.max(0, selectedCabinet.wallWidthInches - selectedCabinet.widthInches)}
                    onChange={(value) =>
                      updateCabinetNumber("distanceFromLeftInches", value)
                    }
                  />
                  <WindowPropertyInput
                    label="Distance from right"
                    value={roundToQuarter(selectedCabinet.distanceFromRightInches)}
                    unit="in"
                    max={Math.max(0, selectedCabinet.wallWidthInches - selectedCabinet.widthInches)}
                    onChange={(value) =>
                      updateCabinetNumber("distanceFromRightInches", value)
                    }
                  />
                </>
              )}

            {canEditCabinetBottomDistance && (
              <WindowPropertyInput
                label="Distance from bottom"
                value={roundToQuarter(selectedCabinet.distanceFromFloorInches ?? 54)}
                unit="in"
                onChange={(value) =>
                  updateCabinetNumber("distanceFromFloorInches", value)
                }
              />
            )}
          </div>
        )}

        {canAddCabinetTopFixtures && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Cabinet top option
            </div>

            <label className="block space-y-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Fixture / appliance
              </span>
              <select
                value={selectedCabinet.cooktopFixture ?? "none"}
                onChange={(event) =>
                  updateCabinetAccessory(
                    "topFixture",
                    event.target.value as "none" | "surface" | "front"
                  )
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
              >
                <option value="none">None</option>
                <option value="surface">Surface cooktop</option>
                <option value="front">Front-control cooktop</option>
              </select>
            </label>

            {selectedCabinet.cooktopFixture === "front" && (
              <WindowPropertyInput
                label="Front-control height"
                value={roundToQuarter(selectedCabinet.cooktopFrontHeightInches ?? 6)}
                unit="in"
                onChange={(value) => updateCabinetAccessory("cooktopFrontHeightInches", Number(value))}
              />
            )}
          </div>
        )}

        {isSelectedOvenBottomDrawerCabinet && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Oven cabinet products
            </div>

            <label className="block space-y-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Product stack
              </span>
              <select
                value={selectedCabinet.ovenCabinetProductLayout ?? "none"}
                onChange={(event) =>
                  updateCabinetAccessory(
                    "ovenCabinetProductLayout",
                    event.target.value as OvenCabinetProductLayout
                  )
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
              >
                {selectedCabinet.image === "base-microwave-bottom-drawer" ? (
                  <>
                    <option value="none">None</option>
                    <option value="single-microwave">1 Microwave</option>
                  </>
                ) : (
                  <>
                    <option value="none">None</option>
                    <option value="single-oven">1 Oven</option>
                    <option value="double-oven">2 Ovens</option>
                    <option value="microwave-oven">1 Microwave + 1 Oven</option>
                  </>
                )}
              </select>
            </label>

            <WindowPropertyInput
              label="Products height"
              value={roundToQuarter(ovenCabinetHeights.productHeightInches)}
              unit="in"
              max={Math.max(0, ovenCabinetHeights.totalHeightInches - ovenCabinetHeights.bottomDrawerHeightInches)}
              onChange={(value) =>
                updateCabinetAccessory("ovenCabinetProductHeightInches", Number(value))
              }
            />

            <WindowPropertyInput
              label="Filler height"
              value={roundToQuarter(ovenCabinetHeights.fillerHeightInches)}
              unit="in"
              max={Math.max(0, ovenCabinetHeights.totalHeightInches - ovenCabinetHeights.bottomDrawerHeightInches)}
              onChange={(value) =>
                updateCabinetAccessory("ovenCabinetFillerHeightInches", Number(value))
              }
            />

            <WindowPropertyInput
              label="Bottom drawer height"
              value={roundToQuarter(ovenCabinetHeights.bottomDrawerHeightInches)}
              unit="in"
              max={Math.max(0, ovenCabinetHeights.totalHeightInches - ovenCabinetHeights.productHeightInches)}
              onChange={(value) =>
                updateCabinetAccessory("ovenCabinetBottomDrawerHeightInches", Number(value))
              }
            />
          </div>
        )}

        {isSelectedBlindCabinet && blindCabinetWidths && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Blind cabinet front
            </div>

            <WindowPropertyInput
              label="Door width"
              value={roundToQuarter(blindCabinetWidths.doorWidthInches)}
              unit="in"
              min={0}
              max={Math.max(0, blindCabinetWidths.widthInches - blindCabinetWidths.fillerWidthInches - 3)}
              onChange={(value) =>
                updateCabinetAccessory("blindDoorWidthInches", Number(value))
              }
            />

            <WindowPropertyInput
              label="Built-in Filler Width"
              value={roundToQuarter(blindCabinetWidths.fillerWidthInches)}
              unit="in"
              min={0}
              max={Math.max(0, blindCabinetWidths.widthInches - blindCabinetWidths.doorWidthInches - 3)}
              onChange={(value) =>
                updateCabinetAccessory("blindFillerWidthInches", Number(value))
              }
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Cabinet finish
          </div>
          <FinishCard label="Decorator's White" subLabel="Benjamin Moore" />
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Hardware finish
          </div>
          <FinishCard label="Stainless Steel" subLabel="Matcap" />
        </div>
      </div>
    </aside>
  );
}

function WindowPropertyInput({
  label,
  value,
  unit,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}) {
  const defaultMin = label === "Width" ? 12 : 0;
  const defaultMax = label === "Width" ? 120 : 144;
  const sliderMin = min ?? defaultMin;
  const sliderMax = Math.max(sliderMin, max ?? defaultMax, value);

  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase text-pelican-navy">
        {label}
      </span>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 accent-pelican-teal"
        />
        <div className="flex h-11 w-[105px] items-center rounded-md border border-slate-200 bg-slate-50 px-3">
          <input
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-bold text-pelican-navy outline-none"
          />
          <span className="ml-1 text-[11px] font-semibold text-slate-400">
            {unit}
          </span>
        </div>
      </div>
    </label>
  );
}

function FinishCard({ label, subLabel }: { label: string; subLabel: string }) {
  return (
    <div className="flex h-16 items-center justify-between rounded-md border border-slate-200 bg-white px-2">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-md bg-slate-100" />
        <div>
          <div className="text-sm font-bold text-slate-900">{label}</div>
          <div className="text-[11px] text-slate-500">{subLabel}</div>
        </div>
      </div>
      <PencilLine className="h-4 w-4 text-slate-300" />
    </div>
  );
}

function ContextPanel({
  activePanel,
  activeTool,
  setActiveTool,
  setIsSelectionMode,
  selectedWall,
  selectedWindow,
  selectedDoor,
  selectedCabinet,
  cabinetCategoryTab,
  selectedCabinetCatalogId,
  onSelectCabinetCategory,
  onSelectCabinetCatalog,
  onRequestPanel,
}: {
  activePanel: Panel;
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  setIsSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedWall: WallSelectionDetail | null;
  selectedWindow: WindowSelectionDetail | null;
  selectedDoor: DoorSelectionDetail | null;
  selectedCabinet: CabinetSelectionDetail | null;
  cabinetCategoryTab: CabinetCategory;
  selectedCabinetCatalogId: string;
  onSelectCabinetCategory: (category: CabinetCategory) => void;
  onSelectCabinetCatalog: (catalogId: string) => void;
  onRequestPanel: (panel: Panel) => void;
}) {
  const [structureTab, setStructureTab] = useState<"doors" | "windows">("doors");
  const [productCategoryTab, setProductCategoryTab] = useState<ProductCategory>("base");

  const activateToolFromCard = (tool: Tool) => {
    setIsSelectionMode(false);
    setActiveTool(tool);
  };

  if (selectedCabinet) {
    const selectedCabinetBackPanel: Panel = isAccessoryCabinetImage(selectedCabinet.image)
      ? "objects"
      : isProductCabinetImage(selectedCabinet.image)
        ? "products"
        : "cabinets";

    return (
      <CabinetPropertiesPanel
        selectedCabinet={selectedCabinet}
        onBack={() => {
          window.dispatchEvent(new Event("pelican-deselect-cabinet"));
          onRequestPanel(selectedCabinetBackPanel);
        }}
      />
    );
  }

  if (activePanel === "walls" && selectedWall) {
    return (
      <WallPropertiesPanel
        selectedWall={selectedWall}
        onBack={() => window.dispatchEvent(new Event("pelican-deselect-wall"))}
      />
    );
  }

  if (activePanel === "cabinets") {
    const visibleCabinets = CABINET_CATALOG.filter(
      (item) => item.category === cabinetCategoryTab && !item.isProduct && !item.isAccessory
    );

    return (
      <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
        <div className="sticky top-0 z-10 bg-white px-3 pt-4">
          <button className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pelican-teal px-3 text-[12px] font-bold text-white shadow-sm hover:brightness-95">
            <ImagePlus className="h-4 w-4" />
            Import & Trace Floor Plan Image
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectCabinetCategory("base")}
              className={cn(
                "flex min-h-[56px] items-center justify-center rounded-md px-2 py-2 text-center text-[13px] font-medium leading-tight transition",
                cabinetCategoryTab === "base"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Base Cab.
            </button>
            <button
              type="button"
              onClick={() => onSelectCabinetCategory("wall")}
              className={cn(
                "flex min-h-[56px] items-center justify-center rounded-md px-2 py-2 text-center text-[13px] font-medium leading-tight transition",
                cabinetCategoryTab === "wall"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Wall Cab.
            </button>
          </div>
        </div>

        <div className="space-y-3 px-3 pb-6 pt-4">
          {visibleCabinets.map((cabinetItem) => (
            <CabinetToolCard
              key={cabinetItem.id}
              title={cabinetItem.title}
              subtitle={cabinetItem.subtitle}
              active={activeTool === "place-cabinet" && selectedCabinetCatalogId === cabinetItem.id}
              onClick={() => {
                onSelectCabinetCatalog(cabinetItem.id);
                activateToolFromCard("place-cabinet");
              }}
            >
<CabinetCatalogImage image={cabinetItem.image} category={cabinetItem.category} widthInches={cabinetItem.widthInches} heightInches={cabinetItem.heightInches} />
            </CabinetToolCard>
          ))}
        </div>
      </aside>
    );
  }


  if (activePanel === "products") {
    const visibleProducts = CABINET_CATALOG.filter(
      (item) => item.isProduct && item.productCategory === productCategoryTab
    );

    return (
      <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
        <div className="sticky top-0 z-10 bg-white px-3 pt-4">
          <button className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pelican-teal px-3 text-[12px] font-bold text-white shadow-sm hover:brightness-95">
            <ImagePlus className="h-4 w-4" />
            Import & Trace Floor Plan Image
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setProductCategoryTab("base")}
              className={cn(
                "flex min-h-[48px] items-center justify-center rounded-md px-2 py-2 text-center text-[13px] font-medium leading-tight transition",
                productCategoryTab === "base"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Base Product
            </button>
            <button
              type="button"
              onClick={() => setProductCategoryTab("wall")}
              className={cn(
                "flex min-h-[48px] items-center justify-center rounded-md px-2 py-2 text-center text-[13px] font-medium leading-tight transition",
                productCategoryTab === "wall"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Wall Product
            </button>
          </div>
        </div>

        <div className="space-y-3 px-3 pb-6 pt-4">
          {visibleProducts.map((productItem) => (
            <CabinetToolCard
              key={productItem.id}
              title={productItem.title}
              subtitle={productItem.subtitle}
              active={activeTool === "place-cabinet" && selectedCabinetCatalogId === productItem.id}
              onClick={() => {
                onSelectCabinetCatalog(productItem.id);
                activateToolFromCard("place-cabinet");
              }}
            >
              <CabinetCatalogImage image={productItem.image} category={productItem.category} widthInches={productItem.widthInches} heightInches={productItem.heightInches} />
            </CabinetToolCard>
          ))}
        </div>
      </aside>
    );
  }


  if (activePanel === "objects") {
    const visibleAccessories = CABINET_CATALOG.filter((item) => item.isAccessory);

    return (
      <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Accessories
          </div>
          <div className="mt-1 text-sm font-bold text-pelican-navy">
            Add filler or end panels
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Pick an accessory, then click a wall-side gap or cabinet edge in the plan. End panels snap and collide like cabinets.
          </p>
        </div>

        <div className="space-y-3 px-3 pb-6 pt-4">
          {visibleAccessories.map((accessoryItem) => (
            <CabinetToolCard
              key={accessoryItem.id}
              title={accessoryItem.title}
              subtitle={accessoryItem.subtitle}
              active={activeTool === "place-cabinet" && selectedCabinetCatalogId === accessoryItem.id}
              onClick={() => {
                onSelectCabinetCatalog(accessoryItem.id);
                activateToolFromCard("place-cabinet");
              }}
            >
              <CabinetCatalogImage image={accessoryItem.image} category={accessoryItem.category} widthInches={accessoryItem.widthInches} heightInches={accessoryItem.heightInches} />
            </CabinetToolCard>
          ))}
        </div>
      </aside>
    );
  }

  if (activePanel === "structures" && selectedWindow) {
    return (
      <WindowPropertiesPanel
        selectedWindow={selectedWindow}
        onBack={() => window.dispatchEvent(new Event("pelican-deselect-window"))}
      />
    );
  }

  if (activePanel === "structures" && selectedDoor) {
    return (
      <DoorPropertiesPanel
        selectedDoor={selectedDoor}
        onBack={() => window.dispatchEvent(new Event("pelican-deselect-door"))}
      />
    );
  }

  if (activePanel === "structures") {
    return (
      <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
        <div className="sticky top-0 z-10 bg-white px-3 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStructureTab("doors")}
              className={cn(
                "h-8 rounded-md text-[13px] font-medium transition",
                structureTab === "doors"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Doors
            </button>

            <button
              type="button"
              onClick={() => setStructureTab("windows")}
              className={cn(
                "h-8 rounded-md text-[13px] font-medium transition",
                structureTab === "windows"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Windows
            </button>
          </div>
        </div>

        <div className="px-3 pb-6 pt-4">
          {structureTab === "doors" ? (
            <StructureToolCard
              title="Simple Door"
              subtitle="36&quot; W x 80&quot; H"
              active={activeTool === "place-door"}
              onClick={() => activateToolFromCard("place-door")}
            >
              <SimpleDoorShape />
            </StructureToolCard>
          ) : (
            <StructureToolCard
              title="Simple Window"
              subtitle="39.25&quot; W x 36&quot; H"
              active={activeTool === "place-window"}
              onClick={() => activateToolFromCard("place-window")}
            >
              <SimpleWindowShape />
            </StructureToolCard>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 bg-white px-3 pt-4">
        <button className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pelican-teal px-3 text-[12px] font-bold text-white shadow-sm hover:brightness-95">
          <ImagePlus className="h-4 w-4" />
          Import & Trace Floor Plan Image
        </button>
      </div>

      <div className="space-y-3 px-3 pb-6">
        <WallToolCard
          active={activeTool === "draw-wall"}
          onClick={() => activateToolFromCard("draw-wall")}
        />

        <ThinWallToolCard
          active={activeTool === "draw-thin-wall"}
          onClick={() => activateToolFromCard("draw-thin-wall")}
        />

        <PeninWallToolCard
          active={activeTool === "draw-penin-wall"}
          onClick={() => activateToolFromCard("draw-penin-wall")}
        />

        <IslandWallToolCard
          active={activeTool === "draw-island-wall"}
          onClick={() => activateToolFromCard("draw-island-wall")}
        />
      </div>
    </aside>
  );
}

function StructureToolCard({
  title,
  subtitle,
  active = false,
  onClick,
  children,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[150px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 text-center transition hover:border-pelican-teal",
        active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200"
      )}
    >
      <div className="flex h-24 w-full items-center justify-center">
        {children}
      </div>

      <span className="mt-2 text-[13px] font-medium text-slate-900">
        {title}
      </span>
      <span className="mt-1 text-[11px] text-slate-500">
        {subtitle}
      </span>
    </button>
  );
}

function SimpleDoorShape() {
  return (
    <svg viewBox="0 0 110 90" className="h-24 w-28">
      <rect
        x="24"
        y="20"
        width="62"
        height="50"
        rx="3"
        fill="#d1d5db"
        stroke="#9ca3af"
        strokeWidth="4"
      />
      <rect
        x="32"
        y="28"
        width="46"
        height="34"
        fill="#f8fafc"
        opacity="0.45"
      />
      <circle cx="72" cy="45" r="3" fill="#9ca3af" />
    </svg>
  );
}

function SimpleWindowShape() {
  return (
    <svg viewBox="0 0 110 90" className="h-24 w-28">
      <rect
        x="20"
        y="22"
        width="70"
        height="48"
        rx="4"
        fill="#e5e7eb"
        stroke="#9ca3af"
        strokeWidth="4"
      />
      <rect
        x="28"
        y="30"
        width="54"
        height="32"
        fill="#f8fafc"
        opacity="0.65"
      />
      <line x1="55" y1="24" x2="55" y2="68" stroke="#9ca3af" strokeWidth="3" />
      <line x1="22" y1="46" x2="88" y2="46" stroke="#9ca3af" strokeWidth="3" />
    </svg>
  );
}

function WallToolCard({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[135px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 transition hover:border-pelican-teal",
        active
          ? "border-pelican-navy ring-1 ring-pelican-navy"
          : "border-slate-200"
      )}
    >
      <WallLineShape />

      <span className="mt-3 text-[12px] font-medium text-slate-900">
        Draw thick Wall
      </span>
    </button>
  );
}

function WallLineShape() {
  return (
    <svg viewBox="0 0 130 70" className="h-16 w-24">
      <path d="M20 36 H110" className="fill-none stroke-slate-300 stroke-[8]" />
      <path d="M20 32 H110" className="stroke-slate-400 stroke-[2]" />
    </svg>
  );
}

function ThinWallToolCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-[135px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 transition hover:border-pelican-teal", active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200")}>
      <ThinWallLineShape />
      <span className="mt-3 text-[12px] font-medium text-slate-900">Draw thin Wall</span>
    </button>
  );
}
function ThinWallLineShape() {
  return <svg viewBox="0 0 130 70" className="h-16 w-24"><path d="M20 36 H110" className="fill-none stroke-slate-500 stroke-[2]" strokeLinecap="round" /></svg>;
}

function PeninWallToolCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-[135px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 transition hover:border-pelican-teal", active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200")}>
      <IslandWallLineShape />
      <span className="mt-3 text-[12px] font-medium text-slate-900">Draw Peninsula</span>
    </button>
  );
}

function PeninWallLineShape() {
  return <svg viewBox="0 0 130 70" className="h-16 w-24"><path d="M20 36 H110" className="fill-none stroke-slate-300 stroke-[8]" /><path d="M20 32 H110" className="stroke-slate-400 stroke-[2]" /><path d="M24 48 H106" className="stroke-pelican-teal stroke-[2]" strokeDasharray="6 5" /></svg>;
}

function IslandWallToolCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-[135px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 transition hover:border-pelican-teal", active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200")}>
      <IslandWallLineShape />
      <span className="mt-3 text-[12px] font-medium text-slate-900">Draw Island</span>
    </button>
  );
}

function IslandWallLineShape() {
  return <svg viewBox="0 0 130 70" className="h-16 w-24"><rect x="20" y="27" width="90" height="18" rx="2" className="fill-[#f1ede4] stroke-slate-400 stroke-[2]" /><rect x="27" y="31" width="76" height="10" rx="1" className="fill-none stroke-slate-400 stroke-[1.5]" /></svg>;
}

function MainToolbar({
  active,
  onSelect,
}: {
  active: Panel;
  onSelect: (panel: Panel) => void;
}) {
  return (
    <nav className="flex h-full w-[68px] shrink-0 flex-col items-center bg-white py-3">
      <div className="flex w-full flex-col items-center gap-0.5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full flex-col items-center gap-1 py-1.5 text-[11px] font-semibold leading-none",
                isActive
                  ? "text-pelican-navy"
                  : "text-slate-500 hover:text-pelican-navy"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  isActive
                    ? "bg-pelican-navy text-white shadow-soft"
                    : "bg-white text-slate-500"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>

              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 pb-2">
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-pelican-teal text-white shadow-soft">
          <Home className="h-5 w-5" />
        </button>
        <span className="text-[11px] font-semibold text-slate-500">Learn</span>
      </div>
    </nav>
  );
}



// ThinWallGroupContextMenu
function ThinWallGroupContextMenu({
  position,
  onCreateExterior,
  onCreateInterior,
}: {
  position: Point;
  onCreateExterior: () => void;
  onCreateInterior: () => void;
}) {
  return (
    <foreignObject x={position.x} y={position.y} width="190" height="94">
      <div className="rounded-md border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 shadow-lg">
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onCreateExterior(); }}
          className="block w-full rounded px-3 py-2 text-left hover:bg-pelican-teal/10"
        >
          Create exterior wall
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onCreateInterior(); }}
          className="block w-full rounded px-3 py-2 text-left hover:bg-pelican-teal/10"
        >
          Create interior wall
        </button>
      </div>
    </foreignObject>
  );
}


// CabinetToolCard
function CabinetToolCard({
  title,
  subtitle,
  active,
  onClick,
  children,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[150px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 text-center transition hover:border-pelican-teal",
        active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200"
      )}
    >
      <div className="flex h-24 w-full items-center justify-center">{children}</div>
      <span className="mt-2 text-[13px] font-medium text-slate-900">{title}</span>
      <span className="mt-1 text-[11px] text-slate-500">{subtitle}</span>
    </button>
  );
}

// SimpleBaseCabinetImage
function SimpleBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs>
        <linearGradient id="cabinetFaceGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6f3ed" />
          <stop offset="100%" stopColor="#ded9cf" />
        </linearGradient>
      </defs>
      <polygon points="42,24 86,24 100,31 55,31" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.5" />
      <polygon points="86,24 100,31 100,86 86,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.5" />
      <rect x="42" y="31" width="44" height="50" fill="url(#cabinetFaceGradient)" stroke="#bfb8ad" strokeWidth="1.5" />
      <line x1="84" y1="31" x2="84" y2="80" stroke="#c7c1b8" strokeWidth="1.25" />
      <rect x="45" y="81" width="39" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="48" y1="22" x2="92" y2="22" stroke="#c6c1b8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="82" cy="54" r="1.4" fill="#aaa49b" />
    </svg>
  );
}


function SimpleWallCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs>
        <linearGradient id="wallCabinetFaceGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6f3ed" />
          <stop offset="100%" stopColor="#ded9cf" />
        </linearGradient>
      </defs>
      <polygon points="46,26 84,26 96,32 58,32" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.4" />
      <polygon points="84,26 96,32 96,80 84,74" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.4" />
      <rect x="46" y="32" width="38" height="42" fill="url(#wallCabinetFaceGradient)" stroke="#bfb8ad" strokeWidth="1.4" />
      <line x1="65" y1="32" x2="65" y2="73" stroke="#c7c1b8" strokeWidth="1.15" />
      <line x1="49" y1="24" x2="88" y2="24" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="63" cy="54" r="1.2" fill="#aaa49b" />
      <circle cx="67" cy="54" r="1.2" fill="#aaa49b" />
    </svg>
  );
}


function getDefaultCabinetImageForCategory(category: CabinetCategory): CabinetImage {
  if (category === "pantry") return "pantry-two-door";
  if (category === "wall") return "wall-two-doors";
  return "base";
}

function getCabinetImage(cabinetItem: Partial<Pick<CabinetElement, "image" | "category">>): CabinetImage {
  return cabinetItem.image ?? getDefaultCabinetImageForCategory(cabinetItem.category ?? "base");
}

function isProductCabinetImage(image?: CabinetImage) {
  return Boolean(
    image === "base-dishwasher" ||
      image === "base-refrigerator" ||
      image === "base-range" ||
      image === "wall-hood" ||
      image === "wall-microwave" ||
      image === "wall-oven" ||
      image === "wall-double-oven"
  );
}

function isAccessoryCabinetImage(image?: CabinetImage) {
  return Boolean(
    image === "accessory-base-filler" ||
      image === "accessory-wall-filler" ||
      image === "accessory-wall-filler-horizontal" ||
      image === "accessory-filler" ||
      image === "accessory-base-end-panel" ||
      image === "accessory-wall-end-panel"
  );
}

function getCabinetPlanBodyFill(cabinetItem: Pick<CabinetElement, "image">, preview = false, invalid = false) {
  if (invalid) return "#fee2e2";
  if (preview) return "#d9f8fd";

  const image = getCabinetImage(cabinetItem);

  if (
    image === "base-dishwasher" ||
    image === "base-refrigerator" ||
    image === "wall-microwave" ||
    image === "wall-oven" ||
    image === "wall-double-oven"
  ) {
    return "#d1d5db";
  }

  if (image === "base-range" || image === "wall-hood") {
    return "#e5e7eb";
  }

  return "#f1ede4";
}

function isStandaloneBaseProductElevationImage(image?: CabinetImage) {
  return image === "base-dishwasher" || image === "base-refrigerator" || image === "base-range";
}

function isFillerAccessoryCabinetImage(image?: CabinetImage) {
  return Boolean(
    image === "accessory-base-filler" ||
      image === "accessory-wall-filler" ||
      image === "accessory-wall-filler-horizontal" ||
      image === "accessory-filler"
  );
}

function getCabinetCatalogPreviewFrame(image: CabinetImage, categoryOverride?: CabinetCategory) {
  const category = categoryOverride ?? getCabinetCategoryForImage(image);

  if (image === "accessory-wall-filler-horizontal") {
    return { x: 24, y: 52, width: 82, height: 14, category };
  }

  if (isAccessoryCabinetImage(image)) {
    return { x: 58, y: 24, width: 14, height: 62, category };
  }

  if (image === "base-refrigerator") {
    return { x: 28, y: 6, width: 74, height: 94, category };
  }

  if (category === "pantry") {
    const isSingleDoorPantry = image === "pantry-one-door";
    return { x: isSingleDoorPantry ? 42 : 28, y: 8, width: isSingleDoorPantry ? 46 : 74, height: 90, category };
  }

  if (image === "wall-hood") {
    return { x: 24, y: 22, width: 82, height: 64, category };
  }

  if (image === "wall-double-oven") {
    return { x: 36, y: 10, width: 58, height: 80, category };
  }

  if (image === "wall-microwave") {
    return { x: 34, y: 28, width: 62, height: 40, category };
  }

  if (image === "wall-oven") {
    return { x: 34, y: 24, width: 62, height: 48, category };
  }

  if (category === "wall") {
    return { x: 28, y: 28, width: 74, height: 52, category };
  }

  const narrowBaseImages: CabinetImage[] = [
    "base-one-door",
    "base-one-door-one-drawer",
    "base-two-drawer",
    "base-four-drawer",
    "base-spice-rack",
    "base-trash-can",
  ];
  const wideBaseImages: CabinetImage[] = [
    "base-refrigerator",
    "base-corner",
    "base-blind-left",
    "base-blind-right",
    "base-sink-cabinet",
    "base-farm-sink-cabinet",
  ];

  if (wideBaseImages.includes(image)) {
    return { x: 18, y: 28, width: 94, height: 50, category };
  }

  if (narrowBaseImages.includes(image)) {
    return { x: 42, y: 28, width: 46, height: 50, category };
  }

  return { x: 28, y: 28, width: 74, height: 50, category };
}



function CabinetCatalogImage({
  image,
  category,
  widthInches,
  heightInches,
  blindDoorWidthInches,
  blindFillerWidthInches,
  ovenCabinetProductLayout,
  ovenCabinetProductHeightInches,
  ovenCabinetFillerHeightInches,
  ovenCabinetBottomDrawerHeightInches,
}: {
  image: CabinetImage;
  category?: CabinetCategory;
  widthInches?: number;
  heightInches?: number;
  blindDoorWidthInches?: number;
  blindFillerWidthInches?: number;
  ovenCabinetProductLayout?: OvenCabinetProductLayout;
  ovenCabinetProductHeightInches?: number;
  ovenCabinetFillerHeightInches?: number;
  ovenCabinetBottomDrawerHeightInches?: number;
}) {
  const frame = getCabinetCatalogPreviewFrame(image, category);

  if (image === "base-corner") {
    return <SimpleCornerBaseCabinetImage />;
  }

  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <ElevationCabinetOnWall
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        category={frame.category}
        image={image}
        cabinet={{
          id: `catalog-preview-${image}`,
          center: { x: 0, y: 0 },
          width: inchesToPixels(widthInches ?? (frame.width / GRID_SIZE) * 12),
          depth: inchesToPixels(24),
          rotation: 0,
          category: frame.category,
          image,
          heightInches,
          sinkFixture: isBuiltInSinkCabinetImage(image) ? true : undefined,
          blindDoorWidthInches,
          blindFillerWidthInches,
          ovenCabinetProductLayout,
          ovenCabinetProductHeightInches,
          ovenCabinetFillerHeightInches,
          ovenCabinetBottomDrawerHeightInches,
        }}
      />
    </svg>
  );
}

function SimpleCornerBaseCabinetImage() {
  return (
    <div className="flex h-24 w-28 items-center justify-center">
      <img
        src={L_SHAPED_CORNER_CABINET_DISPLAY_IMAGE}
        alt="L-Shaped Corner Cabinet"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

function SimpleOneDoorBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="oneDoorBaseGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="50,18 80,18 94,25 63,25" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.25" />
      <polygon points="80,18 94,25 94,88 80,81" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.25" />
      <rect x="50" y="25" width="30" height="56" fill="url(#oneDoorBaseGradient)" stroke="#bfb8ad" strokeWidth="1.25" />
      <rect x="53" y="81" width="26" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="55" y1="16" x2="86" y2="16" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="76" cy="51" r="1.2" fill="#aaa49b" />
    </svg>
  );
}

function SimpleSinkBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="sinkCabinetGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="34,26 93,26 106,33 47,33" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.4" />
      <polygon points="93,26 106,33 106,85 93,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.4" />
      <rect x="34" y="33" width="59" height="45" fill="url(#sinkCabinetGradient)" stroke="#bfb8ad" strokeWidth="1.4" />
      <line x1="63.5" y1="33" x2="63.5" y2="78" stroke="#c7c1b8" strokeWidth="1.1" />
      <ellipse cx="64" cy="31" rx="21" ry="3.8" fill="#f7f7f4" stroke="#bfb8ad" strokeWidth="1" />
      <path d="M64 27 C64 16 75 16 75 27" fill="none" stroke="#bfb8ad" strokeWidth="2" strokeLinecap="round" />
      <circle cx="61" cy="52" r="1.2" fill="#aaa49b" /><circle cx="66" cy="52" r="1.2" fill="#aaa49b" />
      <rect x="38" y="78" width="52" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
    </svg>
  );
}

function SimpleDrawerBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="drawerCabinetGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="38,20 90,20 103,27 51,27" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="90,20 103,27 103,86 90,79" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x="38" y="27" width="52" height="52" fill="url(#drawerCabinetGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="38" y1="44" x2="90" y2="44" stroke="#c7c1b8" strokeWidth="1.1" />
      <line x1="38" y1="61" x2="90" y2="61" stroke="#c7c1b8" strokeWidth="1.1" />
      <circle cx="64" cy="36" r="1.15" fill="#aaa49b" /><circle cx="64" cy="53" r="1.15" fill="#aaa49b" /><circle cx="64" cy="70" r="1.15" fill="#aaa49b" />
      <rect x="41" y="79" width="47" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="43" y1="18" x2="96" y2="18" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SimpleApplianceBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="applianceCabinetGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="42,18 86,18 100,25 55,25" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.3" />
      <polygon points="86,18 100,25 100,88 86,82" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.3" />
      <rect x="42" y="25" width="44" height="57" fill="url(#applianceCabinetGradient)" stroke="#bfb8ad" strokeWidth="1.3" />
      <rect x="46" y="41" width="36" height="25" fill="#f3f1ed" stroke="#bfb8ad" strokeWidth="1.25" />
      <line x1="49" y1="37" x2="79" y2="37" stroke="#bfb8ad" strokeWidth="2" strokeLinecap="round" />
      <rect x="48" y="27" width="4" height="9" fill="#e5e0d6" stroke="#bfb8ad" strokeWidth="0.7" /><rect x="76" y="27" width="4" height="9" fill="#e5e0d6" stroke="#bfb8ad" strokeWidth="0.7" />
      <line x1="42" y1="72" x2="86" y2="72" stroke="#c7c1b8" strokeWidth="1.1" />
      <circle cx="64" cy="77" r="1.2" fill="#aaa49b" />
      <rect x="45" y="82" width="39" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
    </svg>
  );
}


function SimpleBaseCabinetWithDrawerImage({ doors, drawers }: { doors: 1 | 2; drawers: 1 | 2 }) {
  const drawerSplit = drawers === 2;
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id={`baseDrawerDoorGradient-${doors}-${drawers}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points={doors === 2 ? "34,22 92,22 106,29 48,29" : "50,22 82,22 96,29 64,29"} fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points={doors === 2 ? "92,22 106,29 106,86 92,79" : "82,22 96,29 96,86 82,79"} fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x={doors === 2 ? 34 : 50} y="29" width={doors === 2 ? 58 : 32} height="50" fill={`url(#baseDrawerDoorGradient-${doors}-${drawers})`} stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1={doors === 2 ? 34 : 50} y1="42" x2={doors === 2 ? 92 : 82} y2="42" stroke="#c7c1b8" strokeWidth="1.1" />
      {drawerSplit && <line x1="63" y1="29" x2="63" y2="42" stroke="#c7c1b8" strokeWidth="1.1" />}
      {doors === 2 && <line x1="63" y1="42" x2="63" y2="79" stroke="#c7c1b8" strokeWidth="1.1" />}
      {drawerSplit ? <><circle cx="50" cy="35" r="1.15" fill="#aaa49b" /><circle cx="76" cy="35" r="1.15" fill="#aaa49b" /></> : <circle cx={doors === 2 ? 63 : 66} cy="35" r="1.15" fill="#aaa49b" />}
      {doors === 2 ? <><circle cx="60" cy="58" r="1.15" fill="#aaa49b" /><circle cx="66" cy="58" r="1.15" fill="#aaa49b" /></> : <circle cx="78" cy="58" r="1.15" fill="#aaa49b" />}
      <rect x={doors === 2 ? 38 : 53} y="79" width={doors === 2 ? 51 : 27} height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1={doors === 2 ? 40 : 55} y1="20" x2={doors === 2 ? 98 : 88} y2="20" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SimpleDrawerStackCabinetImage({ drawers }: { drawers: 2 | 4 }) {
  const x = 50;
  const y = 28;
  const w = 32;
  const h = 54;
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id={`drawerStackGradient-${drawers}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="50,21 82,21 96,28 64,28" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="82,21 96,28 96,89 82,82" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x={x} y={y} width={w} height={h} fill={`url(#drawerStackGradient-${drawers})`} stroke="#bfb8ad" strokeWidth="1.35" />
      {Array.from({ length: drawers - 1 }, (_, index) => <line key={index} x1={x} y1={y + (h * (index + 1)) / drawers} x2={x + w} y2={y + (h * (index + 1)) / drawers} stroke="#c7c1b8" strokeWidth="1.1" />)}
      {Array.from({ length: drawers }, (_, index) => <circle key={index} cx={x + w / 2} cy={y + (h * (index + 0.5)) / drawers} r="1.15" fill="#aaa49b" />)}
      <rect x="53" y="82" width="27" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="55" y1="19" x2="88" y2="19" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SimpleSinkPanelCabinetImage({ doors }: { doors: 1 | 2 }) {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id={`sinkPanelGradient-${doors}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points={doors === 2 ? "34,26 93,26 106,33 47,33" : "48,26 84,26 98,33 62,33"} fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points={doors === 2 ? "93,26 106,33 106,86 93,79" : "84,26 98,33 98,86 84,79"} fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x={doors === 2 ? 34 : 48} y="33" width={doors === 2 ? 59 : 36} height="46" fill={`url(#sinkPanelGradient-${doors})`} stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1={doors === 2 ? 34 : 48} y1="45" x2={doors === 2 ? 93 : 84} y2="45" stroke="#c7c1b8" strokeWidth="1.1" />
      {doors === 2 && <line x1="63.5" y1="45" x2="63.5" y2="79" stroke="#c7c1b8" strokeWidth="1.1" />}
      <ellipse cx="64" cy="30" rx="21" ry="3.8" fill="#f7f7f4" stroke="#bfb8ad" strokeWidth="1" />
      <path d="M64 26 C64 15 75 15 75 26" fill="none" stroke="#bfb8ad" strokeWidth="2" strokeLinecap="round" />
      {doors === 2 ? <><circle cx="61" cy="60" r="1.2" fill="#aaa49b" /><circle cx="66" cy="60" r="1.2" fill="#aaa49b" /></> : <circle cx="80" cy="60" r="1.2" fill="#aaa49b" />}
      <rect x={doors === 2 ? 38 : 51} y="79" width={doors === 2 ? 52 : 31} height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
    </svg>
  );
}

function SimpleBlindLeftOneDrawerBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="blindLeftOneDrawerGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient><linearGradient id="blindLeftOneDrawerShelfGradient" x1="0" x2="1"><stop offset="0%" stopColor="#c2bdaf" /><stop offset="100%" stopColor="#efece4" /></linearGradient></defs>
      <polygon points="20,25 92,25 106,32 34,32" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="92,25 106,32 106,84 92,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x="20" y="32" width="34" height="46" fill="url(#blindLeftOneDrawerShelfGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="20" y1="47" x2="54" y2="47" stroke="#f7f5ef" strokeWidth="2" /><line x1="20" y1="62" x2="54" y2="62" stroke="#f7f5ef" strokeWidth="2" />
      <rect x="54" y="32" width="38" height="46" fill="url(#blindLeftOneDrawerGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="54" y1="44" x2="92" y2="44" stroke="#c7c1b8" strokeWidth="1.1" />
      <circle cx="73" cy="38" r="1.15" fill="#aaa49b" /><circle cx="88" cy="59" r="1.2" fill="#aaa49b" />
      <rect x="24" y="78" width="66" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="25" y1="23" x2="98" y2="23" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SimpleBlindRightOneDrawerBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="blindRightOneDrawerGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient><linearGradient id="blindRightOneDrawerShelfGradient" x1="0" x2="1"><stop offset="0%" stopColor="#c2bdaf" /><stop offset="100%" stopColor="#efece4" /></linearGradient></defs>
      <polygon points="20,25 92,25 106,32 34,32" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="92,25 106,32 106,84 92,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x="20" y="32" width="38" height="46" fill="url(#blindRightOneDrawerGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="20" y1="44" x2="58" y2="44" stroke="#c7c1b8" strokeWidth="1.1" />
      <circle cx="39" cy="38" r="1.15" fill="#aaa49b" /><circle cx="24" cy="59" r="1.2" fill="#aaa49b" />
      <rect x="58" y="32" width="34" height="46" fill="url(#blindRightOneDrawerShelfGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="58" y1="47" x2="92" y2="47" stroke="#f7f5ef" strokeWidth="2" /><line x1="58" y1="62" x2="92" y2="62" stroke="#f7f5ef" strokeWidth="2" />
      <rect x="24" y="78" width="66" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="25" y1="23" x2="98" y2="23" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SimpleBlindLeftBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="blindLeftGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient><linearGradient id="openShelfGradient" x1="0" x2="1"><stop offset="0%" stopColor="#c2bdaf" /><stop offset="100%" stopColor="#efece4" /></linearGradient></defs>
      <polygon points="20,25 92,25 106,32 34,32" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="92,25 106,32 106,84 92,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x="20" y="32" width="34" height="46" fill="url(#openShelfGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="20" y1="47" x2="54" y2="47" stroke="#f7f5ef" strokeWidth="2" /><line x1="20" y1="62" x2="54" y2="62" stroke="#f7f5ef" strokeWidth="2" />
      <rect x="54" y="32" width="38" height="46" fill="url(#blindLeftGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <circle cx="88" cy="52" r="1.2" fill="#aaa49b" />
      <rect x="24" y="78" width="66" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="25" y1="23" x2="98" y2="23" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// CabinetOnFloor
function CabinetOnFloor({
  cabinetItem,
  walls,
  selected,
  dragPreview = null,
  showDegree = false,
  disabled,
  onSelect,
  onDragStart,
  onRotateStart,
}: {
  cabinetItem: CabinetElement;
  walls: Wall[];
  selected: boolean;
  dragPreview?: CabinetPlacementPreview | null;
  showDegree?: boolean;
  disabled?: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
  onRotateStart: (event: React.PointerEvent<SVGPathElement>) => void;
}) {
  const dragInvalid = Boolean(dragPreview && !dragPreview.isValid);
  const visibleCabinet: CabinetElement = dragPreview
    ? {
        ...cabinetItem,
        center: dragPreview.center,
        width: dragPreview.width,
        depth: dragPreview.depth,
        rotation: dragPreview.rotation,
        category: dragPreview.category,
        image: dragPreview.image ?? cabinetItem.image,
        wallId: dragPreview.wallId ?? cabinetItem.wallId,
        accessoryKind: cabinetItem.accessoryKind,
      }
    : cabinetItem;

  const metrics = getCabinetWallDistanceMetrics(visibleCabinet, walls);
  const showDistanceGuides =
    selected && (!dragPreview || isCabinetAttachedToWallFace(visibleCabinet, walls));

  return (
    <g>
      {showDistanceGuides && <CabinetDistanceGuides metrics={metrics} />}
      <g
        onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
        style={{ cursor: disabled ? "default" : selected ? "move" : "pointer" }}
      >
        <CabinetPlanShape cabinetItem={visibleCabinet} selected={selected} invalid={dragInvalid} />
      </g>
      {selected && (
        <CabinetMoveRotateControl
          cabinetItem={visibleCabinet}
          onRotateStart={dragPreview || disabled ? undefined : onRotateStart}
          invalid={dragInvalid}
          showDegree={showDegree}
        />
      )}
    </g>
  );
}

// CabinetFloorInteractionTarget
function CabinetFloorInteractionTarget({
  cabinetItem,
  disabled,
  selected,
  onSelect,
  onDragStart,
}: {
  cabinetItem: CabinetElement;
  disabled?: boolean;
  selected: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const { center, width, depth, rotation } = cabinetItem;

  return (
    <g
      transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}
      onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
      style={{ cursor: disabled ? "default" : selected ? "move" : "pointer" }}
    >
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        fill="transparent"
        stroke="none"
        pointerEvents={disabled ? "none" : "all"}
      />
    </g>
  );
}

// CabinetSelectionOverlay
function CabinetSelectionOverlay({
  cabinetItem,
  walls,
  dragPreview = null,
  showDegree = false,
  onRotateStart,
}: {
  cabinetItem: CabinetElement;
  walls: Wall[];
  dragPreview?: CabinetPlacementPreview | null;
  showDegree?: boolean;
  onRotateStart: (event: React.PointerEvent<SVGPathElement>) => void;
}) {
  const overlayCabinet: CabinetElement = dragPreview
    ? {
        ...cabinetItem,
        center: dragPreview.center,
        width: dragPreview.width,
        depth: dragPreview.depth,
        rotation: dragPreview.rotation,
        category: dragPreview.category,
        image: dragPreview.image ?? cabinetItem.image,
        wallId: dragPreview.wallId ?? cabinetItem.wallId,
        accessoryKind: cabinetItem.accessoryKind,
      }
    : cabinetItem;
  const metrics = getCabinetWallDistanceMetrics(overlayCabinet, walls);
  const invalid = Boolean(dragPreview && !dragPreview.isValid);
  const showDistanceGuides = !dragPreview || isCabinetAttachedToWallFace(overlayCabinet, walls);

  return (
    <g>
      {showDistanceGuides && <CabinetDistanceGuides metrics={metrics} />}
      <CabinetPlanSelectionOverlay cabinetItem={overlayCabinet} invalid={invalid} />
      <CabinetMoveRotateControl
        cabinetItem={overlayCabinet}
        onRotateStart={onRotateStart}
        invalid={invalid}
        showDegree={showDegree}
      />
    </g>
  );
}

// CabinetPlanSelectionOverlay
function CabinetPlanSelectionOverlay({
  cabinetItem,
  invalid = false,
}: {
  cabinetItem: CabinetElement;
  invalid?: boolean;
}) {
  const { center, width, depth, rotation } = cabinetItem;
  const stroke = invalid ? "#ef4444" : "#22bfd6";
  const handleFill = invalid ? "#ef4444" : "#22bfd6";
  const image = getCabinetImage(cabinetItem);

  return (
    <g
      transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}
      pointerEvents="none"
    >
      {image === "base-corner" ? (
        <path
          d={getBaseCornerPlanPath(width, depth)}
          fill="none"
          stroke={stroke}
          strokeWidth="2.6"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <rect
          x={-width / 2}
          y={-depth / 2}
          width={width}
          height={depth}
          fill="none"
          stroke={stroke}
          strokeWidth="2.6"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {[
        { x: 0, y: -depth / 2 },
        { x: width / 2, y: 0 },
        { x: 0, y: depth / 2 },
        { x: -width / 2, y: 0 },
      ].map((handle, index) => (
        <circle
          key={`cabinet-selection-handle-${index}`}
          cx={handle.x}
          cy={handle.y}
          r="4"
          fill={handleFill}
          stroke="#ffffff"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

// CabinetPreview
function CabinetPreview({ preview, walls }: { preview: CabinetPlacementPreview; walls: Wall[] }) {
  // Catalog cabinets must be attached to a wall. Hide the floor-plan preview
  // instead of showing a free-floating cabinet when the cursor is away from
  // every valid wall face.
  if (!preview.wallId && !preview.wall) return null;

  const previewCabinet: CabinetElement = {
    id: "cabinet-preview",
    center: preview.center,
    width: preview.width,
    depth: preview.depth,
    rotation: preview.rotation,
    category: preview.category,
    image: preview.image,
    wallId: preview.wallId,
    wallFace: preview.wallFace,
  };
  const metrics = getCabinetWallDistanceMetrics(previewCabinet, walls);
  const showDistanceGuides = isCabinetAttachedToWallFace(previewCabinet, walls);
  const showCollisionInvalidPreview = !preview.isValid;

  return (
    <g pointerEvents="none" opacity={1}>
      {showDistanceGuides && <CabinetDistanceGuides metrics={metrics} />}
      <CabinetPlanShape
        cabinetItem={previewCabinet}
        selected
        preview
        invalid={showCollisionInvalidPreview}
      />
      <CabinetMoveRotateControl
        cabinetItem={previewCabinet}
        preview
        invalid={showCollisionInvalidPreview}
      />
    </g>
  );
}

// CabinetPlanShape
function getBaseCornerPlanPath(width: number, depth: number, inset = 0) {
  const outerLeft = -width / 2;
  const outerRight = width / 2;
  const outerTop = -depth / 2;
  const outerBottom = depth / 2;
  const outerNotchX = outerLeft + width * 0.48;
  const outerNotchY = outerTop + depth * 0.54;

  if (inset <= 0) {
    return `M ${outerLeft} ${outerTop} L ${outerRight} ${outerTop} L ${outerRight} ${outerBottom} L ${outerNotchX} ${outerBottom} L ${outerNotchX} ${outerNotchY} L ${outerLeft} ${outerNotchY} Z`;
  }

  const left = outerLeft + inset;
  const right = outerRight - inset;
  const top = outerTop + inset;
  const bottom = outerBottom - inset;

  // Local base-corner geometry has a bottom-left notch before rotation.
  // For a consistent inset border, offset the concave notch edges toward the
  // remaining cabinet body: the vertical notch edge moves right, and the
  // horizontal notch edge moves up.
  const notchX = Math.min(right, Math.max(left, outerNotchX + inset));
  const notchY = Math.min(bottom, Math.max(top, outerNotchY - inset));

  return `M ${left} ${top} L ${right} ${top} L ${right} ${bottom} L ${notchX} ${bottom} L ${notchX} ${notchY} L ${left} ${notchY} Z`;
}

function CabinetPlanShape({
  cabinetItem,
  selected = false,
  preview = false,
  invalid = false,
}: {
  cabinetItem: CabinetElement;
  selected?: boolean;
  preview?: boolean;
  invalid?: boolean;
}) {
  const { center, width, depth, rotation } = cabinetItem;
  const fill = getCabinetPlanBodyFill(cabinetItem, preview, invalid);
  const fillOpacity = 1;
  const detailOpacity = invalid ? 0.75 : 1;
  const stroke = invalid ? "#ef4444" : selected ? "#22bfd6" : "#475569";
  const innerStroke = invalid ? "#ef4444" : selected ? "#67e8f9" : "#64748b";
  const inset = Math.min(7, Math.max(3, Math.min(width, depth) * 0.16));
  const image = getCabinetImage(cabinetItem);
  const isLShapedCornerCabinet = image === "base-corner";
  const isAccessory = isAccessoryCabinetImage(image);
  const isBlindCabinet = isBlindCabinetImage(image);
  const selectionHandles = [
    { x: 0, y: -depth / 2 },
    { x: width / 2, y: 0 },
    { x: 0, y: depth / 2 },
    { x: -width / 2, y: 0 },
  ];

  if (isAccessory) {
    const accessoryStrokeWidth = selected ? 2.2 : 2;
    const fillerTabDepth = Math.min(Math.max(inchesToPixels(4), 5), Math.max(1, depth - 2));
    const showFillerTab = isFillerAccessoryCabinetImage(image) && depth > fillerTabDepth + 2;
    const fillerDividerY = depth / 2 - fillerTabDepth;

    return (
      <g transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}>
        <rect
          x={-width / 2}
          y={-depth / 2}
          width={width}
          height={depth}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={accessoryStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        {showFillerTab && (
          <line
            x1={-width / 2}
            y1={fillerDividerY}
            x2={width / 2}
            y2={fillerDividerY}
            stroke={stroke}
            strokeWidth={accessoryStrokeWidth}
            strokeOpacity={detailOpacity}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {selected && selectionHandles.map((handle, index) => (
          <circle
            key={`cabinet-handle-${index}`}
            cx={handle.x}
            cy={handle.y}
            r="4"
            fill="#22bfd6"
            stroke="#ffffff"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    );
  }

  return (
    <g transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}>
      {isLShapedCornerCabinet ? (
        <>
          <path
            d={getBaseCornerPlanPath(width, depth)}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={selected ? 2.2 : 2}
            vectorEffect="non-scaling-stroke"
          />
          {width > inset * 2 && depth > inset * 2 && (
            <path
              d={getBaseCornerPlanPath(width, depth, inset)}
              fill="none"
              stroke={innerStroke}
              strokeWidth="1.2"
              strokeOpacity={detailOpacity}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </>
      ) : (
        <>
          <rect
            x={-width / 2}
            y={-depth / 2}
            width={width}
            height={depth}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={selected ? 2.2 : 2}
            vectorEffect="non-scaling-stroke"
          />
          {!isBlindCabinet && width > inset * 2 && depth > inset * 2 && (
            <rect
              x={-width / 2 + inset}
              y={-depth / 2 + inset}
              width={width - inset * 2}
              height={depth - inset * 2}
              fill="none"
              stroke={innerStroke}
              strokeWidth="1.2"
              strokeOpacity={detailOpacity}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </>
      )}
      {!isAccessory && (
        <>
          <CabinetPlanVariantDetails
            cabinetItem={cabinetItem}
            inset={inset}
            stroke={innerStroke}
            detailOpacity={detailOpacity}
          />
          <CabinetPlanAccessoryDetails
            cabinetItem={cabinetItem}
            inset={inset}
            stroke={innerStroke}
            detailOpacity={detailOpacity}
          />
        </>
      )}
      {!isAccessory && getCabinetPlanHandleTabRects(cabinetItem).map((tab, index) => (
        <rect
          key={`cabinet-plan-handle-tab-${index}`}
          x={tab.x}
          y={tab.y}
          width={tab.width}
          height={tab.height}
          rx="1.2"
          fill="#111827"
          fillOpacity={invalid ? 0.55 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {selected && selectionHandles.map((handle, index) => (
        <circle
          key={`cabinet-handle-${index}`}
          cx={handle.x}
          cy={handle.y}
          r="4"
          fill="#22bfd6"
          stroke="#ffffff"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

// CabinetMoveRotateControl
function CabinetMoveRotateControl({
  cabinetItem,
  onRotateStart,
  preview = false,
  invalid = false,
  showDegree = false,
}: {
  cabinetItem: CabinetElement;
  onRotateStart?: (event: React.PointerEvent<SVGPathElement>) => void;
  preview?: boolean;
  invalid?: boolean;
  showDegree?: boolean;
}) {
  const radius = Math.max(cabinetItem.width, cabinetItem.depth) / 2 + 20;
  const ringCenterRadius = radius - 7;
  const tickHalfLength = 2.7;
  const arcRadius = ringCenterRadius;
  const activeRotation = normalizeDegrees(cabinetItem.rotation);
  const rotateArcStart = -20;
  const rotateArcEnd = 20;
  const rotateColor = invalid ? "#ef4444" : preview ? "#35bed0" : "#06b6d4";
  const ringColor = invalid ? "#ef4444" : "#7eeaf4";
  const arrowMarkerId = preview ? "cabinetRotateArrowMarkerPreview" : "cabinetRotateArrowMarker";

  return (
    <g transform={`translate(${cabinetItem.center.x} ${cabinetItem.center.y})`} opacity={invalid ? 0.55 : 1}>
      <defs>
        <marker
          id={arrowMarkerId}
          viewBox="0 0 16 16"
          refX="10.4"
          refY="8"
          markerWidth="4.8"
          markerHeight="4.8"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <path
            d="M 3.2 3.25 L 12.2 8 L 3.2 12.75 Q 5.65 8 3.2 3.25 Z"
            fill={rotateColor}
            stroke={rotateColor}
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      <circle
        r={radius - 7}
        fill="none"
        stroke={ringColor}
        strokeWidth="14"
        strokeOpacity="0.45"
        pointerEvents="none"
        vectorEffect="non-scaling-stroke"
      />
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index * Math.PI) / 4;
        const x1 = Math.cos(angle) * (ringCenterRadius - tickHalfLength);
        const y1 = Math.sin(angle) * (ringCenterRadius - tickHalfLength);
        const x2 = Math.cos(angle) * (ringCenterRadius + tickHalfLength);
        const y2 = Math.sin(angle) * (ringCenterRadius + tickHalfLength);
        return (
          <line
            key={`cabinet-rotate-tick-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#111827"
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        );
      })}
      <path
        d={describeArc(0, 0, arcRadius, rotateArcStart, rotateArcEnd)}
        transform={`rotate(${activeRotation})`}
        fill="none"
        stroke={rotateColor}
        strokeWidth="4.15"
        strokeLinecap="round"
        markerStart={`url(#${arrowMarkerId})`}
        markerEnd={`url(#${arrowMarkerId})`}
        vectorEffect="non-scaling-stroke"
        onPointerDown={onRotateStart}
        style={{ cursor: onRotateStart ? "grab" : "default", pointerEvents: onRotateStart ? "stroke" : "none" }}
      />
      {showDegree && !preview && (
        <ellipse cx="0" cy="0" rx="25" ry="18" fill="#64748b" opacity="0.92" pointerEvents="none" />
      )}
      {showDegree && !preview && (
        <text x="0" y="6" textAnchor="middle" className="fill-white text-[18px] font-bold" pointerEvents="none">
          {Math.round(activeRotation)}°
        </text>
      )}
    </g>
  );
}

// CabinetArrow
function CabinetArrow({ x, y, rotation }: { x: number; y: number; rotation: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`} opacity="0.78">
      <path
        d="M-11.5,-3 H2 V-6.7 L9.6,0 L2,6.7 V3 H-11.5 Z"
        fill="#94a3b8"
        stroke="#ffffff"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

// CabinetDistanceGuides
function CabinetDistanceGuides({ metrics }: { metrics: CabinetDistanceMetric[] }) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  return (
    <g pointerEvents="none">
      {metrics.map((metric) => (
        <g key={metric.key}>
          <line
            x1={metric.start.x}
            y1={metric.start.y}
            x2={metric.end.x}
            y2={metric.end.y}
            stroke="#22bfd6"
            strokeWidth="1.5"
            strokeDasharray="6 8"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={metric.tickStart.x}
            y1={metric.tickStart.y}
            x2={metric.tickEnd.x}
            y2={metric.tickEnd.y}
            stroke="#22bfd6"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <SvgTextHalo
            x={metric.label.x}
            y={metric.label.y}
            text={formatFeetInches(metric.distance, measurementDisplayUnit)}
            className="fill-slate-700 text-[12px] font-bold"
          />
        </g>
      ))}
    </g>
  );
}

// SelectedCabinetContextMenu
function SelectedCabinetContextMenu({
  position,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  position: Point;
  onDelete: () => void;
  onDragStart: (
    event: React.PointerEvent<HTMLDivElement>,
    startPosition: Point
  ) => void;
  onDragMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={82}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[74px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected cabinet menu"
          className="flex w-6 shrink-0 cursor-grab items-center justify-center bg-[#0fb8d2] active:cursor-grabbing"
          onPointerDown={(event) => onDragStart(event, position)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex flex-col gap-1">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>

        <button
          type="button"
          aria-label="Delete selected cabinet"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </foreignObject>
  );
}

// CabinetDistanceMetric
type CabinetDistanceMetric = {
  key: string;
  start: Point;
  end: Point;
  tickStart: Point;
  tickEnd: Point;
  label: Point;
  distance: number;
};

// getCabinetPlacementPreview
function getCabinetPlacementPreview(
  rawPoint: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  cabinets: CabinetElement[] = [],
  excludedCabinetId?: string,
  cabinetCategory?: CabinetCategory,
  snapToCabinets = true,
  ignoreCabinetCollisions = false,
  enforcePlacementRules = true,
  preferredWallId?: string,
  cabinetImage?: CabinetImage
): CabinetPlacementPreview {
  const freeCenter = rawPoint;
  const thickWalls = walls.filter(isThickWall);
  let resolvedRotation = normalizeDegrees(rotation);
  let stickyWallId: string | undefined;
  let wallSnappedCenter = preferredWallId
    ? getWallFaceSnappedCabinetCenterForWall(
        freeCenter,
        thickWalls,
        width,
        depth,
        resolvedRotation,
        preferredWallId,
        WALL_THICKNESS / 2 + 24
      )
    : null;

  if (wallSnappedCenter) {
    stickyWallId = preferredWallId;
  } else {
    wallSnappedCenter = getWallFaceSnappedCabinetCenter(
      freeCenter,
      thickWalls,
      width,
      depth,
      resolvedRotation
    );
  }

  // Convenience auto-facing should not unexpectedly switch wall sides at a corner.
  // When an existing cabinet already belongs to a wall, keep auto-facing tied to
  // that same wall while the cabinet is still close to it. The user can still
  // rotate manually, and dragging clearly away from that wall lets normal auto
  // facing choose another wall.
  const autoFacingRotation = getCabinetAutoFacingRotationForWallFace(
    wallSnappedCenter,
    thickWalls,
    width,
    depth,
    resolvedRotation,
    stickyWallId
  );
  if (autoFacingRotation !== null) {
    resolvedRotation = autoFacingRotation;
    wallSnappedCenter = stickyWallId
      ? getWallFaceSnappedCabinetCenterForWall(
          freeCenter,
          thickWalls,
          width,
          depth,
          resolvedRotation,
          stickyWallId,
          WALL_THICKNESS / 2 + 24
        ) ?? wallSnappedCenter
      : getWallFaceSnappedCabinetCenter(
          freeCenter,
          thickWalls,
          width,
          depth,
          resolvedRotation
        );
  }

  let center = snapToCabinets
    ? getAdjacentCabinetSnappedCenter(
        wallSnappedCenter,
        cabinets,
        width,
        depth,
        resolvedRotation,
        cabinetCategory,
        excludedCabinetId
      )
    : wallSnappedCenter;

  center = getWallOverlapResolvedCabinetCenter(
    center,
    thickWalls,
    width,
    depth,
    resolvedRotation,
    stickyWallId
  );

  const handleSafePlacement = resolveCabinetPlacementWithHandlesFacingOut({
    rawPoint: freeCenter,
    currentCenter: center,
    walls: thickWalls,
    width,
    depth,
    rotation: resolvedRotation,
    cabinetCategory,
    cabinetImage,
    preferredWallId: stickyWallId,
  });
  center = handleSafePlacement.center;
  resolvedRotation = handleSafePlacement.rotation;
  stickyWallId = handleSafePlacement.wallId ?? stickyWallId;

  if (snapToCabinets) {
    center = getCollisionSafeAdjacentCabinetSnappedCenter({
      center,
      walls: thickWalls,
      cabinets,
      width,
      depth,
      rotation: resolvedRotation,
      cabinetCategory,
      cabinetImage,
      excludedCabinetId,
      preferredWallId: stickyWallId,
    });
    center = getWallOverlapResolvedCabinetCenter(
      center,
      thickWalls,
      width,
      depth,
      resolvedRotation,
      stickyWallId
    );
  }

  const attachments = getCabinetWallAttachments(
    { center, width, depth, rotation: resolvedRotation },
    thickWalls,
    Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
  );
  const attachment = (stickyWallId
    ? attachments.find((candidate) => candidate.wall.id === stickyWallId)
    : null) ?? attachments[0] ?? null;
  const candidateCabinet: CabinetElement = {
    id: excludedCabinetId ?? "pending-cabinet",
    center,
    width,
    depth,
    rotation: resolvedRotation,
    category: cabinetCategory,
    image: cabinetImage,
    heightInches: cabinetCategory === "wall" ? 30 : cabinetCategory === "pantry" ? 84 : 36,
    distanceFromFloorInches: cabinetCategory === "wall" ? 54 : 0,
    wallId: attachment?.wall.id,
    wallFace: attachment?.wallFace,
  };
  const attachedWall = attachment?.wall ?? null;
  const preview = {
    center,
    width,
    depth,
    rotation: resolvedRotation,
    category: cabinetCategory,
    wall: attachedWall,
    wallId: attachedWall?.id,
    wallFace: attachment?.wallFace,
    isValid: true,
  };

  if (attachedWall && !candidateCabinet.wallId) {
    candidateCabinet.wallId = attachedWall.id;
  }

  const isAttachedToWall = Boolean(attachedWall || candidateCabinet.wallId);
  const intersectsWall = enforcePlacementRules
    ? !isAttachedToWall || cabinetIntersectsAnyWall(preview, walls) || cabinetHandleTabsIntersectAnyWall(candidateCabinet, walls)
    : false;
  const intersectsCabinet = enforcePlacementRules && !ignoreCabinetCollisions
    ? Boolean(getCabinetPlacementRuleViolationMessage(candidateCabinet, cabinets, walls, excludedCabinetId, false))
    : false;
  let invalidReason: string | null | undefined;

  if (enforcePlacementRules) {
    invalidReason = getCabinetPlacementRuleViolationMessage(candidateCabinet, cabinets, walls, excludedCabinetId, true);
  }

  if (!intersectsWall && !intersectsCabinet && !invalidReason && enforcePlacementRules && cabinetCategory === "wall") {
    const candidateCabinets = [
      ...cabinets.filter((cabinetItem) => cabinetItem.id !== excludedCabinetId),
      candidateCabinet,
    ];
    invalidReason = getWallCabinetStackOverflowMessage(candidateCabinets, walls, candidateCabinet.id);
  }

  return {
    ...preview,
    isValid: !intersectsWall && !intersectsCabinet && !invalidReason,
    invalidReason: invalidReason ?? (intersectsWall
      ? isAttachedToWall
        ? "Cabinet cannot be placed through a wall."
        : CABINET_NOT_AGAINST_WALL_MESSAGE
      : undefined),
  };
}

// getWallOverlapResolvedCabinetCenter
function getWallOverlapResolvedCabinetCenter(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  preferredWallId?: string
): Point {
  const thickWalls = walls.filter(isThickWall);
  const collisionCandidate = { center, width, depth, rotation };
  if (!cabinetIntersectsAnyWall(collisionCandidate, thickWalls)) return center;

  const snappedCandidates: Point[] = [];
  const preferredSnap = preferredWallId
    ? getWallFaceSnappedCabinetCenterForWall(
        center,
        thickWalls,
        width,
        depth,
        rotation,
        preferredWallId,
        Number.POSITIVE_INFINITY
      )
    : null;

  if (preferredSnap) snappedCandidates.push(preferredSnap);

  snappedCandidates.push(
    getWallFaceSnappedCabinetCenter(
      center,
      thickWalls,
      width,
      depth,
      rotation,
      Number.POSITIVE_INFINITY
    )
  );

  for (const wall of thickWalls) {
    const wallSnap = getWallFaceSnappedCabinetCenterForWall(
      center,
      thickWalls,
      width,
      depth,
      rotation,
      wall.id,
      Number.POSITIVE_INFINITY
    );

    if (wallSnap) snappedCandidates.push(wallSnap);
  }

  let bestNonIntersecting: { center: Point; distance: number } | null = null;
  let bestFallback: { center: Point; distance: number } | null = null;

  for (const snappedCenter of snappedCandidates) {
    const moveDistance = distance(center, snappedCenter);
    const snappedCandidate = { center: snappedCenter, width, depth, rotation };

    if (!bestFallback || moveDistance < bestFallback.distance) {
      bestFallback = { center: snappedCenter, distance: moveDistance };
    }

    if (!cabinetIntersectsAnyWall(snappedCandidate, thickWalls)) {
      if (!bestNonIntersecting || moveDistance < bestNonIntersecting.distance) {
        bestNonIntersecting = { center: snappedCenter, distance: moveDistance };
      }
    }
  }

  return bestNonIntersecting?.center ?? bestFallback?.center ?? center;
}

// getWallFaceSnappedCabinetCenter
function getWallFaceSnappedCabinetCenter(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  snapThreshold = 18
): Point {
  const wallFacePadding = WALL_THICKNESS / 2;
  let nextCenter = { ...center };
  let bestXSnap: { delta: number; distance: number } | null = null;
  let bestYSnap: { delta: number; distance: number } | null = null;

  const considerSnap = (axis: "x" | "y", delta: number) => {
    const snapDistance = Math.abs(delta);
    if (snapDistance > snapThreshold) return;

    if (axis === "x") {
      if (!bestXSnap || snapDistance < bestXSnap.distance) {
        bestXSnap = { delta, distance: snapDistance };
      }
      return;
    }

    if (!bestYSnap || snapDistance < bestYSnap.distance) {
      bestYSnap = { delta, distance: snapDistance };
    }
  };

  const collectSnaps = () => {
    const bounds = getRotatedRectBounds(nextCenter, width, depth, rotation);

    for (const wall of walls) {
      const isVertical = Math.abs(wall.start.x - wall.end.x) < Math.abs(wall.start.y - wall.end.y);
      const isHorizontal = !isVertical;

      if (isVertical) {
        const minY = Math.min(wall.start.y, wall.end.y);
        const maxY = Math.max(wall.start.y, wall.end.y);
        const overlapsY = maxY >= bounds.minY && minY <= bounds.maxY;
        if (!overlapsY) continue;

        const centerX = (wall.start.x + wall.end.x) / 2;
        const leftFace = centerX - wallFacePadding;
        const rightFace = centerX + wallFacePadding;
        considerSnap("x", leftFace - bounds.maxX);
        considerSnap("x", rightFace - bounds.minX);
        continue;
      }

      if (isHorizontal) {
        const minX = Math.min(wall.start.x, wall.end.x);
        const maxX = Math.max(wall.start.x, wall.end.x);
        const overlapsX = maxX >= bounds.minX && minX <= bounds.maxX;
        if (!overlapsX) continue;

        const centerY = (wall.start.y + wall.end.y) / 2;
        const topFace = centerY - wallFacePadding;
        const bottomFace = centerY + wallFacePadding;
        considerSnap("y", topFace - bounds.maxY);
        considerSnap("y", bottomFace - bounds.minY);
      }
    }
  };

  collectSnaps();

  const resolvedXSnap = bestXSnap as { delta: number; distance: number } | null;
  const resolvedYSnap = bestYSnap as { delta: number; distance: number } | null;

  if (resolvedXSnap) {
    nextCenter = { ...nextCenter, x: nextCenter.x + resolvedXSnap.delta };
  }

  if (resolvedYSnap) {
    nextCenter = { ...nextCenter, y: nextCenter.y + resolvedYSnap.delta };
  }

  const attachment = getBestCabinetWallAttachment(
    { center: nextCenter, width, depth, rotation },
    walls,
    Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
  );

  return attachment
    ? getWallEndStoppedCabinetCenter(nextCenter, walls, width, depth, rotation, attachment.wall.id)
    : nextCenter;
}

type CabinetWallSideGuideLine = {
  startAnchor: Point;
  endAnchor: Point;
  direction: Point;
  length: number;
  side: Exclude<MeasurementSide, "length">;
};

function getCabinetWallSideGuideLine(
  wall: Wall,
  walls: Wall[],
  cabinetCenter: Point
): CabinetWallSideGuideLine | null {
  const wallDirection = normalize(sub(wall.end, wall.start));
  if (!vectorLength(wallDirection)) return null;

  // Use the wall's own start -> end direction here, not getElevationWallAxis().
  // getElevationWallAxis() may flip the wall for reading order, which also
  // flips left/right and can clamp a cabinet against the opposite black-dot
  // side. A cabinet standing on a wall side must use the two dots that form
  // that exact physical side of this wall segment.
  const wallNormal = normalize(perp(wallDirection));
  const signedSideDistance = dot(sub(cabinetCenter, wall.start), wallNormal);
  const cabinetGuideSide: Exclude<MeasurementSide, "length"> =
    signedSideDistance >= 0 ? "left" : "right";

  const segmentGeometry = getWallSegmentBlackDotGeometry(
    wall.start,
    wall.end,
    walls.filter(isThickWall)
  );
  const startAnchor = cabinetGuideSide === "left"
    ? segmentGeometry.startLeft
    : segmentGeometry.startRight;
  const endAnchor = cabinetGuideSide === "left"
    ? segmentGeometry.endLeft
    : segmentGeometry.endRight;
  const length = distance(startAnchor, endAnchor);

  if (length < 0.001) return null;

  return {
    startAnchor,
    endAnchor,
    direction: normalize(sub(endAnchor, startAnchor)),
    length,
    side: cabinetGuideSide,
  };
}

// Clamp cabinets attached to a wall run to the black-dot endpoints that belong
// to the same side of the wall the cabinet is standing on. This prevents a
// chained/perpendicular wall on the opposite side from shortening the usable
// drag span. The cabinet edge is allowed to snap/stop at the two black dots on
// its own wall-face line.
function getWallEndStoppedCabinetCenter(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  wallId: string,
  stopThreshold = Number.POSITIVE_INFINITY
): Point {
  const wall = walls.find((candidate) => candidate.id === wallId && isThickWall(candidate));
  if (!wall) return center;

  const sideLine = getCabinetWallSideGuideLine(wall, walls, center);
  if (!sideLine || sideLine.length < 1) return center;

  // Clamp along the actual wall-side line formed by its two black dots. This
  // fixes chained/mitered wall cases where the wall rectangle edge and the
  // visible black-dot side are not the same usable run.
  const cabinetInterval = getRotatedRectProjectionInterval(
    center,
    width,
    depth,
    rotation,
    sideLine.startAnchor,
    sideLine.direction
  );
  const startOverflow = -cabinetInterval.min;
  const endOverflow = cabinetInterval.max - sideLine.length;
  let projectionDelta = 0;

  if (startOverflow > 0 && startOverflow <= stopThreshold + WALL_THICKNESS) {
    projectionDelta = startOverflow;
  }

  if (endOverflow > 0 && endOverflow <= stopThreshold + WALL_THICKNESS) {
    projectionDelta = projectionDelta === 0
      ? -endOverflow
      : Math.abs(endOverflow) < Math.abs(projectionDelta)
        ? -endOverflow
        : projectionDelta;
  }

  if (projectionDelta === 0) return center;

  return add(center, mul(sideLine.direction, projectionDelta));
}

function getThickWallProjectionInterval(
  wall: Wall,
  axisStart: Point,
  axisDirection: Point
) {
  const direction = normalize(sub(wall.end, wall.start));
  const normal = perp(direction);
  const corners = [
    add(wall.start, mul(normal, WALL_THICKNESS / 2)),
    add(wall.end, mul(normal, WALL_THICKNESS / 2)),
    add(wall.end, mul(normal, -WALL_THICKNESS / 2)),
    add(wall.start, mul(normal, -WALL_THICKNESS / 2)),
  ];
  const projections = corners.map((corner) => dot(sub(corner, axisStart), axisDirection));

  return {
    min: Math.min(...projections),
    max: Math.max(...projections),
  };
}

function getRotatedRectProjectionInterval(
  center: Point,
  width: number,
  depth: number,
  rotation: number,
  axisStart: Point,
  axisDirection: Point
) {
  const corners = getRotatedRectCorners(center, width, depth, rotation);
  const projections = corners.map((corner) => dot(sub(corner, axisStart), axisDirection));

  return {
    min: Math.min(...projections),
    max: Math.max(...projections),
  };
}

function getWallCollisionPolygon(wall: Wall, walls: Wall[]): Point[] {
  if (!isThickWall(wall)) {
    return [wall.start, wall.end, wall.end, wall.start];
  }

  return getWallSegmentBlackDotGeometry(
    wall.start,
    wall.end,
    walls.filter(isThickWall)
  ).polygon;
}

function polygonsOverlapForCabinetBlocking(firstPolygon: Point[], secondPolygon: Point[]) {
  if (firstPolygon.length < 3 || secondPolygon.length < 3) return false;

  const firstEdges = firstPolygon.map((point, index) => ({
    start: point,
    end: firstPolygon[(index + 1) % firstPolygon.length],
  }));
  const secondEdges = secondPolygon.map((point, index) => ({
    start: point,
    end: secondPolygon[(index + 1) % secondPolygon.length],
  }));

  return (
    firstPolygon.some((point) => pointInPolygon(point, secondPolygon)) ||
    secondPolygon.some((point) => pointInPolygon(point, firstPolygon)) ||
    firstEdges.some((firstEdge) =>
      secondEdges.some((secondEdge) =>
        cabinetOpenSegmentsIntersect(
          firstEdge.start,
          firstEdge.end,
          secondEdge.start,
          secondEdge.end
        )
      )
    )
  );
}

function getCabinetPlanHandleTabPolygons(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "category" | "image">>
) {
  const radians = degreesToRadians(cabinetItem.rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const toWorldPoint = (localPoint: Point): Point => ({
    x: cabinetItem.center.x + localPoint.x * cosValue - localPoint.y * sinValue,
    y: cabinetItem.center.y + localPoint.x * sinValue + localPoint.y * cosValue,
  });

  return getCabinetPlanHandleTabRects(cabinetItem).map((tab) =>
    [
      { x: tab.x, y: tab.y },
      { x: tab.x + tab.width, y: tab.y },
      { x: tab.x + tab.width, y: tab.y + tab.height },
      { x: tab.x, y: tab.y + tab.height },
    ].map(toWorldPoint)
  );
}

function cabinetHandleTabsIntersectAnyWall(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "category" | "image">>,
  walls: Wall[]
) {
  const tabPolygons = getCabinetPlanHandleTabPolygons(cabinetItem);
  if (tabPolygons.length === 0) return false;

  const thickWalls = walls.filter(isThickWall);
  return tabPolygons.some((tabPolygon) =>
    thickWalls.some((wall) =>
      polygonsOverlapForCabinetBlocking(
        tabPolygon,
        getWallCollisionPolygon(wall, thickWalls)
      )
    )
  );
}

type CabinetWallFacingResolution = {
  center: Point;
  rotation: number;
  wallId?: string;
  wallFace?: WallFaceSide;
};

function resolveCabinetPlacementWithHandlesFacingOut({
  rawPoint,
  currentCenter,
  walls,
  width,
  depth,
  rotation,
  cabinetCategory,
  cabinetImage,
  preferredWallId,
}: {
  rawPoint: Point;
  currentCenter: Point;
  walls: Wall[];
  width: number;
  depth: number;
  rotation: number;
  cabinetCategory?: CabinetCategory;
  cabinetImage?: CabinetImage;
  preferredWallId?: string;
}): CabinetWallFacingResolution {
  const thickWalls = walls.filter(isThickWall);
  if (!thickWalls.length) {
    return { center: currentCenter, rotation };
  }

  const wallIds = [
    ...(preferredWallId ? [preferredWallId] : []),
    ...thickWalls
      .filter((wall) => wall.id !== preferredWallId)
      .slice()
      .sort(
        (left, right) =>
          pointToSegmentDistance(rawPoint, left.start, left.end) -
          pointToSegmentDistance(rawPoint, right.start, right.end)
      )
      .map((wall) => wall.id),
  ];
  const normalizedRotation = normalizeDegrees(rotation);
  const nearestCardinalRotation = normalizeDegrees(Math.round(normalizedRotation / 90) * 90);

  const candidates: Array<CabinetWallFacingResolution & { score: number; bodyBlocked: boolean; handleBlocked: boolean }> = [];

  const getWallParallelPenalty = (candidateRotation: number, candidateWallId?: string) => {
    const attachedWall = candidateWallId
      ? thickWalls.find((wall) => wall.id === candidateWallId)
      : null;
    if (!attachedWall) return 0;

    const alignedRotations = getCabinetRotationsParallelToWall(attachedWall);
    const angleError = Math.min(
      ...alignedRotations.map((alignedRotation) =>
        Math.abs(cabinetShortestAngleDistance(candidateRotation, alignedRotation))
      )
    );

    // A cabinet placed on a wall must stay parallel to that wall. Without this
    // penalty the resolver can prefer a 90-degree turn because it is a little
    // closer to the cursor, which creates the bad red/perpendicular preview.
    return angleError <= 2 ? 0 : 75000 + angleError * 250;
  };

  const addCandidate = (candidateCenter: Point, candidateRotation: number, candidateWallId?: string, baseScore = 0) => {
    const stoppedCenter = candidateWallId
      ? getWallEndStoppedCabinetCenter(
          candidateCenter,
          thickWalls,
          width,
          depth,
          candidateRotation,
          candidateWallId
        )
      : candidateCenter;
    const candidate = {
      center: stoppedCenter,
      width,
      depth,
      rotation: candidateRotation,
      category: cabinetCategory,
      image: cabinetImage,
    };
    const bodyBlocked = cabinetIntersectsAnyWall(candidate, thickWalls);
    const handleBlocked = cabinetHandleTabsIntersectAnyWall(candidate, thickWalls);
    const attachment = getBestCabinetWallAttachment(
      candidate,
      thickWalls,
      Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
    );
    const wallId = candidateWallId ?? attachment?.wall.id;
    const wallFace = attachment?.wallFace;
    const score =
      baseScore +
      distance(rawPoint, stoppedCenter) +
      getWallParallelPenalty(candidateRotation, wallId) +
      (bodyBlocked ? 100000 : 0) +
      (handleBlocked ? 50000 : 0) +
      (!wallId ? 25000 : 0) +
      (preferredWallId && wallId !== preferredWallId ? 4000 : 0);

    candidates.push({
      center: stoppedCenter,
      rotation: candidateRotation,
      wallId,
      wallFace,
      score,
      bodyBlocked,
      handleBlocked,
    });
  };

  addCandidate(currentCenter, normalizedRotation, preferredWallId, 120);
  addCandidate(currentCenter, normalizeDegrees(normalizedRotation + 180), preferredWallId, 132);

  for (const wallId of wallIds) {
    const wall = thickWalls.find((candidateWall) => candidateWall.id === wallId);
    if (!wall) continue;

    const rotations = Array.from(
      new Set(
        [
          ...getCabinetRotationsParallelToWall(wall),
          nearestCardinalRotation,
          normalizeDegrees(nearestCardinalRotation + 180),
        ]
          .map((value) => Math.round(normalizeDegrees(value)))
          .filter((value) =>
            getCabinetRotationsParallelToWall(wall).some(
              (alignedRotation) => Math.abs(cabinetShortestAngleDistance(value, alignedRotation)) <= 2
            )
          )
      )
    );

    for (const candidateRotation of rotations) {
      const snappedCenters = getWallFaceSnappedCabinetCentersForWall(
        rawPoint,
        thickWalls,
        width,
        depth,
        candidateRotation,
        wallId,
        Number.POSITIVE_INFINITY
      );

      for (const snappedCenter of snappedCenters) {
        addCandidate(
          getWallOverlapResolvedCabinetCenter(
            snappedCenter,
            thickWalls,
            width,
            depth,
            candidateRotation,
            wallId
          ),
          candidateRotation,
          wallId,
          4
        );
      }
    }
  }

  const validCandidates = candidates.filter(
    (candidate) => !candidate.bodyBlocked && !candidate.handleBlocked
  );
  const bodySafeCandidates = candidates.filter((candidate) => !candidate.bodyBlocked);
  const pool = validCandidates.length ? validCandidates : bodySafeCandidates.length ? bodySafeCandidates : candidates;
  const bestCandidate = pool.slice().sort((left, right) => left.score - right.score)[0];

  return bestCandidate
    ? {
        center: bestCandidate.center,
        rotation: bestCandidate.rotation,
        wallId: bestCandidate.wallId,
        wallFace: bestCandidate.wallFace,
      }
    : { center: currentCenter, rotation: normalizedRotation, wallId: preferredWallId };
}



function getCabinetRotationsParallelToWall(wall: Wall): number[] {
  const wallVector = sub(wall.end, wall.start);
  const wallAngle = normalizeDegrees((Math.atan2(wallVector.y, wallVector.x) * 180) / Math.PI);
  return [wallAngle, normalizeDegrees(wallAngle + 180)];
}

function getWallFaceSnappedCabinetCentersForWall(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  wallId: string,
  snapThreshold = 18
): Point[] {
  const wall = walls.find((candidate) => candidate.id === wallId && isThickWall(candidate));
  if (!wall) return [];

  const wallFacePadding = WALL_THICKNESS / 2;
  const bounds = getRotatedRectBounds(center, width, depth, rotation);
  const wallIsVertical = Math.abs(wall.start.x - wall.end.x) < Math.abs(wall.start.y - wall.end.y);
  const snappedCenters: Point[] = [];

  const pushUniqueCenter = (candidateCenter: Point) => {
    if (snappedCenters.some((existingCenter) => distance(existingCenter, candidateCenter) < 0.001)) {
      return;
    }
    snappedCenters.push(candidateCenter);
  };

  if (wallIsVertical) {
    const minY = Math.min(wall.start.y, wall.end.y);
    const maxY = Math.max(wall.start.y, wall.end.y);
    const overlapY = Math.min(bounds.maxY, maxY) - Math.max(bounds.minY, minY);
    if (overlapY <= Math.max(1, Math.min(depth, width) * 0.2)) return [];

    const centerX = (wall.start.x + wall.end.x) / 2;
    const leftFace = centerX - wallFacePadding;
    const rightFace = centerX + wallFacePadding;
    const faceDeltas = [leftFace - bounds.maxX, rightFace - bounds.minX].sort(
      (leftDelta, rightDelta) => Math.abs(leftDelta) - Math.abs(rightDelta)
    );

    faceDeltas.forEach((delta) => {
      if (Math.abs(delta) > snapThreshold) return;
      pushUniqueCenter(getWallEndStoppedCabinetCenter(
        { ...center, x: center.x + delta },
        walls,
        width,
        depth,
        rotation,
        wallId
      ));
    });

    return snappedCenters;
  }

  const minX = Math.min(wall.start.x, wall.end.x);
  const maxX = Math.max(wall.start.x, wall.end.x);
  const overlapX = Math.min(bounds.maxX, maxX) - Math.max(bounds.minX, minX);
  if (overlapX <= Math.max(1, Math.min(depth, width) * 0.2)) return [];

  const centerY = (wall.start.y + wall.end.y) / 2;
  const topFace = centerY - wallFacePadding;
  const bottomFace = centerY + wallFacePadding;
  const faceDeltas = [topFace - bounds.maxY, bottomFace - bounds.minY].sort(
    (leftDelta, rightDelta) => Math.abs(leftDelta) - Math.abs(rightDelta)
  );

  faceDeltas.forEach((delta) => {
    if (Math.abs(delta) > snapThreshold) return;
    pushUniqueCenter(getWallEndStoppedCabinetCenter(
      { ...center, y: center.y + delta },
      walls,
      width,
      depth,
      rotation,
      wallId
    ));
  });

  return snappedCenters;
}


function getWallFaceSnappedCabinetCenterForWall(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  wallId: string,
  snapThreshold = 18
): Point | null {
  const snappedCenters = getWallFaceSnappedCabinetCentersForWall(
    center,
    walls,
    width,
    depth,
    rotation,
    wallId,
    snapThreshold
  );

  return snappedCenters.slice().sort(
    (left, right) => distance(center, left) - distance(center, right)
  )[0] ?? null;
}

function getCabinetAutoFacingRotationForWallFace(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  preferredWallId?: string
): number | null {
  const normalizedRotation = normalizeDegrees(rotation);
  const nearestCardinalRotation = normalizeDegrees(Math.round(normalizedRotation / 90) * 90);
  if (cabinetShortestAngleDistance(normalizedRotation, nearestCardinalRotation) > 2) {
    return null;
  }

  const faceNormal = getNearestCabinetWallFaceNormal(center, walls, width, depth, nearestCardinalRotation, preferredWallId);
  if (!faceNormal) return null;

  return normalizeDegrees((Math.atan2(-faceNormal.x, faceNormal.y) * 180) / Math.PI);
}

function getNearestCabinetWallFaceNormal(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  preferredWallId?: string
): Point | null {
  const attachmentTolerance = 10;
  const wallFacePadding = WALL_THICKNESS / 2;
  const bounds = getRotatedRectBounds(
    center,
    Math.max(1, width - 1),
    Math.max(1, depth - 1),
    rotation
  );
  let bestMatch: { normal: Point; distance: number } | null = null;

  const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) > 1;

  const considerFace = (normal: Point, faceDistance: number) => {
    const absDistance = Math.abs(faceDistance);
    if (absDistance > attachmentTolerance) return;
    if (!bestMatch || absDistance < bestMatch.distance) {
      bestMatch = { normal, distance: absDistance };
    }
  };

  walls
    .filter(isThickWall)
    .filter((wall) => !preferredWallId || wall.id === preferredWallId)
    .forEach((wall) => {
    const wallIsVertical = Math.abs(wall.start.x - wall.end.x) < Math.abs(wall.start.y - wall.end.y);

    if (wallIsVertical) {
      const minY = Math.min(wall.start.y, wall.end.y);
      const maxY = Math.max(wall.start.y, wall.end.y);
      if (!rangesOverlap(bounds.minY, bounds.maxY, minY, maxY)) return;

      const centerX = (wall.start.x + wall.end.x) / 2;
      const leftFace = centerX - wallFacePadding;
      const rightFace = centerX + wallFacePadding;
      considerFace({ x: -1, y: 0 }, bounds.maxX - leftFace);
      considerFace({ x: 1, y: 0 }, bounds.minX - rightFace);
      return;
    }

    const minX = Math.min(wall.start.x, wall.end.x);
    const maxX = Math.max(wall.start.x, wall.end.x);
    if (!rangesOverlap(bounds.minX, bounds.maxX, minX, maxX)) return;

    const centerY = (wall.start.y + wall.end.y) / 2;
    const topFace = centerY - wallFacePadding;
    const bottomFace = centerY + wallFacePadding;
    considerFace({ x: 0, y: -1 }, bounds.maxY - topFace);
    considerFace({ x: 0, y: 1 }, bounds.minY - bottomFace);
  });

  const resolvedBestMatch = bestMatch as { normal: Point; distance: number } | null;
  return resolvedBestMatch ? resolvedBestMatch.normal : null;
}

// getAdjacentCabinetSnappedCenter
function getAdjacentCabinetSnappedCenter(
  center: Point,
  cabinets: CabinetElement[],
  width: number,
  depth: number,
  rotation: number,
  cabinetCategory?: CabinetCategory,
  excludedCabinetId?: string
): Point {
  const neighborAwarenessThreshold = 24;
  const edgeBindingSnapThreshold = 22;
  const alignmentThreshold = 14;
  const rotationIsStraight = Math.abs(cabinetShortestAngleDistance(normalizeDegrees(rotation), 0)) < 1 ||
    Math.abs(cabinetShortestAngleDistance(normalizeDegrees(rotation), 180)) < 1;
  const rotationIsQuarterTurn = Math.abs(cabinetShortestAngleDistance(normalizeDegrees(rotation), 90)) < 1 ||
    Math.abs(cabinetShortestAngleDistance(normalizeDegrees(rotation), 270)) < 1;

  if (!rotationIsStraight && !rotationIsQuarterTurn) return center;

  const pendingCategory = cabinetCategory ?? getCabinetElevationCategory({
    id: "pending-cabinet",
    center,
    width,
    depth,
    rotation,
  });

  let nextCenter = { ...center };
  let bestXEdgeSnap: { delta: number; distance: number } | null = null;
  let bestYEdgeSnap: { delta: number; distance: number } | null = null;
  let bestXAlignmentSnap: { delta: number; distance: number } | null = null;
  let bestYAlignmentSnap: { delta: number; distance: number } | null = null;

  const considerSnap = (
    axis: "x" | "y",
    kind: "edge" | "alignment",
    delta: number,
    threshold = neighborAwarenessThreshold
  ) => {
    const snapDistance = Math.abs(delta);
    if (snapDistance > threshold) return;

    if (axis === "x" && kind === "edge") {
      if (!bestXEdgeSnap || snapDistance < bestXEdgeSnap.distance) {
        bestXEdgeSnap = { delta, distance: snapDistance };
      }
      return;
    }

    if (axis === "y" && kind === "edge") {
      if (!bestYEdgeSnap || snapDistance < bestYEdgeSnap.distance) {
        bestYEdgeSnap = { delta, distance: snapDistance };
      }
      return;
    }

    if (axis === "x") {
      if (!bestXAlignmentSnap || snapDistance < bestXAlignmentSnap.distance) {
        bestXAlignmentSnap = { delta, distance: snapDistance };
      }
      return;
    }

    if (!bestYAlignmentSnap || snapDistance < bestYAlignmentSnap.distance) {
      bestYAlignmentSnap = { delta, distance: snapDistance };
    }
  };

  const rangesOverlapOrTouch = (minA: number, maxA: number, minB: number, maxB: number, tolerance = 0) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) >= -tolerance;

  const bounds = getRotatedRectBounds(nextCenter, width, depth, rotation);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  for (const otherCabinet of cabinets) {
    if (otherCabinet.id === excludedCabinetId) continue;

    const otherCategory = getCabinetElevationCategory(otherCabinet);
    const samePlacementLayer =
      isElevationFloatingCabinet({ category: pendingCategory, width }) ===
      isElevationFloatingCabinet(otherCabinet);

    const otherBounds = getRotatedRectBounds(
      otherCabinet.center,
      otherCabinet.width,
      otherCabinet.depth,
      otherCabinet.rotation
    );
    const otherCenterX = (otherBounds.minX + otherBounds.maxX) / 2;
    const otherCenterY = (otherBounds.minY + otherBounds.maxY) / 2;

    const nearSameRows = rangesOverlapOrTouch(bounds.minY, bounds.maxY, otherBounds.minY, otherBounds.maxY, alignmentThreshold);
    const nearSameColumns = rangesOverlapOrTouch(bounds.minX, bounds.maxX, otherBounds.minX, otherBounds.maxX, alignmentThreshold);
    const nearVerticalNeighbor =
      Math.abs(otherBounds.minY - bounds.maxY) <= neighborAwarenessThreshold ||
      Math.abs(otherBounds.maxY - bounds.minY) <= neighborAwarenessThreshold ||
      nearSameRows;
    const nearHorizontalNeighbor =
      Math.abs(otherBounds.minX - bounds.maxX) <= neighborAwarenessThreshold ||
      Math.abs(otherBounds.maxX - bounds.minX) <= neighborAwarenessThreshold ||
      nearSameColumns;

    // Edge-to-edge snaps are allowed across every cabinet category, but only when
    // the cabinet is almost touching the neighboring cabinet. This preserves the
    // existing snap/bind behavior for closed cabinets while still letting the user
    // intentionally leave a small reveal/filler gap between nearby cabinets.
    if (nearSameRows) {
      considerSnap("x", "edge", otherBounds.minX - bounds.maxX, edgeBindingSnapThreshold);
      considerSnap("x", "edge", otherBounds.maxX - bounds.minX, edgeBindingSnapThreshold);
    }

    if (nearSameColumns) {
      considerSnap("y", "edge", otherBounds.minY - bounds.maxY, edgeBindingSnapThreshold);
      considerSnap("y", "edge", otherBounds.maxY - bounds.minY, edgeBindingSnapThreshold);
    }

    // Alignment snaps are only same-layer. Cross-layer alignment was the root cause
    // of wall cabinets being pulled into a small false gap or a small false overlap
    // when the user wanted edge-to-edge placement beside base/pantry cabinets.
    if (samePlacementLayer && nearVerticalNeighbor) {
      considerSnap("x", "alignment", otherBounds.minX - bounds.minX, alignmentThreshold);
      considerSnap("x", "alignment", otherBounds.maxX - bounds.maxX, alignmentThreshold);
      considerSnap("x", "alignment", otherCenterX - centerX, alignmentThreshold);
    }

    if (samePlacementLayer && nearHorizontalNeighbor) {
      considerSnap("y", "alignment", otherBounds.minY - bounds.minY, alignmentThreshold);
      considerSnap("y", "alignment", otherBounds.maxY - bounds.maxY, alignmentThreshold);
      considerSnap("y", "alignment", otherCenterY - centerY, alignmentThreshold);
    }
  }

  // Prefer true edge-to-edge snaps when the moving cabinet is close enough to
  // another cabinet edge. Fall back to same-layer alignment snaps when there is
  // no nearby edge contact candidate. Collision validation below still decides
  // whether the snapped position is actually allowed in floor/elevation.
  const xSnap = bestXEdgeSnap ?? bestXAlignmentSnap;
  const ySnap = bestYEdgeSnap ?? bestYAlignmentSnap;

  const resolvedXNeighborSnap = xSnap as { delta: number; distance: number } | null;
  const resolvedYNeighborSnap = ySnap as { delta: number; distance: number } | null;

  if (resolvedXNeighborSnap) {
    nextCenter = { ...nextCenter, x: nextCenter.x + resolvedXNeighborSnap.delta };
  }

  if (resolvedYNeighborSnap) {
    nextCenter = { ...nextCenter, y: nextCenter.y + resolvedYNeighborSnap.delta };
  }

  return nextCenter;
}

type CabinetEdgeSnapOptions = {
  center: Point;
  walls: Wall[];
  cabinets: CabinetElement[];
  width: number;
  depth: number;
  rotation: number;
  cabinetCategory?: CabinetCategory;
  cabinetImage?: CabinetImage;
  excludedCabinetId?: string;
  preferredWallId?: string;
  snapThreshold?: number;
};

function getCabinetEdgeToEdgeSnappedCenter({
  center,
  walls,
  cabinets,
  width,
  depth,
  rotation,
  cabinetCategory,
  cabinetImage,
  excludedCabinetId,
  preferredWallId,
  snapThreshold = 18,
}: CabinetEdgeSnapOptions): Point {
  const thickWalls = walls.filter(isThickWall);
  const movingBounds = getRotatedRectBounds(center, width, depth, rotation);
  const movingCategory = cabinetCategory ?? getCabinetElevationCategory({
    id: excludedCabinetId ?? "pending-cabinet",
    center,
    width,
    depth,
    rotation,
  });
  const attachments = getCabinetWallAttachments(
    { center, width, depth, rotation },
    thickWalls,
    Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
  );
  const wallAttachment = (preferredWallId
    ? attachments.find((attachment) => attachment.wall.id === preferredWallId)
    : null) ?? attachments[0] ?? null;
  const attachedWall = wallAttachment?.wall ?? null;
  const attachedWallIsVertical = attachedWall
    ? Math.abs(attachedWall.start.x - attachedWall.end.x) < Math.abs(attachedWall.start.y - attachedWall.end.y)
    : null;
  const allowedAxes: Array<"x" | "y"> = attachedWallIsVertical === null
    ? ["x", "y"]
    : attachedWallIsVertical
      ? ["y"]
      : ["x"];
  const overlapTolerance = Math.max(8, snapThreshold);
  const targetWallId = preferredWallId ?? attachedWall?.id;
  const targetWall = targetWallId
    ? thickWalls.find((candidateWall) => candidateWall.id === targetWallId) ?? null
    : null;
  const movingCabinetFromList = excludedCabinetId
    ? cabinets.find((cabinetItem) => cabinetItem.id === excludedCabinetId) ?? null
    : null;
  const movingImage = cabinetImage ?? movingCabinetFromList?.image;

  const rangesNearOrOverlap = (minA: number, maxA: number, minB: number, maxB: number, tolerance = 0) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) >= -tolerance;

  const belongsToSameSnapRun = (otherCabinet: CabinetElement) => {
    if (!targetWallId || !otherCabinet.wallId) return true;
    if (otherCabinet.wallId === targetWallId) return true;

    const involvesCornerCabinet = movingImage === "base-corner" || otherCabinet.image === "base-corner";
    if (!involvesCornerCabinet || !targetWall) return false;

    const otherWall = thickWalls.find((candidateWall) => candidateWall.id === otherCabinet.wallId) ?? null;
    return Boolean(
      otherWall &&
      wallsShareEndpoint(targetWall, otherWall, Math.max(2, WALL_THICKNESS + 4))
    );
  };

  const snapCandidates: Array<{ center: Point; distance: number; axis: "x" | "y" }> = [];

  for (const otherCabinet of cabinets) {
    if (otherCabinet.id === excludedCabinetId) continue;
    if (!belongsToSameSnapRun(otherCabinet)) continue;

    const otherBounds = getRotatedRectBounds(
      otherCabinet.center,
      otherCabinet.width,
      otherCabinet.depth,
      otherCabinet.rotation
    );
    const otherCategory = getCabinetElevationCategory(otherCabinet);

    // Keep edge snap broad enough to support wall-over-base alignment, but avoid
    // snapping floor-standing cabinets to upper cabinets on different elevation
    // paths unless they share the same wall/run. Collision validation still
    // decides whether the snapped placement is legal after the edge alignment.
    if (
      isElevationFloatingCabinet({ category: movingCategory, width }) !== isElevationFloatingCabinet(otherCabinet) &&
      preferredWallId &&
      otherCabinet.wallId &&
      otherCabinet.wallId !== preferredWallId
    ) {
      continue;
    }

    if (
      allowedAxes.includes("x") &&
      rangesNearOrOverlap(movingBounds.minY, movingBounds.maxY, otherBounds.minY, otherBounds.maxY, overlapTolerance)
    ) {
      [
        otherBounds.minX - movingBounds.maxX,
        otherBounds.maxX - movingBounds.minX,
      ].forEach((delta) => {
        const distance = Math.abs(delta);
        if (distance <= snapThreshold) {
          snapCandidates.push({
            center: { ...center, x: center.x + delta },
            distance,
            axis: "x",
          });
        }
      });
    }

    if (
      allowedAxes.includes("y") &&
      rangesNearOrOverlap(movingBounds.minX, movingBounds.maxX, otherBounds.minX, otherBounds.maxX, overlapTolerance)
    ) {
      [
        otherBounds.minY - movingBounds.maxY,
        otherBounds.maxY - movingBounds.minY,
      ].forEach((delta) => {
        const distance = Math.abs(delta);
        if (distance <= snapThreshold) {
          snapCandidates.push({
            center: { ...center, y: center.y + delta },
            distance,
            axis: "y",
          });
        }
      });
    }
  }

  if (!snapCandidates.length) return center;

  const candidates = snapCandidates
    .map((candidate) => {
      const wallStoppedCenter = attachedWall
        ? getWallEndStoppedCabinetCenter(
            candidate.center,
            thickWalls,
            width,
            depth,
            rotation,
            attachedWall.id
          )
        : candidate.center;
      const wallResolvedCenter = getWallOverlapResolvedCabinetCenter(
        wallStoppedCenter,
        thickWalls,
        width,
        depth,
        rotation,
        preferredWallId ?? attachedWall?.id
      );
      const candidateCabinet = {
        center: wallResolvedCenter,
        width,
        depth,
        rotation,
        category: cabinetCategory,
        image: movingImage,
      };
      const wallPenalty = cabinetIntersectsAnyWall(candidateCabinet, thickWalls) ||
        cabinetHandleTabsIntersectAnyWall(candidateCabinet, thickWalls)
        ? 100000
        : 0;
      return {
        center: wallResolvedCenter,
        score: candidate.distance + wallPenalty,
      };
    })
    .sort((left, right) => left.score - right.score);

  return candidates[0]?.center ?? center;
}

function getCollisionSafeAdjacentCabinetSnappedCenter(options: CabinetEdgeSnapOptions): Point {
  return getCabinetEdgeToEdgeSnappedCenter(options);
}
function getWallCabinetElevationOverlapMessage(
  cabinetItem: CabinetElement,
  cabinets: CabinetElement[],
  walls: Wall[],
  excludedCabinetId?: string
): string | undefined {
  const thickWalls = walls.filter(isThickWall);
  if (!thickWalls.length) return undefined;

  const candidateCabinets = cabinets.some((candidate) => candidate.id === cabinetItem.id)
    ? cabinets.map((candidate) =>
        candidate.id === cabinetItem.id ? cabinetItem : candidate
      )
    : [...cabinets, cabinetItem];

  const overlapToleranceInches = 0.25;

  for (const wall of thickWalls) {
    const placements = getCabinetElevationPlacementsForWall(
      wall,
      candidateCabinets,
      thickWalls
    );
    const movingPlacement = placements.find(
      (placement) => placement.cabinet.id === cabinetItem.id
    );

    if (!movingPlacement) continue;

    const movingStart = movingPlacement.startInches;
    const movingEnd = movingPlacement.startInches + movingPlacement.widthInches;
    const movingBottom = movingPlacement.distanceFromFloorInches;
    const movingTop = movingPlacement.distanceFromFloorInches + movingPlacement.heightInches;

    const overlapsAnotherCabinet = placements.some((otherPlacement) => {
      if (otherPlacement.cabinet.id === cabinetItem.id) return false;
      if (otherPlacement.cabinet.id === excludedCabinetId) return false;

      const movingCategory = movingPlacement.category;
      const otherCategory = otherPlacement.category;

      // New wall cabinets are allowed to initially share the same floor/elevation
      // projection with an existing same-wall wall cabinet because the placement
      // step immediately resolves that into a vertical stack. For drags/edits,
      // excludedCabinetId is present, so overlap is still blocked normally.
      if (
        !excludedCabinetId &&
        isElevationFloatingCabinet(movingPlacement.cabinet) &&
        isElevationFloatingCabinet(otherPlacement.cabinet) &&
        cabinetsBelongToSameWall(movingPlacement.cabinet, otherPlacement.cabinet)
      ) {
        return false;
      }

      const otherStart = otherPlacement.startInches;
      const otherEnd = otherPlacement.startInches + otherPlacement.widthInches;
      const otherBottom = otherPlacement.distanceFromFloorInches;
      const otherTop = otherPlacement.distanceFromFloorInches + otherPlacement.heightInches;
      const horizontalOverlap = Math.min(movingEnd, otherEnd) - Math.max(movingStart, otherStart);
      const verticalOverlap = Math.min(movingTop, otherTop) - Math.max(movingBottom, otherBottom);

      return horizontalOverlap > overlapToleranceInches && verticalOverlap > overlapToleranceInches;
    });

    if (overlapsAnotherCabinet) {
      return CABINET_OVERLAP_MESSAGE;
    }
  }

  return undefined;
}

function getCabinetElevationOverlapMessage(
  cabinetItem: CabinetElement,
  cabinets: CabinetElement[],
  walls: Wall[],
  excludedCabinetId?: string
): string | undefined {
  return getWallCabinetElevationOverlapMessage(cabinetItem, cabinets, walls, excludedCabinetId);
}

function getCabinetPlacementRuleViolationMessage(
  cabinetItem: CabinetElement,
  cabinets: CabinetElement[],
  walls: Wall[],
  excludedCabinetId?: string,
  requireWallAttachment = true
): string | undefined {
  // Cabinet-to-cabinet collision has higher priority than wall-attachment
  // messaging. This prevents an attached-but-overlapping cabinet from reporting
  // "Cabinet should be placed against the wall" when the real blocking issue is
  // another cabinet.
  const disallowedOverlap = getDisallowedCabinetBodyOverlap(cabinetItem, cabinets, walls, excludedCabinetId);
  if (disallowedOverlap) return CABINET_OVERLAP_MESSAGE;

  const elevationOverlapMessage = getCabinetElevationOverlapMessage(cabinetItem, cabinets, walls, excludedCabinetId);
  if (elevationOverlapMessage) return elevationOverlapMessage;

  if (requireWallAttachment && !isCabinetAttachedToWallFace(cabinetItem, walls)) {
    return CABINET_NOT_AGAINST_WALL_MESSAGE;
  }

  return undefined;
}

function getDisallowedCabinetBodyOverlap(
  cabinetItem: CabinetElement,
  cabinets: CabinetElement[],
  walls: Wall[],
  excludedCabinetId?: string
): CabinetElement | undefined {
  const bodyBounds = getRotatedRectBounds(
    cabinetItem.center,
    Math.max(1, cabinetItem.width - 1),
    Math.max(1, cabinetItem.depth - 1),
    cabinetItem.rotation
  );

  return cabinets.find((otherCabinet) => {
    if (otherCabinet.id === cabinetItem.id) return false;
    if (otherCabinet.id === excludedCabinetId) return false;

    const otherBodyBounds = getRotatedRectBounds(
      otherCabinet.center,
      Math.max(1, otherCabinet.width - 1),
      Math.max(1, otherCabinet.depth - 1),
      otherCabinet.rotation
    );

    const bodyOverlapX = Math.min(bodyBounds.maxX, otherBodyBounds.maxX) - Math.max(bodyBounds.minX, otherBodyBounds.minX);
    const bodyOverlapY = Math.min(bodyBounds.maxY, otherBodyBounds.maxY) - Math.max(bodyBounds.minY, otherBodyBounds.minY);
    if (bodyOverlapX <= 0.5 || bodyOverlapY <= 0.5) return false;

    const category = getCabinetElevationCategory(cabinetItem);
    const otherCategory = getCabinetElevationCategory(otherCabinet);
    const sameWall = cabinetsBelongToSameWall(cabinetItem, otherCabinet);
    const candidateCabinets = cabinets.some((candidate) => candidate.id === cabinetItem.id)
      ? cabinets.map((candidate) => candidate.id === cabinetItem.id ? cabinetItem : candidate)
      : [...cabinets, cabinetItem];

    // Base cabinets are floor-standing. If two floor-standing cabinets
    // overlap in the floor plan, they collide physically even when they are
    // attached to different connected wall runs such as an L-shaped corner.
    if (isFloorStandingCabinet(cabinetItem) && isFloorStandingCabinet(otherCabinet)) {
      if (cabinetsShareWallButDifferentFaces(cabinetItem, otherCabinet)) {
        return false;
      }
      return true;
    }

    // A new wall cabinet can share a same-wall footprint with another wall
    // cabinet because placement immediately resolves it into an elevation stack.
    // During drag/edit, excludedCabinetId is present and the elevation check below
    // blocks any remaining vertical overlap.
    if (
      !excludedCabinetId &&
      isElevationFloatingCabinet(cabinetItem) &&
      isElevationFloatingCabinet(otherCabinet) &&
      sameWall
    ) {
      return false;
    }

    // For upper/lower combinations, the floor plan alone is not enough. A wall
    // or pantry cabinet may look like it sits over a base cabinet in top view but
    // still be valid because it is above the base in elevation. Block only when
    // their vertical elevation ranges overlap. This also catches different-wall
    // floating-cabinet collisions at L-shaped corners.
    if (cabinetVerticalRangesOverlap(cabinetItem, otherCabinet)) {
      return true;
    }

    // Keep the same-wall elevation projection check for cases that are not
    // obvious from the floor-plan rectangle alone, such as manual elevation edits
    // and wall cabinets stacked on the same run.
    return Boolean(
      getCabinetElevationOverlapMessage(
        cabinetItem,
        candidateCabinets,
        walls,
        excludedCabinetId
      )
    );
  });
}

function cabinetsBelongToSameWall(
  cabinetItem: Pick<CabinetElement, "wallId" | "wallFace">,
  otherCabinet: Pick<CabinetElement, "wallId" | "wallFace">
) {
  return Boolean(
    cabinetItem.wallId &&
      otherCabinet.wallId &&
      cabinetItem.wallId === otherCabinet.wallId &&
      (cabinetItem.wallFace === otherCabinet.wallFace ||
        !cabinetItem.wallFace ||
        !otherCabinet.wallFace)
  );
}

function cabinetsShareWallButDifferentFaces(
  cabinetItem: Pick<CabinetElement, "wallId" | "wallFace">,
  otherCabinet: Pick<CabinetElement, "wallId" | "wallFace">
) {
  return Boolean(
    cabinetItem.wallId &&
      otherCabinet.wallId &&
      cabinetItem.wallId === otherCabinet.wallId &&
      cabinetItem.wallFace &&
      otherCabinet.wallFace &&
      cabinetItem.wallFace !== otherCabinet.wallFace
  );
}

function getCabinetVerticalRangeInches(cabinetItem: CabinetElement) {
  const category = getCabinetElevationCategory(cabinetItem);
  const spec = getCabinetElevationSpec(cabinetItem, category);

  return {
    bottom: spec.distanceFromFloorInches,
    top:
      spec.distanceFromFloorInches +
      spec.heightInches +
      getCabinetTopAccessoryExtraHeightInches(cabinetItem),
  };
}

function cabinetVerticalRangesOverlap(
  cabinetItem: CabinetElement,
  otherCabinet: CabinetElement,
  toleranceInches = 0.25
) {
  const range = getCabinetVerticalRangeInches(cabinetItem);
  const otherRange = getCabinetVerticalRangeInches(otherCabinet);

  return Math.min(range.top, otherRange.top) - Math.max(range.bottom, otherRange.bottom) > toleranceInches;
}

function isSameWallWallCabinetStackOverlapAllowed(
  cabinetItem: CabinetElement,
  otherCabinet: CabinetElement
) {
  const category = getCabinetElevationCategory(cabinetItem);
  const otherCategory = getCabinetElevationCategory(otherCabinet);

  // Wall cabinets may overlap in the floor plan only when they belong to the
  // same wall. That floor-plan overlap is used to create an elevation stack.
  // A wall cabinet from a different wall is physically crossing into another
  // cabinet's footprint, so it must be blocked.
  return (
    isElevationFloatingCabinet(cabinetItem) &&
    isElevationFloatingCabinet(otherCabinet) &&
    cabinetsBelongToSameWall(cabinetItem, otherCabinet)
  );
}

function isSameWallCrossLayerCabinetOverlapAllowed(
  cabinetItem: CabinetElement,
  otherCabinet: CabinetElement
) {
  const category = getCabinetElevationCategory(cabinetItem);
  const otherCategory = getCabinetElevationCategory(otherCabinet);

  // Wall and pantry cabinets can float above lower cabinets. They may share
  // the same floor-plan footprint only on the same wall because they occupy
  // different elevation layers on that wall. If the cabinets are attached to
  // different walls, the floor-plan overlap is a real collision.
  return (
    isElevationFloatingCabinet(cabinetItem) !== isElevationFloatingCabinet(otherCabinet) &&
    cabinetsBelongToSameWall(cabinetItem, otherCabinet)
  );
}

function isCabinetAttachedToWallFace(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation">,
  walls: Wall[]
): boolean {
  return Boolean(
    getBestCabinetWallAttachment(
      cabinetItem,
      walls,
      Math.max(7, WALL_THICKNESS / 2 + 4)
    )
  );
}

function getWallCabinetSupportedWall(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "id" | "category" | "wallId" | "wallFace">>,
  cabinets: CabinetElement[],
  walls: Wall[],
  excludedCabinetId?: string
): Wall | null {
  const category = cabinetItem.category ?? getCabinetElevationCategory({
    id: cabinetItem.id ?? "pending-cabinet",
    center: cabinetItem.center,
    width: cabinetItem.width,
    depth: cabinetItem.depth,
    rotation: cabinetItem.rotation,
  });

  if (!isElevationFloatingCabinet(cabinetItem)) return null;

  const bodyBounds = getRotatedRectBounds(
    cabinetItem.center,
    Math.max(1, cabinetItem.width - 1),
    Math.max(1, cabinetItem.depth - 1),
    cabinetItem.rotation
  );

  let bestSupport: { wall: Wall; area: number } | null = null;

  for (const otherCabinet of cabinets) {
    if (otherCabinet.id === excludedCabinetId || otherCabinet.id === cabinetItem.id) continue;
    if (cabinetsShareWallButDifferentFaces(cabinetItem, otherCabinet)) continue;

    const otherBounds = getRotatedRectBounds(
      otherCabinet.center,
      Math.max(1, otherCabinet.width - 1),
      Math.max(1, otherCabinet.depth - 1),
      otherCabinet.rotation
    );

    const overlapX = Math.min(bodyBounds.maxX, otherBounds.maxX) - Math.max(bodyBounds.minX, otherBounds.minX);
    const overlapY = Math.min(bodyBounds.maxY, otherBounds.maxY) - Math.max(bodyBounds.minY, otherBounds.minY);
    if (overlapX <= 0.5 || overlapY <= 0.5) continue;

    const supportWall = otherCabinet.wallId
      ? walls.find((wall) => wall.id === otherCabinet.wallId && isThickWall(wall)) ?? null
      : getBestCabinetWallAttachment(
          otherCabinet,
          walls,
          Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
        )?.wall ?? null;

    if (!supportWall) continue;

    const area = overlapX * overlapY;
    if (!bestSupport || area > bestSupport.area) {
      bestSupport = { wall: supportWall, area };
    }
  }

  return bestSupport?.wall ?? null;
}

function getCabinetProjectionOnWallAxis(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation">,
  wall: Wall
): { startProjection: number; endProjection: number; depthFromWallFace: number } | null {
  const axis = getElevationWallAxis(wall);
  if (axis.length < 0.001) return null;

  const corners = getRotatedRectCorners(
    cabinetItem.center,
    cabinetItem.width,
    cabinetItem.depth,
    cabinetItem.rotation
  );
  const projections = corners.map((corner) => dot(sub(corner, axis.start), axis.direction));
  const rawStartProjection = Math.min(...projections);
  const rawEndProjection = Math.max(...projections);
  const displayWidthPixels = Math.min(rawEndProjection - rawStartProjection, axis.length);

  if (displayWidthPixels <= 0.5) return null;

  let startProjection = rawStartProjection;
  let endProjection = rawEndProjection;

  if (displayWidthPixels >= axis.length) {
    startProjection = 0;
    endProjection = axis.length;
  } else {
    if (startProjection < 0) {
      endProjection -= startProjection;
      startProjection = 0;
    }

    if (endProjection > axis.length) {
      startProjection -= endProjection - axis.length;
      endProjection = axis.length;
    }

    startProjection = clamp(startProjection, 0, axis.length - displayWidthPixels);
    endProjection = startProjection + displayWidthPixels;
  }

  const wallFaceOffset = WALL_THICKNESS / 2;
  const centerSideDistance = dot(sub(cabinetItem.center, axis.start), axis.normal);
  const depthFromWallFace = Math.max(
    0,
    Math.abs(Math.abs(centerSideDistance) - wallFaceOffset) - cabinetItem.depth / 2
  );

  return { startProjection, endProjection, depthFromWallFace };
}

// cabinetIntersectsAnyCabinet
function cabinetIntersectsAnyCabinet(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "category" | "image">>,
  cabinets: CabinetElement[],
  excludedCabinetId?: string
) {
  const bodyBounds = getRotatedRectBounds(
    cabinetItem.center,
    Math.max(1, cabinetItem.width - 1),
    Math.max(1, cabinetItem.depth - 1),
    cabinetItem.rotation
  );
  const cabinetCategory = getCabinetElevationCategory({
    id: "pending-cabinet",
    center: cabinetItem.center,
    width: cabinetItem.width,
    depth: cabinetItem.depth,
    rotation: cabinetItem.rotation,
    category: cabinetItem.category,
  });
  const tabBounds = getCabinetPlanHandleTabWorldBounds(cabinetItem);

  return cabinets.some((otherCabinet) => {
    if (otherCabinet.id === excludedCabinetId) return false;

    const otherCategory = getCabinetElevationCategory(otherCabinet);

    if (
      isElevationFloatingCabinet({
        category: cabinetCategory,
        width: cabinetItem.width,
        image: cabinetItem.image,
      }) &&
      isElevationFloatingCabinet(otherCabinet)
    ) return false;

    // Wall cabinets may sit over base/pantry cabinets, but no cabinet may sit on
    // top of another cabinet of the same placement layer. Base/pantry cabinets are
    // floor-standing and cannot be placed over any cabinet.
    const floatingOverFloorStanding =
      isElevationFloatingCabinet({
        category: cabinetCategory,
        width: cabinetItem.width,
        image: cabinetItem.image,
      }) !== isElevationFloatingCabinet(otherCabinet);
    if (floatingOverFloorStanding) return false;

    const otherBodyBounds = getRotatedRectBounds(
      otherCabinet.center,
      Math.max(1, otherCabinet.width - 1),
      Math.max(1, otherCabinet.depth - 1),
      otherCabinet.rotation
    );

    const bodyOverlapX = Math.min(bodyBounds.maxX, otherBodyBounds.maxX) - Math.max(bodyBounds.minX, otherBodyBounds.minX);
    const bodyOverlapY = Math.min(bodyBounds.maxY, otherBodyBounds.maxY) - Math.max(bodyBounds.minY, otherBodyBounds.minY);
    if (bodyOverlapX > 0.5 && bodyOverlapY > 0.5) return true;

    const otherTabBounds = getCabinetPlanHandleTabWorldBounds(otherCabinet);
    const tabCoverageTolerance = 0.75;

    return (
      tabBounds.some((tab) => rectContainsRect(otherBodyBounds, tab, tabCoverageTolerance)) ||
      otherTabBounds.some((tab) => rectContainsRect(bodyBounds, tab, tabCoverageTolerance))
    );
  });
}


type CabinetElevationPairOverlap = {
  movingStartInches: number;
  movingEndInches: number;
  movingBottomInches: number;
  movingTopInches: number;
  otherStartInches: number;
  otherEndInches: number;
  otherBottomInches: number;
  otherTopInches: number;
};

function getCabinetElevationPairOverlap(
  movingCabinet: CabinetElement,
  otherCabinet: CabinetElement,
  cabinets: CabinetElement[],
  walls: Wall[]
): CabinetElevationPairOverlap | null {
  const elevationWalls = walls.filter(isThickWall);
  if (elevationWalls.length === 0) return null;

  const candidateCabinets = cabinets.some((cabinetItem) => cabinetItem.id === movingCabinet.id)
    ? cabinets.map((cabinetItem) => cabinetItem.id === movingCabinet.id ? movingCabinet : cabinetItem)
    : [...cabinets, movingCabinet];
  const overlapToleranceInches = 0.25;

  for (const wall of elevationWalls) {
    const placements = getCabinetElevationPlacementsForWall(wall, candidateCabinets, elevationWalls);
    const movingPlacement = placements.find((placement) => placement.cabinet.id === movingCabinet.id);
    const otherPlacement = placements.find((placement) => placement.cabinet.id === otherCabinet.id);
    if (!movingPlacement || !otherPlacement) continue;

    const movingStartInches = movingPlacement.startInches;
    const movingEndInches = movingPlacement.startInches + movingPlacement.widthInches;
    const movingBottomInches = movingPlacement.distanceFromFloorInches;
    const movingTopInches = movingPlacement.distanceFromFloorInches + movingPlacement.heightInches;
    const otherStartInches = otherPlacement.startInches;
    const otherEndInches = otherPlacement.startInches + otherPlacement.widthInches;
    const otherBottomInches = otherPlacement.distanceFromFloorInches;
    const otherTopInches = otherPlacement.distanceFromFloorInches + otherPlacement.heightInches;

    const horizontalOverlapInches = Math.min(movingEndInches, otherEndInches) - Math.max(movingStartInches, otherStartInches);
    const verticalOverlapInches = Math.min(movingTopInches, otherTopInches) - Math.max(movingBottomInches, otherBottomInches);

    if (horizontalOverlapInches > overlapToleranceInches && verticalOverlapInches > overlapToleranceInches) {
      return {
        movingStartInches,
        movingEndInches,
        movingBottomInches,
        movingTopInches,
        otherStartInches,
        otherEndInches,
        otherBottomInches,
        otherTopInches,
      };
    }
  }

  return null;
}

function resolveCabinetDragCenterAgainstCabinetCollisions(
  previousCabinet: CabinetElement,
  proposedCabinet: CabinetElement,
  cabinets: CabinetElement[],
  walls: Wall[]
): CabinetElement {
  const movement = sub(proposedCabinet.center, previousCabinet.center);

  if (Math.abs(movement.x) < 0.001 && Math.abs(movement.y) < 0.001) {
    return previousCabinet;
  }

  const hasCabinetCollision = (candidateCenter: Point) => {
    const candidateCabinet: CabinetElement = {
      ...proposedCabinet,
      center: candidateCenter,
    };

    return (
      cabinetIntersectsAnyCabinet(candidateCabinet, cabinets, previousCabinet.id) ||
      Boolean(getCabinetElevationOverlapMessage(candidateCabinet, cabinets, walls, previousCabinet.id))
    );
  };

  if (!hasCabinetCollision(proposedCabinet.center)) return proposedCabinet;

  const pairShouldStopDrag = (candidateCabinet: CabinetElement, otherCabinet: CabinetElement) => {
    const candidateCategory = getCabinetElevationCategory(candidateCabinet);
    const otherCategory = getCabinetElevationCategory(otherCabinet);

    // Wall cabinets can overlap in floor plan while being safe at different
    // elevations. Use the elevation projection to decide whether this pair is a
    // real cabinet collision that should block/snap the drag.
    if (isElevationFloatingCabinet(candidateCabinet) || isElevationFloatingCabinet(otherCabinet)) {
      return Boolean(getCabinetElevationPairOverlap(candidateCabinet, otherCabinet, cabinets, walls));
    }

    return true;
  };

  const startBounds = getRotatedRectBounds(
    previousCabinet.center,
    proposedCabinet.width,
    proposedCabinet.depth,
    proposedCabinet.rotation
  );

  const sweptStops: { center: Point; t: number }[] = [];

  for (const otherCabinet of cabinets) {
    if (otherCabinet.id === previousCabinet.id) continue;
    if (!pairShouldStopDrag(proposedCabinet, otherCabinet)) continue;

    const otherBounds = getRotatedRectBounds(
      otherCabinet.center,
      otherCabinet.width,
      otherCabinet.depth,
      otherCabinet.rotation
    );

    const getAxisTimes = (
      delta: number,
      movingMin: number,
      movingMax: number,
      obstacleMin: number,
      obstacleMax: number
    ) => {
      if (Math.abs(delta) < 0.001) {
        if (movingMax <= obstacleMin || movingMin >= obstacleMax) return null;
        return { entry: Number.NEGATIVE_INFINITY, exit: Number.POSITIVE_INFINITY };
      }

      if (delta > 0) {
        return {
          entry: (obstacleMin - movingMax) / delta,
          exit: (obstacleMax - movingMin) / delta,
        };
      }

      return {
        entry: (obstacleMax - movingMin) / delta,
        exit: (obstacleMin - movingMax) / delta,
      };
    };

    const xTimes = getAxisTimes(movement.x, startBounds.minX, startBounds.maxX, otherBounds.minX, otherBounds.maxX);
    const yTimes = getAxisTimes(movement.y, startBounds.minY, startBounds.maxY, otherBounds.minY, otherBounds.maxY);
    if (!xTimes || !yTimes) continue;

    const entryTime = Math.max(xTimes.entry, yTimes.entry);
    const exitTime = Math.min(xTimes.exit, yTimes.exit);

    if (entryTime > exitTime || entryTime < 0 || entryTime > 1) continue;

    sweptStops.push({
      center: add(previousCabinet.center, mul(movement, entryTime)),
      t: entryTime,
    });
  }

  if (sweptStops.length) {
    sweptStops.sort((left, right) => left.t - right.t);
    return {
      ...proposedCabinet,
      center: sweptStops[0].center,
    };
  }

  // If the drag started while already overlapping another cabinet, resolve
  // directly to the exact edge-to-edge contact point instead of stopping at a
  // last-safe sampled position. For wall cabinets, only pairs that overlap in
  // the elevation view participate in this blocking/snap calculation.
  const targetBounds = getRotatedRectBounds(
    proposedCabinet.center,
    proposedCabinet.width,
    proposedCabinet.depth,
    proposedCabinet.rotation
  );
  const snapCandidates: { center: Point; distance: number }[] = [];

  const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) > 0;

  for (const otherCabinet of cabinets) {
    if (otherCabinet.id === previousCabinet.id) continue;
    if (!pairShouldStopDrag(proposedCabinet, otherCabinet)) continue;

    const otherBounds = getRotatedRectBounds(
      otherCabinet.center,
      otherCabinet.width,
      otherCabinet.depth,
      otherCabinet.rotation
    );

    if (movement.x > 0 && rangesOverlap(targetBounds.minY, targetBounds.maxY, otherBounds.minY, otherBounds.maxY)) {
      const delta = otherBounds.minX - targetBounds.maxX;
      const center = { ...proposedCabinet.center, x: proposedCabinet.center.x + delta };
      snapCandidates.push({ center, distance: Math.abs(delta) });
    }

    if (movement.x < 0 && rangesOverlap(targetBounds.minY, targetBounds.maxY, otherBounds.minY, otherBounds.maxY)) {
      const delta = otherBounds.maxX - targetBounds.minX;
      const center = { ...proposedCabinet.center, x: proposedCabinet.center.x + delta };
      snapCandidates.push({ center, distance: Math.abs(delta) });
    }

    if (movement.y > 0 && rangesOverlap(targetBounds.minX, targetBounds.maxX, otherBounds.minX, otherBounds.maxX)) {
      const delta = otherBounds.minY - targetBounds.maxY;
      const center = { ...proposedCabinet.center, y: proposedCabinet.center.y + delta };
      snapCandidates.push({ center, distance: Math.abs(delta) });
    }

    if (movement.y < 0 && rangesOverlap(targetBounds.minX, targetBounds.maxX, otherBounds.minX, otherBounds.maxX)) {
      const delta = otherBounds.maxY - targetBounds.minY;
      const center = { ...proposedCabinet.center, y: proposedCabinet.center.y + delta };
      snapCandidates.push({ center, distance: Math.abs(delta) });
    }
  }

  if (snapCandidates.length) {
    snapCandidates.sort((left, right) => left.distance - right.distance);
    return {
      ...proposedCabinet,
      center: snapCandidates[0].center,
    };
  }

  // Some cabinet conflicts only appear in the elevation projection. Example:
  // a wall cabinet can look snapped between two base cabinets in the floor plan
  // while still overlapping one of those bases in elevation because its wall-axis
  // projection crosses the base cabinet width. Resolve those cases by moving the
  // cabinet along the elevation wall axis until its projected edge exactly
  // touches the blocking cabinet edge.
  const elevationSnapCandidates: { center: Point; distance: number; alongDrag: boolean }[] = [];
  const elevationWalls = walls.filter(isThickWall);
  const candidateCabinets = cabinets.some((cabinetItem) => cabinetItem.id === proposedCabinet.id)
    ? cabinets.map((cabinetItem) => cabinetItem.id === proposedCabinet.id ? proposedCabinet : cabinetItem)
    : [...cabinets, proposedCabinet];
  const overlapToleranceInches = 0.25;

  for (const wall of elevationWalls) {
    const axis = getElevationWallAxis(wall);
    const movementAlongAxis = dot(movement, axis.direction);
    const placements = getCabinetElevationPlacementsForWall(wall, candidateCabinets, elevationWalls);
    const movingPlacement = placements.find((placement) => placement.cabinet.id === proposedCabinet.id);
    if (!movingPlacement) continue;

    const movingStartInches = movingPlacement.startInches;
    const movingEndInches = movingPlacement.startInches + movingPlacement.widthInches;
    const movingBottomInches = movingPlacement.distanceFromFloorInches;
    const movingTopInches = movingPlacement.distanceFromFloorInches + movingPlacement.heightInches;

    for (const otherPlacement of placements) {
      if (otherPlacement.cabinet.id === proposedCabinet.id) continue;

      const otherStartInches = otherPlacement.startInches;
      const otherEndInches = otherPlacement.startInches + otherPlacement.widthInches;
      const otherBottomInches = otherPlacement.distanceFromFloorInches;
      const otherTopInches = otherPlacement.distanceFromFloorInches + otherPlacement.heightInches;
      const horizontalOverlapInches = Math.min(movingEndInches, otherEndInches) - Math.max(movingStartInches, otherStartInches);
      const verticalOverlapInches = Math.min(movingTopInches, otherTopInches) - Math.max(movingBottomInches, otherBottomInches);

      if (horizontalOverlapInches <= overlapToleranceInches || verticalOverlapInches <= overlapToleranceInches) {
        continue;
      }

      const shiftsInches = [
        otherStartInches - movingEndInches,
        otherEndInches - movingStartInches,
      ];

      for (const shiftInches of shiftsInches) {
        if (Math.abs(shiftInches) <= overlapToleranceInches) continue;

        const shiftPixels = inchesToPixels(shiftInches);
        const center = add(proposedCabinet.center, mul(axis.direction, shiftPixels));

        if (hasCabinetCollision(center)) continue;

        const alongDrag = Math.abs(movementAlongAxis) < 0.001
          ? true
          : Math.sign(shiftPixels) !== Math.sign(movementAlongAxis);

        elevationSnapCandidates.push({
          center,
          distance: Math.abs(shiftPixels),
          alongDrag,
        });
      }
    }
  }

  if (elevationSnapCandidates.length) {
    elevationSnapCandidates.sort((left, right) => {
      if (left.alongDrag !== right.alongDrag) return left.alongDrag ? -1 : 1;
      return left.distance - right.distance;
    });

    return {
      ...proposedCabinet,
      center: elevationSnapCandidates[0].center,
    };
  }

  return previousCabinet;
}

function getCabinetPlanHandleTabWorldBounds(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "category" | "image">>
) {
  const radians = degreesToRadians(cabinetItem.rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);

  return getCabinetPlanHandleTabRects(cabinetItem).map((tab) => {
    const corners = [
      { x: tab.x, y: tab.y },
      { x: tab.x + tab.width, y: tab.y },
      { x: tab.x + tab.width, y: tab.y + tab.height },
      { x: tab.x, y: tab.y + tab.height },
    ].map((corner) => ({
      x: cabinetItem.center.x + corner.x * cosValue - corner.y * sinValue,
      y: cabinetItem.center.y + corner.x * sinValue + corner.y * cosValue,
    }));
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });
}

function rectContainsRect(
  outer: { minX: number; maxX: number; minY: number; maxY: number },
  inner: { minX: number; maxX: number; minY: number; maxY: number },
  tolerance = 0
) {
  return (
    inner.minX >= outer.minX - tolerance &&
    inner.maxX <= outer.maxX + tolerance &&
    inner.minY >= outer.minY - tolerance &&
    inner.maxY <= outer.maxY + tolerance
  );
}

// cabinetOpenSegmentsIntersect
function cabinetOpenSegmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  if (!segmentsIntersect(a, b, c, d)) return false;

  const aOnWall = pointOnSegment(a, c, d);
  const bOnWall = pointOnSegment(b, c, d);
  const cOnCabinet = pointOnSegment(c, a, b);
  const dOnCabinet = pointOnSegment(d, a, b);

  const onlyTouching = aOnWall || bOnWall || cOnCabinet || dOnCabinet;
  // Treat pure edge/corner contact as allowed. A cabinet should be able to sit
  // flush beside a wall or at an inside corner without showing a red invalid
  // preview. Real wall penetration is still caught when a cabinet corner is
  // inside the wall polygon or when edges cross through each other away from
  // endpoints.
  if (onlyTouching) return false;

  return true;
}

// getCabinetMenuPosition
function getCabinetMenuPosition(cabinetItem: CabinetElement): Point {
  const menuWidth = 82;
  const menuHeight = 54;
  const ringOuterRadius = Math.max(cabinetItem.width, cabinetItem.depth) / 2 + 20;
  const gapAboveRing = 10;
  return {
    x: cabinetItem.center.x - menuWidth / 2,
    y: cabinetItem.center.y - ringOuterRadius - menuHeight - gapAboveRing,
  };
}

// areCabinetsEqual
function areCabinetsEqual(left: CabinetElement[], right: CabinetElement[]) {
  if (left.length !== right.length) return false;

  return left.every((cabinetItem, index) => {
    const otherCabinet = right[index];
    return (
      otherCabinet &&
      cabinetItem.id === otherCabinet.id &&
      Math.abs(cabinetItem.center.x - otherCabinet.center.x) < 0.001 &&
      Math.abs(cabinetItem.center.y - otherCabinet.center.y) < 0.001 &&
      Math.abs(cabinetItem.width - otherCabinet.width) < 0.001 &&
      Math.abs(cabinetItem.depth - otherCabinet.depth) < 0.001 &&
      Math.abs(cabinetItem.rotation - otherCabinet.rotation) < 0.001 &&
      Math.abs((cabinetItem.heightInches ?? 0) - (otherCabinet.heightInches ?? 0)) < 0.001 &&
      Math.abs((cabinetItem.distanceFromFloorInches ?? 0) - (otherCabinet.distanceFromFloorInches ?? 0)) < 0.001 &&
      Math.abs((cabinetItem.cooktopFrontHeightInches ?? 0) - (otherCabinet.cooktopFrontHeightInches ?? 0)) < 0.001 &&
      Math.abs((cabinetItem.blindDoorWidthInches ?? 0) - (otherCabinet.blindDoorWidthInches ?? 0)) < 0.001 &&
      Math.abs((cabinetItem.blindFillerWidthInches ?? 0) - (otherCabinet.blindFillerWidthInches ?? 0)) < 0.001 &&
      Math.abs((cabinetItem.ovenCabinetProductHeightInches ?? 0) - (otherCabinet.ovenCabinetProductHeightInches ?? 0)) < 0.001 &&
      Math.abs((cabinetItem.ovenCabinetFillerHeightInches ?? 0) - (otherCabinet.ovenCabinetFillerHeightInches ?? 0)) < 0.001 &&
      Math.abs((cabinetItem.ovenCabinetBottomDrawerHeightInches ?? 0) - (otherCabinet.ovenCabinetBottomDrawerHeightInches ?? 0)) < 0.001 &&
      (cabinetItem.category ?? null) === (otherCabinet.category ?? null) &&
      (cabinetItem.catalogId ?? null) === (otherCabinet.catalogId ?? null) &&
      (cabinetItem.image ?? null) === (otherCabinet.image ?? null) &&
      Boolean(cabinetItem.sinkFixture) === Boolean(otherCabinet.sinkFixture) &&
      (cabinetItem.cooktopFixture ?? null) === (otherCabinet.cooktopFixture ?? null) &&
      (cabinetItem.ovenCabinetProductLayout ?? "none") ===
        (otherCabinet.ovenCabinetProductLayout ?? "none") &&
      (cabinetItem.wallId ?? null) === (otherCabinet.wallId ?? null) &&
      (cabinetItem.wallFace ?? null) === (otherCabinet.wallFace ?? null)
    );
  });
}

// getCabinetWallDistanceMetrics
function getCabinetWallDistanceMetrics(cabinetItem: CabinetElement, walls: Wall[]): CabinetDistanceMetric[] {
  const bounds = getRotatedRectBounds(
    cabinetItem.center,
    cabinetItem.width,
    cabinetItem.depth,
    cabinetItem.rotation
  );
  const metrics: CabinetDistanceMetric[] = [];
  const wallFacePadding = WALL_THICKNESS / 2;
  const usableWalls = walls.filter(isThickWall);
  const verticalWalls = usableWalls.filter((wall) => Math.abs(wall.start.x - wall.end.x) < Math.abs(wall.start.y - wall.end.y));
  const horizontalWalls = usableWalls.filter((wall) => Math.abs(wall.start.y - wall.end.y) <= Math.abs(wall.start.x - wall.end.x));

  const verticalOverlap = (wall: Wall) =>
    Math.max(wall.start.y, wall.end.y) >= bounds.minY &&
    Math.min(wall.start.y, wall.end.y) <= bounds.maxY;

  const horizontalOverlap = (wall: Wall) =>
    Math.max(wall.start.x, wall.end.x) >= bounds.minX &&
    Math.min(wall.start.x, wall.end.x) <= bounds.maxX;

  const leftWall = verticalWalls
    .filter(verticalOverlap)
    .map((wall) => {
      const centerX = (wall.start.x + wall.end.x) / 2;
      return { wall, faceX: centerX + wallFacePadding };
    })
    .filter((item) => item.faceX <= bounds.minX + 0.001)
    .sort((a, b) => b.faceX - a.faceX)[0];

  const rightWall = verticalWalls
    .filter(verticalOverlap)
    .map((wall) => {
      const centerX = (wall.start.x + wall.end.x) / 2;
      return { wall, faceX: centerX - wallFacePadding };
    })
    .filter((item) => item.faceX >= bounds.maxX - 0.001)
    .sort((a, b) => a.faceX - b.faceX)[0];

  const topWall = horizontalWalls
    .filter(horizontalOverlap)
    .map((wall) => {
      const centerY = (wall.start.y + wall.end.y) / 2;
      return { wall, faceY: centerY + wallFacePadding };
    })
    .filter((item) => item.faceY <= bounds.minY + 0.001)
    .sort((a, b) => b.faceY - a.faceY)[0];

  const bottomWall = horizontalWalls
    .filter(horizontalOverlap)
    .map((wall) => {
      const centerY = (wall.start.y + wall.end.y) / 2;
      return { wall, faceY: centerY - wallFacePadding };
    })
    .filter((item) => item.faceY >= bounds.maxY - 0.001)
    .sort((a, b) => a.faceY - b.faceY)[0];

  if (leftWall) {
    const y = cabinetItem.center.y;
    const start = { x: leftWall.faceX, y };
    const end = { x: bounds.minX, y };
    const midX = (start.x + end.x) / 2;
    metrics.push({
      key: "left",
      start,
      end,
      tickStart: { x: start.x, y: y - 8 },
      tickEnd: { x: start.x, y: y + 8 },
      label: { x: midX, y: y - 16 },
      distance: Math.max(0, Math.abs(end.x - start.x)),
    });
  }

  if (rightWall) {
    const y = cabinetItem.center.y;
    const start = { x: bounds.maxX, y };
    const end = { x: rightWall.faceX, y };
    const midX = (start.x + end.x) / 2;
    metrics.push({
      key: "right",
      start,
      end,
      tickStart: { x: end.x, y: y - 8 },
      tickEnd: { x: end.x, y: y + 8 },
      label: { x: midX, y: y - 16 },
      distance: Math.max(0, Math.abs(end.x - start.x)),
    });
  }

  if (topWall) {
    const x = cabinetItem.center.x;
    const start = { x, y: topWall.faceY };
    const end = { x, y: bounds.minY };
    const midY = (start.y + end.y) / 2;
    metrics.push({
      key: "top",
      start,
      end,
      tickStart: { x: x - 8, y: start.y },
      tickEnd: { x: x + 8, y: start.y },
      label: { x: x + 34, y: midY + 4 },
      distance: Math.max(0, Math.abs(end.y - start.y)),
    });
  }

  if (bottomWall) {
    const x = cabinetItem.center.x;
    const start = { x, y: bounds.maxY };
    const end = { x, y: bottomWall.faceY };
    const midY = (start.y + end.y) / 2;
    metrics.push({
      key: "bottom",
      start,
      end,
      tickStart: { x: x - 8, y: end.y },
      tickEnd: { x: x + 8, y: end.y },
      label: { x: x + 34, y: midY + 4 },
      distance: Math.max(0, Math.abs(end.y - start.y)),
    });
  }

  return metrics.filter((metric) => metric.distance > 0.5);
}

// cabinetIntersectsAnyWall
function cabinetIntersectsAnyWall(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation">,
  walls: Wall[]
) {
  const collisionWidth = Math.max(1, cabinetItem.width - 1);
  const collisionDepth = Math.max(1, cabinetItem.depth - 1);
  const corners = getRotatedRectCorners(cabinetItem.center, collisionWidth, collisionDepth, cabinetItem.rotation);
  const edges = corners.map((corner, index) => ({
    start: corner,
    end: corners[(index + 1) % corners.length],
  }));

  return walls.filter(isThickWall).some((wall) => {
    const wallDirection = normalize(sub(wall.end, wall.start));
    const wallNormal = perp(wallDirection);
    const wallCorners = [
      add(wall.start, mul(wallNormal, WALL_THICKNESS / 2)),
      add(wall.end, mul(wallNormal, WALL_THICKNESS / 2)),
      add(wall.end, mul(wallNormal, -WALL_THICKNESS / 2)),
      add(wall.start, mul(wallNormal, -WALL_THICKNESS / 2)),
    ];
    const wallEdges = wallCorners.map((corner, index) => ({
      start: corner,
      end: wallCorners[(index + 1) % wallCorners.length],
    }));

    return (
      corners.some((corner) => pointInPolygon(corner, wallCorners)) ||
      wallCorners.some((corner) => pointInPolygon(corner, corners)) ||
      edges.some((edge) =>
        wallEdges.some((wallEdge) => cabinetOpenSegmentsIntersect(edge.start, edge.end, wallEdge.start, wallEdge.end))
      )
    );
  });
}

function polygonsIntersect(firstPolygon: Point[], secondPolygon: Point[]) {
  const firstEdges = firstPolygon.map((point, index) => ({
    start: point,
    end: firstPolygon[(index + 1) % firstPolygon.length],
  }));
  const secondEdges = secondPolygon.map((point, index) => ({
    start: point,
    end: secondPolygon[(index + 1) % secondPolygon.length],
  }));

  return (
    firstPolygon.some((point) => pointInPolygon(point, secondPolygon)) ||
    secondPolygon.some((point) => pointInPolygon(point, firstPolygon)) ||
    firstEdges.some((firstEdge) =>
      secondEdges.some((secondEdge) =>
        cabinetOpenSegmentsIntersect(firstEdge.start, firstEdge.end, secondEdge.start, secondEdge.end)
      )
    )
  );
}

function getDetachedPanelWallCollisionCorners(wall: Wall, structuralWalls: Wall[] = []) {
  const visibleSegment = getPeninWallVisibleSegment(wall, structuralWalls);
  const panelLength = distance(visibleSegment.start, visibleSegment.end);
  if (panelLength < 0.001) return null;

  return getRotatedRectCorners(
    midpoint(visibleSegment.start, visibleSegment.end),
    Math.max(1, panelLength - 1),
    Math.max(1, PENIN_WALL_THICKNESS - 1),
    getAngleDegrees(visibleSegment.start, visibleSegment.end)
  );
}

function detachedPanelWallIntersectsFloorCabinet(
  wall: Wall,
  cabinets: CabinetElement[],
  structuralWalls: Wall[] = [],
  allWalls: Wall[] = [],
  excludedWallId?: string
) {
  const panelCorners = getDetachedPanelWallCollisionCorners(wall, structuralWalls);
  if (!panelCorners) return false;

  const overlapsFloorCabinet = cabinets.some((cabinetItem) => {
    if (getCabinetElevationCategory(cabinetItem) === "wall") return false;

    const cabinetCorners = getRotatedRectCorners(
      cabinetItem.center,
      Math.max(1, cabinetItem.width - 1),
      Math.max(1, cabinetItem.depth - 1),
      cabinetItem.rotation
    );

    return polygonsIntersect(panelCorners, cabinetCorners);
  });

  if (overlapsFloorCabinet) return true;

  const otherDetachedPanels = allWalls.filter(
    (otherWall) =>
      otherWall.id !== excludedWallId &&
      otherWall.id !== wall.id &&
      isDetachedPanelWall(otherWall)
  );

  return otherDetachedPanels.some((otherWall) => {
    const otherPanelCorners = getDetachedPanelWallCollisionCorners(otherWall, structuralWalls);
    return Boolean(otherPanelCorners && polygonsIntersect(panelCorners, otherPanelCorners));
  });
}

function detectCabinetAttachmentSides(
  cabinetItem: CabinetElement,
  walls: Wall[],
  cabinets: CabinetElement[]
): Set<"left" | "right" | "top" | "bottom"> {
  const touchTolerance = 4;
  const bounds = getRotatedRectBounds(
    cabinetItem.center,
    cabinetItem.width,
    cabinetItem.depth,
    cabinetItem.rotation
  );
  const attachedSides = new Set<"left" | "right" | "top" | "bottom">();

  const rangesOverlap = (
    minA: number,
    maxA: number,
    minB: number,
    maxB: number,
    tolerance = touchTolerance
  ) => Math.min(maxA, maxB) - Math.max(minA, minB) >= -tolerance;

  walls.filter(isThickWall).forEach((wall) => {
    const wallBounds = getWallRectBounds(wall);

    if (rangesOverlap(bounds.minY, bounds.maxY, wallBounds.minY, wallBounds.maxY)) {
      if (Math.abs(bounds.minX - wallBounds.maxX) <= touchTolerance) attachedSides.add("left");
      if (Math.abs(bounds.maxX - wallBounds.minX) <= touchTolerance) attachedSides.add("right");
    }

    if (rangesOverlap(bounds.minX, bounds.maxX, wallBounds.minX, wallBounds.maxX)) {
      if (Math.abs(bounds.minY - wallBounds.maxY) <= touchTolerance) attachedSides.add("top");
      if (Math.abs(bounds.maxY - wallBounds.minY) <= touchTolerance) attachedSides.add("bottom");
    }
  });

  cabinets.forEach((otherCabinet) => {
    if (otherCabinet.id === cabinetItem.id) return;

    const otherBounds = getRotatedRectBounds(
      otherCabinet.center,
      otherCabinet.width,
      otherCabinet.depth,
      otherCabinet.rotation
    );

    if (rangesOverlap(bounds.minY, bounds.maxY, otherBounds.minY, otherBounds.maxY)) {
      if (Math.abs(bounds.minX - otherBounds.maxX) <= touchTolerance) attachedSides.add("left");
      if (Math.abs(bounds.maxX - otherBounds.minX) <= touchTolerance) attachedSides.add("right");
    }

    if (rangesOverlap(bounds.minX, bounds.maxX, otherBounds.minX, otherBounds.maxX)) {
      if (Math.abs(bounds.minY - otherBounds.maxY) <= touchTolerance) attachedSides.add("top");
      if (Math.abs(bounds.maxY - otherBounds.minY) <= touchTolerance) attachedSides.add("bottom");
    }
  });

  return attachedSides;
}

function keepCabinetResizeAnchoredToAttachments(
  previousCabinet: CabinetElement,
  proposedCabinet: CabinetElement,
  walls: Wall[],
  cabinets: CabinetElement[]
): CabinetElement {
  const attachedSides = detectCabinetAttachmentSides(previousCabinet, walls, cabinets);
  if (attachedSides.size === 0) return proposedCabinet;

  const previousBounds = getRotatedRectBounds(
    previousCabinet.center,
    previousCabinet.width,
    previousCabinet.depth,
    previousCabinet.rotation
  );
  const radians = degreesToRadians(normalizeDegrees(previousCabinet.rotation));
  const widthAxisHorizontal = Math.abs(Math.cos(radians)) >= Math.abs(Math.sin(radians));
  let nextCenter = { ...proposedCabinet.center };

  if (Math.abs(previousCabinet.width - proposedCabinet.width) > 0.001) {
    if (widthAxisHorizontal) {
      if (attachedSides.has("left") && !attachedSides.has("right")) {
        nextCenter = { ...nextCenter, x: previousBounds.minX + proposedCabinet.width / 2 };
      } else if (attachedSides.has("right") && !attachedSides.has("left")) {
        nextCenter = { ...nextCenter, x: previousBounds.maxX - proposedCabinet.width / 2 };
      }
    } else {
      if (attachedSides.has("top") && !attachedSides.has("bottom")) {
        nextCenter = { ...nextCenter, y: previousBounds.minY + proposedCabinet.width / 2 };
      } else if (attachedSides.has("bottom") && !attachedSides.has("top")) {
        nextCenter = { ...nextCenter, y: previousBounds.maxY - proposedCabinet.width / 2 };
      }
    }
  }

  if (Math.abs(previousCabinet.depth - proposedCabinet.depth) > 0.001) {
    if (widthAxisHorizontal) {
      if (attachedSides.has("top") && !attachedSides.has("bottom")) {
        nextCenter = { ...nextCenter, y: previousBounds.minY + proposedCabinet.depth / 2 };
      } else if (attachedSides.has("bottom") && !attachedSides.has("top")) {
        nextCenter = { ...nextCenter, y: previousBounds.maxY - proposedCabinet.depth / 2 };
      }
    } else {
      if (attachedSides.has("left") && !attachedSides.has("right")) {
        nextCenter = { ...nextCenter, x: previousBounds.minX + proposedCabinet.depth / 2 };
      } else if (attachedSides.has("right") && !attachedSides.has("left")) {
        nextCenter = { ...nextCenter, x: previousBounds.maxX - proposedCabinet.depth / 2 };
      }
    }
  }

  return {
    ...proposedCabinet,
    center: nextCenter,
  };
}

function resolveCabinetDimensionChange(
  previousCabinet: CabinetElement,
  proposedCabinet: CabinetElement,
  walls: Wall[],
  cabinets: CabinetElement[]
): CabinetElement {
  const attachmentAwareCabinet = keepCabinetResizeAnchoredToAttachments(
    previousCabinet,
    proposedCabinet,
    walls,
    cabinets
  );

  return resolveCabinetDimensionChangeAgainstWalls(
    previousCabinet,
    attachmentAwareCabinet,
    walls
  );
}

function resolveCabinetDimensionChangeAgainstWalls(
  previousCabinet: CabinetElement,
  proposedCabinet: CabinetElement,
  walls: Wall[]
): CabinetElement {
  const thickWalls = walls.filter(isThickWall);
  if (!cabinetIntersectsAnyWall(proposedCabinet, thickWalls)) return proposedCabinet;

  const wallAnchoredCabinet = keepCabinetOnTouchedWallFaces(
    previousCabinet,
    proposedCabinet,
    thickWalls
  );
  if (!cabinetIntersectsAnyWall(wallAnchoredCabinet, thickWalls)) return wallAnchoredCabinet;

  const pushedCabinet = pushCabinetOutsideWallOverlaps(wallAnchoredCabinet, thickWalls);
  if (!cabinetIntersectsAnyWall(pushedCabinet, thickWalls)) return pushedCabinet;

  return previousCabinet;
}

function keepCabinetOnTouchedWallFaces(
  previousCabinet: CabinetElement,
  proposedCabinet: CabinetElement,
  walls: Wall[]
): CabinetElement {
  const touchTolerance = 3;
  const previousBounds = getRotatedRectBounds(
    previousCabinet.center,
    previousCabinet.width,
    previousCabinet.depth,
    previousCabinet.rotation
  );
  let adjustedCabinet = { ...proposedCabinet };

  const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) >= -touchTolerance;

  for (const wall of walls) {
    const wallBounds = getWallRectBounds(wall);
    let nextBounds = getRotatedRectBounds(
      adjustedCabinet.center,
      adjustedCabinet.width,
      adjustedCabinet.depth,
      adjustedCabinet.rotation
    );

    const overlapsY = rangesOverlap(previousBounds.minY, previousBounds.maxY, wallBounds.minY, wallBounds.maxY);
    if (overlapsY) {
      if (Math.abs(previousBounds.maxX - wallBounds.minX) <= touchTolerance && nextBounds.maxX > wallBounds.minX) {
        adjustedCabinet = {
          ...adjustedCabinet,
          center: { ...adjustedCabinet.center, x: adjustedCabinet.center.x - (nextBounds.maxX - wallBounds.minX) },
        };
      }
      nextBounds = getRotatedRectBounds(
        adjustedCabinet.center,
        adjustedCabinet.width,
        adjustedCabinet.depth,
        adjustedCabinet.rotation
      );
      if (Math.abs(previousBounds.minX - wallBounds.maxX) <= touchTolerance && nextBounds.minX < wallBounds.maxX) {
        adjustedCabinet = {
          ...adjustedCabinet,
          center: { ...adjustedCabinet.center, x: adjustedCabinet.center.x + (wallBounds.maxX - nextBounds.minX) },
        };
      }
    }

    nextBounds = getRotatedRectBounds(
      adjustedCabinet.center,
      adjustedCabinet.width,
      adjustedCabinet.depth,
      adjustedCabinet.rotation
    );
    const overlapsX = rangesOverlap(previousBounds.minX, previousBounds.maxX, wallBounds.minX, wallBounds.maxX);
    if (overlapsX) {
      if (Math.abs(previousBounds.maxY - wallBounds.minY) <= touchTolerance && nextBounds.maxY > wallBounds.minY) {
        adjustedCabinet = {
          ...adjustedCabinet,
          center: { ...adjustedCabinet.center, y: adjustedCabinet.center.y - (nextBounds.maxY - wallBounds.minY) },
        };
      }
      nextBounds = getRotatedRectBounds(
        adjustedCabinet.center,
        adjustedCabinet.width,
        adjustedCabinet.depth,
        adjustedCabinet.rotation
      );
      if (Math.abs(previousBounds.minY - wallBounds.maxY) <= touchTolerance && nextBounds.minY < wallBounds.maxY) {
        adjustedCabinet = {
          ...adjustedCabinet,
          center: { ...adjustedCabinet.center, y: adjustedCabinet.center.y + (wallBounds.maxY - nextBounds.minY) },
        };
      }
    }
  }

  return adjustedCabinet;
}

function pushCabinetOutsideWallOverlaps(cabinetItem: CabinetElement, walls: Wall[]): CabinetElement {
  let adjustedCabinet = { ...cabinetItem };

  for (let index = 0; index < 6; index += 1) {
    let moved = false;
    let cabinetBounds = getRotatedRectBounds(
      adjustedCabinet.center,
      adjustedCabinet.width,
      adjustedCabinet.depth,
      adjustedCabinet.rotation
    );

    for (const wall of walls) {
      const wallBounds = getWallRectBounds(wall);
      const overlapX = Math.min(cabinetBounds.maxX, wallBounds.maxX) - Math.max(cabinetBounds.minX, wallBounds.minX);
      const overlapY = Math.min(cabinetBounds.maxY, wallBounds.maxY) - Math.max(cabinetBounds.minY, wallBounds.minY);
      if (overlapX <= 0 || overlapY <= 0) continue;

      const cabinetCenterX = (cabinetBounds.minX + cabinetBounds.maxX) / 2;
      const cabinetCenterY = (cabinetBounds.minY + cabinetBounds.maxY) / 2;
      const wallCenterX = (wallBounds.minX + wallBounds.maxX) / 2;
      const wallCenterY = (wallBounds.minY + wallBounds.maxY) / 2;
      const clearance = 0.75;

      if (overlapX <= overlapY) {
        const direction = cabinetCenterX < wallCenterX ? -1 : 1;
        adjustedCabinet = {
          ...adjustedCabinet,
          center: { ...adjustedCabinet.center, x: adjustedCabinet.center.x + direction * (overlapX + clearance) },
        };
      } else {
        const direction = cabinetCenterY < wallCenterY ? -1 : 1;
        adjustedCabinet = {
          ...adjustedCabinet,
          center: { ...adjustedCabinet.center, y: adjustedCabinet.center.y + direction * (overlapY + clearance) },
        };
      }

      cabinetBounds = getRotatedRectBounds(
        adjustedCabinet.center,
        adjustedCabinet.width,
        adjustedCabinet.depth,
        adjustedCabinet.rotation
      );
      moved = true;
    }

    if (!moved) break;
  }

  return adjustedCabinet;
}

function getWallRectBounds(wall: Wall) {
  const direction = normalize(sub(wall.end, wall.start));
  const normal = perp(direction);
  const corners = [
    add(wall.start, mul(normal, WALL_THICKNESS / 2)),
    add(wall.end, mul(normal, WALL_THICKNESS / 2)),
    add(wall.end, mul(normal, -WALL_THICKNESS / 2)),
    add(wall.start, mul(normal, -WALL_THICKNESS / 2)),
  ];
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

// getRotatedRectCorners




function CabinetPlanAccessoryDetails({
  cabinetItem,
  inset,
  stroke,
  detailOpacity,
}: {
  cabinetItem: CabinetElement;
  inset: number;
  stroke: string;
  detailOpacity: number;
}) {
  const { width, depth } = cabinetItem;
  const items: React.ReactNode[] = [];

  if (cabinetItem.sinkFixture) {
    const sinkWidth = Math.max(width * 0.38, width - inset * 4.2);
    const sinkDepth = Math.max(depth * 0.22, depth - inset * 5.2);
    const sinkX = -sinkWidth / 2;
    const sinkY = -depth / 2 + inset * 1.65;
    const faucetY = sinkY - Math.max(2.5, inset * 0.45);
    const faucetReach = Math.max(5, Math.min(10, depth * 0.18));
    const faucetHeight = Math.max(5, Math.min(11, depth * 0.28));
    items.push(
      <g key="sink-fixture-plan">
        <rect x={sinkX} y={sinkY} width={sinkWidth} height={sinkDepth} rx={Math.min(6, sinkDepth * 0.28)} fill="none" stroke={stroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <ellipse cx={0} cy={sinkY + sinkDepth / 2} rx={Math.max(5, sinkWidth * 0.18)} ry={Math.max(2.2, sinkDepth * 0.2)} fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={`M ${-faucetReach * 0.38} ${faucetY} C ${-faucetReach * 0.18} ${faucetY - faucetHeight * 0.78}, ${faucetReach * 0.42} ${faucetY - faucetHeight * 0.78}, ${faucetReach * 0.42} ${faucetY + faucetReach * 0.22}`} fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (cabinetItem.cooktopFixture) {
    const topX = -width / 2 + inset * 1.55;
    const topY = -depth / 2 + inset * 1.1;
    const topWidth = width - inset * 3.1;
    const topHeight = Math.max(depth * 0.68, depth - inset * 2.45);
    const burnerRadius = Math.max(2.2, Math.min(5.2, Math.min(topWidth, topHeight) * 0.13));

    if (cabinetItem.cooktopFixture === "surface") {
      const frameX = topX + topWidth * 0.04;
      const frameY = topY + topHeight * 0.06;
      const frameWidth = topWidth * 0.92;
      const frameHeight = topHeight * 0.52;
      const knobY = topY + topHeight * 0.82;
      items.push(
        <g key="cooktop-fixture-plan-surface">
          <rect
            x={frameX}
            y={frameY}
            width={frameWidth}
            height={frameHeight}
            rx={Math.min(7, frameHeight * 0.22)}
            fill="#f8f6ef"
            stroke="#64748b"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          {[0.22, 0.78].map((xRatio) => [0.3, 0.7].map((yRatio) => (
            <circle
              key={`surface-cooktop-burner-${xRatio}-${yRatio}`}
              cx={frameX + frameWidth * xRatio}
              cy={frameY + frameHeight * yRatio}
              r={burnerRadius}
              fill="none"
              stroke={stroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )))}
          {[0.18, 0.39, 0.61, 0.82].map((ratio) => (
            <circle
              key={`surface-cooktop-knob-plan-${ratio}`}
              cx={frameX + frameWidth * ratio}
              cy={knobY}
              r={Math.max(2.8, Math.min(5.2, topWidth * 0.06))}
              fill="#111827"
            />
          ))}
        </g>
      );
    } else {
      const burnerFrameX = topX + topWidth * 0.04;
      const burnerFrameY = topY + topHeight * 0.06;
      const burnerFrameWidth = topWidth * 0.92;
      const burnerFrameHeight = topHeight * 0.48;
      const controlBarHeight = Math.max(5, topHeight * 0.2);
      const controlBarY = topY + topHeight - controlBarHeight;
      items.push(
        <g key="cooktop-fixture-plan-front-control">
          <rect
            x={burnerFrameX}
            y={burnerFrameY}
            width={burnerFrameWidth}
            height={burnerFrameHeight}
            rx={Math.min(7, burnerFrameHeight * 0.22)}
            fill="#f8f6ef"
            stroke="#64748b"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          {[0.22, 0.78].map((xRatio) => [0.3, 0.7].map((yRatio) => (
            <circle
              key={`front-cooktop-burner-${xRatio}-${yRatio}`}
              cx={burnerFrameX + burnerFrameWidth * xRatio}
              cy={burnerFrameY + burnerFrameHeight * yRatio}
              r={burnerRadius}
              fill="none"
              stroke={stroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )))}
          <rect
            x={topX}
            y={controlBarY}
            width={topWidth}
            height={controlBarHeight}
            fill="#cbd5e1"
            stroke="#94a3b8"
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    }
  }

  if (!items.length) return null;
  return <g opacity={detailOpacity}>{items}</g>;
}

function ElevationCabinetAccessoryDetails({
  cabinet,
  x,
  y,
  width,
  height,
  innerStroke,
  handleStroke,
  frontControlBlockHeight = 0,
}: {
  cabinet: CabinetElement;
  x: number;
  y: number;
  width: number;
  height: number;
  innerStroke: string;
  handleStroke: string;
  frontControlBlockHeight?: number;
}) {
  const children: React.ReactNode[] = [];

  if (cabinet.sinkFixture) {
    children.push(
      <ElevationSinkFixture
        key="elevation-sink-addon"
        x={x}
        y={y}
        width={width}
        height={height}
        innerStroke={innerStroke}
        fixtureScale={0.82}
      />
    );
  }

  if (cabinet.cooktopFixture) {
    const cooktopHeight = Math.max(5, Math.min(12, height * 0.08));
    const cooktopX = x + width * 0.14;
    const cooktopWidth = width * 0.72;

    if (cabinet.cooktopFixture === "front") {
      const blockHeight = Math.max(frontControlBlockHeight, cooktopHeight * 1.6);
      const blockY = y - blockHeight;
      const knobY = blockY + blockHeight * 0.52;
      const knobWidth = Math.max(3, Math.min(6, cooktopWidth * 0.08));
      const knobHeight = Math.max(4, Math.min(7, blockHeight * 0.24));
      children.push(
        <g key="elevation-front-control-cooktop-addon">
          <rect
            x={x}
            y={blockY}
            width={width}
            height={blockHeight}
            fill="#d1d5db"
            stroke={innerStroke}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={cooktopX}
            y={blockY - cooktopHeight * 0.35}
            width={cooktopWidth}
            height={cooktopHeight}
            rx="2"
            fill="#e5e7eb"
            stroke={innerStroke}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {[0.14, 0.38, 0.62, 0.86].map((ratio) => (
            <rect
              key={`front-cooktop-knob-${ratio}`}
              x={cooktopX + cooktopWidth * ratio - knobWidth / 2}
              y={knobY - knobHeight / 2}
              width={knobWidth}
              height={knobHeight}
              fill={handleStroke}
              rx="0.6"
            />
          ))}
        </g>
      );
    } else {
      const topBarY = y - cooktopHeight * 0.28;
      const topBarHeight = Math.max(3, cooktopHeight * 0.38);
      const tabWidth = Math.max(3.2, Math.min(6, width * 0.07));
      const tabHeight = Math.max(4, Math.min(8, cooktopHeight * 1.2));
      const tabTopY = topBarY - tabHeight * 0.72;
      children.push(
        <g key="elevation-surface-cooktop-addon">
          <rect
            x={x + width * 0.08}
            y={topBarY}
            width={width * 0.84}
            height={topBarHeight}
            fill="#cbd5e1"
            stroke={innerStroke}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {[0.2, 0.36, 0.52, 0.68].map((ratio) => (
            <rect
              key={`surface-cooktop-elevation-tab-${ratio}`}
              x={x + width * ratio - tabWidth / 2}
              y={tabTopY}
              width={tabWidth}
              height={tabHeight}
              fill={handleStroke}
              rx="0.6"
            />
          ))}
        </g>
      );
    }
  }

  if (!children.length) return null;
  return <g>{children}</g>;
}

function CabinetPlanVariantDetails({
  cabinetItem,
  inset,
  stroke,
  detailOpacity,
}: {
  cabinetItem: CabinetElement;
  inset: number;
  stroke: string;
  detailOpacity: number;
}) {
  const { width, depth } = cabinetItem;
  const image = getCabinetImage(cabinetItem);
  const blindCabinetWidths = isBlindCabinetImage(image)
    ? getBlindCabinetWidthSegments(cabinetItem)
    : null;
  const topLine = (
    <line
      x1={-width / 2 + 6}
      y1={-depth / 2 + 6}
      x2={width / 2 - 6}
      y2={-depth / 2 + 6}
      stroke="#cbd5e1"
      strokeOpacity={detailOpacity}
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
    />
  );


  if (image === "base-dishwasher") {
    const bodyX = -width / 2 + inset * 1.35;
    const bodyY = -depth / 2 + inset * 1.35;
    const bodyWidth = width - inset * 2.7;
    const bodyHeight = depth - inset * 2.7;
    const handleY = depth / 2 - inset * 1.75;
    return (
      <g opacity={detailOpacity}>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} rx="2" fill="none" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        <line x1={bodyX + bodyWidth * 0.16} y1={handleY} x2={bodyX + bodyWidth * 0.84} y2={handleY} stroke="#111827" strokeWidth="1.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={bodyX} y1={-depth / 2 + inset * 2.15} x2={bodyX + bodyWidth} y2={-depth / 2 + inset * 2.15} stroke="#94a3b8" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }


  if (image === "base-refrigerator") {
    const bodyX = -width / 2 + inset * 1.15;
    const bodyY = -depth / 2 + inset * 1.15;
    const bodyWidth = width - inset * 2.3;
    const bodyHeight = depth - inset * 2.3;
    const frontY = depth / 2 - inset * 1.3;
    return (
      <g opacity={detailOpacity}>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} rx="2" fill="none" stroke={stroke} strokeWidth="1.15" vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={bodyY} x2={0} y2={frontY} stroke={stroke} strokeWidth="1.05" vectorEffect="non-scaling-stroke" />
        <line x1={bodyX} y1={frontY} x2={bodyX + bodyWidth} y2={frontY} stroke="#111827" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <line x1={-width * 0.08} y1={frontY - bodyHeight * 0.22} x2={-width * 0.08} y2={frontY - bodyHeight * 0.04} stroke="#111827" strokeWidth="1.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={width * 0.08} y1={frontY - bodyHeight * 0.22} x2={width * 0.08} y2={frontY - bodyHeight * 0.04} stroke="#111827" strokeWidth="1.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-range") {
    const cooktopX = -width / 2 + inset * 1.5;
    const cooktopY = -depth / 2 + inset * 1.4;
    const cooktopWidth = width - inset * 3;
    const cooktopHeight = depth - inset * 3.2;
    return (
      <g opacity={detailOpacity}>
        {topLine}
        <rect x={cooktopX} y={cooktopY} width={cooktopWidth} height={cooktopHeight} rx="3" fill="#e5e7eb" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        {[0.25, 0.75].map((xRatio) => [0.3, 0.68].map((yRatio) => <circle key={`range-plan-burner-${xRatio}-${yRatio}`} cx={cooktopX + cooktopWidth * xRatio} cy={cooktopY + cooktopHeight * yRatio} r={Math.max(2.2, Math.min(5.4, Math.min(cooktopWidth, cooktopHeight) * 0.12))} fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />))}
        <rect x={-width / 2 + inset * 1.6} y={depth / 2 - inset * 1.3} width={width - inset * 3.2} height={Math.max(5, inset * 0.85)} rx="1.5" fill="#111827" opacity="0.9" />
      </g>
    );
  }

  if (image === "wall-hood") {
    const backY = -depth / 2 + inset * 1.1;
    const frontY = depth / 2 - inset * 1.1;
    return (
      <g opacity={detailOpacity}>
        <path d={`M ${-width * 0.28} ${backY} L ${width * 0.28} ${backY} L ${width / 2 - inset * 1.2} ${frontY} L ${-width / 2 + inset * 1.2} ${frontY} Z`} fill="none" stroke={stroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1={-width * 0.34} y1={frontY - depth * 0.12} x2={width * 0.34} y2={frontY - depth * 0.12} stroke="#111827" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "wall-microwave" || image === "wall-oven" || image === "wall-double-oven") {
    const bodyX = -width / 2 + inset * 1.35;
    const bodyY = -depth / 2 + inset * 1.35;
    const bodyWidth = width - inset * 2.7;
    const bodyHeight = depth - inset * 2.7;
    const isDoubleOven = image === "wall-double-oven";
    return (
      <g opacity={detailOpacity}>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} rx="2" fill="none" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        <line x1={bodyX} y1={depth / 2 - inset * 1.45} x2={bodyX + bodyWidth} y2={depth / 2 - inset * 1.45} stroke="#111827" strokeWidth="1.15" vectorEffect="non-scaling-stroke" />
        {isDoubleOven ? (
          <>
            <rect x={bodyX + bodyWidth * 0.12} y={bodyY + bodyHeight * 0.14} width={bodyWidth * 0.76} height={bodyHeight * 0.18} rx="1.2" fill="#94a3b8" opacity="0.32" />
            <rect x={bodyX + bodyWidth * 0.12} y={bodyY + bodyHeight * 0.42} width={bodyWidth * 0.76} height={bodyHeight * 0.18} rx="1.2" fill="#94a3b8" opacity="0.32" />
          </>
        ) : (
          <rect x={bodyX + bodyWidth * 0.14} y={bodyY + bodyHeight * 0.16} width={bodyWidth * 0.72} height={bodyHeight * 0.18} rx="1.2" fill="#94a3b8" opacity="0.32" />
        )}
      </g>
    );
  }

  if (
    image === "base-drawer" ||
    image === "base-two-drawer" ||
    image === "base-four-drawer" ||
    image === "base-two-door-one-drawer" ||
    image === "base-one-door-one-drawer" ||
    image === "base-two-door-two-drawer" ||
    image === "base-sink-cabinet" ||
    image === "base-farm-sink-cabinet" ||
    image === "base-spice-rack" ||
    image === "base-trash-can"
  ) {
    return <g opacity={detailOpacity}>{topLine}</g>;
  }

  if (
    image === "base-appliance" ||
    image === "base-oven-bottom-drawer" ||
    image === "base-microwave-bottom-drawer"
  ) {
    return (
      <g opacity={detailOpacity}>
        {topLine}
        <rect
          x={-width / 2 + inset * 1.7}
          y={-depth / 2 + inset * 1.55}
          width={width - inset * 3.4}
          height={depth - inset * 3.1}
          fill="none"
          stroke={stroke}
          strokeWidth="1.1"
          vectorEffect="non-scaling-stroke"
        />
        <line x1={-width / 2 + inset * 2} y1={-depth / 2 + inset * 1.1} x2={width / 2 - inset * 2} y2={-depth / 2 + inset * 1.1} stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (
    image === "base-blind-left" ||
    image === "base-blind-right" ||
    image === "wall-blind-left" ||
    image === "wall-blind-right" ||
    image === "base-blind-left-one-drawer" ||
    image === "base-blind-right-one-drawer"
  ) {
    const panelInsetX = 0;
    const panelInsetY = 0;
    const innerWidth = width;
    const innerHeight = depth;
    const side = blindCabinetWidths?.side ?? getBlindCabinetSide(image) ?? "left";
    const visibleWidthRatio =
      blindCabinetWidths && blindCabinetWidths.widthInches > 0
        ? blindCabinetWidths.visibleWidthInches / blindCabinetWidths.widthInches
        : 0.45;
    const visibleWidth = innerWidth * clamp(visibleWidthRatio, 0, 1);
    const blindWidth = Math.max(0, innerWidth - visibleWidth);
    const visibleX =
      side === "right" ? -width / 2 + panelInsetX : -width / 2 + panelInsetX + blindWidth;
    const blindX =
      side === "right" ? -width / 2 + panelInsetX + visibleWidth : -width / 2 + panelInsetX;
    const dividerX =
      side === "right"
        ? -width / 2 + panelInsetX + visibleWidth
        : -width / 2 + panelInsetX + blindWidth;
    const bodySize = Math.max(4.8, Math.min(8, Math.min(width, depth) * 0.085));
    const captionY = -depth / 2 + innerHeight * 0.46;
    const detailY = captionY + bodySize * 1.15;
    const visiblePatternId = `blind-visible-dot-pattern-${cabinetItem.id}`;
    const blindPatternId = `blind-hidden-hatch-pattern-${cabinetItem.id}`;

    return (
      <g opacity={detailOpacity}>
        <defs>
          <pattern
            id={visiblePatternId}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r="1.2" fill="#a78bfa" opacity="0.45" />
          </pattern>
          <pattern
            id={blindPatternId}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="#8b5cf6"
              strokeOpacity="0.28"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <rect
          x={visibleX}
          y={-depth / 2 + panelInsetY}
          width={visibleWidth}
          height={innerHeight}
          fill={`url(#${visiblePatternId})`}
          opacity="0.85"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={blindX}
          y={-depth / 2 + panelInsetY}
          width={blindWidth}
          height={innerHeight}
          fill={`url(#${blindPatternId})`}
          opacity="0.9"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={dividerX}
          y1={-depth / 2}
          x2={dividerX}
          y2={depth / 2}
          stroke={stroke}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={visibleX + visibleWidth / 2}
          y={captionY}
          textAnchor="middle"
          fontSize={bodySize}
          fontWeight="600"
          fill="#3f3f46"
        >
          visible
        </text>
        <text
          x={visibleX + visibleWidth / 2}
          y={detailY}
          textAnchor="middle"
          fontSize={bodySize}
          fontWeight="700"
          fill="#3f3f46"
        >
          {`${roundToQuarter(blindCabinetWidths?.visibleWidthInches ?? 0)}"`}
        </text>
        <text
          x={blindX + blindWidth / 2}
          y={captionY}
          textAnchor="middle"
          fontSize={bodySize}
          fontWeight="600"
          fill="#3f3f46"
        >
          blind
        </text>
        <text
          x={blindX + blindWidth / 2}
          y={detailY}
          textAnchor="middle"
          fontSize={bodySize}
          fontWeight="700"
          fill="#3f3f46"
        >
          {`${roundToQuarter(blindCabinetWidths?.blindWidthInches ?? 0)}"`}
        </text>
      </g>
    );
  }

  if (image === "base-corner") {
    return null;
  }

  return <g opacity={detailOpacity}>{topLine}</g>;
}

function getCabinetPlanHandleTabRects(
  cabinetItem: Pick<CabinetElement, "width" | "depth" | "center" | "rotation"> & Partial<Pick<CabinetElement, "category" | "image">>
) {
  const image = getCabinetImage(cabinetItem);
  if (isProductCabinetImage(image)) return [];

  if (isAccessoryCabinetImage(image)) {
    return [];
  }

  const tabWidth = Math.min(22, Math.max(10, cabinetItem.width * 0.18));
  const tabHeight = Math.min(8, Math.max(5, cabinetItem.depth * 0.18));
  const tabY = cabinetItem.depth / 2 - tabHeight * 0.12;

  if (image === "base-corner") {
    const left = -cabinetItem.width / 2;
    const top = -cabinetItem.depth / 2;
    const bottom = cabinetItem.depth / 2;
    const innerX = left + cabinetItem.width * 0.48;
    const innerY = top + cabinetItem.depth * 0.54;

    // Define the handle placement in the cabinet's base local orientation,
    // where the L-shape notch is on the bottom-left. The whole cabinet group
    // is rotated afterward, so this local placement will rotate with it and
    // match the user-facing orientation.
    const verticalWidth = Math.max(5, Math.min(7, tabHeight));
    const verticalHeight = Math.max(16, Math.min(24, tabWidth * 1.05));

    const notchVerticalCenterY = innerY + (bottom - innerY) * 0.44;
    const edgeGap = 1.5;

    return [
      {
        // vertical handle on the inner vertical notch face, protruding into the notch
        x: innerX - verticalWidth - edgeGap,
        y: notchVerticalCenterY - verticalHeight / 2,
        width: verticalWidth,
        height: verticalHeight,
      },
    ];
  }

  let tabCenters: number[];

  if (
    image === "base-one-door" ||
    image === "pantry-one-door" ||
    image === "base-spice-rack" ||
    image === "base-trash-can" ||
    image === "base-appliance" ||
    image === "base-oven-bottom-drawer" ||
    image === "base-microwave-bottom-drawer" ||
    image === "base-blind-left" ||
    image === "wall-blind-left" ||
    image === "base-one-door-one-drawer" ||
    image === "base-two-drawer" ||
    image === "base-four-drawer" ||
    image === "base-blind-left-one-drawer"
  ) {
    tabCenters = [cabinetItem.width / 2 - tabWidth * 0.9];
  } else if (
    image === "base-blind-right-one-drawer" ||
    image === "base-blind-right" ||
    image === "wall-blind-right"
  ) {
    tabCenters = [-cabinetItem.width / 2 + tabWidth * 0.9];
  } else if (image === "base-drawer") {
    tabCenters = [0];
  } else {
      tabCenters = [-cabinetItem.width * 0.24, cabinetItem.width * 0.24];
  }

  return tabCenters.map((centerX) => ({
    x: centerX - tabWidth / 2,
    y: tabY,
    width: tabWidth,
    height: tabHeight,
  }));
}

function getCabinetPlanOccupiedCorners(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "category" | "image">>
) {
  const radians = degreesToRadians(cabinetItem.rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const localCorners = [
    { x: -cabinetItem.width / 2, y: -cabinetItem.depth / 2 },
    { x: cabinetItem.width / 2, y: -cabinetItem.depth / 2 },
    { x: cabinetItem.width / 2, y: cabinetItem.depth / 2 },
    { x: -cabinetItem.width / 2, y: cabinetItem.depth / 2 },
  ];

  getCabinetPlanHandleTabRects(cabinetItem).forEach((tab) => {
    localCorners.push(
      { x: tab.x, y: tab.y },
      { x: tab.x + tab.width, y: tab.y },
      { x: tab.x + tab.width, y: tab.y + tab.height },
      { x: tab.x, y: tab.y + tab.height }
    );
  });

  return localCorners.map((corner) => ({
    x: cabinetItem.center.x + corner.x * cosValue - corner.y * sinValue,
    y: cabinetItem.center.y + corner.x * sinValue + corner.y * cosValue,
  }));
}

function getCabinetPlanOccupiedBounds(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "category" | "image">>
) {
  const corners = getCabinetPlanOccupiedCorners(cabinetItem);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

// getRotatedRectBounds
// describeArc
// cabinetSnapRotationToTick
function cabinetSnapRotationToTick(
  rawRotation: number,
  currentSnappedRotation: number | null
): { rotation: number; snappedRotation: number | null } {
  void currentSnappedRotation;

  const normalizedRotation = normalizeDegrees(rawRotation);
  const nearestSnap = normalizeDegrees(
    Math.round(normalizedRotation / CABINET_ROTATION_SNAP_STEP_DEGREES) * CABINET_ROTATION_SNAP_STEP_DEGREES
  );

  if (cabinetShortestAngleDistance(normalizedRotation, nearestSnap) <= CABINET_ROTATION_SNAP_ENTER_DEGREES) {
    return { rotation: nearestSnap, snappedRotation: nearestSnap };
  }

  return { rotation: normalizedRotation, snappedRotation: null };
}

// cabinetShortestAngleDistance
function cabinetShortestAngleDistance(leftAngle: number, rightAngle: number) {
  const difference = Math.abs(normalizeDegrees(leftAngle) - normalizeDegrees(rightAngle));
  return Math.min(difference, 360 - difference);
}

function describeArc(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(centerX, centerY, radius, startAngle);
  const end = polarPoint(centerX, centerY, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}


function getDoorPlacementOnWall(
  point: Point,
  walls: Wall[],
  width: number,
  snapOptions: StructurePlacementSnapOptions = {}
): DoorPlacementPreview | null {
  const placement = getWindowPlacementOnWall(point, walls, width, snapOptions);

  if (!placement) return null;

  return {
    wall: placement.wall,
    t: placement.t,
    point: placement.point,
    isValid: true,
  };
}

function getDoorGeometry(doorItem: DoorElement, wall: Wall) {
  const wallLength = distance(wall.start, wall.end);

  if (wallLength < 0.001) return null;

  const direction = normalize(sub(wall.end, wall.start));
  const halfWidth = Math.min(doorItem.width / 2, wallLength / 2);
  const centerDistance = clamp(doorItem.t * wallLength, halfWidth, wallLength - halfWidth);
  const center = add(wall.start, mul(direction, centerDistance));

  return {
    center,
    start: add(center, mul(direction, -halfWidth)),
    end: add(center, mul(direction, halfWidth)),
  };
}

function getDoorMenuPosition(
  doorItem: DoorElement,
  wall: Wall,
  overrideT?: number,
  walls: Wall[] = []
): Point {
  const geometry = getDoorGeometry(
    {
      ...doorItem,
      t: overrideT ?? doorItem.t,
    },
    wall
  );

  if (!geometry) {
    return { x: wall.start.x + 24, y: wall.start.y - 24 };
  }

  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const measurementSide = getInteriorMeasurementGuideSide(wall, walls.length ? walls : [wall]);
  const menuSide = getOppositeMeasurementSide(measurementSide);
  const normal = menuSide === "left" ? baseNormal : mul(baseNormal, -1);
  const menuWidth = 74;
  const menuHeight = 46;
  const doorHalfHeight = 7;
  const menuGapFromDoor = 20;
  const doorCenter = geometry.center;
  const menuHalfProjectionOnNormal =
    (Math.abs(normal.x) * menuWidth + Math.abs(normal.y) * menuHeight) / 2;
  const menuCenter = add(
    doorCenter,
    mul(normal, doorHalfHeight + menuGapFromDoor + menuHalfProjectionOnNormal)
  );

  return {
    x: menuCenter.x - menuWidth / 2,
    y: menuCenter.y - menuHeight / 2,
  };
}

function snapStructureCenterDistanceToNeighbor(
  centerDistance: number,
  width: number,
  wall: Wall,
  walls: Wall[],
  options: StructurePlacementSnapOptions,
  interiorStart: number,
  interiorEnd: number
) {
  void walls;
  const wallLength = distance(wall.start, wall.end);
  if (wallLength < 0.001) return centerDistance;

  const halfWidth = width / 2;
  const minCenter = interiorStart + halfWidth;
  const maxCenter = interiorEnd - halfWidth;
  const snapThreshold = inchesToPixels(3);
  const snapTargets: { start: number; end: number }[] = [];

  (options.windows ?? []).forEach((windowItem) => {
    if (windowItem.id === options.excludeWindowId || windowItem.wallId !== wall.id) return;
    const targetHalfWidth = windowItem.width / 2;
    const targetCenter = clamp(windowItem.t * wallLength, targetHalfWidth, wallLength - targetHalfWidth);
    snapTargets.push({ start: targetCenter - targetHalfWidth, end: targetCenter + targetHalfWidth });
  });

  (options.doors ?? []).forEach((doorItem) => {
    if (doorItem.id === options.excludeDoorId || doorItem.wallId !== wall.id) return;
    const targetHalfWidth = doorItem.width / 2;
    const targetCenter = clamp(doorItem.t * wallLength, targetHalfWidth, wallLength - targetHalfWidth);
    snapTargets.push({ start: targetCenter - targetHalfWidth, end: targetCenter + targetHalfWidth });
  });

  (options.cabinets ?? []).forEach((cabinetItem) => {
    if (cabinetItem.id === options.excludeCabinetId) return;
    if (cabinetItem.wallId && cabinetItem.wallId !== wall.id) return;
    const projection = getCabinetProjectionOnWallAxis(cabinetItem, wall);
    if (!projection) return;
    snapTargets.push({ start: projection.startProjection, end: projection.endProjection });
  });

  let bestCenter = centerDistance;
  let bestDistance = snapThreshold;

  snapTargets.forEach((target) => {
    const candidates = [target.start - halfWidth, target.end + halfWidth];

    candidates.forEach((candidateCenter) => {
      if (candidateCenter < minCenter - 0.001 || candidateCenter > maxCenter + 0.001) return;
      const snapDistance = Math.abs(candidateCenter - centerDistance);
      if (snapDistance <= bestDistance) {
        bestDistance = snapDistance;
        bestCenter = candidateCenter;
      }
    });
  });

  return clamp(bestCenter, minCenter, maxCenter);
}

function getWindowPlacementOnWall(
  point: Point,
  walls: Wall[],
  width: number,
  snapOptions: StructurePlacementSnapOptions = {}
): WindowPlacementPreview | null {
  let bestPlacement: WindowPlacementPreview | null = null;
  let bestDistance = Infinity;
  const placementTolerance = WALL_ATTACH_THRESHOLD + WALL_STROKE_WIDTH / 2 + 16;
  const thickWalls = walls.filter(isThickWall);

  for (const wall of thickWalls) {
    const wallLength = distance(wall.start, wall.end);
    if (wallLength < width + 4) continue;

    const projection = closestPointOnSegment(point, wall.start, wall.end);
    const distanceToWall = distance(point, projection);

    if (distanceToWall > placementTolerance || distanceToWall >= bestDistance) {
      continue;
    }

    const direction = normalize(sub(wall.end, wall.start));
    const interiorSide = getInteriorMeasurementGuideSide(wall, thickWalls);
    const interiorRun = getStructureGuideEndpointsFromMeasurementRun(
      wall,
      thickWalls,
      interiorSide
    );
    const rawInteriorStart = interiorRun
      ? dot(sub(interiorRun.startAnchor, wall.start), direction)
      : 0;
    const rawInteriorEnd = interiorRun
      ? dot(sub(interiorRun.endAnchor, wall.start), direction)
      : wallLength;
    const interiorStart = clamp(Math.min(rawInteriorStart, rawInteriorEnd), 0, wallLength);
    const interiorEnd = clamp(Math.max(rawInteriorStart, rawInteriorEnd), 0, wallLength);

    // Bound every preview/drag to the interior usable span of the wall. This keeps
    // the door/window fully inside the two interior black-dot endpoints instead
    // of allowing the opening to slide into the thick-wall corner/exterior run.
    if (interiorEnd - interiorStart < width + 0.001) continue;

    const rawDistance = dot(sub(projection, wall.start), direction);
    const clampedDistance = clamp(
      rawDistance,
      interiorStart + width / 2,
      interiorEnd - width / 2
    );
    const snappedDistance = snapStructureCenterDistanceToNeighbor(
      clampedDistance,
      width,
      wall,
      walls,
      snapOptions,
      interiorStart,
      interiorEnd
    );
    const centerPoint = add(wall.start, mul(direction, snappedDistance));

    bestDistance = distanceToWall;
    bestPlacement = {
      wall,
      t: snappedDistance / wallLength,
      point: centerPoint,
      isValid: true,
    };
  }

  return bestPlacement;
}

function getWindowPlacementPreviewForPoint(
  point: Point,
  walls: Wall[],
  width: number,
  snapOptions: StructurePlacementSnapOptions = {}
): WindowPlacementPreview {
  return getWindowPlacementOnWall(point, walls, width, snapOptions) ?? {
    wall: null,
    t: 0,
    point,
    isValid: false,
    invalidReason: "Windows must be placed on a wall.",
  };
}

function getDoorPlacementPreviewForPoint(
  point: Point,
  walls: Wall[],
  width: number,
  snapOptions: StructurePlacementSnapOptions = {}
): DoorPlacementPreview {
  return getDoorPlacementOnWall(point, walls, width, snapOptions) ?? {
    wall: null,
    t: 0,
    point,
    isValid: false,
    invalidReason: "Doors must be placed on a wall.",
  };
}

function getWindowPlacementFromWall(
  windowItem: WindowElement,
  wall: Wall
): WindowPlacementPreview {
  return {
    wall,
    t: windowItem.t,
    point: interpolate(wall.start, wall.end, windowItem.t),
    isValid: true,
  };
}

function getWindowGeometry(windowItem: WindowElement, wall: Wall) {
  const wallLength = distance(wall.start, wall.end);

  if (wallLength < 0.001) return null;

  const direction = normalize(sub(wall.end, wall.start));
  const halfWidth = Math.min(windowItem.width / 2, wallLength / 2);
  const centerDistance = clamp(windowItem.t * wallLength, halfWidth, wallLength - halfWidth);
  const center = add(wall.start, mul(direction, centerDistance));

  return {
    center,
    start: add(center, mul(direction, -halfWidth)),
    end: add(center, mul(direction, halfWidth)),
  };
}

function getWindowTabSideFacingMeasurementGuide(
  wall: Wall,
  walls: Wall[] = []
): 1 | -1 {
  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const measurementSide = getInteriorMeasurementGuideSide(
    wall,
    walls.length ? walls : [wall]
  );
  const measurementNormal =
    measurementSide === "left" ? baseNormal : mul(baseNormal, -1);
  const windowShapeNormal = getPreferredNormal(wall.start, wall.end);

  return dot(windowShapeNormal, measurementNormal) >= 0 ? 1 : -1;
}

function getWindowMenuPosition(
  windowItem: WindowElement,
  wall: Wall,
  overrideT?: number,
  walls: Wall[] = []
): Point {
  const geometry = getWindowGeometry(
    {
      ...windowItem,
      t: overrideT ?? windowItem.t,
    },
    wall
  );

  if (!geometry) {
    return { x: wall.start.x + 24, y: wall.start.y - 24 };
  }

  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const measurementSide = getInteriorMeasurementGuideSide(wall, walls.length ? walls : [wall]);
  const menuSide = getOppositeMeasurementSide(measurementSide);
  const normal = menuSide === "left" ? baseNormal : mul(baseNormal, -1);
  const menuWidth = 112;
  const menuHeight = 46;
  const windowHalfHeight = 7;
  const menuGapFromWindow = 20;
  const windowCenter = geometry.center;

  // Keep a consistent visual gap from the window shape for every wall angle.
  // Since the context menu is an axis-aligned rectangle, use its projected
  // half-size along the wall normal before placing the menu center.
  const menuHalfProjectionOnNormal =
    (Math.abs(normal.x) * menuWidth + Math.abs(normal.y) * menuHeight) / 2;
  const menuCenter = add(
    windowCenter,
    mul(normal, windowHalfHeight + menuGapFromWindow + menuHalfProjectionOnNormal)
  );

  return {
    x: menuCenter.x - menuWidth / 2,
    y: menuCenter.y - menuHeight / 2,
  };
}

function getStructureGuideSideForWall(
  wall: Wall
): Exclude<MeasurementSide, "length"> {
  const direction = normalize(sub(wall.end, wall.start));
  const baseNormal = normalize(perp(direction));
  const guideNormal = getPreferredNormal(wall.start, wall.end);

  return dot(guideNormal, baseNormal) >= 0 ? "left" : "right";
}

function measurementSideMatchesStructureGuide(
  segmentStart: Point,
  segmentEnd: Point,
  side: "left" | "right",
  wall: Wall,
  walls: Wall[] = []
) {
  const guideSide = getInteriorMeasurementGuideSide(wall, walls);

  if (samePoint(segmentStart, wall.start) && samePoint(segmentEnd, wall.end)) {
    return side === guideSide;
  }

  if (samePoint(segmentStart, wall.end) && samePoint(segmentEnd, wall.start)) {
    return side === getOppositeMeasurementSide(guideSide);
  }

  return false;
}

function segmentMatchesWall(
  segmentStart: Point,
  segmentEnd: Point,
  wallId: string,
  walls: Wall[]
) {
  const wall = walls.find((currentWall) => currentWall.id === wallId);

  if (!wall) return false;

  return (
    (samePoint(segmentStart, wall.start) && samePoint(segmentEnd, wall.end)) ||
    (samePoint(segmentStart, wall.end) && samePoint(segmentEnd, wall.start))
  );
}

function interpolate(start: Point, end: Point, t: number): Point {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function areWindowsEqual(a: WindowElement[], b: WindowElement[]) {
  if (a.length !== b.length) return false;

  return a.every((windowItem, index) => {
    const otherWindow = b[index];

    return (
      otherWindow &&
      windowItem.id === otherWindow.id &&
      windowItem.wallId === otherWindow.wallId &&
      Math.abs(windowItem.t - otherWindow.t) < 0.001 &&
      Math.abs(windowItem.width - otherWindow.width) < 0.001 &&
      Math.abs(windowItem.heightInches - otherWindow.heightInches) < 0.001 &&
      Math.abs(windowItem.distanceFromFloorInches - otherWindow.distanceFromFloorInches) < 0.001 &&
      (windowItem.tabSide ?? 1) === (otherWindow.tabSide ?? 1)
    );
  });
}

function areDoorsEqual(a: DoorElement[], b: DoorElement[]) {
  if (a.length !== b.length) return false;

  return a.every((doorItem, index) => {
    const otherDoor = b[index];

    return (
      otherDoor &&
      doorItem.id === otherDoor.id &&
      doorItem.wallId === otherDoor.wallId &&
      Math.abs(doorItem.t - otherDoor.t) < 0.001 &&
      Math.abs(doorItem.width - otherDoor.width) < 0.001 &&
      Math.abs(doorItem.heightInches - otherDoor.heightInches) < 0.001 &&
      Math.abs(doorItem.distanceFromFloorInches - otherDoor.distanceFromFloorInches) < 0.001
    );
  });
}

function isPeninWall(wall: Wall) { return wall.kind === "penin-wall"; }
function isIslandWall(wall: Wall) { return wall.kind === "island-wall"; }
function isDetachedPanelWall(wall: Wall) { return isPeninWall(wall) || isIslandWall(wall); }
function isThinWall(wall: Wall) { return wall.kind === "thin-wall"; }
function isThickWall(wall: Wall) { return wall.kind !== "thin-wall"; }
function isDrawingTool(tool: Tool) { return tool === "draw-wall" || tool === "draw-thin-wall" || tool === "draw-penin-wall" || tool === "draw-island-wall"; }

function canConvertThinWallSelection(selectedWalls: Wall[], allThinWalls: Wall[]) {
  if (selectedWalls.length === 0) return false;
  if (!selectedWalls.every(isThinWall)) return false;

  const selectedIds = new Set(selectedWalls.map((wall) => wall.id));
  const components = getConnectedWallComponents(allThinWalls);

  for (const component of components) {
    const selectedInComponent = component.filter((wall) => selectedIds.has(wall.id));

    if (selectedInComponent.length === 0) continue;
    if (selectedInComponent.length !== component.length) return false;
  }

  return true;
}

function getConnectedWallComponents(walls: Wall[]) {
  const remaining = new Map(walls.map((wall) => [wall.id, wall]));
  const pointToWallIds = new Map<string, string[]>();

  for (const wall of walls) {
    for (const point of [wall.start, wall.end]) {
      const key = pointKey(point);
      pointToWallIds.set(key, [...(pointToWallIds.get(key) ?? []), wall.id]);
    }
  }

  const components: Wall[][] = [];

  while (remaining.size > 0) {
    const first = Array.from(remaining.values())[0];
    const queue = [first];
    const component: Wall[] = [];
    remaining.delete(first.id);

    while (queue.length > 0) {
      const wall = queue.shift();
      if (!wall) continue;

      component.push(wall);

      for (const point of [wall.start, wall.end]) {
        for (const neighborId of pointToWallIds.get(pointKey(point)) ?? []) {
          const neighbor = remaining.get(neighborId);

          if (!neighbor) continue;

          remaining.delete(neighborId);
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components;
}

function convertThinWallsToThickWalls(
  thinWalls: Wall[],
  mode: ThickWallCreationMode
) {
  const convertedWalls: Wall[] = [];
  const thinComponents = getConnectedWallComponents(thinWalls);

  for (const component of thinComponents) {
    const componentConnectionMap = buildConnectionMap(component);
    const hasBranchingJunction = component.some((wall) => {
      return [wall.start, wall.end].some(
        (point) => (componentConnectionMap.get(pointKey(point)) ?? 0) > 2
      );
    });

    // Branching thin-wall systems have T / cross junctions. If we offset every
    // branch independently, their converted centerlines no longer meet at the
    // same node, which creates tiny wall pieces, incorrect labels like 3", and
    // red open-end dots at what should be a real junction. For branched
    // systems, keep the thin guide nodes as the thick-wall centerline graph so
    // every connected endpoint stays exactly shared after conversion.
    if (hasBranchingJunction) {
      for (const wall of component) {
        if (distance(wall.start, wall.end) < 0.001) continue;

        convertedWalls.push({
          id: crypto.randomUUID(),
          start: { ...wall.start },
          end: { ...wall.end },
          kind: "wall",
          sourceThinLength: distance(wall.start, wall.end),
          sourceThinMode: mode,
        });
      }

      continue;
    }

    const thinChains = buildWallChains(component);

    for (const chain of thinChains) {
      if (chain.points.length < 2) continue;

      const centerlinePoints = getThickWallCenterlineFromThinGuide(
        chain.points,
        mode
      );

      for (let index = 0; index < centerlinePoints.length - 1; index++) {
        const start = centerlinePoints[index];
        const end = centerlinePoints[index + 1];

        if (distance(start, end) < 0.001) continue;

        convertedWalls.push({
          id: crypto.randomUUID(),
          start,
          end,
          kind: "wall",
          sourceThinLength: distance(chain.points[index], chain.points[index + 1]),
          sourceThinMode: mode,
        });
      }
    }
  }

  return tuneConvertedWallsToThinGuideLengths(convertedWalls, mode);
}

function tuneConvertedWallsToThinGuideLengths(
  walls: Wall[],
  mode: ThickWallCreationMode
) {
  const components = getConnectedWallComponents(walls);
  const fittedWalls: Wall[] = [];

  for (const component of components) {
    fittedWalls.push(...fitConvertedComponentToThinGuideLengths(component, mode));
  }

  return fittedWalls;
}

function fitConvertedComponentToThinGuideLengths(
  component: Wall[],
  mode: ThickWallCreationMode
) {
  const walls = component.map((wall) => ({
    ...wall,
    start: { ...wall.start },
    end: { ...wall.end },
  }));

  if (walls.length === 0) return walls;

  const desiredLengths = new Map<string, number>();

  for (const wall of walls) {
    const centerLength = distance(wall.start, wall.end);
    const sourceLength = wall.sourceThinLength;

    if (!sourceLength || sourceLength <= 0 || centerLength < 0.001) {
      desiredLengths.set(wall.id, centerLength);
      continue;
    }

    const targetSide = getConvertedTargetMeasurementSide(wall, walls, mode);
    const layout = getWallSideMeasurementLayout(
      wall.start,
      wall.end,
      targetSide,
      walls
    );
    const guideLength = distance(layout.lineStart, layout.lineEnd);

    // Keep the original segment direction but change its centerline length by
    // the exact amount needed for the target dotted guide to match the thin
    // guide. For a fixed junction angle, the guide-vs-centerline offset is
    // constant, so this preserves the system shape while correcting the actual
    // measured dotted-line length.
    desiredLengths.set(wall.id, Math.max(4, centerLength + (sourceLength - guideLength)));
  }

  return rebuildConvertedComponentWithDesiredLengths(walls, desiredLengths);
}

function rebuildConvertedComponentWithDesiredLengths(
  walls: Wall[],
  desiredLengths: Map<string, number>
) {
  if (walls.length === 0) return walls;

  const pointToWalls = new Map<string, Wall[]>();

  for (const wall of walls) {
    pointToWalls.set(pointKey(wall.start), [
      ...(pointToWalls.get(pointKey(wall.start)) ?? []),
      wall,
    ]);
    pointToWalls.set(pointKey(wall.end), [
      ...(pointToWalls.get(pointKey(wall.end)) ?? []),
      wall,
    ]);
  }

  const rootPoint = chooseConvertedRebuildRoot(walls, pointToWalls);
  const rebuiltPoints = new Map<string, Point>();
  const visitedWalls = new Set<string>();
  const queue: Point[] = [rootPoint];

  rebuiltPoints.set(pointKey(rootPoint), { ...rootPoint });

  while (queue.length) {
    const currentOriginalPoint = queue.shift()!;
    const currentKey = pointKey(currentOriginalPoint);
    const currentRebuiltPoint = rebuiltPoints.get(currentKey);

    if (!currentRebuiltPoint) continue;

    for (const wall of pointToWalls.get(currentKey) ?? []) {
      if (visitedWalls.has(wall.id)) continue;

      const currentIsStart = samePoint(wall.start, currentOriginalPoint);
      const neighborOriginalPoint = currentIsStart ? wall.end : wall.start;
      const neighborKey = pointKey(neighborOriginalPoint);
      const originalDirection = normalize(
        sub(neighborOriginalPoint, currentOriginalPoint)
      );

      if (!vectorLength(originalDirection)) continue;

      const desiredLength =
        desiredLengths.get(wall.id) ?? distance(wall.start, wall.end);
      const rebuiltNeighborPoint = add(
        currentRebuiltPoint,
        mul(originalDirection, desiredLength)
      );

      visitedWalls.add(wall.id);

      if (!rebuiltPoints.has(neighborKey)) {
        rebuiltPoints.set(neighborKey, rebuiltNeighborPoint);
        queue.push(neighborOriginalPoint);
      }
    }
  }

  return walls.map((wall) => ({
    ...wall,
    start: rebuiltPoints.get(pointKey(wall.start)) ?? wall.start,
    end: rebuiltPoints.get(pointKey(wall.end)) ?? wall.end,
  }));
}

function chooseConvertedRebuildRoot(
  walls: Wall[],
  pointToWalls: Map<string, Wall[]>
) {
  const allPoints = uniquePoints(getWallEndpoints(walls));
  const openPoints = allPoints.filter(
    (point) => (pointToWalls.get(pointKey(point)) ?? []).length <= 1
  );

  const candidates = openPoints.length ? openPoints : allPoints;
  let bestPoint = candidates[0];

  for (const point of candidates) {
    if (point.y < bestPoint.y - 0.001) {
      bestPoint = point;
      continue;
    }

    if (Math.abs(point.y - bestPoint.y) <= 0.001 && point.x < bestPoint.x) {
      bestPoint = point;
    }
  }

  return bestPoint;
}


function getConvertedTargetMeasurementSide(
  wall: Wall,
  walls: Wall[],
  mode: ThickWallCreationMode
): Exclude<MeasurementSide, "length"> {
  const exteriorSide = getExteriorMeasurementSide(wall.start, wall.end, walls);

  // Preserve the current button behavior:
  // Create exterior wall -> match the generated interior guide to the thin wall.
  // Create interior wall -> match the generated exterior guide to the thin wall.
  return mode === "exterior"
    ? exteriorSide === "left"
      ? "right"
      : "left"
    : exteriorSide;
}

function moveSharedPoint(walls: Wall[], from: Point, to: Point) {
  return walls.map((wall) => ({
    ...wall,
    start: samePoint(wall.start, from) ? { ...to } : wall.start,
    end: samePoint(wall.end, from) ? { ...to } : wall.end,
  }));
}

function getThickWallCenterlineFromThinGuide(
  thinGuidePoints: Point[],
  mode: ThickWallCreationMode
) {
  // Button behavior is intentionally opposite of the side that should match:
  // - Create exterior wall: preserve thin-wall values on the generated INTERIOR.
  // - Create interior wall: preserve thin-wall values on the generated EXTERIOR.
  const offset = mode === "exterior" ? WALL_THICKNESS / 2 : -WALL_THICKNESS / 2;

  return buildOffsetSide(thinGuidePoints, offset);
}

function getWallSideMeasurementLayout(
  segmentStart: Point,
  segmentEnd: Point,
  side: Exclude<MeasurementSide, "length">,
  walls: Wall[],
  labelOffset = 18
): MeasurementLayout {
  const direction = normalize(sub(segmentEnd, segmentStart));
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);
  const lineOffsetFromWallFace = 14;

  const startAnchor = getMeasurementGuideAnchor(
    segmentStart,
    segmentEnd,
    normal,
    walls
  );
  const endAnchor = getMeasurementGuideAnchor(
    segmentEnd,
    segmentStart,
    normal,
    walls
  );

  const lineStart = add(startAnchor, mul(normal, lineOffsetFromWallFace));
  const lineEnd = add(endAnchor, mul(normal, lineOffsetFromWallFace));
  const mid = midpoint(lineStart, lineEnd);

  return {
    lineStart,
    lineEnd,
    labelPoint: add(mid, mul(normal, labelOffset)),
    rotation: getTextRotation(segmentStart, segmentEnd),
  };
}

function getMeasurementGuideAnchor(
  endpoint: Point,
  segmentNeighbor: Point,
  sideNormal: Point,
  walls: Wall[]
) {
  const segmentDirection = normalize(sub(segmentNeighbor, endpoint));
  const wallFacePoint = add(endpoint, mul(sideNormal, WALL_THICKNESS / 2));

  if (!vectorLength(segmentDirection)) return wallFacePoint;

  const connectedDirections = getConnectedDirectionsAtPoint(endpoint, walls);

  if (connectedDirections.length <= 1) return wallFacePoint;

  const matchingIndex = findMatchingDirectionIndex(
    connectedDirections,
    segmentDirection
  );

  if (matchingIndex < 0) return wallFacePoint;

  const leftNormal = normalize(perp(segmentDirection));
  const isLeftSide = dot(sideNormal, leftNormal) >= 0;
  const currentDirection = connectedDirections[matchingIndex];

  if (isLeftSide) {
    const nextDirection =
      connectedDirections[(matchingIndex + 1) % connectedDirections.length];
    return getMiterAnchorForDirectionPair(
      endpoint,
      currentDirection,
      nextDirection,
      "first-left"
    );
  }

  const previousDirection =
    connectedDirections[
      (matchingIndex - 1 + connectedDirections.length) %
        connectedDirections.length
    ];

  return getMiterAnchorForDirectionPair(
    endpoint,
    previousDirection,
    currentDirection,
    "second-right"
  );
}

function getConnectedDirectionsAtPoint(point: Point, walls: Wall[]) {
  const directions = walls
    .filter((wall) => samePoint(wall.start, point) || samePoint(wall.end, point))
    .map((wall) => {
      const otherPoint = samePoint(wall.start, point) ? wall.end : wall.start;
      return normalize(sub(otherPoint, point));
    })
    .filter((direction) => vectorLength(direction));

  const uniqueDirections: Point[] = [];

  for (const direction of directions) {
    if (
      uniqueDirections.some(
        (existingDirection) => dot(existingDirection, direction) > 0.999
      )
    ) {
      continue;
    }

    uniqueDirections.push(direction);
  }

  return uniqueDirections.sort(
    (a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x)
  );
}

function findMatchingDirectionIndex(directions: Point[], target: Point) {
  let bestIndex = -1;
  let bestDot = 0.999;

  directions.forEach((direction, index) => {
    const match = dot(direction, target);

    if (match > bestDot) {
      bestDot = match;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getMiterAnchorForDirectionPair(
  point: Point,
  firstDirection: Point,
  secondDirection: Point,
  whichSide: "first-left" | "second-right"
) {
  const halfThickness = WALL_THICKNESS / 2;
  const firstLeftNormal = normalize(perp(firstDirection));
  const secondRightNormal = mul(normalize(perp(secondDirection)), -1);
  const firstOffsetPoint = add(point, mul(firstLeftNormal, halfThickness));
  const secondOffsetPoint = add(point, mul(secondRightNormal, halfThickness));
  const intersection = lineIntersection(
    firstOffsetPoint,
    firstDirection,
    secondOffsetPoint,
    secondDirection
  );

  const fallback =
    whichSide === "first-left" ? firstOffsetPoint : secondOffsetPoint;

  if (!intersection) return fallback;

  const distanceFromPoint = distance(point, intersection);

  // Avoid extreme spikes at very shallow angles. A bevel-like fallback gives a
  // stable black-dot anchor that follows the visible wall edge.
  if (distanceFromPoint > WALL_THICKNESS * 2.25) {
    return fallback;
  }

  return intersection;
}

function getRayExitDistanceFromPolygon(
  rayStart: Point,
  rayDirection: Point,
  polygon: Point[]
) {
  if (polygon.length < 3) return null;

  const intersections: number[] = [];

  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const edge = sub(b, a);
    const denominator = cross(rayDirection, edge);

    if (Math.abs(denominator) < 0.0001) continue;

    const diff = sub(a, rayStart);
    const rayT = cross(diff, edge) / denominator;
    const segmentT = cross(diff, rayDirection) / denominator;

    if (rayT >= -0.001 && segmentT >= -0.001 && segmentT <= 1.001) {
      intersections.push(Math.max(0, rayT));
    }
  }

  if (isPointInPolygon(rayStart, polygon)) {
    return intersections.length ? Math.max(...intersections) : null;
  }

  const positiveIntersections = intersections
    .filter((value) => value > 0.25)
    .sort((a, b) => a - b);

  if (positiveIntersections.length < 2) return null;

  return positiveIntersections[1];
}

function isPointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const crossesY = current.y > point.y !== previous.y > point.y;

    if (!crossesY) continue;

    const xIntersection =
      ((previous.x - current.x) * (point.y - current.y)) /
        (previous.y - current.y + 0.0000001) +
      current.x;

    if (point.x < xIntersection) {
      inside = !inside;
    }
  }

  return inside;
}

function getConvertedWallDisplayLength(
  _segmentStart: Point,
  _segmentEnd: Point,
  _side: MeasurementSide,
  _walls: Wall[]
) {
  // Always show the real length of the blue dotted measurement guide.
  return null;
}

function getConvertedMeasurementRunDisplayLength(
  _points: Point[],
  _startIndex: number,
  _endIndex: number,
  _side: Exclude<MeasurementSide, "length">,
  _walls: Wall[]
) {
  // Always use the real blue dotted guide length.
  return null;
}

function getMergedMeasurementLayout(
  firstLayout: MeasurementLayout,
  lastLayout: MeasurementLayout
): MeasurementLayout {
  const lineStart = firstLayout.lineStart;
  const lineEnd = lastLayout.lineEnd;
  const mergedMidpoint = midpoint(lineStart, lineEnd);
  const firstMidpoint = midpoint(firstLayout.lineStart, firstLayout.lineEnd);
  const labelOffsetVector = sub(firstLayout.labelPoint, firstMidpoint);

  return {
    lineStart,
    lineEnd,
    labelPoint: add(mergedMidpoint, labelOffsetVector),
    rotation: firstLayout.rotation,
  };
}

function shouldMergeMeasurementRun(
  points: Point[],
  index: number,
  side: Exclude<MeasurementSide, "length">,
  walls: Wall[]
) {
  if (index >= points.length - 2) return false;

  const currentStart = points[index];
  const joint = points[index + 1];
  const currentEnd = points[index + 1];
  const nextEnd = points[index + 2];

  // Re-measure the wall system as a whole: a multi-wall junction creates black
  // measurement anchors, so guides must stop at the closest black dot on each
  // side of that junction instead of merging past it to a farther endpoint.
  // A simple collinear split without an attached wall can still merge.
  if (isMultiWallMeasurementJunction(joint, walls)) return false;

  const currentDirection = normalize(sub(currentEnd, currentStart));
  const nextDirection = normalize(sub(nextEnd, joint));

  if (!vectorLength(currentDirection) || !vectorLength(nextDirection)) {
    return false;
  }

  if (dot(currentDirection, nextDirection) < 0.999) return false;

  const currentExteriorSide = getExteriorMeasurementSide(
    currentStart,
    currentEnd,
    walls
  );
  const nextExteriorSide = getExteriorMeasurementSide(joint, nextEnd, walls);

  return side === currentExteriorSide && side === nextExteriorSide;
}

function isMultiWallMeasurementJunction(point: Point, walls: Wall[]) {
  const connectedWalls = walls.filter(
    (wall) => samePoint(wall.start, point) || samePoint(wall.end, point)
  );

  if (connectedWalls.length <= 2) return false;

  const uniqueDirections: Point[] = [];

  for (const wall of connectedWalls) {
    const otherPoint = samePoint(wall.start, point) ? wall.end : wall.start;
    const direction = normalize(sub(otherPoint, point));

    if (!vectorLength(direction)) continue;

    if (
      uniqueDirections.some(
        (existingDirection) => Math.abs(dot(existingDirection, direction)) > 0.999
      )
    ) {
      continue;
    }

    uniqueDirections.push(direction);
  }

  return uniqueDirections.length >= 2;
}

function getExteriorMeasurementSide(
  segmentStart: Point,
  segmentEnd: Point,
  walls: Wall[]
): Exclude<MeasurementSide, "length"> {
  const wallPoints = getWallEndpoints(walls);

  if (wallPoints.length === 0) return "left";

  const centroid = wallPoints.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 }
  );

  centroid.x /= wallPoints.length;
  centroid.y /= wallPoints.length;

  const segmentMidpoint = midpoint(segmentStart, segmentEnd);
  const direction = normalize(sub(segmentEnd, segmentStart));
  const leftNormal = perp(direction);
  const outwardVector = sub(segmentMidpoint, centroid);

  return dot(leftNormal, outwardVector) >= 0 ? "left" : "right";
}

function resizeWallFromMeasurement(
  walls: Wall[],
  edit: MeasurementEditState,
  targetEdgeLength: number
) {
  const wall = walls.find((currentWall) => currentWall.id === edit.wallId);

  if (!wall) return walls;

  const delta = targetEdgeLength - edit.currentEdgeLength;

  if (Math.abs(delta) < 0.001) return walls;

  const direction = normalize(sub(edit.segmentEnd, edit.segmentStart));

  if (!vectorLength(direction)) return walls;

  const connectionMap = buildConnectionMap(walls);
  const startConnected = isConnected(edit.segmentStart, connectionMap);
  const endConnected = isConnected(edit.segmentEnd, connectionMap);

  const moveStart = !startConnected && endConnected;
  const oldPoint = moveStart ? edit.segmentStart : edit.segmentEnd;
  const newPoint = moveStart
    ? add(edit.segmentStart, mul(direction, -delta))
    : add(edit.segmentEnd, mul(direction, delta));

  return walls.map((currentWall) => {
    const isEditedWall = currentWall.id === wall.id;

    return {
      ...currentWall,
      start: samePoint(currentWall.start, oldPoint) ? newPoint : currentWall.start,
      end: samePoint(currentWall.end, oldPoint) ? newPoint : currentWall.end,
      sourceThinLength:
        isEditedWall && currentWall.sourceThinLength
          ? targetEdgeLength
          : currentWall.sourceThinLength,
    };
  });
}

function areWallsEqual(a: Wall[], b: Wall[]) {
  if (a.length !== b.length) return false;

  return a.every((wall, index) => {
    const other = b[index];

    return (
      other &&
      wall.id === other.id &&
      (wall.kind ?? "wall") === (other.kind ?? "wall") &&
      getWallElevationViewMode(wall) === getWallElevationViewMode(other) &&
      (wall.needCabinetPlacement ?? true) === (other.needCabinetPlacement ?? true) &&
      getWallCabinetPlacementMode(wall) === getWallCabinetPlacementMode(other) &&
      samePoint(wall.start, other.start) &&
      samePoint(wall.end, other.end)
    );
  });
}

function buildWallChains(walls: Wall[]) {
  if (walls.length === 0) return [];

  const pointToWalls = new Map<string, Wall[]>();

  for (const wall of walls) {
    for (const point of [wall.start, wall.end]) {
      const key = pointKey(point);
      pointToWalls.set(key, [...(pointToWalls.get(key) ?? []), wall]);
    }
  }

  const usedWallIds = new Set<string>();
  const chains: { points: Point[] }[] = [];

  const getOtherPoint = (wall: Wall, point: Point) => {
    return samePoint(wall.start, point) ? wall.end : wall.start;
  };

  const isPassThroughPoint = (point: Point) => {
    return (pointToWalls.get(pointKey(point)) ?? []).length === 2;
  };

  const getContinuationWall = (
    previousPoint: Point,
    currentPoint: Point,
    currentWall: Wall
  ) => {
    const connectedWalls = pointToWalls.get(pointKey(currentPoint)) ?? [];
    const unusedWalls = connectedWalls.filter(
      (wall) => wall.id !== currentWall.id && !usedWallIds.has(wall.id)
    );

    if (unusedWalls.length === 0) return undefined;

    if (connectedWalls.length === 2) return unusedWalls[0];

    const incomingDirection = normalize(sub(currentPoint, previousPoint));
    let bestWall: Wall | undefined;
    let bestDot = 0.999;

    for (const wall of unusedWalls) {
      const outgoingDirection = normalize(sub(getOtherPoint(wall, currentPoint), currentPoint));
      const continuationDot = dot(incomingDirection, outgoingDirection);

      if (continuationDot > bestDot) {
        bestDot = continuationDot;
        bestWall = wall;
      }
    }

    return bestWall;
  };

  const walkChain = (startPoint: Point, firstWall: Wall) => {
    const points: Point[] = [startPoint];
    let currentPoint = startPoint;
    let currentWall: Wall | undefined = firstWall;

    while (currentWall && !usedWallIds.has(currentWall.id)) {
      usedWallIds.add(currentWall.id);

      const previousPoint = currentPoint;
      const nextPoint = getOtherPoint(currentWall, currentPoint);
      points.push(nextPoint);
      currentPoint = nextPoint;

      currentWall = getContinuationWall(previousPoint, currentPoint, currentWall);
    }

    return points;
  };

  const junctionOrOpenPoints = uniquePoints(
    getWallEndpoints(walls).filter((point) => !isPassThroughPoint(point))
  ).sort((a, b) => {
    const degreeA = pointToWalls.get(pointKey(a))?.length ?? 0;
    const degreeB = pointToWalls.get(pointKey(b))?.length ?? 0;

    return degreeA - degreeB;
  });

  for (const startPoint of junctionOrOpenPoints) {
    for (const wall of pointToWalls.get(pointKey(startPoint)) ?? []) {
      if (usedWallIds.has(wall.id)) continue;
      chains.push({ points: walkChain(startPoint, wall) });
    }
  }

  for (const wall of walls) {
    if (usedWallIds.has(wall.id)) continue;
    chains.push({ points: walkChain(wall.start, wall) });
  }

  return chains.filter((chain) => chain.points.length >= 2);
}

function getWallSegmentBlackDotGeometry(
  segmentStart: Point,
  segmentEnd: Point,
  walls: Wall[]
): WallSegmentBlackDotGeometry {
  const direction = normalize(sub(segmentEnd, segmentStart));

  if (!vectorLength(direction)) {
    const fallback = {
      segmentStart,
      segmentEnd,
      startLeft: segmentStart,
      endLeft: segmentEnd,
      endRight: segmentEnd,
      startRight: segmentStart,
      polygon: [segmentStart, segmentEnd, segmentEnd, segmentStart],
      leftEdge: { a: segmentStart, b: segmentEnd },
      rightEdge: { a: segmentStart, b: segmentEnd },
    };

    return fallback;
  }

  // Build the wall body from the four visible black-dot anchors on the same
  // physical side of this segment. The old version asked for the end anchors
  // using the reversed segment direction with the same left/right label. That
  // flips the side at the end of the wall and can connect top-left to
  // bottom-right, creating a twisted bow-tie polygon. Keep the side normal in
  // the original segment direction for both endpoints instead.
  const leftNormal = normalize(perp(direction));
  const rightNormal = mul(leftNormal, -1);
  const startLeft = getMeasurementGuideAnchor(
    segmentStart,
    segmentEnd,
    leftNormal,
    walls
  );
  const endLeft = getMeasurementGuideAnchor(
    segmentEnd,
    segmentStart,
    leftNormal,
    walls
  );
  const endRight = getMeasurementGuideAnchor(
    segmentEnd,
    segmentStart,
    rightNormal,
    walls
  );
  const startRight = getMeasurementGuideAnchor(
    segmentStart,
    segmentEnd,
    rightNormal,
    walls
  );

  return {
    segmentStart,
    segmentEnd,
    startLeft,
    endLeft,
    endRight,
    startRight,
    polygon: [startLeft, endLeft, endRight, startRight],
    leftEdge: { a: startLeft, b: endLeft },
    rightEdge: { a: startRight, b: endRight },
  };
}

function buildBlackDotWallBand(
  points: Point[],
  walls: Wall[]
): WallBandGeometry {
  const segmentGeometries = points.slice(0, -1).map((point, index) =>
    getWallSegmentBlackDotGeometry(point, points[index + 1], walls)
  );

  const leftEdges = segmentGeometries.map((segment) => segment.leftEdge);
  const rightEdges = segmentGeometries.map((segment) => segment.rightEdge);
  const left = segmentGeometries.length
    ? [
        ...segmentGeometries.map((segment) => segment.startLeft),
        segmentGeometries[segmentGeometries.length - 1].endLeft,
      ]
    : [];
  const right = segmentGeometries.length
    ? [
        ...segmentGeometries.map((segment) => segment.startRight),
        segmentGeometries[segmentGeometries.length - 1].endRight,
      ]
    : [];
  const polygon = segmentGeometries.flatMap((segment) => segment.polygon);

  return {
    left,
    right,
    polygon,
    leftEdges,
    rightEdges,
    segmentGeometries,
  };
}

function buildWallBand(points: Point[], thickness: number): WallBandGeometry {
  const half = thickness / 2;

  const left = buildOffsetSide(points, half);
  const right = buildOffsetSide(points, -half);

  const polygon = [...left, ...[...right].reverse()];

  const leftEdges = left.slice(0, -1).map((point, index) => ({
    a: point,
    b: left[index + 1],
  }));

  const rightEdges = right.slice(0, -1).map((point, index) => ({
    a: point,
    b: right[index + 1],
  }));

  return {
    left,
    right,
    polygon,
    leftEdges,
    rightEdges,
    segmentGeometries: [],
  };
}

function buildOffsetSide(points: Point[], offset: number) {
  const result: Point[] = [];
  const directions = points
    .slice(0, -1)
    .map((point, index) => normalize(sub(points[index + 1], point)));

  for (let index = 0; index < points.length; index++) {
    if (index === 0) {
      const normal = perp(directions[0]);
      result.push(add(points[index], mul(normal, offset)));
      continue;
    }

    if (index === points.length - 1) {
      const normal = perp(directions[directions.length - 1]);
      result.push(add(points[index], mul(normal, offset)));
      continue;
    }

    const previousDirection = directions[index - 1];
    const nextDirection = directions[index];
    const previousNormal = perp(previousDirection);
    const nextNormal = perp(nextDirection);

    const previousOffsetPoint = add(
      points[index],
      mul(previousNormal, offset)
    );

    const nextOffsetPoint = add(points[index], mul(nextNormal, offset));

    const intersection = lineIntersection(
      previousOffsetPoint,
      previousDirection,
      nextOffsetPoint,
      nextDirection
    );

    if (intersection) {
      result.push(intersection);
    } else {
      const averageNormal = normalize(add(previousNormal, nextNormal));
      result.push(add(points[index], mul(averageNormal, offset)));
    }
  }

  return result;
}

function lineIntersection(
  p1: Point,
  d1: Point,
  p2: Point,
  d2: Point
): Point | null {
  const crossValue = cross(d1, d2);

  if (Math.abs(crossValue) < 0.0001) return null;

  const diff = sub(p2, p1);
  const t = cross(diff, d2) / crossValue;

  return add(p1, mul(d1, t));
}

function getEdgeMeasurementLayout(
  start: Point,
  end: Point,
  side: "left" | "right",
  labelOffset = 18,
  startInset = 0,
  endInset = 0
): MeasurementLayout {
  const direction = sub(end, start);
  const directionUnit = normalize(direction);
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);

  const lineOffset = 14;
  const lineStart = {
    x: start.x + normal.x * lineOffset + directionUnit.x * startInset,
    y: start.y + normal.y * lineOffset + directionUnit.y * startInset,
  };

  const lineEnd = {
    x: end.x + normal.x * lineOffset - directionUnit.x * endInset,
    y: end.y + normal.y * lineOffset - directionUnit.y * endInset,
  };

  const mid = midpoint(lineStart, lineEnd);

  const labelPoint = {
    x: mid.x + normal.x * labelOffset,
    y: mid.y + normal.y * labelOffset,
  };

  return {
    lineStart,
    lineEnd,
    labelPoint,
    rotation: getTextRotation(start, end),
  };
}

function getThinWallMeasurementLayout(start: Point, end: Point): MeasurementLayout {
  const normal = getPreferredNormal(start, end);
  const labelDistance = 16;

  const mid = midpoint(start, end);

  return {
    lineStart: start,
    lineEnd: end,
    labelPoint: {
      x: mid.x + normal.x * labelDistance,
      y: mid.y + normal.y * labelDistance,
    },
    rotation: getTextRotation(start, end),
  };
}

function getMeasurementLayout(
  start: Point,
  end: Point,
  side: "exterior" | "interior"
): MeasurementLayout {
  const exteriorNormal = getPreferredNormal(start, end);
  const normal =
    side === "exterior"
      ? exteriorNormal
      : { x: -exteriorNormal.x, y: -exteriorNormal.y };

  const lineOffset = 14;
  const labelOffset = 18;

  const lineStart = {
    x: start.x + normal.x * lineOffset,
    y: start.y + normal.y * lineOffset,
  };

  const lineEnd = {
    x: end.x + normal.x * lineOffset,
    y: end.y + normal.y * lineOffset,
  };

  const mid = midpoint(lineStart, lineEnd);

  const labelPoint = {
    x: mid.x + normal.x * labelOffset,
    y: mid.y + normal.y * labelOffset,
  };

  return {
    lineStart,
    lineEnd,
    labelPoint,
    rotation: getTextRotation(start, end),
  };
}

function getAngleGuideLayout(start: Point, end: Point): {
  mode: ArcMode;
  labels: { text: string; point: Point }[];
} {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const radius = distance(start, end);

  if (radius <= 4) return { mode: "full", labels: [] };

  if (Math.abs(dy) < 0.01) {
    return {
      mode: "full",
      labels: [
        {
          text: "180°",
          point: { x: start.x, y: start.y - Math.max(72, radius * 0.6) },
        },
        {
          text: "180°",
          point: { x: start.x, y: start.y + Math.max(72, radius * 0.6) },
        },
      ],
    };
  }

  const mode: ArcMode = dy < 0 ? "upper" : "lower";
  const wallAngle = normalizeDegrees((Math.atan2(-dy, dx) * 180) / Math.PI);
  const acute = Math.round(
    (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI
  );
  const obtuse = 180 - acute;
  const labelRadius = Math.max(72, radius * 0.56);

  let acuteLabelAngle = 0;
  let obtuseLabelAngle = 0;

  if (mode === "upper") {
    if (dx >= 0) {
      acuteLabelAngle = wallAngle / 2;
      obtuseLabelAngle = (wallAngle + 180) / 2;
    } else {
      acuteLabelAngle = (wallAngle + 180) / 2;
      obtuseLabelAngle = wallAngle / 2;
    }
  } else {
    if (dx >= 0) {
      acuteLabelAngle = (wallAngle + 360) / 2;
      obtuseLabelAngle = (180 + wallAngle) / 2;
    } else {
      acuteLabelAngle = (180 + wallAngle) / 2;
      obtuseLabelAngle = (wallAngle + 360) / 2;
    }
  }

  return {
    mode,
    labels: [
      {
        text: `${obtuse}°`,
        point: cabinetPolarPoint(start, labelRadius, obtuseLabelAngle),
      },
      {
        text: `${acute}°`,
        point: cabinetPolarPoint(start, labelRadius, acuteLabelAngle),
      },
    ],
  };
}

function describeHalfArc(center: Point, radius: number, mode: "upper" | "lower") {
  const left = { x: center.x - radius, y: center.y };
  const right = { x: center.x + radius, y: center.y };
  const sweepFlag = mode === "upper" ? 1 : 0;

  return `M ${left.x} ${left.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${right.x} ${right.y}`;
}

function normalizeWallJunctions(walls: Wall[], kind: WallKind) {
  let nextWalls = [...walls];
  let didChange = true;

  while (didChange) {
    didChange = false;

    const snappedWalls = snapEndpointsToNearbyInteriorSegments(nextWalls, kind);

    if (!areWallsEqualLoose(nextWalls, snappedWalls)) {
      nextWalls = snappedWalls;
      didChange = true;
      continue;
    }

    const kindWalls = nextWalls.filter((wall) => (wall.kind ?? "wall") === kind);
    const endpoints = uniquePoints(
      getWallEndpoints(kindWalls)
    );

    for (const endpoint of endpoints) {
      const splitWalls = splitWallsAtInteriorPoint(nextWalls, endpoint, kind);

      if (splitWalls.length !== nextWalls.length) {
        nextWalls = splitWalls;
        didChange = true;
        break;
      }
    }
  }

  return nextWalls;
}

function snapEndpointsToNearbyInteriorSegments(walls: Wall[], kind: WallKind) {
  const snapThreshold = WALL_THICKNESS * 1.1;
  const kindWalls = walls.filter((wall) => (wall.kind ?? "wall") === kind);

  for (const sourceWall of kindWalls) {
    for (const sourcePoint of [sourceWall.start, sourceWall.end]) {
      let bestSnap: Point | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const targetWall of kindWalls) {
        if (targetWall.id === sourceWall.id) continue;
        if (samePoint(sourcePoint, targetWall.start) || samePoint(sourcePoint, targetWall.end)) continue;

        const projectedPoint = closestPointOnSegment(
          sourcePoint,
          targetWall.start,
          targetWall.end
        );

        if (!pointIsInteriorToSegment(projectedPoint, targetWall.start, targetWall.end)) continue;

        const snapDistance = distance(sourcePoint, projectedPoint);

        if (snapDistance < bestDistance && snapDistance <= snapThreshold) {
          bestDistance = snapDistance;
          bestSnap = projectedPoint;
        }
      }

      if (!bestSnap) continue;

      return walls.map((wall) => {
        if ((wall.kind ?? "wall") !== kind) return wall;

        return {
          ...wall,
          start: samePoint(wall.start, sourcePoint) ? { ...bestSnap } : wall.start,
          end: samePoint(wall.end, sourcePoint) ? { ...bestSnap } : wall.end,
        };
      });
    }
  }

  return walls;
}

function pointIsInteriorToSegment(point: Point, segmentStart: Point, segmentEnd: Point) {
  const totalLength = distance(segmentStart, segmentEnd);
  const startLength = distance(segmentStart, point);
  const endLength = distance(point, segmentEnd);

  return startLength > 1 && endLength > 1 && startLength < totalLength && endLength < totalLength;
}

function areWallsEqualLoose(a: Wall[], b: Wall[]) {
  if (a.length !== b.length) return false;

  return a.every((wall, index) => {
    const other = b[index];

    return (
      other &&
      wall.id === other.id &&
      (wall.kind ?? "wall") === (other.kind ?? "wall") &&
      samePoint(wall.start, other.start) &&
      samePoint(wall.end, other.end)
    );
  });
}

function getMultiConnectedEndpoints(walls: Wall[], connectionMap: ConnectionMap) {
  const points: Point[] = [];

  for (const wall of walls) {
    if ((connectionMap.get(pointKey(wall.start)) ?? 0) > 2) points.push(wall.start);
    if ((connectionMap.get(pointKey(wall.end)) ?? 0) > 2) points.push(wall.end);
  }

  return uniquePoints(points);
}

function getConnectedWallDirectionsAtPoint(point: Point, walls: Wall[]) {
  const directions: Point[] = [];

  for (const wall of walls) {
    let direction: Point | null = null;

    if (samePoint(point, wall.start)) {
      direction = normalize(sub(wall.end, wall.start));
    } else if (samePoint(point, wall.end)) {
      direction = normalize(sub(wall.start, wall.end));
    }

    if (!direction || !vectorLength(direction)) continue;

    const isDuplicate = directions.some((existingDirection) => {
      return dot(existingDirection, direction) > 0.999;
    });

    if (!isDuplicate) directions.push(direction);
  }

  return directions;
}

function buildConnectionMap(walls: Wall[]) {
  const map = new Map<string, number>();

  for (const wall of walls) {
    map.set(pointKey(wall.start), (map.get(pointKey(wall.start)) ?? 0) + 1);
    map.set(pointKey(wall.end), (map.get(pointKey(wall.end)) ?? 0) + 1);
  }

  return map;
}

function getOpenEndpoints(walls: Wall[], connectionMap: ConnectionMap) {
  const points: Point[] = [];

  for (const wall of walls) {
    if (
      !isConnected(wall.start, connectionMap) &&
      !touchesAnotherWallInterior(wall.start, wall, walls)
    ) {
      points.push(wall.start);
    }

    if (
      !isConnected(wall.end, connectionMap) &&
      !touchesAnotherWallInterior(wall.end, wall, walls)
    ) {
      points.push(wall.end);
    }
  }

  return uniquePoints(points);
}

function touchesAnotherWallInterior(point: Point, sourceWall: Wall, walls: Wall[]) {
  const tolerance = 1.25;

  return walls.some((wall) => {
    if (wall.id === sourceWall.id) return false;
    if ((wall.kind ?? "wall") !== (sourceWall.kind ?? "wall")) return false;
    if (samePoint(point, wall.start) || samePoint(point, wall.end)) return false;

    const projectedPoint = closestPointOnSegment(point, wall.start, wall.end);

    if (!pointIsInteriorToSegment(projectedPoint, wall.start, wall.end)) return false;

    return distance(point, projectedPoint) <= tolerance;
  });
}

function getConnectedEndpoints(walls: Wall[], connectionMap: ConnectionMap) {
  const points: Point[] = [];

  for (const wall of walls) {
    if (isConnected(wall.start, connectionMap)) points.push(wall.start);
    if (isConnected(wall.end, connectionMap)) points.push(wall.end);
  }

  return uniquePoints(points);
}

function getWallEndpoints(walls: Wall[]): Point[] {
  return walls.reduce<Point[]>((points, wall) => {
    points.push(wall.start, wall.end);
    return points;
  }, []);
}

function uniquePoints(points: Point[]) {
  const seen = new Set<string>();
  const unique: Point[] = [];

  for (const point of points) {
    const key = pointKey(point);

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(point);
  }

  return unique;
}

function isConnected(point: Point, connectionMap: ConnectionMap) {
  return (connectionMap.get(pointKey(point)) ?? 0) > 1;
}

function pointKey(point: Point) {
  return `${Math.round(point.x)}:${Math.round(point.y)}`;
}

function samePoint(a: Point, b: Point) {
  return (
    Math.round(a.x) === Math.round(b.x) &&
    Math.round(a.y) === Math.round(b.y)
  );
}

function getPreferredNormal(start: Point, end: Point): Point {
  const normal = getNormal(start, end);
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dy) < 0.001) return { x: 0, y: -1 };

  if (dy < 0) {
    return normal.y < 0 ? normal : { x: -normal.x, y: -normal.y };
  }

  if (dx >= 0) {
    return normal.y > 0 ? normal : { x: -normal.x, y: -normal.y };
  }

  return normal.y > 0 ? normal : { x: -normal.x, y: -normal.y };
}

function getSelectionRect(start: Point, end: Point): SelectionRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);

  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function cabinetIntersectsSelectionRect(cabinetItem: CabinetElement, rect: SelectionRect) {
  const bounds = getCabinetPlanOccupiedBounds(cabinetItem);

  return (
    bounds.minX <= rect.x + rect.width &&
    bounds.maxX >= rect.x &&
    bounds.minY <= rect.y + rect.height &&
    bounds.maxY >= rect.y
  );
}

function wallIntersectsSelectionRect(wall: Wall, rect: SelectionRect) {
  if (pointInSelectionRect(wall.start, rect) || pointInSelectionRect(wall.end, rect)) {
    return true;
  }

  const topLeft = { x: rect.x, y: rect.y };
  const topRight = { x: rect.x + rect.width, y: rect.y };
  const bottomRight = { x: rect.x + rect.width, y: rect.y + rect.height };
  const bottomLeft = { x: rect.x, y: rect.y + rect.height };

  return (
    cabinetSegmentsIntersect(wall.start, wall.end, topLeft, topRight) ||
    cabinetSegmentsIntersect(wall.start, wall.end, topRight, bottomRight) ||
    cabinetSegmentsIntersect(wall.start, wall.end, bottomRight, bottomLeft) ||
    cabinetSegmentsIntersect(wall.start, wall.end, bottomLeft, topLeft)
  );
}

function pointInSelectionRect(point: Point, rect: SelectionRect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function cabinetSegmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const orientation1 = segmentOrientation(a, b, c);
  const orientation2 = segmentOrientation(a, b, d);
  const orientation3 = segmentOrientation(c, d, a);
  const orientation4 = segmentOrientation(c, d, b);

  if (orientation1 !== orientation2 && orientation3 !== orientation4) return true;

  if (orientation1 === 0 && pointOnSegment(c, a, b)) return true;
  if (orientation2 === 0 && pointOnSegment(d, a, b)) return true;
  if (orientation3 === 0 && pointOnSegment(a, c, d)) return true;
  if (orientation4 === 0 && pointOnSegment(b, c, d)) return true;

  return false;
}

function getWallAttachPoint(point: Point, walls: Wall[]): Point | null {
  const closestEndpointPoint = getClosestEndpointPoint(point, walls);

  if (closestEndpointPoint) return closestEndpointPoint;

  let closestPoint: Point | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const wall of walls) {
    const projectedPoint = closestPointOnSegment(point, wall.start, wall.end);
    const projectedDistance = distance(point, projectedPoint);

    if (projectedDistance < closestDistance) {
      closestDistance = projectedDistance;
      closestPoint = projectedPoint;
    }
  }

  if (!closestPoint || closestDistance > WALL_ATTACH_THRESHOLD) return null;

  return closestPoint;
}


function splitConnectedWallsAndAddWall(walls: Wall[], newWall: Wall): Wall[] {
  let nextWalls = walls;

  const wallKind: WallKind = newWall.kind ?? "wall";
  const splitKinds: WallKind[] = wallKind === "penin-wall" || wallKind === "island-wall" ? [] : [wallKind];

  for (const kind of splitKinds) {
    nextWalls = splitWallsAtInteriorPoint(nextWalls, newWall.start, kind);
    nextWalls = splitWallsAtInteriorPoint(nextWalls, newWall.end, kind);
  }

  return [...nextWalls, newWall];
}

function splitWallsAtInteriorPoint(walls: Wall[], point: Point, kind: WallKind): Wall[] {
  const result: Wall[] = [];

  for (const wall of walls) {
    if (wall.kind !== kind || !pointIsInsideWallSegment(point, wall)) {
      result.push(wall);
      continue;
    }

    result.push({
      ...wall,
      id: crypto.randomUUID(),
      start: wall.start,
      end: { ...point },
      sourceThinLength: wall.sourceThinMode ? distance(wall.start, point) : undefined,
      sourceThinMode: wall.sourceThinMode,
    });

    result.push({
      ...wall,
      id: crypto.randomUUID(),
      start: { ...point },
      end: wall.end,
      sourceThinLength: wall.sourceThinMode ? distance(point, wall.end) : undefined,
      sourceThinMode: wall.sourceThinMode,
    });
  }

  return result;
}

function pointIsInsideWallSegment(point: Point, wall: Wall) {
  if (samePoint(point, wall.start) || samePoint(point, wall.end)) return false;

  const projectedPoint = closestPointOnSegment(point, wall.start, wall.end);
  const distanceFromWall = distance(point, projectedPoint);

  if (distanceFromWall > 0.75) return false;

  const totalLength = distance(wall.start, wall.end);
  const startLength = distance(wall.start, projectedPoint);
  const endLength = distance(projectedPoint, wall.end);

  return startLength > 1 && endLength > 1 && startLength < totalLength && endLength < totalLength;
}

function getClosestEndpointPoint(point: Point, walls: Wall[]): Point | null {
  let closestEndpointPoint: Point | null = null;
  let closestEndpointDistance = Number.POSITIVE_INFINITY;

  for (const wall of walls) {
    for (const endpoint of [wall.start, wall.end]) {
      const endpointDistance = distance(point, endpoint);

      if (endpointDistance < closestEndpointDistance) {
        closestEndpointDistance = endpointDistance;
        closestEndpointPoint = endpoint;
      }
    }
  }

  if (!closestEndpointPoint || closestEndpointDistance > WALL_ATTACH_THRESHOLD) {
    return null;
  }

  return closestEndpointPoint;
}

function snapToGrid(point: Point): Point {
  return {
    x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
  };
}
