"use client";

import { ChevronLeft } from "lucide-react";
import { FinishCard } from "../layout/FinishCard";
import { WindowPropertyInput } from "../layout/WindowPropertyInput";
import { SimpleDoorShape } from "../shapes/SimpleStructureShapes";
import type { DoorSelectionDetail } from "../types";
import { roundToQuarter } from "../measurements";

type DoorPropertiesPanelProps = {
  selectedDoor: DoorSelectionDetail;
  onBack: () => void;
};

export function DoorPropertiesPanel({
  selectedDoor,
  onBack,
}: DoorPropertiesPanelProps) {
  const updateDoorNumber = (
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
