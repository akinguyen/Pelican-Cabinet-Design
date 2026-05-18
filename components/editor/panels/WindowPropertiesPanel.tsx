"use client";

import { PencilLine, ChevronLeft } from "lucide-react";
import { FinishCard } from "../layout/FinishCard";
import { WindowPropertyInput } from "../layout/WindowPropertyInput";
import { SimpleWindowShape } from "../shapes/SimpleStructureShapes";
import type { WindowSelectionDetail } from "../types";
import { roundToQuarter } from "../measurements";

type WindowPropertiesPanelProps = {
  selectedWindow: WindowSelectionDetail;
  onBack: () => void;
};

export function WindowPropertiesPanel({
  selectedWindow,
  onBack,
}: WindowPropertiesPanelProps) {
  const updateWindowNumber = (
    field:
      | "widthInches"
      | "heightInches"
      | "distanceFromFloorInches"
      | "distanceFromLeftInches"
      | "distanceFromRightInches",
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
