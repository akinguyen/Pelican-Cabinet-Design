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

type Tool = "draw-wall" | "draw-thin-wall" | "place-window" | "place-door" | null;

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
const DEFAULT_ELEVATION_WALL_HEIGHT_INCHES = 96;
const ELEVATION_VIEWBOX_WIDTH = 1200;
const ELEVATION_VIEWBOX_HEIGHT = 760;

const JOINT_DOT_RADIUS = 5;
const JOINT_TICK_LENGTH = 16;

export default function CabinetEditor() {
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [activePanel, setActivePanel] = useState<Panel>("walls");
  const [selectedWindowDetail, setSelectedWindowDetail] =
    useState<WindowSelectionDetail | null>(null);
  const [selectedDoorDetail, setSelectedDoorDetail] =
    useState<DoorSelectionDetail | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [planViewMode, setPlanViewMode] = useState<PlanViewMode>("floor");
  const [canConvertSelectedThinWalls, setCanConvertSelectedThinWalls] = useState(false);

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

  const undoWallChange = useCallback(() => {
    const previousSnapshot = undoStackRef.current.pop();

    if (!previousSnapshot) return;

    const currentSnapshot = {
      walls: wallsRef.current,
      windows: windowsRef.current,
      doors: doorsRef.current,
    };

    redoStackRef.current.push(currentSnapshot);
    wallsRef.current = previousSnapshot.walls;
    windowsRef.current = previousSnapshot.windows;
    doorsRef.current = previousSnapshot.doors ?? [];
    setWalls(previousSnapshot.walls);
    setWindows(previousSnapshot.windows);
    setDoors(previousSnapshot.doors ?? []);
    clearWallSelectionState();
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
  }, [clearWallSelectionState, updateDoorPreview, updateWindowPreview]);

  const redoWallChange = useCallback(() => {
    const nextSnapshot = redoStackRef.current.pop();

    if (!nextSnapshot) return;

    const currentSnapshot = {
      walls: wallsRef.current,
      windows: windowsRef.current,
      doors: doorsRef.current,
    };

    undoStackRef.current.push(currentSnapshot);
    wallsRef.current = nextSnapshot.walls;
    windowsRef.current = nextSnapshot.windows;
    doorsRef.current = nextSnapshot.doors ?? [];
    setWalls(nextSnapshot.walls);
    setWindows(nextSnapshot.windows);
    setDoors(nextSnapshot.doors ?? []);
    clearWallSelectionState();
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
  }, [clearWallSelectionState, updateDoorPreview, updateWindowPreview]);

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
      (isDrawingTool(activeToolRef.current) || activeToolRef.current === "place-window" || activeToolRef.current === "place-door")
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
}, [commitWallsChange, commitWindowsChange, commitDoorsChange, editingMeasurement, groupSelectedWallIds, isSelectionMode, redoWallChange, selectedWallId, setActiveTool, setIsSelectionMode, undoWallChange]);

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
    if (activeToolRef.current === "place-door" && commitPreviewStructurePlacement("door")) {
      return;
    }

    if (activeToolRef.current === "place-window" && commitPreviewStructurePlacement("window")) {
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
                : null;

  if (planViewMode === "elevation") {
    return (
      <ElevationPlanView
        walls={elevationWalls}
        windows={windows}
        doors={doors}
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
            : activeTool === "place-window" || activeTool === "place-door"
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
                disabled={activeTool === "place-window" || activeTool === "place-door"}
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setSelectedWindowId(windowItem.id);
                  setSelectedDoorId(null);
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


function ElevationPlanView({
  walls,
  windows,
  doors,
  activeIndex,
  onPrevious,
  onNext,
}: {
  walls: Wall[];
  windows: WindowElement[];
  doors: DoorElement[];
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
    .sort((left, right) => left.t - right.t);
  const wallDoors = doors
    .filter((doorItem) => doorItem.wallId === wall.id)
    .sort((left, right) => left.t - right.t);

  const wallLengthInches = pixelsToInches(distance(wall.start, wall.end));
  const wallHeightInches = DEFAULT_ELEVATION_WALL_HEIGHT_INCHES;
  const drawingWidth = ELEVATION_VIEWBOX_WIDTH - 220;
  const drawingHeight = ELEVATION_VIEWBOX_HEIGHT - 220;
  const renderScale = Math.min(
    drawingWidth / Math.max(wallLengthInches, 1),
    drawingHeight / wallHeightInches
  );
  const wallRenderWidth = wallLengthInches * renderScale;
  const wallRenderHeight = wallHeightInches * renderScale;
  const wallLeft = (ELEVATION_VIEWBOX_WIDTH - wallRenderWidth) / 2;
  const wallTop = 150;
  const wallBottom = wallTop + wallRenderHeight;
  const overallLengthLabel = formatMeasurementFromInches(wallLengthInches);
  const overallHeightLabel = formatMeasurementFromInches(wallHeightInches);

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
              y1={wallTop - 42}
              x2={wallLeft + wallRenderWidth}
              y2={wallTop - 42}
              label={overallLengthLabel}
              textOffset={-12}
            />

            <ElevationDimensionLine
              x1={wallLeft + wallRenderWidth + 42}
              y1={wallTop}
              x2={wallLeft + wallRenderWidth + 42}
              y2={wallBottom}
              label={overallHeightLabel}
              rotateText
              textOffset={18}
            />

            {wallWindows.map((windowItem) => {
              const width = pixelsToInches(windowItem.width) * renderScale;
              const height = windowItem.heightInches * renderScale;
              const left = wallLeft + wallRenderWidth * windowItem.t - width / 2;
              const top = wallBottom - (windowItem.distanceFromFloorInches + windowItem.heightInches) * renderScale;
              const sillY = wallBottom - windowItem.distanceFromFloorInches * renderScale;

              return (
                <g key={windowItem.id}>
                  <rect x={left} y={top} width={width} height={height} fill="#f1ede4" stroke="#111827" strokeWidth="2" />
                  <rect x={left + 8} y={top + 8} width={Math.max(0, width - 16)} height={Math.max(0, height - 16)} fill="#fafaf9" stroke="#111827" strokeWidth="1.5" />
                  <line x1={left + width / 2} y1={top + 8} x2={left + width / 2} y2={top + height - 8} stroke="#111827" strokeWidth="1.5" />
                  <line x1={left + 8} y1={top + height / 2} x2={left + width - 8} y2={top + height / 2} stroke="#111827" strokeWidth="1.5" />
                  <line x1={wallLeft + wallRenderWidth * windowItem.t} y1={wallTop - 6} x2={wallLeft + wallRenderWidth * windowItem.t} y2={top} stroke="#16a34a" strokeWidth="2" opacity="0.45" />
                  <ElevationDimensionLine
                    x1={left}
                    y1={top - 28}
                    x2={left + width}
                    y2={top - 28}
                    label={formatMeasurementFromInches(pixelsToInches(windowItem.width))}
                    textOffset={-10}
                    extensionTop={10}
                    extensionBottom={10}
                  />
                  <ElevationDimensionLine
                    x1={left - 24}
                    y1={sillY}
                    x2={left - 24}
                    y2={wallBottom}
                    label={formatMeasurementFromInches(windowItem.distanceFromFloorInches)}
                    rotateText
                    textOffset={16}
                    extensionTop={8}
                    extensionBottom={8}
                  />
                </g>
              );
            })}

            {wallDoors.map((doorItem) => {
              const width = pixelsToInches(doorItem.width) * renderScale;
              const height = doorItem.heightInches * renderScale;
              const left = wallLeft + wallRenderWidth * doorItem.t - width / 2;
              const top = wallBottom - (doorItem.distanceFromFloorInches + doorItem.heightInches) * renderScale;

              return (
                <g key={doorItem.id}>
                  <rect x={left} y={top} width={width} height={height} fill="#d6dee8" stroke="#111827" strokeWidth="2" />
                  <rect x={left + 10} y={top + 10} width={Math.max(0, width - 20)} height={Math.max(0, height - 20)} fill="#f8fafc" opacity="0.65" />
                  <circle cx={left + width - 14} cy={top + height / 2} r="4" fill="#6b7280" />
                  <line x1={wallLeft + wallRenderWidth * doorItem.t} y1={wallTop - 6} x2={wallLeft + wallRenderWidth * doorItem.t} y2={top} stroke="#2563eb" strokeWidth="2" opacity="0.35" />
                  <ElevationDimensionLine
                    x1={left}
                    y1={top - 28}
                    x2={left + width}
                    y2={top - 28}
                    label={formatMeasurementFromInches(pixelsToInches(doorItem.width))}
                    textOffset={-10}
                    extensionTop={10}
                    extensionBottom={10}
                  />
                </g>
              );
            })}

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
      <text
        x={midX}
        y={midY + (rotateText ? 0 : textOffset)}
        textAnchor="middle"
        dominantBaseline="central"
        transform={rotateText ? `rotate(-90 ${midX} ${midY}) translate(${textOffset} 0)` : undefined}
        className="fill-indigo-700 text-[20px] font-semibold"
      >
        {label}
      </text>
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
  if (isDrawingTool(activeTool) || activeTool === "place-window" || activeTool === "place-door") return null;

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
}: {
  activePanel: Panel;
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  setIsSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedWindow: WindowSelectionDetail | null;
  selectedDoor: DoorSelectionDetail | null;
}) {
  const [structureTab, setStructureTab] = useState<"doors" | "windows">("doors");

  const activateToolFromCard = (tool: Tool) => {
    setIsSelectionMode(false);
    setActiveTool(tool);
  };

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
        point: polarPoint(start, labelRadius, obtuseLabelAngle),
      },
      {
        text: `${acute}°`,
        point: polarPoint(start, labelRadius, acuteLabelAngle),
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

function polarPoint(origin: Point, radius: number, angleDegrees: number): Point {
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
    segmentsIntersect(wall.start, wall.end, topLeft, topRight) ||
    segmentsIntersect(wall.start, wall.end, topRight, bottomRight) ||
    segmentsIntersect(wall.start, wall.end, bottomRight, bottomLeft) ||
    segmentsIntersect(wall.start, wall.end, bottomLeft, topLeft)
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

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
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

function normalizeDegrees(angle: number) {
  return ((angle % 360) + 360) % 360;
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
