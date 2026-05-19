"use client";
import * as React from "react";
import { useState } from "react";
import { Home, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlacementCatalogImage, PlacementToolCard } from "../placements/PlacementViews";
import { PlacementPropertiesPanel, DoorPropertiesPanel, WallPropertiesPanel, WindowPropertiesPanel } from "../panels/PropertiesPanels";
import { sidebarItems } from "../../constants/sidebarItems";
import { PLACEMENT_CATALOG } from "../../data/placementCatalog";
import { isAccessoryPlacementImage, isProductPlacementImage } from "../../engine/placementClassification";
import type { PlacementCategory, PlacementSelectionDetail, DoorSelectionDetail, Panel, Point, ProductCategory, Tool, WallSelectionDetail, WindowSelectionDetail } from "../../types/editorTypes";

export function ContextPanel({
  activePanel,
  activeTool,
  setActiveTool,
  setIsSelectionMode,
  selectedWall,
  selectedWindow,
  selectedDoor,
  selectedPlacement,
  placementCategoryTab,
  selectedPlacementCatalogId,
  onSelectPlacementCategory,
  onSelectPlacementCatalog,
  onRequestPanel,
}: {
  activePanel: Panel;
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  setIsSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedWall: WallSelectionDetail | null;
  selectedWindow: WindowSelectionDetail | null;
  selectedDoor: DoorSelectionDetail | null;
  selectedPlacement: PlacementSelectionDetail | null;
  placementCategoryTab: PlacementCategory;
  selectedPlacementCatalogId: string;
  onSelectPlacementCategory: (category: PlacementCategory) => void;
  onSelectPlacementCatalog: (catalogId: string) => void;
  onRequestPanel: (panel: Panel) => void;
}) {
  const [structureTab, setStructureTab] = useState<"doors" | "windows">("doors");
  const [productCategoryTab, setProductCategoryTab] = useState<ProductCategory>("base");

  const activateToolFromCard = (tool: Tool) => {
    setIsSelectionMode(false);
    setActiveTool(tool);
  };

  if (selectedPlacement) {
    const selectedPlacementBackPanel: Panel = isAccessoryPlacementImage(selectedPlacement.image)
      ? "objects"
      : isProductPlacementImage(selectedPlacement.image)
        ? "products"
        : "cabinets";

    return (
      <PlacementPropertiesPanel
        selectedPlacement={selectedPlacement}
        onBack={() => {
          window.dispatchEvent(new Event("pelican-deselect-placement"));
          onRequestPanel(selectedPlacementBackPanel);
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
    const visiblePlacements = PLACEMENT_CATALOG.filter(
      (item) =>
        item.category === placementCategoryTab &&
        !isProductPlacementImage(item.image) &&
        !isAccessoryPlacementImage(item.image)
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
              onClick={() => onSelectPlacementCategory("base")}
              className={cn(
                "flex min-h-[56px] items-center justify-center rounded-md px-2 py-2 text-center text-[13px] font-medium leading-tight transition",
                placementCategoryTab === "base"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Base Cab.
            </button>
            <button
              type="button"
              onClick={() => onSelectPlacementCategory("wall")}
              className={cn(
                "flex min-h-[56px] items-center justify-center rounded-md px-2 py-2 text-center text-[13px] font-medium leading-tight transition",
                placementCategoryTab === "wall"
                  ? "bg-pelican-teal/25 text-pelican-navy"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Wall Cab.
            </button>
          </div>
        </div>

        <div className="space-y-3 px-3 pb-6 pt-4">
          {visiblePlacements.map((placementItem) => (
            <PlacementToolCard
              key={placementItem.id}
              title={placementItem.title}
              subtitle={placementItem.subtitle}
              active={activeTool === "place-placement" && selectedPlacementCatalogId === placementItem.id}
              onClick={() => {
                onSelectPlacementCatalog(placementItem.id);
                activateToolFromCard("place-placement");
              }}
            >
<PlacementCatalogImage image={placementItem.image} category={placementItem.category} widthInches={placementItem.widthInches} heightInches={placementItem.heightInches} />
            </PlacementToolCard>
          ))}
        </div>
      </aside>
    );
  }


  if (activePanel === "products") {
    const visibleProducts = PLACEMENT_CATALOG.filter(
      (item) =>
        isProductPlacementImage(item.image) && item.category === productCategoryTab
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
            <PlacementToolCard
              key={productItem.id}
              title={productItem.title}
              subtitle={productItem.subtitle}
              active={activeTool === "place-placement" && selectedPlacementCatalogId === productItem.id}
              onClick={() => {
                onSelectPlacementCatalog(productItem.id);
                activateToolFromCard("place-placement");
              }}
            >
              <PlacementCatalogImage image={productItem.image} category={productItem.category} widthInches={productItem.widthInches} heightInches={productItem.heightInches} />
            </PlacementToolCard>
          ))}
        </div>
      </aside>
    );
  }


  if (activePanel === "objects") {
    const visibleAccessories = PLACEMENT_CATALOG.filter((item) =>
      isAccessoryPlacementImage(item.image)
    );

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
            Pick an accessory, then click a wall-side gap or placement edge in the plan. End panels snap and collide like placements.
          </p>
        </div>

        <div className="space-y-3 px-3 pb-6 pt-4">
          {visibleAccessories.map((accessoryItem) => (
            <PlacementToolCard
              key={accessoryItem.id}
              title={accessoryItem.title}
              subtitle={accessoryItem.subtitle}
              active={activeTool === "place-placement" && selectedPlacementCatalogId === accessoryItem.id}
              onClick={() => {
                onSelectPlacementCatalog(accessoryItem.id);
                activateToolFromCard("place-placement");
              }}
            >
              <PlacementCatalogImage image={accessoryItem.image} category={accessoryItem.category} widthInches={accessoryItem.widthInches} heightInches={accessoryItem.heightInches} />
            </PlacementToolCard>
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

export function StructureToolCard({
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

export function SimpleDoorShape() {
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

export function SimpleWindowShape() {
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

export function WallToolCard({
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

export function WallLineShape() {
  return (
    <svg viewBox="0 0 130 70" className="h-16 w-24">
      <path d="M20 36 H110" className="fill-none stroke-slate-300 stroke-[8]" />
      <path d="M20 32 H110" className="stroke-slate-400 stroke-[2]" />
    </svg>
  );
}

export function ThinWallToolCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-[135px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 transition hover:border-pelican-teal", active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200")}>
      <ThinWallLineShape />
      <span className="mt-3 text-[12px] font-medium text-slate-900">Draw thin Wall</span>
    </button>
  );
}

export function ThinWallLineShape() {
  return <svg viewBox="0 0 130 70" className="h-16 w-24"><path d="M20 36 H110" className="fill-none stroke-slate-500 stroke-[2]" strokeLinecap="round" /></svg>;
}

export function PeninWallToolCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-[135px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 transition hover:border-pelican-teal", active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200")}>
      <IslandWallLineShape />
      <span className="mt-3 text-[12px] font-medium text-slate-900">Draw Peninsula</span>
    </button>
  );
}

export function PeninWallLineShape() {
  return <svg viewBox="0 0 130 70" className="h-16 w-24"><path d="M20 36 H110" className="fill-none stroke-slate-300 stroke-[8]" /><path d="M20 32 H110" className="stroke-slate-400 stroke-[2]" /><path d="M24 48 H106" className="stroke-pelican-teal stroke-[2]" strokeDasharray="6 5" /></svg>;
}

export function IslandWallToolCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-[135px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 transition hover:border-pelican-teal", active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200")}>
      <IslandWallLineShape />
      <span className="mt-3 text-[12px] font-medium text-slate-900">Draw Island</span>
    </button>
  );
}

export function IslandWallLineShape() {
  return <svg viewBox="0 0 130 70" className="h-16 w-24"><rect x="20" y="27" width="90" height="18" rx="2" className="fill-[#f1ede4] stroke-slate-400 stroke-[2]" /><rect x="27" y="31" width="76" height="10" rx="1" className="fill-none stroke-slate-400 stroke-[1.5]" /></svg>;
}

export function MainToolbar({
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

export function ThinWallGroupContextMenu({
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
