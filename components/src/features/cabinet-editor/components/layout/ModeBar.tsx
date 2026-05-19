"use client";
import * as React from "react";
import { BrickWall, ChevronDown, Crosshair, Grid3X3, Magnet, Ruler, Scan, Settings, Square, Video, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeasurementDisplayUnit, PlanViewMode } from "../../types/editorTypes";

export function ModeBar({
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
        <ModeIconButton icon={Settings} label="Canvas settings" />
      </div>
    </div>
  );
}

export function ModeIconButton({
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
