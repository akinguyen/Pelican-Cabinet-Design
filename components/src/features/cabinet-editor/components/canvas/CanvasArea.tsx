"use client";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiRoomInput, GeneratedKitchenLayout } from "@/lib/ai/types";
import { PlacementFloorInteractionTarget, PlacementOnFloor, PlacementPlanSelectionOverlay, PlacementPreviewShape, PlacementSelectionOverlay, SelectedPlacementContextMenu, arePlacementsEqual, placementHandleTabsIntersectAnyWall, placementIntersectsAnyWall, detachedPanelWallIntersectsFloorPlacement, getPlacementMenuPosition, getPlacementPreview, getPlacementRuleViolationMessage, getCollisionSafeAdjacentPlacementSnappedCenter, getWallPlacementElevationOverlapMessage, getWallPlacementSupportedWall, getWallOverlapResolvedPlacementCenter, resolvePlacementDimensionChange } from "../placements/PlacementViews";
import { ElevationPlanView, applyWallPlacementStackSpacingOnPlacement, getPlacementCenterFromElevationDistance, getPlacementElevationCategory, getPlacementElevationDistanceMetrics, getPlacementFloorVisualLayerPriority, getPlacementPreviewFloorVisualLayerPriority, getElevationWallAxis, getInteriorMeasurementGuideSide, getOpeningElevationDistanceMetrics, getOpeningTFromElevationDistance, getPeninWallEndpointAttachment, getPeninWallMovePreview, getWallPlacementMode, getWallPlacementStackOverflowMessage, getWallElevationViewMode, measurementSideToWallFaceSide } from "../elevation/ElevationPlanView";
import { DoorOnWall, DoorPreview, RoomInteriorFill, SelectedDoorContextMenu, SelectedWindowContextMenu, SelectionAreaBox, WallAttachIndicator, WindowOnWall, WindowPreview } from "../openings/Openings";
import { EditorAlertModal, shouldSuppressEditorAlert } from "../shared/EditorAlertModal";
import { ThinWallGroupContextMenu } from "../sidebar/ContextPanel";
import { MeasurementEditModal, MeasurementGuideAnchorDebugDots, MoveControl, OpenEndpoint, PeninWallLine, PeninWallSelectionOverlay, SelectedWallContextMenu, SelectedWallOverlay, ThinJointDot, ThinOpenEndpoint, ThinWallDrawingOverlay, ThinWallLine, WallChain, WallDrawingOverlay, WallSelectionHitAreas, getWallMenuPosition } from "../walls/Walls";
import { OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES, OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES } from "../../constants/placementConstants";
import { GRID_SIZE, MAX_ZOOM, MIN_ZOOM, MOVE_STEP, SNAP_THRESHOLD, WORKSPACE_HEIGHT, WORKSPACE_WIDTH, ZOOM_INTENSITY } from "../../constants/editorConstants";
import { DEFAULT_DOOR_WIDTH, DEFAULT_WINDOW_WIDTH } from "../../constants/openingConstants";
import { WALL_STROKE_WIDTH, WALL_THICKNESS } from "../../constants/wallConstants";
import { PLACEMENT_CATALOG, getBlindCabinetWidthSegments, getDefaultBlindCabinetDoorWidthInches, getDefaultBottomDrawerProductLayout, getDefaultOvenCabinetProductHeightInches, getOvenCabinetHeightSegments, isBlindCabinetImage, isBuiltInSinkCabinetImage, isOvenLikeBottomDrawerCabinetImage, normalizeBlindCabinetSettings, normalizeSpecialCabinetState } from "../../data/placementCatalog";
import { getPlacementElementType, getPlacementElementTypeForCatalogItem, getSupportTypeForCategory, isAccessoryPlacementImage, isElevationFloatingPlacement, withPlacementElementType } from "../../engine/placementClassification";
import { add, placementIntersectsSelectionRect, placementSnapRotationToTick, clamp, degreesToRadians, distance, dot, getAngleDegrees, getSelectionRect, getWallAttachPoint, inchesToPixels, mul, normalize, normalizeDegrees, perp, pixelsToInches, pointKey, pointToSegmentDistance, samePoint, sub, vectorLength, wallIntersectsSelectionRect } from "../../engine/geometry";
import { areDoorsEqual, areWindowsEqual, getDoorMenuPosition, getDoorPlacementPreviewForPoint, getWindowMenuPosition, getWindowPlacementPreviewForPoint, getWindowTabSideFacingMeasurementGuide, measurementSideMatchesStructureGuide, segmentMatchesWall } from "../../engine/openingEngine";
import { areWallsEqual, buildConnectionMap, buildWallChains, canConvertThinWallSelection, convertThinWallsToThickWalls, formatFeetInchesForInput, getConnectedEndpoints, getOpenEndpoints, getWallEndpoints, getWallSegmentBlackDotGeometry, isDetachedPanelWall, isDrawingTool, isIslandWall, isThickWall, isThinWall, normalizeWallJunctions, parseFeetInchesToPixels, resizeWallFromMeasurement, snapToGrid, splitConnectedWallsAndAddWall } from "../../engine/wallEngine";
import { downloadJsonFile, readUnknownJsonFile } from "../../services/fileJson";
import { normalizeImportedKitchenPlan } from "../../services/importedKitchenPlan";
import { addEditorElevationWidthsToRoom, exportAiRoomInputFromEditor, getEditorPlacementCatalogItem, withSmartInputCatalog } from "../../services/smartKitchenExport";
import { buildWorkspaceReturnPlacements } from "../../services/workspaceReturnLayout";
import {
  SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID,
  createSmartKitchenWorkspaceDraft,
  saveSmartKitchenWorkspaceDraft,
} from "../../../../../../src/features/generate-smart-kitchen/utils/workspaceDraftStorage";
import type { PlacementCatalogItem, PlacementCategory, PlacementDimensionSet, PlacementDragState, PlacementElement, PlacementPreview, PlacementRotateState, DoorDragState, DoorElement, DoorPlacementPreview, EditorSnapshot, GroupContextMenuState, GroupDragState, GuideInfo, ImportedKitchenPlacement, MeasurementClickPayload, MeasurementEditState, MeasurementSide, MenuDragState, OvenCabinetProductLayout, PeninWallDragState, PeninWallResizeState, PeninWallRotateState, PlanViewMode, Point, ThickWallCreationMode, Tool, Wall, WallPlacementMode, WallPlacementStackPlacementResult, WallElevationViewMode, WallFaceSide, WindowDragState, WindowElement, WindowPlacementPreview } from "../../types/editorTypes";

export function CanvasArea({
  activeTool,
  setActiveTool,
  planViewMode,
  isSelectionMode,
  setIsSelectionMode,
  offset,
  scale,
  setOffset,
  setScale,
  selectedPlacementWidth,
  selectedPlacementDepth,
  selectedPlacementCategory,
  selectedPlacementCatalogItem,
  showElevationMeasurements,
  smartKitchenFeedback,
  onSmartKitchenOutput,
  loadedRoom = null,
  workspaceReturnLayout = null,
  onWorkspaceReturnLayoutApplied,
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
  selectedPlacementWidth: number;
  selectedPlacementDepth: number;
  selectedPlacementCategory: PlacementCategory;
  selectedPlacementCatalogItem: PlacementCatalogItem;
  showElevationMeasurements: boolean;
  smartKitchenFeedback: string;
  onSmartKitchenOutput?: (payload: unknown | null) => void;
  loadedRoom?: AiRoomInput | null;
  workspaceReturnLayout?: GeneratedKitchenLayout | null;
  onWorkspaceReturnLayoutApplied?: () => void;
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
  // PlacementElement
  const [placements, setPlacements] = useState<PlacementElement[]>([]);
  const placementsRef = useRef<PlacementElement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const selectedPlacementIdRef = useRef<string | null>(null);
  const smartKitchenFeedbackRef = useRef(smartKitchenFeedback);
  const resolveImportedPlacementMeasurementSide = useCallback(
    (
      wall: Wall,
      importedWallFace: ImportedKitchenPlacement["wallFace"]
    ): Exclude<MeasurementSide, "length"> => {
      const thickWalls = wallsRef.current.filter(isThickWall);
      const interiorSide = getInteriorMeasurementGuideSide(wall, thickWalls);
      return importedWallFace === "exterior"
        ? interiorSide === "left"
          ? "right"
          : "left"
        : interiorSide;
    },
    []
  );
  const resolveImportedPlacementWallFace = useCallback(
    (
      wall: Wall,
      importedWallFace: ImportedKitchenPlacement["wallFace"]
    ): WallFaceSide => {
      return measurementSideToWallFaceSide(
        wall,
        resolveImportedPlacementMeasurementSide(wall, importedWallFace)
      );
    },
    [resolveImportedPlacementMeasurementSide]
  );
  const getImportedWallFacePlacementGeometry = useCallback(
    (
      wall: Wall,
      importedWallFace: ImportedKitchenPlacement["wallFace"],
      wallFace: WallFaceSide
    ) => {
      const thickWalls = wallsRef.current.filter(isThickWall);
      const geometry = getWallSegmentBlackDotGeometry(
        wall.start,
        wall.end,
        thickWalls
      );
      const measurementSide = resolveImportedPlacementMeasurementSide(
        wall,
        importedWallFace
      );
      const rawFaceStartAnchor =
        measurementSide === "left" ? geometry.startLeft : geometry.startRight;
      const rawFaceEndAnchor =
        measurementSide === "left" ? geometry.endLeft : geometry.endRight;
      const faceVector = sub(rawFaceEndAnchor, rawFaceStartAnchor);
      const faceLength = vectorLength(faceVector);
      const faceNormal = wallFace === "left" ? getElevationWallAxis(wall).normal : mul(getElevationWallAxis(wall).normal, -1);
      const viewDirection = mul(faceNormal, -1);
      const viewerRight = normalize(perp(viewDirection));
      const startProjection = dot(rawFaceStartAnchor, viewerRight);
      const endProjection = dot(rawFaceEndAnchor, viewerRight);
      const displayOrigin =
        startProjection <= endProjection ? rawFaceStartAnchor : rawFaceEndAnchor;

      return {
        displayOrigin,
        viewerRight,
        faceNormal,
        faceLength,
      };
    },
    [resolveImportedPlacementMeasurementSide]
  );
  const [placementPreview, setPlacementPreview] = useState<PlacementPreview | null>(null);
  const placementPreviewRef = useRef<PlacementPreview | null>(null);
  const placementDragRef = useRef<PlacementDragState | null>(null);
  const placementRotateRef = useRef<PlacementRotateState | null>(null);
  const [isPlacementRotating, setIsPlacementRotating] = useState(false);
  const [isPlacementDragging, setIsPlacementDragging] = useState(false);
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
  const [groupSelectedPlacementIds, setGroupSelectedPlacementIds] = useState<string[]>([]);
  const [groupContextMenu, setGroupContextMenu] =
    useState<GroupContextMenuState | null>(null);
  const [activeElevationIndex, setActiveElevationIndex] = useState(0);
  const [editorAlert, setEditorAlert] = useState<{ title: string; message: string } | null>(null);

  const showEditorAlert = useCallback((message: string, title = "Placement warning") => {
    if (shouldSuppressEditorAlert(message)) return;
    setEditorAlert({ title, message });
  }, []);

  const buildSmartKitchenRoomExport = useCallback(() => {
    return addEditorElevationWidthsToRoom(
      withSmartInputCatalog(
        exportAiRoomInputFromEditor({
          walls: wallsRef.current,
          windows: windowsRef.current,
          doors: doorsRef.current,
          placements: placementsRef.current,
        })
      ),
      wallsRef.current,
      placementsRef.current,
      windowsRef.current,
      doorsRef.current
    );
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
    placementsRef.current = [];
    setWalls(nextWalls);
    setWindows(nextWindows);
    setDoors(nextDoors);
    setPlacements([]);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setSelectedWallId(null);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedPlacementId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedPlacementIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setDrawingStart(null);
    setPreviewPoint(null);
    windowPreviewRef.current = null;
    doorPreviewRef.current = null;
    placementPreviewRef.current = null;
    setWindowPreview(null);
    setDoorPreview(null);
    setPlacementPreview(null);
    setActiveElevationIndex(0);
  }, [loadedRoom]);

  useEffect(() => {
    const handleExportRoomRequest = () => {
      const room = buildSmartKitchenRoomExport();

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
  }, [buildSmartKitchenRoomExport, showEditorAlert]);

  useEffect(() => {
    const handleStoreSmartKitchenWorkspaceDraftRequest = (
      event: Event
    ) => {
      const customEvent = event as CustomEvent<{ didStore: boolean }>;
      const room = buildSmartKitchenRoomExport();

      if (room.walls.length === 0) {
        showEditorAlert(
          "Draw thin walls and convert them into thick walls first, then open the Smart Kitchen workspace.",
          "Workspace handoff blocked"
        );
        return;
      }

      saveSmartKitchenWorkspaceDraft(
        createSmartKitchenWorkspaceDraft(room, {
          projectId: SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID,
          fileName: "pelican-smart-kitchen-editor-room-export.json",
        })
      );

      if (customEvent.detail) {
        customEvent.detail.didStore = true;
      }
    };

    window.addEventListener(
      "pelican-ai-store-smart-kitchen-workspace-draft-request",
      handleStoreSmartKitchenWorkspaceDraftRequest
    );

    return () => {
      window.removeEventListener(
        "pelican-ai-store-smart-kitchen-workspace-draft-request",
        handleStoreSmartKitchenWorkspaceDraftRequest
      );
    };
  }, [buildSmartKitchenRoomExport, showEditorAlert]);

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

  // selectedPlacement
  const selectedPlacement = useMemo(() => {
    return placements.find((placementItem) => placementItem.id === selectedPlacementId) ?? null;
  }, [placements, selectedPlacementId]);

  const groupSelectedWalls = useMemo(() => {
    const selectedIds = new Set(groupSelectedWallIds);
    return walls.filter((wall) => selectedIds.has(wall.id));
  }, [groupSelectedWallIds, walls]);

  const groupSelectedPlacements = useMemo(() => {
    const selectedIds = new Set(groupSelectedPlacementIds);
    return placements.filter((placementItem) => selectedIds.has(placementItem.id));
  }, [placements, groupSelectedPlacementIds]);

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

  // updatePlacementPreview
  const updatePlacementPreview = useCallback((preview: PlacementPreview | null) => {
    const nextPreview =
      preview && activeToolRef.current === "place-placement" && !preview.image
        ? { ...preview, image: selectedPlacementCatalogItem.image }
        : preview;

    placementPreviewRef.current = nextPreview;
    setPlacementPreview(nextPreview);
  }, [selectedPlacementCatalogItem.image]);

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


  // commitPlacementsChange
  const commitPlacementsChange = useCallback(
    (updater: PlacementElement[] | ((currentPlacements: PlacementElement[]) => PlacementElement[])) => {
      const currentWalls = wallsRef.current;
      const currentWindows = windowsRef.current;
      const currentDoors = doorsRef.current;
      const currentPlacements = placementsRef.current;
      const nextPlacements =
        typeof updater === "function" ? updater(currentPlacements) : updater;

      if (arePlacementsEqual(currentPlacements, nextPlacements)) return;

      undoStackRef.current.push({
        walls: currentWalls,
        windows: currentWindows,
        doors: currentDoors,
        placements: currentPlacements,
      });
      redoStackRef.current = [];
      placementsRef.current = nextPlacements;
      setPlacements(nextPlacements);
    },
    []
  );

  useEffect(() => {
    if (!loadedRoom || !workspaceReturnLayout) {
      return;
    }

    const restoredPlacements = buildWorkspaceReturnPlacements(workspaceReturnLayout);

    if (restoredPlacements.length > 0) {
      commitPlacementsChange(() => restoredPlacements);
    }

    setSelectedPlacementId(null);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedWallId(null);
    setGroupSelectedPlacementIds([]);
    setGroupSelectedWallIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    updatePlacementPreview(null);
    updateDoorPreview(null);
    updateWindowPreview(null);
    onWorkspaceReturnLayoutApplied?.();
  }, [
    loadedRoom,
    workspaceReturnLayout,
    commitPlacementsChange,
    onWorkspaceReturnLayoutApplied,
    updateDoorPreview,
    updatePlacementPreview,
    updateWindowPreview,
  ]);

  const buildImportedKitchenPlacement = useCallback(
    (
      wall: Wall,
      importedPlacement: ImportedKitchenPlacement,
      catalogItem: PlacementCatalogItem
    ): PlacementElement => {
      const wallFace = resolveImportedPlacementWallFace(wall, importedPlacement.wallFace);
      const { displayOrigin, viewerRight, faceNormal, faceLength } =
        getImportedWallFacePlacementGeometry(wall, importedPlacement.wallFace, wallFace);
      const spanWidthInches = importedPlacement.widthInches ?? catalogItem.widthInches;
      const projectionDepthInches =
        importedPlacement.depthInches ?? catalogItem.depthInches;
      const heightInches =
        importedPlacement.heightInches ??
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
          : importedPlacement.bottomInches ??
            catalogItem.defaultDistanceFromFloorInches ??
            (catalogItem.category === "wall" ? 54 : 0);
      const widthPixels = inchesToPixels(spanWidthInches);
      const depthPixels = inchesToPixels(projectionDepthInches);
      const maxDisplayStartPixels = Math.max(0, faceLength - widthPixels);
      const displayStartPixels = clamp(
        inchesToPixels(importedPlacement.leftInches),
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
      const preview = getPlacementPreview(
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

      const placement: PlacementElement = {
        id: crypto.randomUUID(),
        center,
        width: widthPixels,
        depth: depthPixels,
        rotation,
        placementType: getPlacementElementTypeForCatalogItem(catalogItem),
        category: catalogItem.category,
        productCategory: catalogItem.productCategory,
        catalogId: catalogItem.id,
        image: catalogItem.image,
        heightInches,
        distanceFromFloorInches: bottomInches,
        wallId: preview.wallId ?? wall.id,
        wallFace: preview.wallFace ?? wallFace,
        sinkFixture:
          importedPlacement.topOption === "sink" || isBuiltInSinkCabinetImage(catalogItem.image)
            ? true
            : undefined,
        cooktopFixture:
          importedPlacement.topOption === "surface-cooktop"
            ? "surface"
            : importedPlacement.topOption === "front-control-cooktop"
              ? "front"
              : undefined,
        cooktopFrontHeightInches:
          importedPlacement.topOption === "front-control-cooktop" ? 3 : undefined,
        blindDoorWidthInches: isBlindCabinetImage(catalogItem.image)
          ? getDefaultBlindCabinetDoorWidthInches(
              spanWidthInches,
              catalogItem.category
            )
          : undefined,
        blindFillerWidthInches: isBlindCabinetImage(catalogItem.image)
          ? importedPlacement.builtInFillerWidthInches ?? 3
          : undefined,
        ovenCabinetProductLayout: getDefaultBottomDrawerProductLayout(catalogItem.image),
        ovenCabinetProductHeightInches:
          isOvenLikeBottomDrawerCabinetImage(catalogItem.image)
            ? getDefaultOvenCabinetProductHeightInches(heightInches)
            : undefined,
      };

      return normalizeSpecialCabinetState(placement);
    },
    [getImportedWallFacePlacementGeometry, resolveImportedPlacementWallFace]
  );

  useEffect(() => {
    const handleDownloadSmartKitchenInputRequest = async () => {
      const room = addEditorElevationWidthsToRoom(
        withSmartInputCatalog(
          exportAiRoomInputFromEditor({
            walls: wallsRef.current,
            windows: windowsRef.current,
            doors: doorsRef.current,
            placements: placementsRef.current,
          })
        ),
        wallsRef.current,
        placementsRef.current,
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

      downloadJsonFile("pelican-smart-kitchen-editor-room-export.json", {
        room,
        designerFeedback: smartKitchenFeedbackRef.current.trim() || undefined,
        exportedFor: "generate-smart-kitchen-workspace",
      });
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
  }, [showEditorAlert]);

  // Deprecated: immediate editor-side smart kitchen generation was removed in favor of
  // navigating from the editor into the Generate Smart Kitchen workspace.


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

      const importedPlacements: PlacementElement[] = [];

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
          const catalogItem = PLACEMENT_CATALOG.find(
            (item) => item.id === placement.catalogId
          );
          if (!catalogItem) continue;
          importedPlacements.push(
            buildImportedKitchenPlacement(wall, placement, catalogItem)
          );
        }
      }

      if (importedPlacements.length === 0) {
        return false;
      }

      commitPlacementsChange(() => importedPlacements);
      setSelectedPlacementId(null);
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setSelectedWallId(null);
      setGroupSelectedPlacementIds([]);
      setGroupSelectedWallIds([]);
      setGroupContextMenu(null);
      setMenuPosition(null);
      updatePlacementPreview(null);
      updateDoorPreview(null);
      updateWindowPreview(null);

      const room = addEditorElevationWidthsToRoom(
        withSmartInputCatalog(
          exportAiRoomInputFromEditor({
            walls: wallsRef.current,
            windows: windowsRef.current,
            doors: doorsRef.current,
            placements: importedPlacements,
          })
        ),
        wallsRef.current,
        importedPlacements,
        windowsRef.current,
        doorsRef.current
      );

      onSmartKitchenOutput?.(rawPlan);

      window.dispatchEvent(
        new CustomEvent("pelican-ai-kitchen-generated", {
          detail: {
            room,
            cabinets: importedPlacements,
            summary: {
              layoutType: importedPlan.layoutType ?? "single-wall",
              notes: [
                options?.importNote ?? "Kitchen imported from debug output JSON.",
                ...(importedPlan.notes ?? []),
              ],
              selectedWallIds: thickWalls.map((wall) => wall.id),
              generationMethod: "smart-ai",
              plannerModel: options?.plannerModel ?? "imported-ai-output",
            },
            elevations: thickWalls.map((wall, index) => ({
              wallId: wall.id,
              label: wallLabelLookup.get(wall.id) ?? `Wall ${index + 1}`,
              cabinetCount: importedPlacements.filter(
                (placement) => placement.wallId === wall.id
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
        importNote: "Kitchen imported from debug output JSON.",
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
        "The imported kitchen JSON did not produce any drawable placements in the current room.",
        "Import kitchen failed"
      );
    },
    [
      applyImportedKitchenPlan,
      showEditorAlert,
    ]
  );

  useEffect(() => {
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
  }, [importKitchenFromOutputPlan, showEditorAlert]);

  const undoWallChange = useCallback(() => {
    const previousSnapshot = undoStackRef.current.pop();

    if (!previousSnapshot) return;

    const currentSnapshot = {
      walls: wallsRef.current,
      windows: windowsRef.current,
      doors: doorsRef.current,
      placements: placementsRef.current,
    };

    redoStackRef.current.push(currentSnapshot);
    wallsRef.current = previousSnapshot.walls;
    windowsRef.current = previousSnapshot.windows;
    doorsRef.current = previousSnapshot.doors ?? [];
    placementsRef.current = previousSnapshot.placements ?? placementsRef.current;
    setWalls(previousSnapshot.walls);
    setWindows(previousSnapshot.windows);
    setDoors(previousSnapshot.doors ?? []);
    setPlacements(previousSnapshot.placements ?? placementsRef.current);
    clearWallSelectionState();
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedPlacementId(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updatePlacementPreview(null);
  }, [clearWallSelectionState, updatePlacementPreview, updateDoorPreview, updateWindowPreview]);

  const redoWallChange = useCallback(() => {
    const nextSnapshot = redoStackRef.current.pop();

    if (!nextSnapshot) return;

    const currentSnapshot = {
      walls: wallsRef.current,
      windows: windowsRef.current,
      doors: doorsRef.current,
      placements: placementsRef.current,
    };

    undoStackRef.current.push(currentSnapshot);
    wallsRef.current = nextSnapshot.walls;
    windowsRef.current = nextSnapshot.windows;
    doorsRef.current = nextSnapshot.doors ?? [];
    placementsRef.current = nextSnapshot.placements ?? placementsRef.current;
    setWalls(nextSnapshot.walls);
    setWindows(nextSnapshot.windows);
    setDoors(nextSnapshot.doors ?? []);
    setPlacements(nextSnapshot.placements ?? placementsRef.current);
    clearWallSelectionState();
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedPlacementId(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updatePlacementPreview(null);
  }, [clearWallSelectionState, updatePlacementPreview, updateDoorPreview, updateWindowPreview]);

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

  // placementsRef
  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  // selectedPlacementIdRef
  useEffect(() => {
    selectedPlacementIdRef.current = selectedPlacementId;
  }, [selectedPlacementId]);

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
      ? getOpeningElevationDistanceMetrics(selectedWindow, walls, placements)
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
  }, [selectedWindow, walls, placements]);

  useEffect(() => {
    const wallDistanceMetrics = selectedDoor
      ? getOpeningElevationDistanceMetrics(selectedDoor, walls, placements)
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
  }, [selectedDoor, walls, placements]);

  useEffect(() => {
    const category = selectedPlacement ? getPlacementElevationCategory(selectedPlacement) : null;
    const wallDistanceMetrics = selectedPlacement
      ? getPlacementElevationDistanceMetrics(selectedPlacement, walls, placements)
      : null;
    const catalogItem = selectedPlacement ? getEditorPlacementCatalogItem(selectedPlacement) : null;
    const detail = selectedPlacement
      ? {
          id: selectedPlacement.id,
          catalogId: selectedPlacement.catalogId ?? catalogItem?.id,
          widthInches: pixelsToInches(selectedPlacement.width),
          depthInches: pixelsToInches(selectedPlacement.depth),
          heightInches:
            selectedPlacement.heightInches ??
            catalogItem?.heightInches ??
            (category === "wall" ? 30 : 36),
          distanceFromFloorInches:
            selectedPlacement.distanceFromFloorInches ??
            (isElevationFloatingPlacement(selectedPlacement) ? 54 : 0),
          ...(wallDistanceMetrics ?? {}),
          placementType: getPlacementElementType(selectedPlacement),
          category: category ?? undefined,
          productCategory: selectedPlacement.productCategory,
          image: selectedPlacement.image,
          sinkFixture: selectedPlacement.sinkFixture,
          cooktopFixture: selectedPlacement.cooktopFixture,
          cooktopFrontHeightInches: selectedPlacement.cooktopFrontHeightInches,
          blindDoorWidthInches: isBlindCabinetImage(selectedPlacement.image)
            ? getBlindCabinetWidthSegments(selectedPlacement).doorWidthInches
            : undefined,
          blindFillerWidthInches: isBlindCabinetImage(selectedPlacement.image)
            ? getBlindCabinetWidthSegments(selectedPlacement).fillerWidthInches
            : undefined,
          ovenCabinetProductLayout: selectedPlacement.ovenCabinetProductLayout ?? "none",
          ovenCabinetProductHeightInches:
            getOvenCabinetHeightSegments(selectedPlacement).productHeightInches,
          ovenCabinetFillerHeightInches:
            getOvenCabinetHeightSegments(selectedPlacement).fillerHeightInches,
          ovenCabinetBottomDrawerHeightInches:
            getOvenCabinetHeightSegments(selectedPlacement).bottomDrawerHeightInches,
        }
      : null;

    window.dispatchEvent(
      new CustomEvent("pelican-placement-selection-change", { detail })
    );
  }, [selectedPlacement, walls, placements]);

  useEffect(() => {
    const detail = selectedWall
      ? {
          id: selectedWall.id,
          kind: selectedWall.kind ?? "wall",
          elevationViewMode: getWallElevationViewMode(selectedWall),
          placementMode: getWallPlacementMode(selectedWall),
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
              placementsRef.current
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
              placementsRef.current
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

    const handleWallNeedPlacementChange = (event: Event) => {
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
                needPlacement: value,
                placementMode: value
                  ? getWallPlacementMode(wall) === "none"
                    ? "interior"
                    : getWallPlacementMode(wall)
                  : "none",
              }
            : wall
        )
      );
    };

    const handleWallPlacementModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        value: WallPlacementMode;
      }>;

      const { id, value } = customEvent.detail ?? {};
      if (!id || !value) return;

      commitWallsChange((currentWalls) =>
        currentWalls.map((wall) =>
          wall.id === id ? { ...wall, placementMode: value } : wall
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
      "pelican-wall-need-placement-change",
      handleWallNeedPlacementChange
    );
    window.addEventListener(
      "pelican-wall-placement-mode-change",
      handleWallPlacementModeChange
    );
    window.addEventListener("pelican-deselect-wall", handleWallDeselect);

    return () => {
      window.removeEventListener(
        "pelican-wall-elevation-view-change",
        handleWallElevationViewChange
      );
      window.removeEventListener(
        "pelican-wall-need-placement-change",
        handleWallNeedPlacementChange
      );
      window.removeEventListener(
        "pelican-wall-placement-mode-change",
        handleWallPlacementModeChange
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
              placementsRef.current
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
              placementsRef.current
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
    const handlePlacementAttributeChange = (event: Event) => {
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
          | PlacementDimensionSet
          | boolean
          | "surface"
          | "front"
          | "none"
          | OvenCabinetProductLayout
          | null;
      }>;

      const { id, field, value } = customEvent.detail ?? {};

      if (!id) return;

      const isNumericPlacementField =
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

      if (isNumericPlacementField && !Number.isFinite(Number(value))) return;

      commitPlacementsChange((currentPlacements) =>
        currentPlacements.map((placementItem) => {
          if (placementItem.id !== id) return placementItem;

          if (field === "dimensions") {
            const nextDimension = value as PlacementDimensionSet;
            if (
              !nextDimension ||
              !Number.isFinite(nextDimension.widthInches) ||
              !Number.isFinite(nextDimension.heightInches) ||
              !Number.isFinite(nextDimension.depthInches)
            ) {
              return placementItem;
            }

            const nextWidthPixels = inchesToPixels(Math.max(isAccessoryPlacementImage(placementItem.image) ? 0.25 : 6, nextDimension.widthInches));
            const nextDepthPixels = inchesToPixels(Math.max(1, nextDimension.depthInches));
            const nextHeightInches = Math.max(1, nextDimension.heightInches);

            let nextPlacement = resolvePlacementDimensionChange(
              placementItem,
              { ...placementItem, width: nextWidthPixels },
              wallsRef.current,
              currentPlacements
            );
            nextPlacement = resolvePlacementDimensionChange(
              nextPlacement,
              { ...nextPlacement, depth: nextDepthPixels },
              wallsRef.current,
              currentPlacements.map((candidate) =>
                candidate.id === id ? nextPlacement : candidate
              )
            );
            nextPlacement = {
              ...nextPlacement,
              heightInches: nextHeightInches,
              distanceFromFloorInches: getSupportTypeForCategory(
                getPlacementElevationCategory(nextPlacement),
                pixelsToInches(nextPlacement.width),
                nextHeightInches
              ) === "floor-supported"
                ? 0
                : nextPlacement.distanceFromFloorInches,
            };
            if (isBlindCabinetImage(nextPlacement.image)) {
              nextPlacement = {
                ...nextPlacement,
                blindDoorWidthInches: getDefaultBlindCabinetDoorWidthInches(
                  nextDimension.widthInches,
                  getPlacementElevationCategory(nextPlacement)
                ),
                blindFillerWidthInches: 3,
              };
            }
            if (isOvenLikeBottomDrawerCabinetImage(nextPlacement.image)) {
              nextPlacement = {
                ...nextPlacement,
                ovenCabinetProductHeightInches: getDefaultOvenCabinetProductHeightInches(
                  nextHeightInches
                ),
                ovenCabinetFillerHeightInches:
                  OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES,
                ovenCabinetBottomDrawerHeightInches:
                  OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES,
              };
            }
            nextPlacement = normalizeSpecialCabinetState(nextPlacement);

            if (isElevationFloatingPlacement(nextPlacement)) {
              const candidatePlacements = currentPlacements.map((candidate) =>
                candidate.id === id ? nextPlacement : candidate
              );
              const stackMessage = getWallPlacementStackOverflowMessage(candidatePlacements, wallsRef.current, id);
              if (stackMessage) {
                showEditorAlert(stackMessage);
                return placementItem;
              }
            }

            return nextPlacement;
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
              ...placementItem,
              sinkFixture: isBuiltInSinkCabinetImage(placementItem.image)
                ? placementItem.sinkFixture
                : false,
              cooktopFixture: nextCooktopFixture,
              cooktopFrontHeightInches: nextCooktopFixture === "front"
                ? placementItem.cooktopFrontHeightInches ?? 6
                : placementItem.cooktopFrontHeightInches,
            };
          }

          if (field === "sinkFixture") {
            const hasSink = Boolean(value);
            return {
              ...placementItem,
              sinkFixture: hasSink,
              cooktopFixture: hasSink ? undefined : placementItem.cooktopFixture,
            };
          }

          if (field === "cooktopFixture") {
            const nextCooktopFixture = value === "surface" || value === "front" ? value : undefined;
            return {
              ...placementItem,
              sinkFixture: nextCooktopFixture ? false : placementItem.sinkFixture,
              cooktopFixture: nextCooktopFixture,
              cooktopFrontHeightInches: nextCooktopFixture === "front"
                ? placementItem.cooktopFrontHeightInches ?? 6
                : placementItem.cooktopFrontHeightInches,
            };
          }

          if (field === "cooktopFrontHeightInches") {
            return {
              ...placementItem,
              cooktopFrontHeightInches: Math.max(1, Number(value) || 1),
            };
          }

          if (field === "blindDoorWidthInches") {
            const { widthInches, fillerWidthInches } =
              getBlindCabinetWidthSegments(placementItem);
            return normalizeBlindCabinetSettings({
              ...placementItem,
              blindDoorWidthInches: clamp(
                Number(value) || 0,
                0,
                Math.max(0, widthInches - fillerWidthInches - 3)
              ),
            });
          }

          if (field === "blindFillerWidthInches") {
            const { widthInches, doorWidthInches } =
              getBlindCabinetWidthSegments(placementItem);
            return normalizeBlindCabinetSettings({
              ...placementItem,
              blindFillerWidthInches: clamp(
                Number(value) || 0,
                0,
                Math.max(0, widthInches - doorWidthInches - 3)
              ),
            });
          }

          if (field === "ovenCabinetProductLayout") {
            return {
              ...placementItem,
              ovenCabinetProductLayout: (value as OvenCabinetProductLayout) ?? "none",
            };
          }

          if (field === "ovenCabinetProductHeightInches") {
            const { totalHeightInches, bottomDrawerHeightInches } =
              getOvenCabinetHeightSegments(placementItem);
            const nextProductHeightInches = clamp(
              Number(value) || 0,
              0,
              Math.max(0, totalHeightInches - bottomDrawerHeightInches)
            );
            return {
              ...placementItem,
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
              getOvenCabinetHeightSegments(placementItem);
            const nextFillerHeightInches = clamp(
              Number(value) || 0,
              0,
              Math.max(0, totalHeightInches - bottomDrawerHeightInches)
            );
            return {
              ...placementItem,
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
              getOvenCabinetHeightSegments(placementItem);
            const nextDrawerHeightInches = clamp(
              Number(value) || 0,
              0,
              Math.max(0, totalHeightInches - productHeightInches)
            );
            return {
              ...placementItem,
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
            const metrics = getPlacementElevationDistanceMetrics(
              placementItem,
              wallsRef.current,
              currentPlacements
            );
            if (!metrics) return placementItem;

            const objectWidthInches = Math.max(
              0,
              metrics.wallWidthInches - metrics.distanceFromLeftInches - metrics.distanceFromRightInches
            );
            const displayStartInches = field === "distanceFromLeftInches"
              ? Number(value)
              : metrics.wallWidthInches - objectWidthInches - Number(value);
            const nextCenter = getPlacementCenterFromElevationDistance(
              placementItem,
              wallsRef.current,
              currentPlacements,
              displayStartInches
            );

            return nextCenter ? { ...placementItem, center: nextCenter } : placementItem;
          }

          if (field === "distanceFromFloorInches") {
            if (!isElevationFloatingPlacement(placementItem)) {
              return { ...placementItem, distanceFromFloorInches: 0 };
            }

            const nextPlacement = {
              ...placementItem,
              distanceFromFloorInches: Math.max(0, Number(value)),
            };

            if (isElevationFloatingPlacement(nextPlacement)) {
              const candidatePlacements = currentPlacements.map((candidate) =>
                candidate.id === id ? nextPlacement : candidate
              );
              const stackMessage = getWallPlacementStackOverflowMessage(candidatePlacements, wallsRef.current, id);
              if (stackMessage) {
                showEditorAlert(stackMessage);
                return placementItem;
              }
            }

            return nextPlacement;
          }

          if (field === "widthInches") {
            const minWidthInches = isAccessoryPlacementImage(placementItem.image) ? 0.25 : 6;
            return resolvePlacementDimensionChange(
              placementItem,
              { ...placementItem, width: inchesToPixels(Math.max(minWidthInches, Number(value))) },
              wallsRef.current,
              currentPlacements
            );
          }

          if (field === "depthInches") {
            return resolvePlacementDimensionChange(
              placementItem,
              { ...placementItem, depth: inchesToPixels(Math.max(1, Number(value))) },
              wallsRef.current,
              currentPlacements
            );
          }

          const nextHeightInches = Math.max(1, Number(value));
          const nextPlacement = {
            ...placementItem,
            heightInches: nextHeightInches,
            distanceFromFloorInches: getSupportTypeForCategory(
              getPlacementElevationCategory(placementItem),
              pixelsToInches(placementItem.width),
              nextHeightInches
            ) === "floor-supported"
              ? 0
              : placementItem.distanceFromFloorInches,
          };
          const normalizedNextPlacement =
            normalizeSpecialCabinetState(nextPlacement);
          if (isElevationFloatingPlacement(normalizedNextPlacement)) {
            const candidatePlacements = currentPlacements.map((candidate) =>
              candidate.id === id ? normalizedNextPlacement : candidate
            );
            const stackMessage = getWallPlacementStackOverflowMessage(candidatePlacements, wallsRef.current, id);
            if (stackMessage) {
              showEditorAlert(stackMessage);
              return placementItem;
            }
          }

          return normalizedNextPlacement;
        })
      );
    };

    const handlePlacementDeselect = () => {
      setSelectedPlacementId(null);
      setGroupSelectedPlacementIds([]);
      updatePlacementPreview(null);
    };

    window.addEventListener("pelican-placement-attribute-change", handlePlacementAttributeChange);
    window.addEventListener("pelican-deselect-placement", handlePlacementDeselect);

    return () => {
      window.removeEventListener("pelican-placement-attribute-change", handlePlacementAttributeChange);
      window.removeEventListener("pelican-deselect-placement", handlePlacementDeselect);
    };
  }, [commitPlacementsChange, showEditorAlert, updatePlacementPreview]);

  useEffect(() => {
    if (isDrawingTool(activeTool) && isSelectionMode) {
      setIsSelectionMode(false);
      setGroupSelectedWallIds([]);
      setGroupSelectedPlacementIds([]);
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
    updatePlacementPreview(null);
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
      (isDrawingTool(activeToolRef.current) || activeToolRef.current === "place-window" || activeToolRef.current === "place-door" || activeToolRef.current === "place-placement")
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
      setSelectedPlacementId(null);
      setMenuPosition(null);
      setGroupSelectedWallIds([]);
      setGroupSelectedPlacementIds([]);
      setGroupContextMenu(null);
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelectingArea(false);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      (groupSelectedWallIds.length > 0 || groupSelectedPlacementIds.length > 0)
    ) {
      event.preventDefault();

      if (groupSelectedWallIds.length > 0) {
        const wallIdsToDelete = new Set(groupSelectedWallIds);
        commitWallsChange((currentWalls) =>
          currentWalls.filter((wall) => !wallIdsToDelete.has(wall.id))
        );
      }

      if (groupSelectedPlacementIds.length > 0) {
        const selectedPlacementIds = new Set(groupSelectedPlacementIds);
        commitPlacementsChange((currentPlacements) =>
          currentPlacements.filter((placementItem) => !selectedPlacementIds.has(placementItem.id))
        );
      }

      setSelectedWallId(null);
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setSelectedPlacementId(null);
      setMenuPosition(null);
      setGroupSelectedWallIds([]);
      setGroupSelectedPlacementIds([]);
      setGroupContextMenu(null);
      setSelectionStart(null);
      setSelectionEnd(null);
      setDrawingStart(null);
      setPreviewPoint(null);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      selectedPlacementIdRef.current
    ) {
      event.preventDefault();
      const placementId = selectedPlacementIdRef.current;
      commitPlacementsChange((currentPlacements) =>
        currentPlacements.filter((placementItem) => placementItem.id !== placementId)
      );
      setSelectedPlacementId(null);
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
}, [commitWallsChange, commitWindowsChange, commitDoorsChange, commitPlacementsChange, editingMeasurement, groupSelectedWallIds, groupSelectedPlacementIds, isSelectionMode, redoWallChange, selectedWallId, setActiveTool, setIsSelectionMode, undoWallChange, updatePlacementPreview]);

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
    const selectedPlacementIds = placementsRef.current
      .filter((placementItem) => placementIntersectsSelectionRect(placementItem, rect))
      .map((placementItem) => placementItem.id);

    setGroupSelectedWallIds(areaWallIds);
    setGroupSelectedPlacementIds(selectedPlacementIds);
    setGroupContextMenu(null);
    setSelectedWallId(null);
    setSelectedPlacementId(null);
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
        setSelectedPlacementId(null);
        setGroupSelectedPlacementIds([]);
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
      setSelectedPlacementId(null);
      setMenuPosition(null);
      setEditingMeasurement(null);
      return;
    }

    if (activeToolRef.current === "place-placement") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const preview = rawPoint
        ? getPlacementPreview(
            rawPoint,
            thickWalls,
            selectedPlacementWidth,
            selectedPlacementDepth,
            0,
            placementsRef.current,
            undefined,
            selectedPlacementCategory,
            true,
            false,
            true,
            undefined,
            selectedPlacementCatalogItem.image
          )
        : null;

      if (!preview) {
        updatePlacementPreview(null);
        return;
      }

      updatePlacementPreview(preview);
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
            placements: placementsRef.current,
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
            placements: placementsRef.current,
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
        detachedPanelWallIntersectsFloorPlacement(
          wallToAdd,
          placementsRef.current,
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
    setSelectedPlacementId(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedPlacementIds([]);
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
      const snappedRotationResult = placementSnapRotationToTick(
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
      if (detachedPanelWallIntersectsFloorPlacement(rotatedPeninWall, placementsRef.current, structuralWallsForAttach, wallsRef.current, peninWallRotateState.id)) {
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
      if (detachedPanelWallIntersectsFloorPlacement(resizedPeninWall, placementsRef.current, structuralWallsForAttach, wallsRef.current, peninWallResizeState.id)) {
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

    const placementRotateState = placementRotateRef.current;

    if (placementRotateState && placementRotateState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      event.preventDefault();
      placementRotateState.didMove = true;
      const currentAngle = getAngleDegrees(placementRotateState.center, rawPoint);
      const rawRotation = normalizeDegrees(
        placementRotateState.startRotation + currentAngle - placementRotateState.startAngle
      );
      const snappedRotationResult = placementSnapRotationToTick(
        rawRotation,
        placementRotateState.snappedRotation
      );
      placementRotateState.snappedRotation = snappedRotationResult.snappedRotation;
      const nextRotation = snappedRotationResult.rotation;

      const nextPlacements = placementsRef.current.map((placementItem) => {
        if (placementItem.id !== placementRotateState.id) return placementItem;
        return { ...placementItem, rotation: nextRotation };
      });

      placementsRef.current = nextPlacements;
      setPlacements(nextPlacements);
      return;
    }

    const placementDragState = placementDragRef.current;

    if (placementDragState && placementDragState.pointerId === event.pointerId) {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);

      if (!rawPoint) return;

      const currentPlacement = placementsRef.current.find(
        (placementItem) => placementItem.id === placementDragState.id
      );
      if (!currentPlacement) return;

      const proposedCenter = add(
        placementDragState.startCenter,
        sub(rawPoint, placementDragState.startPointer)
      );

      const preview = getPlacementPreview(
        proposedCenter,
        thickWalls,
        currentPlacement.width,
        currentPlacement.depth,
        currentPlacement.rotation,
        placementsRef.current,
        currentPlacement.id,
        currentPlacement.category,
        true,
        true,
        false,
        currentPlacement.wallId,
        currentPlacement.image
      );

      if (!preview.isValid) return;

      const initialMovingCandidate: PlacementElement = {
        ...currentPlacement,
        center: preview.center,
        rotation: preview.rotation,
        wallId: preview.wallId ?? currentPlacement.wallId,
        wallFace: preview.wallFace ?? currentPlacement.wallFace,
      };
      const movingCandidateForWallCheck = initialMovingCandidate;
      const resolvedPreview = preview;
      const wallResolvedCenter = getWallOverlapResolvedPlacementCenter(
        resolvedPreview.center,
        thickWalls,
        currentPlacement.width,
        currentPlacement.depth,
        resolvedPreview.rotation,
        resolvedPreview.wallId ?? currentPlacement.wallId
      );
      const edgeSnappedCenter = getCollisionSafeAdjacentPlacementSnappedCenter({
        center: wallResolvedCenter,
        walls: thickWalls,
        placements: placementsRef.current,
        width: currentPlacement.width,
        depth: currentPlacement.depth,
        rotation: resolvedPreview.rotation,
        placementCategory: currentPlacement.category,
        placementImage: currentPlacement.image,
        excludedPlacementId: currentPlacement.id,
        preferredWallId: resolvedPreview.wallId ?? currentPlacement.wallId,
      });
      const wallResolvedPreview = {
        ...resolvedPreview,
        center: getWallOverlapResolvedPlacementCenter(
          edgeSnappedCenter,
          thickWalls,
          currentPlacement.width,
          currentPlacement.depth,
          resolvedPreview.rotation,
          resolvedPreview.wallId ?? currentPlacement.wallId
        ),
      };
      const movingCandidateForSupportCheck: PlacementElement = {
        ...movingCandidateForWallCheck,
        center: wallResolvedPreview.center,
        rotation: wallResolvedPreview.rotation,
        wallId: wallResolvedPreview.wallId ?? currentPlacement.wallId,
        wallFace: wallResolvedPreview.wallFace ?? currentPlacement.wallFace,
      };
      const supportedByLowerPlacement = isElevationFloatingPlacement(movingCandidateForSupportCheck) && Boolean(
        getWallPlacementSupportedWall(
          movingCandidateForSupportCheck,
          placementsRef.current,
          thickWalls,
          currentPlacement.id
        )
      );

      const wallCollisionMessage = !supportedByLowerPlacement && (
        placementIntersectsAnyWall(
          { center: wallResolvedPreview.center, width: currentPlacement.width, depth: currentPlacement.depth, rotation: wallResolvedPreview.rotation },
          thickWalls
        ) ||
        placementHandleTabsIntersectAnyWall(
          { ...currentPlacement, center: wallResolvedPreview.center, rotation: wallResolvedPreview.rotation },
          thickWalls
        )
      )
        ? "Cabinet cannot be placed through a wall."
        : undefined;

      const rulePreview = getPlacementPreview(
        wallResolvedPreview.center,
        thickWalls,
        currentPlacement.width,
        currentPlacement.depth,
        wallResolvedPreview.rotation,
        placementsRef.current,
        currentPlacement.id,
        currentPlacement.category,
        false,
        false,
        true,
        wallResolvedPreview.wallId ?? currentPlacement.wallId,
        currentPlacement.image
      );

      const movingPlacementForElevationCheck: PlacementElement = {
        ...currentPlacement,
        center: wallResolvedPreview.center,
        rotation: wallResolvedPreview.rotation,
        wallId: wallResolvedPreview.wallId ?? currentPlacement.wallId,
        wallFace: wallResolvedPreview.wallFace ?? currentPlacement.wallFace,
      };
      const candidatePlacementsForElevationCheck = placementsRef.current.map((placementItem) =>
        placementItem.id === placementDragState.id ? movingPlacementForElevationCheck : placementItem
      );
      const placementRuleMessage = getPlacementRuleViolationMessage(
        movingPlacementForElevationCheck,
        candidatePlacementsForElevationCheck,
        thickWalls,
        currentPlacement.id,
        true
      );
      const elevationOverlapMessage = getWallPlacementElevationOverlapMessage(
        movingPlacementForElevationCheck,
        candidatePlacementsForElevationCheck,
        thickWalls,
        currentPlacement.id
      );
      const dragInvalidReason = placementRuleMessage ?? elevationOverlapMessage ?? wallCollisionMessage;
      const dragRulePreview = dragInvalidReason
        ? { ...rulePreview, isValid: false, invalidReason: dragInvalidReason }
        : { ...rulePreview, isValid: true, invalidReason: undefined };

      event.preventDefault();
      placementDragState.didMove = true;
      updatePlacementPreview(dragRulePreview);

      const nextPlacements = candidatePlacementsForElevationCheck;

      placementsRef.current = nextPlacements;
      setPlacements(nextPlacements);
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
            placements: placementsRef.current,
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
            placements: placementsRef.current,
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
      if (detachedPanelWallIntersectsFloorPlacement(movedPeninWall, placementsRef.current, structuralWallsForAttach, wallsRef.current, peninWallDragState.id)) {
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

    if (activeToolRef.current === "place-placement") {
      event.preventDefault();

      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const preview = rawPoint
        ? getPlacementPreview(
            rawPoint,
            thickWalls,
            selectedPlacementWidth,
            selectedPlacementDepth,
            0,
            placementsRef.current,
            undefined,
            selectedPlacementCategory,
            true,
            false,
            true,
            undefined,
            selectedPlacementCatalogItem.image
          )
        : null;

      updatePlacementPreview(preview);
      return;
    }

    if (activeToolRef.current === "place-door") {
      const rawPoint = screenToWorkspace(event.clientX, event.clientY);
      const placement = rawPoint
        ? getDoorPlacementPreviewForPoint(rawPoint, thickWalls, DEFAULT_DOOR_WIDTH, {
            windows: windowsRef.current,
            doors: doorsRef.current,
            placements: placementsRef.current,
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
            placements: placementsRef.current,
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

  // commitPreviewPlacement
  const commitPreviewPlacement = useCallback(() => {
    const placement = placementPreviewRef.current;

    if (!placement) return false;

    if (!placement.isValid) {
      if (placement.invalidReason) showEditorAlert(placement.invalidReason);
      return false;
    }

    const newPlacement: PlacementElement = {
      id: crypto.randomUUID(),
      center: placement.center,
      width: placement.width,
      depth: placement.depth,
      rotation: placement.rotation,
      placementType: getPlacementElementTypeForCatalogItem(selectedPlacementCatalogItem),
      category: selectedPlacementCategory,
      productCategory: selectedPlacementCatalogItem.productCategory,
      catalogId: selectedPlacementCatalogItem.id,
      image: selectedPlacementCatalogItem.image,
      heightInches: selectedPlacementCatalogItem.heightInches ?? (selectedPlacementCategory === "wall" ? 30 : 36),
      distanceFromFloorInches:
        getSupportTypeForCategory(
          selectedPlacementCategory,
          selectedPlacementCatalogItem.widthInches,
          selectedPlacementCatalogItem.heightInches ?? (selectedPlacementCategory === "wall" ? 30 : 36)
        ) === "floor-supported"
          ? 0
          : selectedPlacementCatalogItem.defaultDistanceFromFloorInches ??
            (selectedPlacementCategory === "wall" ? 54 : 0),
      wallId: placement.wallId,
      wallFace: placement.wallFace,
      sinkFixture: isBuiltInSinkCabinetImage(selectedPlacementCatalogItem.image) ? true : undefined,
      blindDoorWidthInches: isBlindCabinetImage(selectedPlacementCatalogItem.image)
        ? getDefaultBlindCabinetDoorWidthInches(
            selectedPlacementCatalogItem.widthInches,
            selectedPlacementCategory
          )
        : undefined,
      blindFillerWidthInches: isBlindCabinetImage(selectedPlacementCatalogItem.image)
        ? 3
        : undefined,
      ovenCabinetProductLayout:
        getDefaultBottomDrawerProductLayout(selectedPlacementCatalogItem.image),
      ovenCabinetProductHeightInches:
        isOvenLikeBottomDrawerCabinetImage(selectedPlacementCatalogItem.image)
          ? getDefaultOvenCabinetProductHeightInches(
              selectedPlacementCatalogItem.heightInches ?? 36
            )
          : undefined,
      ovenCabinetFillerHeightInches:
        isOvenLikeBottomDrawerCabinetImage(selectedPlacementCatalogItem.image)
          ? OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES
          : undefined,
      ovenCabinetBottomDrawerHeightInches:
        isOvenLikeBottomDrawerCabinetImage(selectedPlacementCatalogItem.image)
          ? OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES
          : undefined,
    };
    const normalizedNewPlacement = normalizeSpecialCabinetState(newPlacement);

    const candidatePlacements = [...placementsRef.current, normalizedNewPlacement];
    const placementResult: WallPlacementStackPlacementResult = isElevationFloatingPlacement(normalizedNewPlacement)
      ? applyWallPlacementStackSpacingOnPlacement(
          candidatePlacements,
          wallsRef.current,
          normalizedNewPlacement.id
        )
      : { placements: candidatePlacements };

    if (placementResult.message) {
      showEditorAlert(placementResult.message);
      return false;
    }

    commitPlacementsChange(placementResult.placements);
    setSelectedPlacementId(normalizedNewPlacement.id);
    setSelectedDoorId(null);
    setSelectedWindowId(null);
    setSelectedWallId(null);
    setMenuPosition(getPlacementMenuPosition(newPlacement));
    setActiveTool(null);
    activeToolRef.current = null;
    updateDoorPreview(null);
    updateWindowPreview(null);
    updatePlacementPreview(null);
    return true;
  }, [commitPlacementsChange, selectedPlacementCategory, selectedPlacementCatalogItem, setActiveTool, showEditorAlert, updatePlacementPreview, updateDoorPreview, updateWindowPreview]);

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

    if (activeToolRef.current === "place-placement") {
      if (!isPlacementReleaseInsideCanvas) {
        updatePlacementPreview(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }

      if (commitPreviewPlacement()) return;
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
          placements: placementsRef.current,
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
          placements: placementsRef.current,
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

    const placementRotateState = placementRotateRef.current;

    if (placementRotateState && placementRotateState.pointerId === event.pointerId) {
      if (placementRotateState.didMove) {
        undoStackRef.current.push({
          walls: wallsRef.current,
          windows: windowsRef.current,
          doors: doorsRef.current,
          placements: placementRotateState.startPlacements,
        });
        redoStackRef.current = [];
      }

      placementRotateRef.current = null;
      setIsPlacementRotating(false);
      updatePlacementPreview(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    const placementDragState = placementDragRef.current;

    if (placementDragState && placementDragState.pointerId === event.pointerId) {
      if (placementDragState.didMove) {
        undoStackRef.current.push({
          walls: wallsRef.current,
          windows: windowsRef.current,
          doors: doorsRef.current,
          placements: placementDragState.startPlacements,
        });
        redoStackRef.current = [];
      }

      const finishedPlacement = placementsRef.current.find((placementItem) => placementItem.id === placementDragState.id);
      if (finishedPlacement) {
        const activeDragPreview = placementPreviewRef.current;
        const ruleMessage = activeDragPreview && !activeDragPreview.isValid
          ? activeDragPreview.invalidReason
          : getPlacementRuleViolationMessage(
              finishedPlacement,
              placementsRef.current,
              wallsRef.current,
              finishedPlacement.id,
              true
            ) ?? getWallPlacementElevationOverlapMessage(
              finishedPlacement,
              placementsRef.current,
              wallsRef.current,
              finishedPlacement.id
            );
        if (ruleMessage) {
          showEditorAlert(ruleMessage);
          placementsRef.current = placementDragState.startPlacements;
          setPlacements(placementDragState.startPlacements);
          const restoredPlacement = placementDragState.startPlacements.find((placementItem) => placementItem.id === placementDragState.id);
          if (restoredPlacement) setMenuPosition(getPlacementMenuPosition(restoredPlacement));
        } else {
          setMenuPosition(getPlacementMenuPosition(finishedPlacement));
        }
      }
      placementDragRef.current = null;
      setIsPlacementDragging(false);
      updatePlacementPreview(null);

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
          placements: placementsRef.current,
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

  // deleteSelectedPlacement
  const deleteSelectedPlacement = () => {
    const placementId = selectedPlacementIdRef.current ?? selectedPlacementId;
    if (!placementId) return;

    commitPlacementsChange((currentPlacements) =>
      currentPlacements.filter((placementItem) => placementItem.id !== placementId)
    );

    selectedPlacementIdRef.current = null;
    setSelectedPlacementId(null);
    setMenuPosition(null);
    updatePlacementPreview(null);
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
    setSelectedPlacementId(null);
    setSelectedWallId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedPlacementIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updatePlacementPreview(null);
  };

  const selectDoorFromElevation = (id: string) => {
    setSelectedDoorId(id);
    setSelectedWindowId(null);
    setSelectedPlacementId(null);
    setSelectedWallId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedPlacementIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updatePlacementPreview(null);
  };

  const selectPlacementFromElevation = (id: string) => {
    setSelectedPlacementId(id);
    setSelectedWindowId(null);
    setSelectedDoorId(null);
    setSelectedWallId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedPlacementIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updatePlacementPreview(null);
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

  const updatePlacementFromElevation = (
    id: string,
    updates: Partial<Pick<PlacementElement, "center" | "distanceFromFloorInches">>
  ) => {
    setPlacements((currentPlacements) => {
      const nextPlacements = currentPlacements.map((placementItem) =>
        placementItem.id === id ? { ...placementItem, ...updates } : placementItem
      );
      placementsRef.current = nextPlacements;
      return nextPlacements;
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
    setSelectedPlacementId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedPlacementIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updatePlacementPreview(null);
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
    setSelectedPlacementId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedPlacementIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updatePlacementPreview(null);
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
    setSelectedPlacementId(null);
    setGroupSelectedWallIds([]);
    setGroupSelectedPlacementIds([]);
    setGroupContextMenu(null);
    setMenuPosition(null);
    setEditingMeasurement(null);
    updateWindowPreview(null);
    updateDoorPreview(null);
    updatePlacementPreview(null);
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
                : selectedPlacement
                  ? getPlacementMenuPosition(selectedPlacement)
                  : null;

  if (planViewMode === "elevation") {
    return (
      <>
        <ElevationPlanView
          walls={elevationWalls}
          allWalls={thickWalls}
          windows={windows}
          doors={doors}
          placements={placements}
          selectedWindowId={selectedWindowId}
          selectedDoorId={selectedDoorId}
          selectedPlacementId={selectedPlacementId}
          selectedWallId={selectedWallId}
          activeIndex={activeElevationIndex}
          showMeasurements={showElevationMeasurements}
          onSelectWindow={selectWindowFromElevation}
          onSelectDoor={selectDoorFromElevation}
          onSelectPlacement={selectPlacementFromElevation}
          onSelectWall={selectWall}
          onUpdateWindow={updateWindowFromElevation}
          onUpdateDoor={updateDoorFromElevation}
          onUpdatePlacement={updatePlacementFromElevation}
          onUpdateWall={updateWallFromElevation}
          onAlert={showEditorAlert}
          onClearSelection={() => {
            setSelectedWallId(null);
            setSelectedWindowId(null);
            setSelectedDoorId(null);
            setSelectedPlacementId(null);
            setGroupSelectedWallIds([]);
            setGroupSelectedPlacementIds([]);
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
        isSelectionMode && (groupSelectedWallIds.length > 0 || groupSelectedPlacementIds.length > 0)
          ? "cursor-move"
          : isSelectionMode
            ? "cursor-crosshair"
            : activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-placement"
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
            selectedWall={selectedWall}
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
                  setSelectedPlacementId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedPlacementIds([]);
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
                  setSelectedPlacementId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedPlacementIds([]);
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
                disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-placement"}
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setSelectedWindowId(windowItem.id);
                  setSelectedDoorId(null);
                  setSelectedPlacementId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedPlacementIds([]);
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
                  setSelectedPlacementId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedPlacementIds([]);
                  setGroupContextMenu(null);
                  setMenuPosition(getWindowMenuPosition(windowItem, wall, undefined, thickWalls));
                  updateWindowPreview(null);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            );
          })}

          {[...placements]
            .map((placementItem, index) => ({ placementItem, index }))
            .sort((left, right) => {
              const leftLayer = getPlacementFloorVisualLayerPriority(left.placementItem);
              const rightLayer = getPlacementFloorVisualLayerPriority(right.placementItem);
              if (leftLayer !== rightLayer) return leftLayer - rightLayer;
              return left.index - right.index;
            })
            .filter(({ placementItem }) => getPlacementFloorVisualLayerPriority(placementItem) < 30)
            .map(({ placementItem }) => (
            <PlacementOnFloor
              key={placementItem.id}
              placementItem={placementItem}
              walls={thickWalls}
              selected={false}
              dragPreview={placementItem.id === selectedPlacementId && isPlacementDragging ? placementPreview : null}
              showDegree={false}
              disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-placement"}
              onSelect={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setSelectedPlacementId(placementItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedPlacementIds([]);
                setGroupContextMenu(null);
                setMenuPosition(getPlacementMenuPosition(placementItem));
                updateWindowPreview(null);
                updateDoorPreview(null);
                updatePlacementPreview(null);
              }}
              onDragStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const dragStartPoint = screenToWorkspace(event.clientX, event.clientY) ?? placementItem.center;

                placementDragRef.current = {
                  id: placementItem.id,
                  pointerId: event.pointerId,
                  startPointer: dragStartPoint,
                  startCenter: placementItem.center,
                  startPlacements: placementsRef.current,
                  didMove: false,
                };

                setSelectedPlacementId(placementItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedPlacementIds([]);
                setGroupContextMenu(null);
                setIsPlacementDragging(true);
                setMenuPosition(null);
                updateWindowPreview(null);
                updateDoorPreview(null);
                updatePlacementPreview(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onRotateStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                placementRotateRef.current = {
                  id: placementItem.id,
                  pointerId: event.pointerId,
                  center: placementItem.center,
                  startAngle: getAngleDegrees(placementItem.center, screenToWorkspace(event.clientX, event.clientY) ?? placementItem.center),
                  startRotation: placementItem.rotation,
                  startPlacements: placementsRef.current,
                  didMove: false,
                  snappedRotation: null,
                };

                setIsPlacementRotating(true);
                setSelectedPlacementId(placementItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedPlacementIds([]);
                setGroupContextMenu(null);
                setMenuPosition(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
            />
          ))}

          {placementPreview &&
            activeTool === "place-placement" &&
            getPlacementPreviewFloorVisualLayerPriority(placementPreview) < 30 && (
              <PlacementPreviewShape preview={placementPreview} walls={thickWalls} />
            )}

          {[...placements]
            .map((placementItem, index) => ({ placementItem, index }))
            .sort((left, right) => {
              const leftLayer = getPlacementFloorVisualLayerPriority(left.placementItem);
              const rightLayer = getPlacementFloorVisualLayerPriority(right.placementItem);
              if (leftLayer !== rightLayer) return leftLayer - rightLayer;
              return left.index - right.index;
            })
            .filter(({ placementItem }) => getPlacementFloorVisualLayerPriority(placementItem) >= 30)
            .map(({ placementItem }) => (
            <PlacementOnFloor
              key={placementItem.id}
              placementItem={placementItem}
              walls={thickWalls}
              selected={false}
              dragPreview={placementItem.id === selectedPlacementId && isPlacementDragging ? placementPreview : null}
              showDegree={false}
              disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-placement"}
              onSelect={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setSelectedPlacementId(placementItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedPlacementIds([]);
                setGroupContextMenu(null);
                setMenuPosition(getPlacementMenuPosition(placementItem));
                updateWindowPreview(null);
                updateDoorPreview(null);
                updatePlacementPreview(null);
              }}
              onDragStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const dragStartPoint = screenToWorkspace(event.clientX, event.clientY) ?? placementItem.center;

                placementDragRef.current = {
                  id: placementItem.id,
                  pointerId: event.pointerId,
                  startPointer: dragStartPoint,
                  startCenter: placementItem.center,
                  startPlacements: placementsRef.current,
                  didMove: false,
                };

                setSelectedPlacementId(placementItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedPlacementIds([]);
                setGroupContextMenu(null);
                setIsPlacementDragging(true);
                setMenuPosition(null);
                updateWindowPreview(null);
                updateDoorPreview(null);
                updatePlacementPreview(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onRotateStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                placementRotateRef.current = {
                  id: placementItem.id,
                  pointerId: event.pointerId,
                  center: placementItem.center,
                  startAngle: getAngleDegrees(placementItem.center, screenToWorkspace(event.clientX, event.clientY) ?? placementItem.center),
                  startRotation: placementItem.rotation,
                  startPlacements: placementsRef.current,
                  didMove: false,
                  snappedRotation: null,
                };

                setIsPlacementRotating(true);
                setSelectedPlacementId(placementItem.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedPlacementIds([]);
                setGroupContextMenu(null);
                setMenuPosition(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
            />
          ))}

          {[...placements]
            .map((placementItem, index) => ({ placementItem, index }))
            .sort((left, right) => {
              const leftSelected = left.placementItem.id === selectedPlacementId;
              const rightSelected = right.placementItem.id === selectedPlacementId;
              if (leftSelected !== rightSelected) return leftSelected ? 1 : -1;

              const leftLayer = getPlacementFloorVisualLayerPriority(left.placementItem);
              const rightLayer = getPlacementFloorVisualLayerPriority(right.placementItem);
              if (leftLayer !== rightLayer) return leftLayer - rightLayer;
              return left.index - right.index;
            })
            .map(({ placementItem }) => (
              <PlacementFloorInteractionTarget
                key={`placement-hit-${placementItem.id}`}
                placementItem={placementItem}
                disabled={activeTool === "place-window" || activeTool === "place-door" || activeTool === "place-placement"}
                selected={placementItem.id === selectedPlacementId}
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setSelectedPlacementId(placementItem.id);
                  setSelectedWindowId(null);
                  setSelectedDoorId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedPlacementIds([]);
                  setGroupContextMenu(null);
                  setMenuPosition(getPlacementMenuPosition(placementItem));
                  updateWindowPreview(null);
                  updateDoorPreview(null);
                  updatePlacementPreview(null);
                }}
                onDragStart={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  const dragStartPoint = screenToWorkspace(event.clientX, event.clientY) ?? placementItem.center;

                  placementDragRef.current = {
                    id: placementItem.id,
                    pointerId: event.pointerId,
                    startPointer: dragStartPoint,
                    startCenter: placementItem.center,
                    startPlacements: placementsRef.current,
                    didMove: false,
                  };

                  setSelectedPlacementId(placementItem.id);
                  setSelectedWindowId(null);
                  setSelectedDoorId(null);
                  setSelectedWallId(null);
                  setGroupSelectedWallIds([]);
                  setGroupSelectedPlacementIds([]);
                  setGroupContextMenu(null);
                  setIsPlacementDragging(true);
                  setMenuPosition(null);
                  updateWindowPreview(null);
                  updateDoorPreview(null);
                  updatePlacementPreview(null);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            ))}

          {placementPreview &&
            activeTool === "place-placement" &&
            getPlacementPreviewFloorVisualLayerPriority(placementPreview) >= 30 && (
              <PlacementPreviewShape preview={placementPreview} walls={thickWalls} />
            )}

          {groupSelectedPlacements
            .filter((placementItem) => placementItem.id !== selectedPlacementId)
            .map((placementItem) => (
              <PlacementPlanSelectionOverlay
                key={`group-selected-placement-${placementItem.id}`}
                placementItem={placementItem}
              />
            ))}

          {selectedPlacement && (
            <PlacementSelectionOverlay
              placementItem={selectedPlacement}
              walls={thickWalls}
              dragPreview={selectedPlacement.id === selectedPlacementId && isPlacementDragging ? placementPreview : null}
              showDegree={selectedPlacement.id === selectedPlacementId && isPlacementRotating}
              onRotateStart={(event) => {
                event.preventDefault();
                event.stopPropagation();

                placementRotateRef.current = {
                  id: selectedPlacement.id,
                  pointerId: event.pointerId,
                  center: selectedPlacement.center,
                  startAngle: getAngleDegrees(selectedPlacement.center, screenToWorkspace(event.clientX, event.clientY) ?? selectedPlacement.center),
                  startRotation: selectedPlacement.rotation,
                  startPlacements: placementsRef.current,
                  didMove: false,
                  snappedRotation: null,
                };

                setIsPlacementRotating(true);
                setSelectedPlacementId(selectedPlacement.id);
                setSelectedWindowId(null);
                setSelectedDoorId(null);
                setSelectedWallId(null);
                setGroupSelectedWallIds([]);
                setGroupSelectedPlacementIds([]);
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

          {selectedPlacement && currentMenuPosition && !isPlacementRotating && !isPlacementDragging && (
            <SelectedPlacementContextMenu
              position={currentMenuPosition}
              onDelete={deleteSelectedPlacement}
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
