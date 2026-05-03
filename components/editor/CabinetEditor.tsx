"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Move,
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

type Panel =
  | "walls"
  | "structures"
  | "products"
  | "cabinets"
  | "objects"
  | "text"
  | "lines";

type Tool =
  | "draw-wall"
  | "draw-thin-wall"
  | "place-window"
  | "place-door"
  | "place-cabinet"
  | null;

type CabinetCategory = "base" | "tall" | "wall";

type CabinetCatalogItem = {
  id: string;
  category: CabinetCategory;
  title: string;
  subtitle: string;
  widthInches: number;
  depthInches: number;
  image: "base" | "tall" | "wall";
};

type PlanViewMode = "floor" | "elevation";

type SidebarItem = {
  id: Panel;
  label: string;
  icon: React.ElementType;
};

type Point = {
  x: number;
  y: number;
};

type WallKind = "wall" | "thin-wall";

type Wall = {
  id: string;
  start: Point;
  end: Point;
  kind?: WallKind;
  sourceThinLength?: number;
  sourceThinMode?: ThickWallCreationMode;
};

type WindowElement = {
  id: string;
  wallId: string;
  t: number;
  width: number;
  heightInches: number;
  distanceFromFloorInches: number;
  tabSide?: 1 | -1;
};

type DoorElement = {
  id: string;
  wallId: string;
  t: number;
  width: number;
  heightInches: number;
  distanceFromFloorInches: number;
};

// CabinetElement
type CabinetElement = {
  id: string;
  center: Point;
  width: number;
  depth: number;
  rotation: number;
  category?: CabinetCategory;
  heightInches?: number;
  distanceFromFloorInches?: number;
};


type WindowSelectionDetail = {
  id: string;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
};

type DoorSelectionDetail = {
  id: string;
  widthInches: number;
  heightInches: number;
  distanceFromFloorInches: number;
};


type WindowPlacementPreview = {
  wall: Wall;
  t: number;
  point: Point;
};

type DoorPlacementPreview = {
  wall: Wall;
  t: number;
  point: Point;
};

// CabinetPlacementPreview
type CabinetPlacementPreview = {
  center: Point;
  width: number;
  depth: number;
  rotation: number;
  isValid: boolean;
};

// CabinetDragState
type CabinetDragState = {
  id: string;
  pointerId: number;
  startCabinets: CabinetElement[];
  didMove: boolean;
  snappedRotation?: number | null;
};

// CabinetRotateState
type CabinetRotateState = {
  id: string;
  pointerId: number;
  center: Point;
  startAngle: number;
  startRotation: number;
  startCabinets: CabinetElement[];
  didMove: boolean;
  snappedRotation: number | null;
};


type WindowDragState = {
  id: string;
  pointerId: number;
  startWindows: WindowElement[];
  didMove: boolean;
};

type DoorDragState = {
  id: string;
  pointerId: number;
  startDoors: DoorElement[];
  didMove: boolean;
};


type EditorSnapshot = {
  walls: Wall[];
  windows: WindowElement[];
  doors: DoorElement[];
  cabinets?: CabinetElement[];
};

type GuideInfo = {
  point: Point;
  verticalX?: number;
  horizontalY?: number;
};

type ArcMode = "full" | "upper" | "lower";

type ConnectionMap = Map<string, number>;

type WallBandGeometry = {
  left: Point[];
  right: Point[];
  polygon: Point[];
  leftEdges: { a: Point; b: Point }[];
  rightEdges: { a: Point; b: Point }[];
};

type MeasurementLayout = {
  lineStart: Point;
  lineEnd: Point;
  labelPoint: Point;
  rotation: number;
};

type MenuDragState = {
  pointerId: number;
  startClient: Point;
  startPosition: Point;
};

type GroupDragState = {
  pointerId: number;
  startPoint: Point;
  startWalls: Wall[];
  selectedIds: Set<string>;
  didMove: boolean;
};

type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type GroupContextMenuState = {
  position: Point;
};

type MeasurementSide = "left" | "right" | "length";

type ThickWallCreationMode = "exterior" | "interior";

type MeasurementEditState = {
  wallId: string;
  segmentStart: Point;
  segmentEnd: Point;
  side: MeasurementSide;
  currentEdgeLength: number;
  position: Point;
  rotation: number;
  value: string;
};

type MeasurementClickPayload = {
  segmentStart: Point;
  segmentEnd: Point;
  side: MeasurementSide;
  currentEdgeLength: number;
  labelPoint: Point;
  rotation: number;
};

const sidebarItems: SidebarItem[] = [
  { id: "walls", label: "Walls", icon: BrickWall },
  { id: "structures", label: "Structures", icon: DoorOpen },
  { id: "products", label: "Products", icon: Sofa },
  { id: "cabinets", label: "Cabinets", icon: Boxes },
  { id: "objects", label: "Objects", icon: Square },
  { id: "text", label: "Text", icon: Type },
  { id: "lines", label: "Lines", icon: PencilLine },
];

const MIN_ZOOM = 0.18;
const MAX_ZOOM = 3;
const ZOOM_INTENSITY = 0.0045;
const ZOOM_BUTTON_STEP = 1.18;
const MOVE_STEP = 48;

const WORKSPACE_WIDTH = 2400;
const WORKSPACE_HEIGHT = 1600;
const GRID_SIZE = 28;
const SNAP_THRESHOLD = 9;
const WALL_ATTACH_THRESHOLD = 22;
const WALL_STROKE_WIDTH = 16;
const WALL_THICKNESS = WALL_STROKE_WIDTH;
const THIN_WALL_STROKE_WIDTH = 2;
const DEFAULT_WINDOW_WIDTH = (39.25 / 12) * GRID_SIZE;
const DEFAULT_DOOR_WIDTH = (36 / 12) * GRID_SIZE;
const DEFAULT_CABINET_WIDTH = (36 / 12) * GRID_SIZE;
const DEFAULT_CABINET_DEPTH = (24 / 12) * GRID_SIZE;
const DEFAULT_ELEVATION_WALL_HEIGHT_INCHES = 96;

const CABINET_CATALOG: CabinetCatalogItem[] = [
  {
    id: "base-cabinet",
    category: "base",
    title: "Base Cabinet",
    subtitle: '36" W x 24" D',
    widthInches: 36,
    depthInches: 24,
    image: "base",
  },
  {
    id: "tall-cabinet",
    category: "tall",
    title: "Tall Cabinet",
    subtitle: '24" W x 24" D',
    widthInches: 24,
    depthInches: 24,
    image: "tall",
  },
  {
    id: "wall-cabinet",
    category: "wall",
    title: "Wall Cabinet",
    subtitle: '24" W x 12" D',
    widthInches: 24,
    depthInches: 12,
    image: "wall",
  },
];
const ELEVATION_VIEWBOX_WIDTH = 1200;
const ELEVATION_VIEWBOX_HEIGHT = 860;

const JOINT_DOT_RADIUS = 5;
const JOINT_TICK_LENGTH = 16;

export default function CabinetEditor() {
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [planViewMode, setPlanViewMode] = useState<PlanViewMode>("floor");
  const [canConvertSelectedThinWalls, setCanConvertSelectedThinWalls] = useState(false);

  const selectedCabinetCatalogItem = useMemo(
    () => CABINET_CATALOG.find((item) => item.id === selectedCabinetCatalogId) ?? CABINET_CATALOG[0],
    [selectedCabinetCatalogId]
  );
  const selectedCabinetWidth = (selectedCabinetCatalogItem.widthInches / 12) * GRID_SIZE;
  const selectedCabinetDepth = (selectedCabinetCatalogItem.depthInches / 12) * GRID_SIZE;

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

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-white text-pelican-navy">
      <TopBar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section className="flex min-w-0 flex-1 flex-col">
          <ModeBar
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={resetCanvasView}
            isSelectionMode={isSelectionMode}
            planViewMode={planViewMode}
            onSelectPlanView={setPlanViewMode}
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
          />
        </section>

        <section className="flex h-full shrink-0 border-l border-slate-200 bg-white">
          <ContextPanel
            activePanel={activePanel}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            setIsSelectionMode={setIsSelectionMode}
            selectedWindow={selectedWindowDetail}
            selectedDoor={selectedDoorDetail}
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
            }}
          />
        </section>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="relative flex h-[55px] w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
      <div className="flex items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pelican-teal text-2xl font-bold italic text-white shadow-sm">
          df
        </div>
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
        <TopAction icon={Download} label="Export" />
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
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ModeBar({
  onZoomIn,
  onZoomOut,
  onResetView,
  isSelectionMode,
  planViewMode,
  onSelectPlanView,
  canConvertSelectedThinWalls,
  onCreateWallExterior,
  onCreateWallInterior,
  onToggleSelectionMode,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  isSelectionMode: boolean;
  planViewMode: PlanViewMode;
  onSelectPlanView: (mode: PlanViewMode) => void;
  canConvertSelectedThinWalls: boolean;
  onCreateWallExterior: () => void;
  onCreateWallInterior: () => void;
  onToggleSelectionMode: () => void;
}) {
  return (
    <div className="grid h-[62px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-2 justify-self-start">
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

      <div className="flex items-center rounded-full bg-slate-100 p-1 justify-self-center">
        <button
          type="button"
          onClick={() => onSelectPlanView("floor")}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full px-5 text-[13px] font-semibold transition",
            planViewMode === "floor"
              ? "bg-white text-pelican-navy shadow-sm"
              : "text-slate-500 hover:text-pelican-navy"
          )}
        >
          <Grid3X3 className="h-4 w-4" />
          Floor plan
        </button>

        <button
          type="button"
          onClick={() => onSelectPlanView("elevation")}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full px-5 text-[13px] font-semibold transition",
            planViewMode === "elevation"
              ? "bg-white text-pelican-navy shadow-sm"
              : "text-slate-500 hover:text-pelican-navy"
          )}
        >
          <Square className="h-4 w-4" />
          Elevation plan
        </button>

        <button className="inline-flex h-9 items-center gap-2 rounded-full px-5 text-[13px] font-semibold text-slate-500 hover:text-pelican-navy">
          <Square className="h-4 w-4" />
          Top-down
        </button>

        <button className="inline-flex h-9 items-center gap-2 rounded-full px-5 text-[13px] font-semibold text-slate-500 hover:text-pelican-navy">
          <Grid3X3 className="h-4 w-4" />
          Perspective
        </button>
      </div>

      <div className="justify-self-end">
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
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef<Point>(offset);
  const scaleRef = useRef(scale);
  const activeToolRef = useRef<Tool>(activeTool);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragOffsetStartRef = useRef<Point>({ x: 0, y: 0 });
  const menuDragRef = useRef<MenuDragState | null>(null);
  const groupDragRef = useRef<GroupDragState | null>(null);

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
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
  const [menuPosition, setMenuPosition] = useState<Point | null>(null);
  const [editingMeasurement, setEditingMeasurement] =
    useState<MeasurementEditState | null>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [groupSelectedWallIds, setGroupSelectedWallIds] = useState<string[]>([]);
  const [groupContextMenu, setGroupContextMenu] =
    useState<GroupContextMenuState | null>(null);
  const [activeElevationIndex, setActiveElevationIndex] = useState(0);

  const thickWalls = useMemo(() => walls.filter(isThickWall), [walls]);
  const thinWalls = useMemo(() => walls.filter(isThinWall), [walls]);

  const wallPoints = useMemo(() => {
    return walls.flatMap((wall) => [wall.start, wall.end]);
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

  const groupSelectedThinWalls = useMemo(() => {
    return groupSelectedWalls.filter(isThinWall);
  }, [groupSelectedWalls]);

  const canConvertGroupThinWalls = useMemo(() => {
    return canConvertThinWallSelection(groupSelectedWalls, thinWalls);
  }, [groupSelectedWalls, thinWalls]);

  const connectionMap = useMemo(() => buildConnectionMap(thickWalls), [thickWalls]);
  const thinConnectionMap = useMemo(() => buildConnectionMap(thinWalls), [thinWalls]);
  const wallChains = useMemo(() => buildWallChains(thickWalls), [thickWalls]);
  const thinWallChains = useMemo(() => buildWallChains(thinWalls), [thinWalls]);
  const elevationWalls = useMemo(() => thickWalls, [thickWalls]);

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
    cabinetPreviewRef.current = preview;
    setCabinetPreview(preview);
  }, []);

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
    const detail = selectedWindow
      ? {
          id: selectedWindow.id,
          widthInches: pixelsToInches(selectedWindow.width),
          heightInches: selectedWindow.heightInches,
          distanceFromFloorInches: selectedWindow.distanceFromFloorInches,
        }
      : null;

    window.dispatchEvent(
      new CustomEvent("pelican-window-selection-change", { detail })
    );
  }, [selectedWindow]);

  useEffect(() => {
    const detail = selectedDoor
      ? {
          id: selectedDoor.id,
          widthInches: pixelsToInches(selectedDoor.width),
          heightInches: selectedDoor.heightInches,
          distanceFromFloorInches: selectedDoor.distanceFromFloorInches,
        }
      : null;

    window.dispatchEvent(
      new CustomEvent("pelican-door-selection-change", { detail })
    );
  }, [selectedDoor]);

  useEffect(() => {
    const handleWindowAttributeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        field: "widthInches" | "heightInches" | "distanceFromFloorInches";
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
    const handleDoorAttributeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        field: "widthInches" | "heightInches" | "distanceFromFloorInches";
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
    if (isDrawingTool(activeTool) && isSelectionMode) {
      setIsSelectionMode(false);
      setGroupSelectedWallIds([]);
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
      setMenuPosition(null);
      setGroupSelectedWallIds([]);
      setGroupContextMenu(null);
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelectingArea(false);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      groupSelectedWallIds.length > 0
    ) {
      event.preventDefault();
      const selectedIds = new Set(groupSelectedWallIds);
      commitWallsChange((currentWalls) =>
        currentWalls.filter((wall) => !selectedIds.has(wall.id))
      );

      setSelectedWallId(null);
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setMenuPosition(null);
      setGroupSelectedWallIds([]);
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
}, [commitWallsChange, commitWindowsChange, commitDoorsChange, commitCabinetsChange, editingMeasurement, groupSelectedWallIds, isSelectionMode, redoWallChange, selectedWallId, setActiveTool, setIsSelectionMode, undoWallChange, updateCabinetPreview]);

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

  const getGuideInfo = (rawPoint: Point, startPoint: Point): GuideInfo => {
    let point = { ...rawPoint };
    let verticalX: number | undefined;
    let horizontalY: number | undefined;

    const alignmentPoints =
      activeToolRef.current === "draw-thin-wall"
        ? thinWalls.flatMap((wall) => [wall.start, wall.end])
        : activeToolRef.current === "draw-wall"
          ? thickWalls.flatMap((wall) => [wall.start, wall.end])
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
      activeTool === "draw-thin-wall" ? thinWalls : thickWalls;

    return getWallAttachPoint(previewPoint, attachableWalls);
  }, [activeTool, drawingStart, previewPoint, thickWalls, thinWalls]);

  const rawPreviewPoint = wallHoverPoint ?? previewPoint;

  const currentGuide =
    drawingStart && rawPreviewPoint
      ? getGuideInfo(rawPreviewPoint, drawingStart)
      : null;

  const currentPreviewPoint = currentGuide?.point ?? rawPreviewPoint;

  const isCreatingWallPreview = Boolean(
    isDrawingTool(activeTool) &&
      drawingStart &&
      currentPreviewPoint &&
      distance(drawingStart, currentPreviewPoint) > 4
  );

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
    const selectedIds = wallsRef.current
      .filter((wall) => wallIntersectsSelectionRect(wall, rect))
      .map((wall) => wall.id);

    setGroupSelectedWallIds(selectedIds);
    setGroupContextMenu(null);
    setSelectedWallId(null);
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
            selectedCabinetCategory
          )
        : null;

      if (!preview || !preview.isValid) {
        updateCabinetPreview(null);
        return;
      }

      updateCabinetPreview(preview);
      if (commitPreviewCabinetPlacement()) return;
      return;
    }

    if (activeToolRef.current === "place-door") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getDoorPlacementOnWall(rawPoint, thickWalls, DEFAULT_DOOR_WIDTH)
        : null;

      if (placement) {
        updateDoorPreview(placement);
      }

      if (commitPreviewStructurePlacement("door")) return;
      return;
    }

    if (activeToolRef.current === "place-window") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getWindowPlacementOnWall(rawPoint, thickWalls, DEFAULT_WINDOW_WIDTH)
        : null;

      if (placement) {
        updateWindowPreview(placement);
      }

      if (commitPreviewStructurePlacement("window")) return;
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
        kind: drawingTool === "draw-thin-wall" ? "thin-wall" : "wall",
      };

      commitWallsChange((currentWalls) =>
        splitConnectedWallsAndAddWall(currentWalls, newWall)
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

      const preview = getCabinetPlacementPreview(
        rawPoint,
        thickWalls,
        currentCabinet.width,
        currentCabinet.depth,
        currentCabinet.rotation,
        cabinetsRef.current,
        currentCabinet.id,
        currentCabinet.category
      );

      if (!preview.isValid) return;

      event.preventDefault();
      cabinetDragState.didMove = true;

      const nextCabinets = cabinetsRef.current.map((cabinetItem) =>
        cabinetItem.id === cabinetDragState.id
          ? { ...cabinetItem, center: preview.center }
          : cabinetItem
      );

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
        ? getDoorPlacementOnWall(rawPoint, thickWalls, currentDoor.width)
        : null;

      if (placement && currentDoor) {
        event.preventDefault();

        doorDragState.didMove = true;

        const nextDoors = doorsRef.current.map((doorItem) =>
          doorItem.id === doorDragState.id
            ? {
                ...doorItem,
                wallId: placement.wall.id,
                t: placement.t,
              }
            : doorItem
        );

        doorsRef.current = nextDoors;
        setDoors(nextDoors);
        setMenuPosition(getDoorMenuPosition(currentDoor, placement.wall, placement.t));
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
        ? getWindowPlacementOnWall(rawPoint, thickWalls, currentWindow.width)
        : null;

      if (placement && currentWindow) {
        event.preventDefault();

        windowDragState.didMove = true;

        const nextWindows = windowsRef.current.map((windowItem) =>
          windowItem.id === windowDragState.id
            ? {
                ...windowItem,
                wallId: placement.wall.id,
                t: placement.t,
              }
            : windowItem
        );

        windowsRef.current = nextWindows;
        setWindows(nextWindows);
        setMenuPosition(getWindowMenuPosition(currentWindow, placement.wall, placement.t));
      }

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
            selectedCabinetCategory
          )
        : null;

      updateCabinetPreview(preview && preview.isValid ? preview : null);
      return;
    }

    if (activeToolRef.current === "place-door") {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getDoorPlacementOnWall(rawPoint, thickWalls, DEFAULT_DOOR_WIDTH)
        : null;

      updateDoorPreview(placement);
      return;
    }

    if (activeToolRef.current === "place-window") {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getWindowPlacementOnWall(rawPoint, thickWalls, DEFAULT_WINDOW_WIDTH)
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

    if (!placement || !placement.isValid) return false;

    const newCabinet: CabinetElement = {
      id: crypto.randomUUID(),
      center: placement.center,
      width: placement.width,
      depth: placement.depth,
      rotation: placement.rotation,
      category: selectedCabinetCategory,
      heightInches: selectedCabinetCategory === "tall" ? 84 : selectedCabinetCategory === "wall" ? 30 : 36,
      distanceFromFloorInches: selectedCabinetCategory === "wall" ? 54 : 0,
    };

    commitCabinetsChange((currentCabinets) => [...currentCabinets, newCabinet]);
    setSelectedCabinetId(newCabinet.id);
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
  }, [commitCabinetsChange, selectedCabinetCategory, setActiveTool, updateCabinetPreview, updateDoorPreview, updateWindowPreview]);

  const commitPreviewStructurePlacement = useCallback(
    (kind: "door" | "window") => {
      if (kind === "door") {
        const placement = doorPreviewRef.current;
        if (!placement) return false;

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

      const newWindow: WindowElement = {
        id: crypto.randomUUID(),
        wallId: placement.wall.id,
        t: placement.t,
        width: DEFAULT_WINDOW_WIDTH,
        heightInches: 36,
        distanceFromFloorInches: 24,
        tabSide: 1,
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
      updateDoorPreview,
      updateWindowPreview,
    ]
  );

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeToolRef.current === "place-cabinet" && commitPreviewCabinetPlacement()) {
      return;
    }

    if (activeToolRef.current === "place-door" && commitPreviewStructurePlacement("door")) {
      return;
    }

    if (activeToolRef.current === "place-window" && commitPreviewStructurePlacement("window")) {
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
      cabinetDragRef.current = null;
      setIsCabinetDragging(false);
      updateCabinetPreview(null);
      if (finishedCabinet) setMenuPosition(getCabinetMenuPosition(finishedCabinet));

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

  // rotateSelectedCabinetBy
  const rotateSelectedCabinetBy = (deltaDegrees: number) => {
    if (!selectedCabinetId) return;

    commitCabinetsChange((currentCabinets) =>
      currentCabinets.map((cabinetItem) =>
        cabinetItem.id === selectedCabinetId
          ? { ...cabinetItem, rotation: normalizeDegrees(cabinetItem.rotation + deltaDegrees) }
          : cabinetItem
      )
    );
  };

  const selectedWindowWall = selectedWindow
    ? thickWalls.find((wall) => wall.id === selectedWindow.wallId) ?? null
    : null;

  const selectedDoorWall = selectedDoor
    ? thickWalls.find((wall) => wall.id === selectedDoor.wallId) ?? null
    : null;

  const activeStructureWallId =
    windowPreview?.wall.id ??
    selectedWindow?.wallId ??
    doorPreview?.wall.id ??
    selectedDoor?.wallId ??
    null;

  const currentMenuPosition =
    selectedWall && menuPosition
      ? menuPosition
      : selectedWall
        ? getWallMenuPosition(selectedWall)
        : selectedWindow && selectedWindowWall && menuPosition
          ? menuPosition
          : selectedWindow && selectedWindowWall
            ? getWindowMenuPosition(selectedWindow, selectedWindowWall)
            : selectedDoor && selectedDoorWall && menuPosition
              ? menuPosition
              : selectedDoor && selectedDoorWall
                ? getDoorMenuPosition(selectedDoor, selectedDoorWall)
                : selectedCabinet
                  ? getCabinetMenuPosition(selectedCabinet)
                  : null;

  if (planViewMode === "elevation") {
    return (
      <ElevationPlanView
        walls={elevationWalls}
        windows={windows}
        doors={doors}
        cabinets={cabinets}
        activeIndex={activeElevationIndex}
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
    );
  }

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-[#f5f5f5] touch-none select-none",
        isSelectionMode && groupSelectedWallIds.length > 0
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
              sourceWalls={thickWalls}
              connectionMap={connectionMap}
              //hideInteriorDetails={isCreatingWallPreview}
              onMeasurementClick={startMeasurementEdit}
              editingMeasurement={editingMeasurement}
              renderMeasurements={false}
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
              sourceWalls={thickWalls}
              connectionMap={connectionMap}
              //hideInteriorDetails={isCreatingWallPreview}
              onMeasurementClick={startMeasurementEdit}
              editingMeasurement={editingMeasurement}
              renderWallBody={false}
              getMeasurementLabelOffset={(segmentStart, segmentEnd, side) => {
                if (!activeStructureWallId) return 18;

                const activeStructureWall = thickWalls.find(
                  (wall) => wall.id === activeStructureWallId
                );

                if (!activeStructureWall) return 18;

                return segmentMatchesWall(segmentStart, segmentEnd, activeStructureWall.id, thickWalls) &&
                  measurementSideMatchesStructureGuide(
                    segmentStart,
                    segmentEnd,
                    side,
                    activeStructureWall
                  )
                  ? 46
                  : 18;
              }}
            />
          ))}

          {groupSelectedWalls.map((wall) => (
            <SelectedWallOverlay key={`group-selected-${wall.id}`} wall={wall} />
          ))}

          {selectedWall && <SelectedWallOverlay wall={selectedWall} />}

          {getOpenEndpoints(thickWalls, connectionMap).map((point) => (
            <OpenEndpoint key={`open-${pointKey(point)}`} point={point} />
          ))}

          <MeasurementGuideAnchorDebugDots
            walls={thickWalls}
            chains={wallChains}
          />

          {getOpenEndpoints(thinWalls, thinConnectionMap).map((point) => (
            <ThinOpenEndpoint key={`thin-open-${pointKey(point)}`} point={point} />
          ))}
          {getConnectedEndpoints(thinWalls, thinConnectionMap).map((point) => (
            <ThinJointDot key={`thin-joint-${pointKey(point)}`} point={point} />
          ))}


          {drawingStart && activeTool === "draw-wall" && (
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

          {!isSelectionMode && (
            <WallSelectionHitAreas
              walls={walls}
              activeTool={activeTool}
              onSelectWall={selectWall}
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
                  setGroupContextMenu(null);
                  setMenuPosition(getDoorMenuPosition(doorItem, wall));
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
                  setGroupContextMenu(null);
                  setMenuPosition(getDoorMenuPosition(doorItem, wall));
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
                  setGroupContextMenu(null);
                  setMenuPosition(getWindowMenuPosition(windowItem, wall));
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
                  setGroupContextMenu(null);
                  setMenuPosition(getWindowMenuPosition(windowItem, wall));
                  updateWindowPreview(null);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            );
          })}

          {cabinets.map((cabinetItem) => (
            <CabinetOnFloor
              key={cabinetItem.id}
              cabinetItem={cabinetItem}
              walls={thickWalls}
              selected={cabinetItem.id === selectedCabinetId}
              disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-cabinet"}
              onSelect={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setSelectedCabinetId(cabinetItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupContextMenu(null);
                setMenuPosition(getCabinetMenuPosition(cabinetItem));
                updateWindowPreview(null);
                updateDoorPreview(null);
                updateCabinetPreview(null);
              }}
              onDragStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                cabinetDragRef.current = {
                  id: cabinetItem.id,
                  pointerId: event.pointerId,
                  startCabinets: cabinetsRef.current,
                  didMove: false,
                };

                setSelectedCabinetId(cabinetItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
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
                setGroupContextMenu(null);
                setMenuPosition(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
            />
          ))}

          {cabinetPreview && activeTool === "place-cabinet" && (
            <CabinetPreview preview={cabinetPreview} walls={thickWalls} />
          )}

          {windowPreview && activeTool === "place-window" && (
            <WindowPreview
              preview={windowPreview}
              width={DEFAULT_WINDOW_WIDTH}
              walls={thickWalls}
              showWidth
            />
          )}

          {doorPreview && activeTool === "place-door" && (
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
              onRotateLeft={() => rotateSelectedCabinetBy(-15)}
              onRotateRight={() => rotateSelectedCabinetBy(15)}
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
};

type ElevationOpeningLayout = {
  startInches: number;
  centerInches: number;
  widthInches: number;
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

function getElevationOpeningLayout(
  wallLengthInches: number,
  openingWidthPixels: number,
  t: number
): ElevationOpeningLayout {
  return getElevationOpeningLayoutFromCenter(
    wallLengthInches,
    openingWidthPixels,
    t * wallLengthInches
  );
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

// ElevationCabinetOnWall
function ElevationCabinetOnWall({
  x,
  y,
  width,
  height,
  category,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  category: CabinetCategory;
}) {
  const innerInset = Math.min(8, Math.max(3, width * 0.08));
  const topRailY = y + Math.min(10, Math.max(5, height * 0.08));
  const hasDoubleDoor = width > 28;
  const stroke = "#475569";
  const fill = category === "wall" ? "#ffffff" : "#f8fafc";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.62}
        stroke={stroke}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={x + innerInset}
        y1={topRailY}
        x2={x + width - innerInset}
        y2={topRailY}
        stroke="#cbd5e1"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {hasDoubleDoor && (
        <line
          x1={x + width / 2}
          y1={y}
          x2={x + width / 2}
          y2={y + height}
          stroke={stroke}
          strokeOpacity="0.6"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {category === "wall" && height > 34 && (
        <line
          x1={x}
          y1={y + height / 2}
          x2={x + width}
          y2={y + height / 2}
          stroke={stroke}
          strokeOpacity="0.6"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}

// getCabinetElevationPlacementsForWall
function getCabinetElevationPlacementsForWall(
  wall: Wall,
  cabinets: CabinetElement[]
): CabinetElevationPlacement[] {
  const axis = getElevationWallAxis(wall);
  const wallLength = axis.length;
  if (wallLength < 0.001) return [];

  const wallFaceOffset = WALL_THICKNESS / 2;
  const touchThreshold = Math.max(6, GRID_SIZE * 0.22);
  const parallelTolerance = 0.08;
  const floorAdjacencyThreshold = GRID_SIZE * 0.75;
  const wallBoundarySnapThreshold = Math.max(6, GRID_SIZE * 0.35);
  const wallLengthInches = pixelsToInches(wallLength);

  const placements = cabinets
    .map((cabinetItem) => {
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

      let bestPlacement:
        | {
            startProjection: number;
            endProjection: number;
            wallFaceDistance: number;
            overlap: number;
          }
        | null = null;

      for (const edge of widthEdges) {
        const edgeLength = distance(edge.start, edge.end);
        if (edgeLength < 0.001) continue;

        const edgeDirection = normalize(sub(edge.end, edge.start));
        const parallelAmount = Math.abs(cross(edgeDirection, axis.direction));
        if (parallelAmount > parallelTolerance) continue;

        const sideDistanceStart = dot(sub(edge.start, axis.start), axis.normal);
        const sideDistanceEnd = dot(sub(edge.end, axis.start), axis.normal);
        if (Math.abs(sideDistanceStart - sideDistanceEnd) > touchThreshold) continue;

        const sideDistance = (sideDistanceStart + sideDistanceEnd) / 2;
        const wallFaceDistance = Math.min(
          Math.abs(sideDistance - wallFaceOffset),
          Math.abs(sideDistance + wallFaceOffset)
        );
        if (wallFaceDistance > touchThreshold) continue;

        const projectionA = dot(sub(edge.start, axis.start), axis.direction);
        const projectionB = dot(sub(edge.end, axis.start), axis.direction);
        const rawStartProjection = Math.min(projectionA, projectionB);
        const rawEndProjection = Math.max(projectionA, projectionB);
        const attachedStartProjection = clamp(rawStartProjection, 0, wallLength);
        const attachedEndProjection = clamp(rawEndProjection, 0, wallLength);
        const attachedOverlap = attachedEndProjection - attachedStartProjection;

        if (attachedOverlap <= Math.max(1, edgeLength * 0.2)) continue;

        // Use the actual wall-facing edge endpoints as the source of truth.
        // The previous code used the cabinet center +/- width / 2, which can
        // drift from the floor-plan footprint after wall/cabinet snap passes.
        // That drift is what made touching cabinets appear separated in
        // elevation view.
        const displayWidthPixels = Math.min(rawEndProjection - rawStartProjection, wallLength);
        if (displayWidthPixels <= 0.5) continue;

        let startProjection = rawStartProjection;
        let endProjection = rawEndProjection;

        if (displayWidthPixels >= wallLength) {
          startProjection = 0;
          endProjection = wallLength;
        } else {
          if (startProjection < 0) {
            endProjection -= startProjection;
            startProjection = 0;
          }

          if (endProjection > wallLength) {
            startProjection -= endProjection - wallLength;
            endProjection = wallLength;
          }

          startProjection = clamp(startProjection, 0, wallLength - displayWidthPixels);
          endProjection = startProjection + displayWidthPixels;
        }

        const edgeSnapThreshold = WALL_THICKNESS / 2 + touchThreshold;
        if (startProjection <= edgeSnapThreshold) {
          startProjection = 0;
          endProjection = Math.min(displayWidthPixels, wallLength);
        } else if (wallLength - endProjection <= edgeSnapThreshold) {
          endProjection = wallLength;
          startProjection = Math.max(0, wallLength - displayWidthPixels);
        }

        const overlap = endProjection - startProjection;
        if (overlap <= 0.5) continue;

        if (
          !bestPlacement ||
          wallFaceDistance < bestPlacement.wallFaceDistance - 0.001 ||
          (Math.abs(wallFaceDistance - bestPlacement.wallFaceDistance) < 0.001 && attachedOverlap > bestPlacement.overlap)
        ) {
          bestPlacement = {
            startProjection,
            endProjection,
            wallFaceDistance,
            overlap: attachedOverlap,
          };
        }
      }

      if (!bestPlacement) return null;

      const widthPixels = bestPlacement.endProjection - bestPlacement.startProjection;
      if (widthPixels <= 0.5) return null;

      const category = getCabinetElevationCategory(cabinetItem);
      const spec = getCabinetElevationSpec(cabinetItem, category);

      return {
        cabinet: cabinetItem,
        category,
        startInches: pixelsToInches(bestPlacement.startProjection),
        widthInches: pixelsToInches(widthPixels),
        heightInches: spec.heightInches,
        distanceFromFloorInches: spec.distanceFromFloorInches,
      };
    })
    .filter((placement): placement is CabinetElevationPlacement => Boolean(placement));

  const normalizedPlacements = normalizeCabinetElevationPlacementsFromFloorPlan(
    placements,
    axis,
    wallLengthInches,
    floorAdjacencyThreshold,
    wallBoundarySnapThreshold
  );

  return normalizedPlacements.sort((left, right) => {
    if (left.distanceFromFloorInches !== right.distanceFromFloorInches) {
      return left.distanceFromFloorInches - right.distanceFromFloorInches;
    }

    return left.startInches - right.startInches;
  });
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
  const normalOverlap =
    Math.min(firstNormalRange.max, secondNormalRange.max) -
    Math.max(firstNormalRange.min, secondNormalRange.min);

  if (normalOverlap <= 1) return null;

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

// getCabinetElevationCategory
function getCabinetElevationCategory(cabinetItem: CabinetElement): CabinetCategory {
  if (cabinetItem.category) return cabinetItem.category;

  const widthInches = pixelsToInches(cabinetItem.width);
  const depthInches = pixelsToInches(cabinetItem.depth);

  if (depthInches <= 15) return "wall";
  if (widthInches <= 27 && depthInches >= 20) return "tall";
  return "base";
}

// getCabinetElevationSpec
function getCabinetElevationSpec(cabinetItem: CabinetElement, category: CabinetCategory) {
  if (cabinetItem.heightInches !== undefined || cabinetItem.distanceFromFloorInches !== undefined) {
    return {
      heightInches: cabinetItem.heightInches ?? (category === "tall" ? 84 : category === "wall" ? 30 : 36),
      distanceFromFloorInches: cabinetItem.distanceFromFloorInches ?? (category === "wall" ? 54 : 0),
    };
  }

  if (category === "tall") {
    return {
      heightInches: 84,
      distanceFromFloorInches: 0,
    };
  }

  if (category === "wall") {
    return {
      heightInches: 30,
      distanceFromFloorInches: 54,
    };
  }

  return {
    heightInches: 36,
    distanceFromFloorInches: 0,
  };
}


function assignLinearDimensionLanes<T>(
  items: T[],
  getStart: (item: T) => number,
  getEnd: (item: T) => number,
  minGap = 18
) {
  const indexed = items
    .map((item, index) => ({
      item,
      index,
      start: Math.min(getStart(item), getEnd(item)),
      end: Math.max(getStart(item), getEnd(item)),
    }))
    .sort((left, right) => {
      if (left.start !== right.start) return left.start - right.start;
      return left.end - right.end;
    });

  const laneAssignments = new Array(items.length).fill(0);
  const laneEndPositions: number[] = [];

  indexed.forEach((entry) => {
    let laneIndex = 0;
    while (
      laneIndex < laneEndPositions.length &&
      entry.start < laneEndPositions[laneIndex] + minGap
    ) {
      laneIndex += 1;
    }

    laneAssignments[entry.index] = laneIndex;
    laneEndPositions[laneIndex] = entry.end;
  });

  return laneAssignments;
}

function assignOrganizedHorizontalDimensionLanes<T>(
  items: T[],
  getBand: (item: T) => number,
  getStart: (item: T) => number,
  getEnd: (item: T) => number,
  minGap = 18,
  bandBucketSize = 6
) {
  const indexed = items.map((item, index) => {
    const start = Math.min(getStart(item), getEnd(item));
    const end = Math.max(getStart(item), getEnd(item));
    const band = getBand(item);

    return {
      item,
      index,
      start,
      end,
      bandBucket:
        Math.round(band / Math.max(bandBucketSize, 1)) * Math.max(bandBucketSize, 1),
    };
  });

  const groups = new Map<number, typeof indexed>();
  indexed.forEach((entry) => {
    const group = groups.get(entry.bandBucket) ?? [];
    group.push(entry);
    groups.set(entry.bandBucket, group);
  });

  const orderedBuckets = [...groups.keys()].sort((left, right) => left - right);
  const laneAssignments = new Array(items.length).fill(0);
  let laneOffset = 0;

  orderedBuckets.forEach((bucket) => {
    const group = (groups.get(bucket) ?? []).sort((left, right) => {
      if (left.start !== right.start) return left.start - right.start;
      return left.end - right.end;
    });

    const laneEndPositions: number[] = [];

    group.forEach((entry) => {
      let laneIndex = 0;
      while (
        laneIndex < laneEndPositions.length &&
        entry.start < laneEndPositions[laneIndex] + minGap
      ) {
        laneIndex += 1;
      }

      laneAssignments[entry.index] = laneOffset + laneIndex;
      laneEndPositions[laneIndex] = entry.end;
    });

    laneOffset += Math.max(1, laneEndPositions.length);
  });

  return laneAssignments;
}

function ElevationPlanView({
  walls,
  windows,
  doors,
  cabinets,
  activeIndex,
  onPrevious,
  onNext,
}: {
  walls: Wall[];
  windows: WindowElement[];
  doors: DoorElement[];
  cabinets: CabinetElement[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
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

  const wall = walls[activeIndex] ?? walls[0];
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
  const wallCabinets = getCabinetElevationPlacementsForWall(wall, cabinets);

  const elevationWallAxis = getElevationWallAxis(wall);
  const wallLengthInches = pixelsToInches(elevationWallAxis.length);
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
  const wallTop = 190;
  const wallBottom = wallTop + wallRenderHeight;
  const overallLengthLabel = formatMeasurementFromInches(wallLengthInches);
  const overallHeightLabel = formatMeasurementFromInches(wallHeightInches);

  const cabinetRenderItems = wallCabinets.map((cabinetPlacement) => {
    const left = wallLeft + cabinetPlacement.startInches * renderScale;
    const width = cabinetPlacement.widthInches * renderScale;
    const height = cabinetPlacement.heightInches * renderScale;
    const bottom = wallBottom - cabinetPlacement.distanceFromFloorInches * renderScale;
    const top = bottom - height;

    return {
      key: cabinetPlacement.cabinet.id,
      type: 'cabinet' as const,
      placement: cabinetPlacement,
      left,
      right: left + width,
      width,
      top,
      bottom,
      height,
    };
  });

  const cabinetBodyItems = [...cabinetRenderItems].sort((left, right) => {
    if (left.placement.distanceFromFloorInches !== right.placement.distanceFromFloorInches) {
      return left.placement.distanceFromFloorInches - right.placement.distanceFromFloorInches;
    }

    return left.placement.startInches - right.placement.startInches;
  });

  const windowRenderItems = wallWindows.map((windowItem) => {
    const layout = getElevationOpeningLayoutFromCenter(
      wallLengthInches,
      windowItem.width,
      getElevationWallElementCenterInches(wall, windowItem.t)
    );
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
    const layout = getElevationOpeningLayoutFromCenter(
      wallLengthInches,
      doorItem.width,
      getElevationWallElementCenterInches(wall, doorItem.t)
    );
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
      left: item.left,
      right: item.right,
      anchorY: item.placement.category === "base" ? item.bottom : item.top,
      label: formatMeasurementFromInches(item.placement.widthInches),
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
      label: formatMeasurementFromInches(item.layout.widthInches),
    });
  });

  doorRenderItems.forEach((item) => {
    addHorizontalDimension(bottomHorizontalDimensionMap, {
      key: `door-width-${item.key}`,
      left: item.left,
      right: item.right,
      anchorY: item.bottom,
      label: formatMeasurementFromInches(item.layout.widthInches),
    });
  });

  const topHorizontalDimensionItems = [...topHorizontalDimensionMap.values()].sort((left, right) => {
    if (left.left !== right.left) return left.left - right.left;
    return left.right - right.right;
  });
  const bottomHorizontalDimensionItems = [...bottomHorizontalDimensionMap.values()].sort((left, right) => {
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
        label: formatMeasurementFromInches(item.placement.distanceFromFloorInches),
      })),
    ...windowRenderItems
      .filter((item) => item.windowItem.distanceFromFloorInches > 0)
      .map((item) => ({
        key: `window-sill-${item.key}`,
        top: item.bottom,
        bottom: wallBottom,
        referenceX: wallLeft,
        label: formatMeasurementFromInches(item.windowItem.distanceFromFloorInches),
      })),
    ...doorRenderItems
      .filter((item) => item.doorItem.distanceFromFloorInches > 0)
      .map((item) => ({
        key: `door-floor-${item.key}`,
        top: item.bottom,
        bottom: wallBottom,
        referenceX: wallLeft,
        label: formatMeasurementFromInches(item.doorItem.distanceFromFloorInches),
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
      label: formatMeasurementFromInches(item.placement.heightInches),
    })),
    ...windowRenderItems.map((item) => ({
      key: `window-height-${item.key}`,
      top: item.top,
      bottom: item.bottom,
      referenceX: wallLeft,
      label: formatMeasurementFromInches(item.windowItem.heightInches),
    })),
    ...doorRenderItems.map((item) => ({
      key: `door-height-${item.key}`,
      top: item.top,
      bottom: item.bottom,
      referenceX: wallLeft,
      label: formatMeasurementFromInches(item.doorItem.heightInches),
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
    ...heightDimensionMap.values(),
    ...clearanceDimensionMap.values(),
  ].sort((left, right) => {
    if (left.top !== right.top) return left.top - right.top;
    if (left.bottom !== right.bottom) return left.bottom - right.bottom;
    return left.label.localeCompare(right.label);
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f5f5f5]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <div className="text-sm font-semibold text-pelican-navy">Elevation plan</div>
          <div className="text-xs text-slate-500">
            Wall {activeIndex + 1} of {walls.length} · {overallLengthLabel} wide
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className="h-full w-full"
            viewBox={`0 0 ${ELEVATION_VIEWBOX_WIDTH} ${ELEVATION_VIEWBOX_HEIGHT}`}
          >
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
              labelXOverride={leftOverallDimensionX - 28}
            />

            {cabinetBodyItems.map((cabinetItem) => (
              <g key={`elevation-cabinet-body-${cabinetItem.key}`}>
                <ElevationCabinetOnWall
                  x={cabinetItem.left}
                  y={cabinetItem.top}
                  width={cabinetItem.width}
                  height={cabinetItem.height}
                  category={cabinetItem.placement.category}
                />
              </g>
            ))}

            {windowRenderItems.map((windowItem) => (
              <g key={windowItem.key}>
                <rect x={windowItem.left} y={windowItem.top} width={windowItem.width} height={windowItem.height} fill="#f1ede4" stroke="#111827" strokeWidth="2" />
                <rect x={windowItem.left + 8} y={windowItem.top + 8} width={Math.max(0, windowItem.width - 16)} height={Math.max(0, windowItem.height - 16)} fill="#fafaf9" stroke="#111827" strokeWidth="1.5" />
                <line x1={windowItem.left + windowItem.width / 2} y1={windowItem.top + 8} x2={windowItem.left + windowItem.width / 2} y2={windowItem.top + windowItem.height - 8} stroke="#111827" strokeWidth="1.5" />
                <line x1={windowItem.left + 8} y1={windowItem.top + windowItem.height / 2} x2={windowItem.left + windowItem.width - 8} y2={windowItem.top + windowItem.height / 2} stroke="#111827" strokeWidth="1.5" />
              </g>
            ))}

            {doorRenderItems.map((doorItem) => (
              <g key={doorItem.key}>
                <rect x={doorItem.left} y={doorItem.top} width={doorItem.width} height={doorItem.height} fill="#d6dee8" stroke="#111827" strokeWidth="2" />
                <rect x={doorItem.left + 10} y={doorItem.top + 10} width={Math.max(0, doorItem.width - 20)} height={Math.max(0, doorItem.height - 20)} fill="#f8fafc" opacity="0.65" />
                <circle cx={doorItem.left + doorItem.width - 14} cy={doorItem.top + doorItem.height / 2} r="4" fill="#6b7280" />
              </g>
            ))}

            {topHorizontalDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key}>
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

            {bottomHorizontalDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key}>
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

            {verticalDetailDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key}>
                <line x1={leftDetailDimensionX} y1={dimensionItem.top} x2={wallLeft} y2={dimensionItem.top} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <line x1={leftDetailDimensionX} y1={dimensionItem.bottom} x2={wallLeft} y2={dimensionItem.bottom} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <ElevationDimensionLine
                  x1={leftDetailDimensionX}
                  y1={dimensionItem.top}
                  x2={leftDetailDimensionX}
                  y2={dimensionItem.bottom}
                  label={dimensionItem.label}
                  rotateText
                  labelXOverride={(leftDetailDimensionX + leftOverallDimensionX) / 2}
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
              Wall elevation {activeIndex + 1}
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
  labelXOverride,
  labelYOverride,
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
  labelXOverride?: number;
  labelYOverride?: number;
}) {
  const isVertical = Math.abs(x1 - x2) < Math.abs(y1 - y2);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const labelX = labelXOverride ?? (rotateText ? midX + textOffset : midX);
  const labelY = labelYOverride ?? (rotateText ? midY : midY + textOffset);
  const approxLabelWidth = Math.max(34, label.length * 12);
  const labelPaddingX = 8;
  const labelPaddingY = 5;
  const labelBoxWidth = approxLabelWidth + labelPaddingX * 2;
  const labelBoxHeight = rotateText ? 34 : 22 + labelPaddingY * 2;

  return (
    <g>
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
          fillOpacity="1"
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
        tabSide={windowItem.tabSide ?? 1}
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
        tabSide={1}
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
  const direction = normalize(sub(wall.end, wall.start));
  const normal = getPreferredNormal(wall.start, wall.end);
  const baseNormal = normalize(perp(direction));
  const guideSide: Exclude<MeasurementSide, "length"> =
    dot(normal, baseNormal) >= 0 ? "left" : "right";
  const measurementWalls = walls?.length ? walls : [wall];
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
        text={formatFeetInches(distance(startAnchor, windowStart))}
        rotate={rotation}
        className="fill-slate-950 text-[12px] font-bold"
      />
      {showWidth && (
        <SvgTextHalo
          x={segmentLabel(bracketWindowStart, bracketWindowEnd).x}
          y={segmentLabel(bracketWindowStart, bracketWindowEnd).y}
          text={formatFeetInches(width)}
          rotate={rotation}
          className="fill-slate-950 text-[12px] font-bold"
        />
      )}
      <SvgTextHalo
        x={segmentLabel(bracketWindowEnd, bracketEnd).x}
        y={segmentLabel(bracketWindowEnd, bracketEnd).y}
        text={formatFeetInches(distance(windowEnd, endAnchor))}
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
  editingMeasurement,
}: {
  wall: Wall;
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
  editingMeasurement?: MeasurementEditState | null;
}) {
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
        label={formatFeetInches(length)}
        onClick={onMeasurementClick ? () => onMeasurementClick(payload) : undefined}
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
  editingMeasurement,
  renderWallBody = true,
  renderMeasurements = true,
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
  getMeasurementLabelOffset?: (
    segmentStart: Point,
    segmentEnd: Point,
    side: "left" | "right",
    index: number
  ) => number;
}) {
  if (points.length < 2) return null;

  const geometry = buildWallBand(points, WALL_THICKNESS);

  return (
    <g>
      {renderWallBody && (
        <g>
          <polygon
            points={geometry.polygon.map(toSvgPoint).join(" ")}
            fill="#c9c9c9"
          />
          <polyline
            points={points.map(toSvgPoint).join(" ")}
            fill="none"
            stroke="#c9c9c9"
            strokeWidth={WALL_THICKNESS}
            strokeLinecap="butt"
            strokeLinejoin="round"
          />
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
        label={formatFeetInches(displayLength)}
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

function SelectedWallOverlay({ wall }: { wall: Wall }) {
  if (isThinWall(wall)) {
    return (
      <g>
        <line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} stroke="#00aee6" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={wall.start.x} cy={wall.start.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        <circle cx={wall.end.x} cy={wall.end.y} r={8} fill="white" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  return (
    <g>
      <line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} stroke="#b7edf4" strokeWidth={WALL_STROKE_WIDTH} strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
      <line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} stroke="#00aee6" strokeWidth={2} strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
      <circle cx={wall.start.x} cy={wall.start.y} r={13} fill="none" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      <circle cx={wall.end.x} cy={wall.end.y} r={13} fill="none" stroke="#00aee6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function MeasurementEditHitAreas({
  chains,
  thinWalls,
  onMeasurementClick,
}: {
  chains: { points: Point[] }[];
  thinWalls: Wall[];
  onMeasurementClick: (payload: MeasurementClickPayload) => void;
}) {
  return (
    <g>
      {chains.map((chain, chainIndex) => {
        if (chain.points.length < 2) return null;
        const geometry = buildWallBand(chain.points, WALL_THICKNESS);
        return (
          <g key={`measure-hit-${chainIndex}`}>
            {geometry.leftEdges.map((edge, index) => {
              const layout = getEdgeMeasurementLayout(edge.a, edge.b, "left");
              const edgeLength = distance(layout.lineStart, layout.lineEnd);
              return (
                <line key={`left-measure-hit-${chainIndex}-${index}`} x1={layout.lineStart.x} y1={layout.lineStart.y} x2={layout.lineEnd.x} y2={layout.lineEnd.y} stroke="transparent" strokeWidth={40} pointerEvents="stroke" vectorEffect="non-scaling-stroke" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onMeasurementClick({ segmentStart: chain.points[index], segmentEnd: chain.points[index + 1], side: "left", currentEdgeLength: edgeLength, labelPoint: layout.labelPoint, rotation: layout.rotation }); }} />
              );
            })}
            {geometry.rightEdges.map((edge, index) => {
              const layout = getEdgeMeasurementLayout(edge.a, edge.b, "right");
              const edgeLength = distance(layout.lineStart, layout.lineEnd);
              return (
                <line key={`right-measure-hit-${chainIndex}-${index}`} x1={layout.lineStart.x} y1={layout.lineStart.y} x2={layout.lineEnd.x} y2={layout.lineEnd.y} stroke="transparent" strokeWidth={40} pointerEvents="stroke" vectorEffect="non-scaling-stroke" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onMeasurementClick({ segmentStart: chain.points[index], segmentEnd: chain.points[index + 1], side: "right", currentEdgeLength: edgeLength, labelPoint: layout.labelPoint, rotation: layout.rotation }); }} />
              );
            })}
          </g>
        );
      })}
      {thinWalls.map((wall) => {
        const layout = getThinWallMeasurementLayout(wall.start, wall.end);
        const edgeLength = distance(wall.start, wall.end);
        return <line key={`thin-measure-hit-${wall.id}`} x1={layout.lineStart.x} y1={layout.lineStart.y} x2={layout.lineEnd.x} y2={layout.lineEnd.y} stroke="transparent" strokeWidth={34} pointerEvents="stroke" vectorEffect="non-scaling-stroke" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onMeasurementClick({ segmentStart: wall.start, segmentEnd: wall.end, side: "length", currentEdgeLength: edgeLength, labelPoint: layout.labelPoint, rotation: layout.rotation }); }} />;
      })}
    </g>
  );
}

function WallSelectionHitAreas({
  walls,
  activeTool,
  onSelectWall,
}: {
  walls: Wall[];
  activeTool: Tool;
  onSelectWall: (id: string) => void;
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
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
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
  const menuWidth = 74;
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


function measurementMatches(
  edit: MeasurementEditState | null | undefined,
  payload: MeasurementClickPayload
) {
  if (!edit) return false;
  if (edit.side !== payload.side) return false;

  const sameDirection =
    samePoint(edit.segmentStart, payload.segmentStart) &&
    samePoint(edit.segmentEnd, payload.segmentEnd);
  const oppositeDirection =
    samePoint(edit.segmentStart, payload.segmentEnd) &&
    samePoint(edit.segmentEnd, payload.segmentStart);

  return sameDirection || oppositeDirection;
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
  const length = distance(start, end);
  const hasLength = length > 4;
  const label = formatFeetInches(length);

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

function ThinWallDrawingOverlay({ start, end, horizontalY, verticalX, showSerialStart }: { start: Point; end: Point; horizontalY?: number; verticalX?: number; showSerialStart: boolean }) {
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
      {hasLength && <MeasurementLabelOnly layout={measure} label={formatFeetInches(length)} />}
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
    field: "widthInches" | "heightInches" | "distanceFromFloorInches",
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
        <WindowPropertyInput
          label="Distance from floor"
          value={roundToQuarter(selectedDoor.distanceFromFloorInches)}
          unit="in"
          onChange={(value) =>
            updateDoorNumber("distanceFromFloorInches", value)
          }
        />

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
    field: "widthInches" | "heightInches" | "distanceFromFloorInches",
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
        <WindowPropertyInput
          label="Distance from floor"
          value={roundToQuarter(selectedWindow.distanceFromFloorInches)}
          unit="in"
          onChange={(value) =>
            updateWindowNumber("distanceFromFloorInches", value)
          }
        />

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

function WindowPropertyInput({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase text-pelican-navy">
        {label}
      </span>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={label === "Width" ? 12 : 0}
          max={label === "Width" ? 120 : 144}
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
  selectedWindow,
  selectedDoor,
  cabinetCategoryTab,
  selectedCabinetCatalogId,
  onSelectCabinetCategory,
  onSelectCabinetCatalog,
}: {
  activePanel: Panel;
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  setIsSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedWindow: WindowSelectionDetail | null;
  selectedDoor: DoorSelectionDetail | null;
  cabinetCategoryTab: CabinetCategory;
  selectedCabinetCatalogId: string;
  onSelectCabinetCategory: (category: CabinetCategory) => void;
  onSelectCabinetCatalog: (catalogId: string) => void;
}) {
  const [structureTab, setStructureTab] = useState<"doors" | "windows">("doors");

  const activateToolFromCard = (tool: Tool) => {
    setIsSelectionMode(false);
    setActiveTool(tool);
  };

  if (activePanel === "cabinets") {
    const visibleCabinets = CABINET_CATALOG.filter((item) => item.category === cabinetCategoryTab);

    return (
      <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
        <div className="sticky top-0 z-10 bg-white px-3 pt-4">
          <button className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pelican-teal px-3 text-[12px] font-bold text-white shadow-sm hover:brightness-95">
            <ImagePlus className="h-4 w-4" />
            Import & Trace Floor Plan Image
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onSelectCabinetCategory("base")}
              className={cn(
                "h-8 rounded-md px-2 text-[13px] font-medium transition",
                cabinetCategoryTab === "base"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Base Cab.
            </button>
            <button
              type="button"
              onClick={() => onSelectCabinetCategory("tall")}
              className={cn(
                "h-8 rounded-md px-2 text-[13px] font-medium transition",
                cabinetCategoryTab === "tall"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Tall Cab.
            </button>
            <button
              type="button"
              onClick={() => onSelectCabinetCategory("wall")}
              className={cn(
                "h-8 rounded-md px-2 text-[13px] font-medium transition",
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
              {cabinetItem.image === "base" ? (
                <SimpleBaseCabinetImage />
              ) : cabinetItem.image === "tall" ? (
                <SimpleTallCabinetImage />
              ) : (
                <SimpleWallCabinetImage />
              )}
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

function SimpleTallCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs>
        <linearGradient id="tallCabinetFaceGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6f3ed" />
          <stop offset="100%" stopColor="#ddd8cf" />
        </linearGradient>
      </defs>
      <polygon points="48,12 81,12 95,19 61,19" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.25" />
      <polygon points="81,12 95,19 95,96 81,90" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.25" />
      <rect x="48" y="19" width="33" height="71" fill="url(#tallCabinetFaceGradient)" stroke="#bfb8ad" strokeWidth="1.25" />
      <line x1="64.5" y1="19" x2="64.5" y2="89" stroke="#c7c1b8" strokeWidth="1.1" />
      <rect x="51" y="90" width="28" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="54" y1="10" x2="87" y2="10" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="63" cy="55" r="1.2" fill="#aaa49b" />
      <circle cx="66" cy="55" r="1.2" fill="#aaa49b" />
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

// CabinetOnFloor
function CabinetOnFloor({
  cabinetItem,
  walls,
  selected,
  disabled,
  onSelect,
  onDragStart,
  onRotateStart,
}: {
  cabinetItem: CabinetElement;
  walls: Wall[];
  selected: boolean;
  disabled?: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
  onRotateStart: (event: React.PointerEvent<SVGPathElement>) => void;
}) {
  const metrics = getCabinetWallDistanceMetrics(cabinetItem, walls);

  return (
    <g>
      {selected && <CabinetDistanceGuides metrics={metrics} />}
      <g
        onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
        style={{ cursor: disabled ? "default" : selected ? "move" : "pointer" }}
      >
        <CabinetPlanShape cabinetItem={cabinetItem} selected={selected} />
      </g>
      {selected && (
        <CabinetMoveRotateControl
          cabinetItem={cabinetItem}
          onRotateStart={onRotateStart}
          showDegree
        />
      )}
    </g>
  );
}

// CabinetPreview
function CabinetPreview({ preview, walls }: { preview: CabinetPlacementPreview; walls: Wall[] }) {
  const previewCabinet: CabinetElement = {
    id: "cabinet-preview",
    center: preview.center,
    width: preview.width,
    depth: preview.depth,
    rotation: preview.rotation,
  };
  const metrics = getCabinetWallDistanceMetrics(previewCabinet, walls);

  return (
    <g pointerEvents="none" opacity={preview.isValid ? 1 : 0.55}>
      <CabinetDistanceGuides metrics={metrics} />
      <CabinetPlanShape cabinetItem={previewCabinet} selected preview invalid={!preview.isValid} />
      <CabinetMoveRotateControl cabinetItem={previewCabinet} preview invalid={!preview.isValid} />
    </g>
  );
}

// CabinetPlanShape
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
  const fill = invalid ? "#fee2e2" : "#f8fafc";
  const fillOpacity = invalid ? 0.28 : preview ? 0.38 : 0.36;
  const detailOpacity = invalid ? 0.45 : preview ? 0.58 : 0.5;
  const stroke = invalid ? "#ef4444" : selected ? "#22bfd6" : "#64748b";

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
        strokeWidth={selected ? 2 : 1.5}
        vectorEffect="non-scaling-stroke"
      />
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
      <line
        x1="0"
        y1={-depth / 2}
        x2="0"
        y2={depth / 2}
        stroke="#d1d5db"
        strokeOpacity={detailOpacity}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {selected && [
        { x: 0, y: -depth / 2 },
        { x: width / 2, y: 0 },
        { x: 0, y: depth / 2 },
        { x: -width / 2, y: 0 },
      ].map((handle, index) => (
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
  const arrowDistance = radius + 18;
  const ringCenterRadius = radius - 7;
  const tickHalfLength = 2.7;
  const arcRadius = ringCenterRadius;
  const activeRotation = normalizeDegrees(cabinetItem.rotation);
  const rotateArcStart = -20;
  const rotateArcEnd = 20;
  const rotateColor = preview ? "#35bed0" : "#06b6d4";
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
      <circle r={radius} fill="#7eeaf4" opacity="0.45" pointerEvents="none" />
      <circle r={radius - 14} fill="#ffffff" opacity="0.72" pointerEvents="none" />
      <g pointerEvents="none">
        <CabinetArrow x={0} y={-arrowDistance} rotation={-90} />
        <CabinetArrow x={arrowDistance} y={0} rotation={0} />
        <CabinetArrow x={0} y={arrowDistance} rotation={90} />
        <CabinetArrow x={-arrowDistance} y={0} rotation={180} />
      </g>
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
            text={formatFeetInches(metric.distance)}
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
  onRotateLeft,
  onRotateRight,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  position: Point;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onDelete: () => void;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>, startPosition: Point) => void;
  onDragMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <foreignObject x={position.x} y={position.y} width="230" height="68" pointerEvents="none" className="overflow-visible">
      <div
        className="pointer-events-auto relative flex h-[52px] items-center rounded-md border-2 border-pelican-teal bg-white shadow-lg"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected cabinet menu"
          className="flex h-full w-5 cursor-grab items-center justify-center rounded-l bg-pelican-teal text-white active:cursor-grabbing"
          onPointerDown={(event) => onDragStart(event, position)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span className="rotate-90 text-lg leading-none">•••</span>
        </div>
        <div className="flex flex-1 items-center justify-around px-2 text-slate-600">
          <button type="button" onPointerDown={(event) => event.stopPropagation()} className="rounded p-1 hover:bg-slate-100" aria-label="Duplicate cabinet"><Box className="h-5 w-5" /></button>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} className="rounded p-1 hover:bg-slate-100" aria-label="Flip cabinet"><ArrowLeftRight className="h-5 w-5" /></button>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onRotateLeft(); }} className="rounded p-1 hover:bg-slate-100" aria-label="Rotate cabinet left"><Undo2 className="h-5 w-5" /></button>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onRotateRight(); }} className="rounded p-1 hover:bg-slate-100" aria-label="Rotate cabinet right"><Redo2 className="h-5 w-5" /></button>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onDelete(); }} className="rounded p-1 hover:bg-red-50 hover:text-red-500" aria-label="Delete cabinet"><Trash2 className="h-5 w-5" /></button>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-full h-7 w-[86px] -translate-x-1/2 -translate-y-[7px] overflow-visible">
          <svg className="absolute inset-0 overflow-visible" viewBox="0 0 86 28" aria-hidden="true">
            <rect x="0" y="0" width="86" height="10" fill="#ffffff" />
            <path
              d="M 0 8 H 32 L 43 19 L 54 8 H 86"
              fill="none"
              stroke="#22bfd6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
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
  cabinetCategory?: CabinetCategory
): CabinetPlacementPreview {
  const snappedCenter = snapToGrid(rawPoint);
  const wallSnappedCenter = getWallFaceSnappedCabinetCenter(
    snappedCenter,
    walls.filter(isThickWall),
    width,
    depth,
    rotation
  );
  const center = getAdjacentCabinetSnappedCenter(
    wallSnappedCenter,
    cabinets,
    width,
    depth,
    rotation,
    cabinetCategory,
    excludedCabinetId
  );
  const preview = { center, width, depth, rotation, isValid: true };

  return {
    ...preview,
    // Cabinet-to-cabinet overlap is intentionally allowed while placing or
    // dragging. Snapping still provides clean edge-to-edge placement when the
    // user is close to another cabinet, but another cabinet must never block
    // movement. The only hard invalid state is crossing through a wall.
    isValid: !cabinetIntersectsAnyWall(preview, walls),
  };
}

// getWallFaceSnappedCabinetCenter
function getWallFaceSnappedCabinetCenter(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number
): Point {
  const snapThreshold = 18;
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

  if (bestXSnap) {
    nextCenter = { ...nextCenter, x: nextCenter.x + bestXSnap.delta };
  }

  if (bestYSnap) {
    nextCenter = { ...nextCenter, y: nextCenter.y + bestYSnap.delta };
  }

  return nextCenter;
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
  const snapThreshold = 18;
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
    threshold = snapThreshold
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
    const samePlacementLayer = (pendingCategory === "wall") === (otherCategory === "wall");

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
      Math.abs(otherBounds.minY - bounds.maxY) <= snapThreshold ||
      Math.abs(otherBounds.maxY - bounds.minY) <= snapThreshold ||
      nearSameRows;
    const nearHorizontalNeighbor =
      Math.abs(otherBounds.minX - bounds.maxX) <= snapThreshold ||
      Math.abs(otherBounds.maxX - bounds.minX) <= snapThreshold ||
      nearSameColumns;

    // Edge-to-edge snaps are allowed across every cabinet category. This lets a wall
    // cabinet sit exactly beside a base or tall cabinet on the floor plan while the
    // intersection logic still allows wall cabinets to overlap above lower cabinets.
    if (nearSameRows) {
      considerSnap("x", "edge", otherBounds.minX - bounds.maxX);
      considerSnap("x", "edge", otherBounds.maxX - bounds.minX);
    }

    if (nearSameColumns) {
      considerSnap("y", "edge", otherBounds.minY - bounds.maxY);
      considerSnap("y", "edge", otherBounds.maxY - bounds.minY);
    }

    // Alignment snaps are only same-layer. Cross-layer alignment was the root cause
    // of wall cabinets being pulled into a small false gap or a small false overlap
    // when the user wanted edge-to-edge placement beside base/tall cabinets.
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

  const xSnap = bestXEdgeSnap ?? bestXAlignmentSnap;
  const ySnap = bestYEdgeSnap ?? bestYAlignmentSnap;

  if (xSnap) {
    nextCenter = { ...nextCenter, x: nextCenter.x + xSnap.delta };
  }

  if (ySnap) {
    nextCenter = { ...nextCenter, y: nextCenter.y + ySnap.delta };
  }

  return nextCenter;
}

// cabinetIntersectsAnyCabinet
function cabinetIntersectsAnyCabinet(
  cabinetItem: Pick<CabinetElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<CabinetElement, "category">>,
  cabinets: CabinetElement[],
  excludedCabinetId?: string
) {
  const bounds = getRotatedRectBounds(
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

  return cabinets.some((otherCabinet) => {
    if (otherCabinet.id === excludedCabinetId) return false;

    const otherCategory = getCabinetElevationCategory(otherCabinet);
    const hasWallCabinetLayer = cabinetCategory === "wall" || otherCategory === "wall";
    const bothAreWallCabinets = cabinetCategory === "wall" && otherCategory === "wall";

    if (hasWallCabinetLayer && !bothAreWallCabinets) return false;

    const otherBounds = getRotatedRectBounds(
      otherCabinet.center,
      Math.max(1, otherCabinet.width - 1),
      Math.max(1, otherCabinet.depth - 1),
      otherCabinet.rotation
    );

    const overlapX = Math.min(bounds.maxX, otherBounds.maxX) - Math.max(bounds.minX, otherBounds.minX);
    const overlapY = Math.min(bounds.maxY, otherBounds.maxY) - Math.max(bounds.minY, otherBounds.minY);

    return overlapX > 0.5 && overlapY > 0.5;
  });
}

// cabinetOpenSegmentsIntersect
function cabinetOpenSegmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  if (!segmentsIntersect(a, b, c, d)) return false;

  const aOnWall = pointOnSegment(a, c, d);
  const bOnWall = pointOnSegment(b, c, d);
  const cOnCabinet = pointOnSegment(c, a, b);
  const dOnCabinet = pointOnSegment(d, a, b);

  const onlyTouching = aOnWall || bOnWall || cOnCabinet || dOnCabinet;
  if (!onlyTouching) return true;

  const directionA = normalize(sub(b, a));
  const directionB = normalize(sub(d, c));
  const nearlyParallel = Math.abs(cross(directionA, directionB)) < 0.001;
  return !nearlyParallel;
}

// getCabinetMenuPosition
function getCabinetMenuPosition(cabinetItem: CabinetElement): Point {
  const menuWidth = 230;
  const menuHeight = 52;
  const radius = Math.max(cabinetItem.width, cabinetItem.depth) / 2 + 20;
  const pointerOverlap = 9;
  const gapAboveRing = 3;
  return {
    x: cabinetItem.center.x - menuWidth / 2,
    y: cabinetItem.center.y - radius - menuHeight - gapAboveRing + pointerOverlap,
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
      (cabinetItem.category ?? null) === (otherCabinet.category ?? null)
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

// getRotatedRectCorners
function getRotatedRectCorners(center: Point, width: number, depth: number, rotation: number) {
  const radians = degreesToRadians(rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const localCorners = [
    { x: -width / 2, y: -depth / 2 },
    { x: width / 2, y: -depth / 2 },
    { x: width / 2, y: depth / 2 },
    { x: -width / 2, y: depth / 2 },
  ];

  return localCorners.map((corner) => ({
    x: center.x + corner.x * cosValue - corner.y * sinValue,
    y: center.y + corner.x * sinValue + corner.y * cosValue,
  }));
}

// getRotatedRectBounds
function getRotatedRectBounds(center: Point, width: number, depth: number, rotation: number) {
  const corners = getRotatedRectCorners(center, width, depth, rotation);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

// pointInPolygon
function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y || 0.000001) + current.x;

    if (intersects) inside = !inside;
  }

  return inside;
}

// segmentsIntersect
function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const orientation = (p1: Point, p2: Point, p3: Point) => Math.sign(cross(sub(p2, p1), sub(p3, p1)));
  const onSegment = (p1: Point, p2: Point, p3: Point) =>
    Math.min(p1.x, p3.x) - 0.001 <= p2.x &&
    p2.x <= Math.max(p1.x, p3.x) + 0.001 &&
    Math.min(p1.y, p3.y) - 0.001 <= p2.y &&
    p2.y <= Math.max(p1.y, p3.y) + 0.001;

  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;

  return false;
}

// normalizeDegrees
function normalizeDegrees(angle: number) {
  return ((angle % 360) + 360) % 360;
}

// degreesToRadians
function degreesToRadians(angle: number) {
  return (angle * Math.PI) / 180;
}

// getAngleDegrees
function getAngleDegrees(center: Point, point: Point) {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
}

// polarPoint
function polarPoint(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const radians = degreesToRadians(angleDegrees);
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

// describeArc
// cabinetSnapRotationToTick
const CABINET_ROTATION_SNAP_STEP_DEGREES = 45;
const CABINET_ROTATION_SNAP_ENTER_DEGREES = 4;

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
  width: number
): DoorPlacementPreview | null {
  const placement = getWindowPlacementOnWall(point, walls, width);

  if (!placement) return null;

  return {
    wall: placement.wall,
    t: placement.t,
    point: placement.point,
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
  overrideT?: number
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

  const normal = getPreferredNormal(wall.start, wall.end);
  const menuWidth = 74;
  const menuHeight = 46;
  const doorHalfHeight = 7;
  const menuGapFromDoor = 20;
  const doorCenter = geometry.center;
  const menuHalfProjectionOnNormal =
    (Math.abs(normal.x) * menuWidth + Math.abs(normal.y) * menuHeight) / 2;
  const menuCenter = add(
    doorCenter,
    mul(normal, -(doorHalfHeight + menuGapFromDoor + menuHalfProjectionOnNormal))
  );

  return {
    x: menuCenter.x - menuWidth / 2,
    y: menuCenter.y - menuHeight / 2,
  };
}

function getWindowPlacementOnWall(
  point: Point,
  walls: Wall[],
  width: number
): WindowPlacementPreview | null {
  let bestPlacement: WindowPlacementPreview | null = null;
  let bestDistance = Infinity;
  const placementTolerance = WALL_ATTACH_THRESHOLD + WALL_STROKE_WIDTH / 2 + 16;

  for (const wall of walls.filter(isThickWall)) {
    const wallLength = distance(wall.start, wall.end);
    if (wallLength < width + 4) continue;

    const projection = closestPointOnSegment(point, wall.start, wall.end);
    const distanceToWall = distance(point, projection);

    if (distanceToWall > placementTolerance || distanceToWall >= bestDistance) {
      continue;
    }

    const direction = normalize(sub(wall.end, wall.start));
    const rawDistance = dot(sub(projection, wall.start), direction);
    const clampedDistance = clamp(rawDistance, width / 2, wallLength - width / 2);
    const centerPoint = add(wall.start, mul(direction, clampedDistance));

    bestDistance = distanceToWall;
    bestPlacement = {
      wall,
      t: clampedDistance / wallLength,
      point: centerPoint,
    };
  }

  return bestPlacement;
}

function getWindowPlacementFromWall(
  windowItem: WindowElement,
  wall: Wall
): WindowPlacementPreview {
  return {
    wall,
    t: windowItem.t,
    point: interpolate(wall.start, wall.end, windowItem.t),
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

function getWindowMenuPosition(
  windowItem: WindowElement,
  wall: Wall,
  overrideT?: number
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

  const normal = getPreferredNormal(wall.start, wall.end);
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
    mul(normal, -(windowHalfHeight + menuGapFromWindow + menuHalfProjectionOnNormal))
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
  wall: Wall
) {
  const guideSide = getStructureGuideSideForWall(wall);

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

function inchesToPixels(inches: number) {
  return (inches / 12) * GRID_SIZE;
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

function isThinWall(wall: Wall) { return wall.kind === "thin-wall"; }
function isThickWall(wall: Wall) { return wall.kind !== "thin-wall"; }
function isDrawingTool(tool: Tool) { return tool === "draw-wall" || tool === "draw-thin-wall"; }

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
    const first = remaining.values().next().value as Wall;
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
  const allPoints = uniquePoints(walls.flatMap((wall) => [wall.start, wall.end]));
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
  const wallPoints = walls.flatMap((wall) => [wall.start, wall.end]);

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

function formatFeetInchesForInput(pixelLength: number) {
  const totalInches = pixelsToInches(pixelLength);
  const feet = Math.floor(totalInches / 12);
  const inches = roundToQuarter(totalInches - feet * 12);

  return `${feet} ${formatDecimal(inches)}`;
}

function formatFeetInchesParts(pixelLength: number) {
  const totalInches = pixelsToInches(pixelLength);
  const feet = Math.floor(totalInches / 12);
  const inches = roundToQuarter(totalInches - feet * 12);

  return {
    feet: `${feet}`,
    inches: formatDecimal(inches),
  };
}

function parseFeetInchesToPixels(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[″”]/g, '"')
    .replace(/[′’]/g, "'")
    .replace(/feet|foot|ft\.?/g, "'")
    .replace(/inches|inch|in\.?/g, '"')
    .replace(/-/g, " ");

  let feet = 0;
  let inches = 0;

  const feetMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*'/);
  const inchMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*"/);

  if (feetMatch || inchMatch) {
    feet = feetMatch ? Number(feetMatch[1]) : 0;
    inches = inchMatch ? Number(inchMatch[1]) : 0;
  } else {
    const parts = normalized.match(/-?\d+(?:\.\d+)?/g) ?? [];

    if (parts.length >= 2) {
      feet = Number(parts[0]);
      inches = Number(parts[1]);
    } else if (parts.length === 1) {
      feet = Number(parts[0]);
    } else {
      return null;
    }
  }

  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;

  const totalInches = feet * 12 + inches;

  if (totalInches <= 0) return null;

  return (totalInches / 12) * GRID_SIZE;
}

function pixelsToInches(pixelLength: number) {
  return (pixelLength / GRID_SIZE) * 12;
}

function roundToQuarter(value: number) {
  return Math.round(value * 4) / 4;
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(2))}`;
}

function areWallsEqual(a: Wall[], b: Wall[]) {
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
    walls
      .flatMap((wall) => [wall.start, wall.end])
      .filter((point) => !isPassThroughPoint(point))
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
      kindWalls.flatMap((wall) => [wall.start, wall.end])
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

function cabinetPolarPoint(origin: Point, radius: number, angleDegrees: number): Point {
  const radians = (angleDegrees * Math.PI) / 180;

  return {
    x: origin.x + Math.cos(radians) * radius,
    y: origin.y - Math.sin(radians) * radius,
  };
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

function pointToSegmentDistance(point: Point, start: Point, end: Point) {
  const segment = sub(end, start);
  const lengthSquared = dot(segment, segment);

  if (lengthSquared === 0) return distance(point, start);

  const t = clamp(dot(sub(point, start), segment) / lengthSquared, 0, 1);
  const projection = add(start, mul(segment, t));

  return distance(point, projection);
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

function segmentOrientation(a: Point, b: Point, c: Point) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 0.0001) return 0;

  return value > 0 ? 1 : 2;
}

function pointOnSegment(point: Point, segmentStart: Point, segmentEnd: Point) {
  return (
    point.x <= Math.max(segmentStart.x, segmentEnd.x) + 0.0001 &&
    point.x >= Math.min(segmentStart.x, segmentEnd.x) - 0.0001 &&
    point.y <= Math.max(segmentStart.y, segmentEnd.y) + 0.0001 &&
    point.y >= Math.min(segmentStart.y, segmentEnd.y) - 0.0001
  );
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

  nextWalls = splitWallsAtInteriorPoint(nextWalls, newWall.start, newWall.kind);
  nextWalls = splitWallsAtInteriorPoint(nextWalls, newWall.end, newWall.kind);

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

function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const segment = sub(end, start);
  const segmentLengthSquared = dot(segment, segment);

  if (segmentLengthSquared === 0) return start;

  const t = clamp(dot(sub(point, start), segment) / segmentLengthSquared, 0, 1);

  return {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  };
}

function snapToGrid(point: Point): Point {
  return {
    x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function add(a: Point, b: Point): Point {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

function sub(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

function mul(point: Point, scalar: number): Point {
  return {
    x: point.x * scalar,
    y: point.y * scalar,
  };
}

function perp(point: Point): Point {
  return {
    x: -point.y,
    y: point.x,
  };
}

function dot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y;
}

function cross(a: Point, b: Point) {
  return a.x * b.y - a.y * b.x;
}

function vectorLength(point: Point) {
  return Math.sqrt(dot(point, point));
}

function normalize(point: Point): Point {
  const length = vectorLength(point);

  if (!length) {
    return { x: 0, y: 0 };
  }

  return {
    x: point.x / length,
    y: point.y / length,
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function getNormal(a: Point, b: Point): Point {
  const unit = getUnitVector(a, b);

  return {
    x: -unit.y,
    y: unit.x,
  };
}

function getUnitVector(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) return { x: 1, y: 0 };

  return {
    x: dx / length,
    y: dy / length,
  };
}

function getTextRotation(a: Point, b: Point) {
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

  return angle > 90 || angle < -90 ? angle + 180 : angle;
}

function toSvgPoint(point: Point): string {
  return `${point.x},${point.y}`;
}

function formatMeasurementFromInches(totalInchesValue: number) {
  const totalInches = Math.max(1, Math.round(totalInchesValue));
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  if (feet === 0) return `${inches}"`;
  if (inches === 0) return `${feet}'`;

  return `${feet}' ${inches}"`;
}

function formatFeetInches(pixelLength: number) {
  const inchesPerGrid = 12;
  const totalInches = Math.max(
    1,
    Math.round((pixelLength / GRID_SIZE) * inchesPerGrid)
  );

  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  if (feet === 0) return `${inches}"`;
  if (inches === 0) return `${feet}'`;

  return `${feet}' ${inches}"`;
}
