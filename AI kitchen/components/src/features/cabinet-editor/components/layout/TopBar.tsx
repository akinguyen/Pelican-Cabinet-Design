"use client";
import * as React from "react";
import { Box, CheckCircle2, Download, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar({
  onImportRoom,
  onImportKitchen,
  onExportRoom,
  onDownloadSmartKitchenInput,
  onDownloadLastSmartKitchenOutput,
  hasLastSmartKitchenOutput = false,
  onOpenSmartKitchenWorkspace,
  isOpeningSmartKitchenWorkspace = false,
  onGenerateSmartKitchen,
  isGeneratingSmartKitchen = false,
}: {
  onImportRoom?: () => void;
  onImportKitchen?: () => void;
  onExportRoom?: () => void;
  onDownloadSmartKitchenInput?: () => void;
  onDownloadLastSmartKitchenOutput?: () => void;
  hasLastSmartKitchenOutput?: boolean;
  onOpenSmartKitchenWorkspace?: () => void;
  isOpeningSmartKitchenWorkspace?: boolean;
  /** @deprecated Use onOpenSmartKitchenWorkspace so the button opens the workspace route instead of starting generation. */
  onGenerateSmartKitchen?: () => void;
  /** @deprecated Immediate editor-side smart generation has been replaced by workspace navigation. */
  isGeneratingSmartKitchen?: boolean;
}) {
  const handleSmartKitchenClick = onOpenSmartKitchenWorkspace ?? onGenerateSmartKitchen;
  const isSmartKitchenButtonDisabled =
    isOpeningSmartKitchenWorkspace || isGeneratingSmartKitchen;
  const smartKitchenButtonLabel = isOpeningSmartKitchenWorkspace
    ? "Opening workspace..."
    : "Generate smart kitchen";

  return (
    <header className="relative flex h-[55px] w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
      <div className="flex items-center gap-3">
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
            label="Download last debug output"
            onClick={onDownloadLastSmartKitchenOutput}
            disabled={!hasLastSmartKitchenOutput}
          />
        ) : null}
        {handleSmartKitchenClick ? (
          <TopAction
            icon={CheckCircle2}
            label={smartKitchenButtonLabel}
            onClick={handleSmartKitchenClick}
            disabled={isSmartKitchenButtonDisabled}
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

export function TopAction({
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
