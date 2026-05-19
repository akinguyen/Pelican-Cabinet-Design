"use client";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiRoomInput, GeneratedKitchenLayout } from "@/lib/ai/types";
import { CanvasArea } from "./components/canvas/CanvasArea";
import { ModeBar } from "./components/layout/ModeBar";
import { TopBar } from "./components/layout/TopBar";
import { ContextPanel, MainToolbar } from "./components/sidebar/ContextPanel";
import { GRID_SIZE, MAX_ZOOM, MIN_ZOOM, ZOOM_BUTTON_STEP } from "./constants/editorConstants";
import { MeasurementDisplayUnitContext } from "./context/MeasurementDisplayUnitContext";
import { PLACEMENT_CATALOG } from "./data/placementCatalog";
import { isAccessoryPlacementImage, isProductPlacementImage } from "./engine/placementClassification";
import { clamp } from "./engine/geometry";
import { downloadJsonFile, readJsonFile } from "./services/fileJson";
import type { PlacementCategory, PlacementSelectionDetail, DoorSelectionDetail, MeasurementDisplayUnit, Panel, PlanViewMode, Point, Tool, WallPlacementMode, WallSelectionDetail, WindowSelectionDetail } from "./types/editorTypes";

export const GENERATE_SMART_KITCHEN_DRAFT_PROJECT_ID = "editor-draft";

export function getGenerateSmartKitchenWorkspacePath(
  projectId: string = GENERATE_SMART_KITCHEN_DRAFT_PROJECT_ID
): string {
  const normalizedProjectId = projectId.trim() || GENERATE_SMART_KITCHEN_DRAFT_PROJECT_ID;

  return `/generate-smart-kitchen/${encodeURIComponent(normalizedProjectId)}`;
}

export function openGenerateSmartKitchenWorkspace(
  projectId: string = GENERATE_SMART_KITCHEN_DRAFT_PROJECT_ID,
  navigate: (url: string) => void = (url) => {
    if (typeof window !== "undefined") {
      window.location.assign(url);
    }
  }
): string {
  const workspacePath = getGenerateSmartKitchenWorkspacePath(projectId);
  navigate(workspacePath);

  return workspacePath;
}

export default function CabinetEditorBase() {
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [activePanel, setActivePanel] = useState<Panel>("walls");
  const [placementCategoryTab, setPlacementCategoryTab] = useState<PlacementCategory>("base");
  const [selectedPlacementCatalogId, setSelectedPlacementCatalogId] = useState<string>(PLACEMENT_CATALOG[0].id);
  const [selectedWindowDetail, setSelectedWindowDetail] =
    useState<WindowSelectionDetail | null>(null);
  const [selectedDoorDetail, setSelectedDoorDetail] =
    useState<DoorSelectionDetail | null>(null);
  const [selectedWallDetail, setSelectedWallDetail] =
    useState<WallSelectionDetail | null>(null);
  const [selectedPlacementDetail, setSelectedPlacementDetail] =
    useState<PlacementSelectionDetail | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [planViewMode, setPlanViewMode] = useState<PlanViewMode>("floor");
  const [showElevationMeasurements, setShowElevationMeasurements] = useState(true);
  const [measurementDisplayUnit, setMeasurementDisplayUnit] =
    useState<MeasurementDisplayUnit>("feet-inches");
  const [canConvertSelectedThinWalls, setCanConvertSelectedThinWalls] = useState(false);
  const [generatedLayout, setGeneratedLayout] = useState<GeneratedKitchenLayout | null>(null);
  const [isDesignerSummaryCollapsed, setIsDesignerSummaryCollapsed] = useState(false);
  const [lastSmartKitchenAiOutput, setLastSmartKitchenAiOutput] = useState<unknown | null>(null);
  const [smartKitchenFeedback, setSmartKitchenFeedback] = useState("");
  const [isSmartKitchenFeedbackCollapsed, setIsSmartKitchenFeedbackCollapsed] = useState(false);
  const [loadedRoom, setLoadedRoom] = useState<AiRoomInput | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importKitchenInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPlacementCatalogItem = useMemo(
    () => PLACEMENT_CATALOG.find((item) => item.id === selectedPlacementCatalogId) ?? PLACEMENT_CATALOG[0],
    [selectedPlacementCatalogId]
  );
  const selectedPlacementWidth = (selectedPlacementCatalogItem.widthInches / 12) * GRID_SIZE;
  const selectedPlacementDepth = (selectedPlacementCatalogItem.depthInches / 12) * GRID_SIZE;

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
    const handleWallPlacementModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        value: WallPlacementMode;
      }>;
      const { id, value } = customEvent.detail ?? {};
      if (!id || !value) return;

      setSelectedWallDetail((current) =>
        current && current.id === id
          ? { ...current, placementMode: value }
          : current
      );
    };

    window.addEventListener(
      "pelican-wall-placement-mode-change",
      handleWallPlacementModeChange
    );

    return () => {
      window.removeEventListener(
        "pelican-wall-placement-mode-change",
        handleWallPlacementModeChange
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
    const handlePlacementSelectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<PlacementSelectionDetail | null>;
      const detail = customEvent.detail ?? null;
      setSelectedPlacementDetail(detail);
      if (detail) {
        setActivePanel(detail.image && isAccessoryPlacementImage(detail.image) ? "objects" : detail.image && isProductPlacementImage(detail.image) ? "products" : "cabinets");
      }
    };

    window.addEventListener(
      "pelican-placement-selection-change",
      handlePlacementSelectionChange
    );

    return () => {
      window.removeEventListener(
        "pelican-placement-selection-change",
        handlePlacementSelectionChange
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

  const handleOpenSmartKitchenWorkspace = () => {
    openGenerateSmartKitchenWorkspace();
  };

  return (
    <MeasurementDisplayUnitContext.Provider value={measurementDisplayUnit}>
      <main className="flex h-screen w-screen flex-col overflow-hidden bg-white text-pelican-navy">
      <TopBar
        onImportRoom={handleImportRoomClick}
        onImportKitchen={handleImportKitchenClick}
        onExportRoom={() => window.dispatchEvent(new Event("pelican-ai-export-room-request"))}
        onDownloadSmartKitchenInput={() =>
          window.dispatchEvent(
            new Event("pelican-ai-download-smart-kitchen-input-request")
          )
        }
        onDownloadLastSmartKitchenOutput={
          () => {
            if (!lastSmartKitchenAiOutput) return;
            downloadJsonFile(
              "pelican-smart-kitchen-ai-output.json",
              lastSmartKitchenAiOutput
            );
          }
        }
        hasLastSmartKitchenOutput={Boolean(lastSmartKitchenAiOutput)}
        onOpenSmartKitchenWorkspace={handleOpenSmartKitchenWorkspace}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportedRoom}
      />
      <input
        ref={importKitchenInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportedKitchen}
      />

      {generatedLayout && (
        <section className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-pelican-navy">
                Debug kitchen concept: {generatedLayout.summary.layoutType}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {generatedLayout.summary.generationMethod === "smart-ai"
                  ? `The layout was planned by ${generatedLayout.summary.plannerModel ?? "the smart planner"} and placed using the existing editor placement engine.`
                  : "Placements were added to the current room using the existing editor placement model."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-medium text-slate-500">
                {generatedLayout.cabinets.length} placement(s)
              </div>
              <button
                type="button"
                onClick={() =>
                  setIsSmartKitchenFeedbackCollapsed((current) => !current)
                }
                className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {isSmartKitchenFeedbackCollapsed
                  ? "Expand debug feedback"
                  : "Collapse debug feedback"}
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
                    Debug feedback for the next smart generation
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
            selectedPlacementWidth={selectedPlacementWidth}
            selectedPlacementDepth={selectedPlacementDepth}
            selectedPlacementCategory={selectedPlacementCatalogItem.category}
            selectedPlacementCatalogItem={selectedPlacementCatalogItem}
            showElevationMeasurements={showElevationMeasurements}
            smartKitchenFeedback={smartKitchenFeedback}
            onSmartKitchenOutput={setLastSmartKitchenAiOutput}
            loadedRoom={loadedRoom}
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
            selectedPlacement={selectedPlacementDetail}
            placementCategoryTab={placementCategoryTab}
            selectedPlacementCatalogId={selectedPlacementCatalogId}
            onSelectPlacementCategory={(category) => {
              setPlacementCategoryTab(category);
              const firstItemInCategory = PLACEMENT_CATALOG.find((item) => item.category === category);
              if (firstItemInCategory) {
                setSelectedPlacementCatalogId(firstItemInCategory.id);
              }
            }}
            onSelectPlacementCatalog={(catalogId) => setSelectedPlacementCatalogId(catalogId)}
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
                setSelectedPlacementDetail(null);
                window.dispatchEvent(new Event("pelican-deselect-placement"));
              }
            }}
          />
        </section>
      </div>
      </main>
    </MeasurementDisplayUnitContext.Provider>
  );
}
