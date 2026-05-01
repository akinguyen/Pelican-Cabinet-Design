"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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

type Tool = "draw-wall" | "draw-thin-wall" | null;

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

const JOINT_DOT_RADIUS = 5;
const JOINT_TICK_LENGTH = 16;

export default function CabinetEditor() {
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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
            onToggleSelectionMode={() => {
              setActiveTool(null);
              setIsSelectionMode((current) => !current);
            }}
          />

          <CanvasArea
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            offset={offset}
            scale={scale}
            setOffset={setOffset}
            setScale={setScale}
          />
        </section>

        <section className="flex h-full shrink-0 border-l border-slate-200 bg-white">
          <ContextPanel activeTool={activeTool} setActiveTool={setActiveTool} />
          <MainToolbar active="walls" />
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
  onToggleSelectionMode,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  isSelectionMode: boolean;
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
        <ModeIconButton icon={Ruler} label="Ruler" />
        <ModeIconButton icon={Magnet} label="Snap" />

        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-pelican-navy hover:bg-slate-100">
          <Video className="h-[19px] w-[19px]" />
          Camera
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center rounded-full bg-slate-100 p-1 justify-self-center">
        <button className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-pelican-navy shadow-sm">
          <Grid3X3 className="h-4 w-4" />
          Floorplan
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
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md border text-pelican-navy hover:bg-slate-100",
        active
          ? "border-pelican-teal bg-cyan-50 text-pelican-teal shadow-sm"
          : "border-slate-200 bg-slate-50"
      )}
    >
      <Icon className="h-[21px] w-[21px]" />
    </button>
  );
}

function CanvasArea({
  activeTool,
  setActiveTool,
  isSelectionMode,
  setIsSelectionMode,
  offset,
  scale,
  setOffset,
  setScale,
}: {
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
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

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [walls, setWalls] = useState<Wall[]>([]);
  const wallsRef = useRef<Wall[]>([]);
  const undoStackRef = useRef<Wall[][]>([]);
  const redoStackRef = useRef<Wall[][]>([]);
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

  const thickWalls = useMemo(() => walls.filter(isThickWall), [walls]);
  const thinWalls = useMemo(() => walls.filter(isThinWall), [walls]);

  const wallPoints = useMemo(() => {
    return walls.flatMap((wall) => [wall.start, wall.end]);
  }, [walls]);

  const selectedWall = useMemo(() => {
    return walls.find((wall) => wall.id === selectedWallId) ?? null;
  }, [walls, selectedWallId]);

  const groupSelectedWalls = useMemo(() => {
    const selectedIds = new Set(groupSelectedWallIds);
    return walls.filter((wall) => selectedIds.has(wall.id));
  }, [groupSelectedWallIds, walls]);

  const groupSelectedThinWalls = useMemo(() => {
    return groupSelectedWalls.filter(isThinWall);
  }, [groupSelectedWalls]);

  const canConvertGroupThinWalls =
    groupSelectedWalls.length > 0 &&
    groupSelectedThinWalls.length === groupSelectedWalls.length;

  const connectionMap = useMemo(() => buildConnectionMap(thickWalls), [thickWalls]);
  const thinConnectionMap = useMemo(() => buildConnectionMap(thinWalls), [thinWalls]);
  const wallChains = useMemo(() => buildWallChains(thickWalls), [thickWalls]);

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

  const commitWallsChange = useCallback(
    (updater: Wall[] | ((currentWalls: Wall[]) => Wall[])) => {
      const currentWalls = wallsRef.current;
      const nextWalls =
        typeof updater === "function" ? updater(currentWalls) : updater;

      if (areWallsEqual(currentWalls, nextWalls)) return;

      undoStackRef.current.push(currentWalls);
      redoStackRef.current = [];
      wallsRef.current = nextWalls;
      setWalls(nextWalls);
    },
    []
  );

  const undoWallChange = useCallback(() => {
    const previousWalls = undoStackRef.current.pop();

    if (!previousWalls) return;

    const currentWalls = wallsRef.current;
    redoStackRef.current.push(currentWalls);
    wallsRef.current = previousWalls;
    setWalls(previousWalls);
    clearWallSelectionState();
  }, [clearWallSelectionState]);

  const redoWallChange = useCallback(() => {
    const nextWalls = redoStackRef.current.pop();

    if (!nextWalls) return;

    const currentWalls = wallsRef.current;
    undoStackRef.current.push(currentWalls);
    wallsRef.current = nextWalls;
    setWalls(nextWalls);
    clearWallSelectionState();
  }, [clearWallSelectionState]);

  const createThickWallsFromThinWalls = useCallback(
    (mode: ThickWallCreationMode, sourceWallIds?: string[]) => {
      const sourceIdSet = sourceWallIds ? new Set(sourceWallIds) : null;
      const currentThinWalls = wallsRef.current.filter(
        (wall) => isThinWall(wall) && (!sourceIdSet || sourceIdSet.has(wall.id))
      );

      if (currentThinWalls.length === 0) return;

      const convertedWalls = convertThinWallsToThickWalls(currentThinWalls, mode);

      if (convertedWalls.length === 0) return;

      commitWallsChange((currentWalls) => [
        ...currentWalls.filter((wall) => {
          if (!isThinWall(wall)) return true;
          return sourceIdSet ? !sourceIdSet.has(wall.id) : false;
        }),
        ...convertedWalls,
      ]);

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
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

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
      isDrawingTool(activeToolRef.current)
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
      selectedWallId
    ) {
      event.preventDefault();
      commitWallsChange((currentWalls) =>
        currentWalls.filter((wall) => wall.id !== selectedWallId)
      );

      setSelectedWallId(null);
      setMenuPosition(null);
      setDrawingStart(null);
      setPreviewPoint(null);
    }
  };

  window.addEventListener("keydown", handleKeyDown, true);

  return () => window.removeEventListener("keydown", handleKeyDown, true);
}, [commitWallsChange, editingMeasurement, groupSelectedWallIds, isSelectionMode, redoWallChange, selectedWallId, setActiveTool, setIsSelectionMode, undoWallChange]);

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

    const candidatePoints = [startPoint, ...wallPoints];

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

    return getWallAttachPoint(previewPoint, walls);
  }, [activeTool, drawingStart, previewPoint, walls]);

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

    commitWallsChange((currentWalls) =>
      resizeWallFromMeasurement(currentWalls, editingMeasurement, targetLength)
    );

    setMenuPosition(null);
    setEditingMeasurement(null);
  };

  const selectWall = (wallId: string) => {
    const wall = walls.find((currentWall) => currentWall.id === wallId);

    setSelectedWallId(wallId);
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

  const createSelectedThinWalls = (mode: ThickWallCreationMode) => {
    if (!canConvertGroupThinWalls) return;

    createThickWallsFromThinWalls(mode, groupSelectedThinWalls.map((wall) => wall.id));
  };

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

      setSelectionStart(rawPoint);
      setSelectionEnd(rawPoint);
      setIsSelectingArea(true);
      setGroupContextMenu(null);
      setSelectedWallId(null);
      setMenuPosition(null);
      setEditingMeasurement(null);
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

      const wallAttachPoint = getWallAttachPoint(rawPoint, wallsRef.current);

      if (!drawingStart) {
        const startPoint = wallAttachPoint ?? snapToGrid(rawPoint);
        setDrawingStart(startPoint);
        setPreviewPoint(startPoint);
        return;
      }

      const guide = getGuideInfo(wallAttachPoint ?? rawPoint, drawingStart);
      const endPoint = wallAttachPoint ?? guide.point;

      if (distance(drawingStart, endPoint) < 4) return;

      commitWallsChange((currentWalls) => [
        ...currentWalls,
        {
          id: crypto.randomUUID(),
          start: drawingStart,
          end: endPoint,
          kind: drawingTool === "draw-thin-wall" ? "thin-wall" : "wall",
        },
      ]);

      setDrawingStart(endPoint);
      setPreviewPoint(endPoint);
      return;
    }

    event.preventDefault();
    setSelectedWallId(null);
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
    if (isSelectionMode && isSelectingArea) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (rawPoint) {
        setSelectionEnd(rawPoint);
      }

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

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
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

  const currentMenuPosition =
    selectedWall && menuPosition
      ? menuPosition
      : selectedWall
        ? getWallMenuPosition(selectedWall)
        : null;

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-[#f5f5f5] touch-none select-none",
        isSelectionMode
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
              connectionMap={connectionMap}
              //hideInteriorDetails={isCreatingWallPreview}
              onMeasurementClick={startMeasurementEdit}
            />
          ))}

          {thinWalls.map((wall) => (
            <ThinWallLine
              key={wall.id}
              wall={wall}
              onMeasurementClick={startMeasurementEdit}
            />
          ))}

          {groupSelectedWalls.map((wall) => (
            <SelectedWallOverlay key={`group-selected-${wall.id}`} wall={wall} />
          ))}

          {selectedWall && <SelectedWallOverlay wall={selectedWall} />}

          {getOpenEndpoints(thickWalls, connectionMap).map((point) => (
            <OpenEndpoint key={`open-${pointKey(point)}`} point={point} />
          ))}

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

          {!isSelectionMode && !isDrawingTool(activeTool) && (
            <MeasurementEditHitAreas
              chains={wallChains}
              thinWalls={thinWalls}
              onMeasurementClick={startMeasurementEdit}
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

          {editingMeasurement && (
            <MeasurementEditPopover
              edit={editingMeasurement}
              onChange={(value) =>
                setEditingMeasurement((currentEdit) =>
                  currentEdit ? { ...currentEdit, value } : currentEdit
                )
              }
              onCancel={() => setEditingMeasurement(null)}
              onApply={applyMeasurementEdit}
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
        </svg>
      </div>

      <MoveControl
        onMoveUp={() => moveCanvasView("up")}
        onMoveDown={() => moveCanvasView("down")}
        onMoveLeft={() => moveCanvasView("left")}
        onMoveRight={() => moveCanvasView("right")}
      />
    </div>
  );
}

function SelectionAreaBox({ start, end }: { start: Point; end: Point }) {
  const rect = getSelectionRect(start, end);

  return (
    <g pointerEvents="none">
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill="#38bdf8"
        fillOpacity={0.12}
        stroke="#0ea5e9"
        strokeWidth={1.5}
        strokeDasharray="6 6"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

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
    <foreignObject
      x={position.x}
      y={position.y}
      width={180}
      height={88}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex w-[170px] flex-col overflow-hidden rounded-md border-2 border-[#00aee6] bg-white text-[12px] font-semibold text-slate-700 shadow-md">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCreateExterior();
          }}
          className="px-3 py-2 text-left hover:bg-cyan-50"
        >
          Create wall exterior
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCreateInterior();
          }}
          className="border-t border-slate-200 px-3 py-2 text-left hover:bg-cyan-50"
        >
          Create wall interior
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

function ThinWallLine({ wall, onMeasurementClick }: { wall: Wall; onMeasurementClick?: (payload: MeasurementClickPayload) => void }) {
  const layout = getThinWallMeasurementLayout(wall.start, wall.end);
  const length = distance(wall.start, wall.end);
  return (
    <g>
      <line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} stroke="#6b7280" strokeWidth={THIN_WALL_STROKE_WIDTH} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <MeasurementLabelOnly layout={layout} label={formatFeetInches(length)} onClick={onMeasurementClick ? () => onMeasurementClick({ segmentStart: wall.start, segmentEnd: wall.end, side: "length", currentEdgeLength: length, labelPoint: layout.labelPoint, rotation: layout.rotation }) : undefined} />
    </g>
  );
}

function WallChain({
  points,
  connectionMap,
  hideInteriorDetails = false,
  onMeasurementClick,
}: {
  points: Point[];
  connectionMap: ConnectionMap;
  hideInteriorDetails?: boolean;
  onMeasurementClick?: (payload: MeasurementClickPayload) => void;
}) {
  if (points.length < 2) return null;

  const geometry = buildWallBand(points, WALL_THICKNESS);

  return (
    <g>
      <polygon
        points={geometry.polygon.map(toSvgPoint).join(" ")}
        fill="#c9c9c9"
      />

      {geometry.leftEdges.map((edge, index) => {
        const layout = getEdgeMeasurementLayout(edge.a, edge.b, "left");
        const edgeLength = distance(edge.a, edge.b);

        return (
          <MeasurementLine
            key={`left-measure-${index}`}
            layout={layout}
            label={formatFeetInches(edgeLength)}
            onClick={
              onMeasurementClick
                ? () =>
                    onMeasurementClick({
                      segmentStart: points[index],
                      segmentEnd: points[index + 1],
                      side: "left",
                      currentEdgeLength: edgeLength,
                      labelPoint: layout.labelPoint,
                      rotation: layout.rotation,
                    })
                : undefined
            }
          />
        );
      })}

      {!hideInteriorDetails &&
        geometry.rightEdges.map((edge, index) => {
          const layout = getEdgeMeasurementLayout(edge.a, edge.b, "right");
          const edgeLength = distance(edge.a, edge.b);

          return (
            <MeasurementLine
              key={`right-measure-${index}`}
              layout={layout}
              label={formatFeetInches(edgeLength)}
              onClick={
                onMeasurementClick
                  ? () =>
                      onMeasurementClick({
                        segmentStart: points[index],
                        segmentEnd: points[index + 1],
                        side: "right",
                        currentEdgeLength: edgeLength,
                        labelPoint: layout.labelPoint,
                        rotation: layout.rotation,
                      })
                  : undefined
              }
            />
          );
        })}

      <JointIndicators
        points={points}
        geometry={geometry}
        hideInteriorDetails={hideInteriorDetails}
      />

      {points.map((point) => {
        const isEndpointOpen = !isConnected(point, connectionMap);

        if (isEndpointOpen) return null;

        return null;
      })}
    </g>
  );
}

function JointIndicators({
  points,
  geometry,
  hideInteriorDetails = false,
}: {
  points: Point[];
  geometry: WallBandGeometry;
  hideInteriorDetails?: boolean;
}) {
  return (
    <g>
      {points.slice(1, -1).map((center, index) => {
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
              const edgeLength = distance(edge.a, edge.b);
              return (
                <line key={`left-measure-hit-${chainIndex}-${index}`} x1={layout.lineStart.x} y1={layout.lineStart.y} x2={layout.lineEnd.x} y2={layout.lineEnd.y} stroke="transparent" strokeWidth={40} pointerEvents="stroke" vectorEffect="non-scaling-stroke" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onMeasurementClick({ segmentStart: chain.points[index], segmentEnd: chain.points[index + 1], side: "left", currentEdgeLength: edgeLength, labelPoint: layout.labelPoint, rotation: layout.rotation }); }} />
              );
            })}
            {geometry.rightEdges.map((edge, index) => {
              const layout = getEdgeMeasurementLayout(edge.a, edge.b, "right");
              const edgeLength = distance(edge.a, edge.b);
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
  if (isDrawingTool(activeTool)) return null;

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
      width={126}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[118px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
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
          aria-label="Move selected wall"
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <Move className="h-5 w-5" />
        </button>

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
  const menuWidth = 118;
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
    <g
      className={onClick ? "cursor-text" : undefined}
      onPointerDown={(event) => {
        if (!onClick) return;

        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <line
        x1={layout.lineStart.x}
        y1={layout.lineStart.y}
        x2={layout.lineEnd.x}
        y2={layout.lineEnd.y}
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeDasharray="4 9"
        vectorEffect="non-scaling-stroke"
      />

      <line
        x1={layout.lineStart.x}
        y1={layout.lineStart.y}
        x2={layout.lineEnd.x}
        y2={layout.lineEnd.y}
        stroke="transparent"
        strokeWidth={18}
        pointerEvents={onClick ? "stroke" : "none"}
        vectorEffect="non-scaling-stroke"
      />

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
      className={onClick ? "cursor-text" : undefined}
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

function MeasurementEditPopover({

  edit,
  onChange,
  onCancel,
  onApply,
}: {
  edit: MeasurementEditState;
  onChange: (value: string) => void;
  onCancel: () => void;
  onApply: (value: string) => void;
}) {
  const popoverWidth = 108;
  const popoverHeight = 72;

  return (
    <foreignObject
      x={edit.position.x - popoverWidth / 2}
      y={edit.position.y - popoverHeight - 10}
      width={popoverWidth}
      height={popoverHeight}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex w-[108px] flex-col items-center gap-1 rounded-md border-2 border-[#0fb8d2] bg-white p-1 shadow-md">
        <input
          autoFocus
          value={edit.value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onApply(edit.value)}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.key === "Enter") {
              event.preventDefault();
              onApply(edit.value);
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          className="h-8 w-full rounded-sm border-0 bg-white px-2 text-center text-[15px] font-bold text-slate-950 outline-none"
        />

        <div className="flex h-6 items-center justify-center gap-1 text-slate-600">
          <button
            type="button"
            aria-label="Cancel measurement edit"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }}
            className="flex h-6 w-8 items-center justify-center rounded border border-slate-200 bg-slate-50 text-lg leading-none hover:bg-slate-100"
          >
            ←
          </button>

          <button
            type="button"
            aria-label="Apply measurement edit"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onApply(edit.value);
            }}
            className="flex h-6 w-8 items-center justify-center rounded border border-slate-200 bg-slate-50 text-lg leading-none hover:bg-slate-100"
          >
            ↔
          </button>

          <button
            type="button"
            aria-label="Apply measurement edit"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onApply(edit.value);
            }}
            className="flex h-6 w-8 items-center justify-center rounded border border-slate-200 bg-slate-50 text-lg leading-none hover:bg-slate-100"
          >
            →
          </button>
        </div>
      </div>
    </foreignObject>
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

function ContextPanel({
  activeTool,
  setActiveTool,
}: {
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
}) {
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
          onClick={() => setActiveTool("draw-wall")}
        />

        <ThinWallToolCard
          active={activeTool === "draw-thin-wall"}
          onClick={() => setActiveTool("draw-thin-wall")}
        />

        <ThinWallConversionButtons />
      </div>
    </aside>
  );
}

function ThinWallConversionButtons() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("pelican-create-wall-exterior"))}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-bold text-pelican-navy shadow-sm hover:border-pelican-teal hover:bg-slate-50"
      >
        Create wall exterior
      </button>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("pelican-create-wall-interior"))}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-bold text-pelican-navy shadow-sm hover:border-pelican-teal hover:bg-slate-50"
      >
        Create wall interior
      </button>
    </div>
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
        Draw Wall (W)
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

function MainToolbar({ active }: { active: Panel }) {
  return (
    <nav className="flex h-full w-[68px] shrink-0 flex-col items-center bg-white py-3">
      <div className="flex w-full flex-col items-center gap-0.5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;

          return (
            <button
              key={item.id}
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

function isThinWall(wall: Wall) { return wall.kind === "thin-wall"; }
function isThickWall(wall: Wall) { return wall.kind !== "thin-wall"; }
function isDrawingTool(tool: Tool) { return tool === "draw-wall" || tool === "draw-thin-wall"; }

function convertThinWallsToThickWalls(
  thinWalls: Wall[],
  mode: ThickWallCreationMode
) {
  const thinChains = buildWallChains(thinWalls);
  const convertedWalls: Wall[] = [];

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
      });
    }
  }

  return convertedWalls;
}

function getThickWallCenterlineFromThinGuide(
  thinGuidePoints: Point[],
  mode: ThickWallCreationMode
) {
  const offset = mode === "exterior" ? -WALL_THICKNESS / 2 : WALL_THICKNESS / 2;

  return buildOffsetSide(thinGuidePoints, offset);
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

  return walls.map((currentWall) => ({
    ...currentWall,
    start: samePoint(currentWall.start, oldPoint) ? newPoint : currentWall.start,
    end: samePoint(currentWall.end, oldPoint) ? newPoint : currentWall.end,
  }));
}

function formatFeetInchesForInput(pixelLength: number) {
  const totalInches = pixelsToInches(pixelLength);
  const feet = Math.floor(totalInches / 12);
  const inches = roundToQuarter(totalInches - feet * 12);

  return `${feet} ${formatDecimal(inches)}`;
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
  const unusedWalls = [...walls];
  const chains: { points: Point[] }[] = [];

  while (unusedWalls.length > 0) {
    const firstWall = unusedWalls.shift();

    if (!firstWall) break;

    const chain: Point[] = [firstWall.start, firstWall.end];

    let didExtend = true;

    while (didExtend) {
      didExtend = false;

      for (let index = 0; index < unusedWalls.length; index++) {
        const wall = unusedWalls[index];
        const head = chain[0];
        const tail = chain[chain.length - 1];

        if (samePoint(tail, wall.start)) {
          chain.push(wall.end);
          unusedWalls.splice(index, 1);
          didExtend = true;
          break;
        }

        if (samePoint(tail, wall.end)) {
          chain.push(wall.start);
          unusedWalls.splice(index, 1);
          didExtend = true;
          break;
        }

        if (samePoint(head, wall.end)) {
          chain.unshift(wall.start);
          unusedWalls.splice(index, 1);
          didExtend = true;
          break;
        }

        if (samePoint(head, wall.start)) {
          chain.unshift(wall.end);
          unusedWalls.splice(index, 1);
          didExtend = true;
          break;
        }
      }
    }

    chains.push({ points: chain });
  }

  return chains;
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
  side: "left" | "right"
): MeasurementLayout {
  const direction = sub(end, start);
  const baseNormal = normalize(perp(direction));
  const normal = side === "left" ? baseNormal : mul(baseNormal, -1);

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
    if (!isConnected(wall.start, connectionMap)) points.push(wall.start);
    if (!isConnected(wall.end, connectionMap)) points.push(wall.end);
  }

  return uniquePoints(points);
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
