"use client";

import { Html } from "@react-three/drei";
import { Trash2 } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";

const EDIT_CONTROL_Z_INCHES = 12;

type SelectedAssembliesFloorPlanEditControlsProps = Readonly<{
  bounds: readonly SceneEntityBounds[];
  deleteLabel: string;
  onDelete: () => void;
}>;

export function SelectedAssembliesFloorPlanEditControls({
  bounds,
  deleteLabel,
  onDelete,
}: SelectedAssembliesFloorPlanEditControlsProps) {
  if (bounds.length === 0) {
    return null;
  }

  const allCorners = bounds.flatMap((item) => item.footprintCornersInches);
  const centerXInches = (Math.min(...allCorners.map((point) => point.xInches)) + Math.max(...allCorners.map((point) => point.xInches))) / 2;
  const topYInches = Math.min(...allCorners.map((point) => point.yInches));

  function stopPointerEvent(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <Html
      center
      position={[centerXInches, topYInches - 14, EDIT_CONTROL_Z_INCHES]}
      style={{ pointerEvents: "auto", zIndex: 50 }}
    >
      <div
        className="flex items-center gap-2 rounded-lg border-2 border-cyan-400 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-lg"
        onPointerDown={stopPointerEvent}
        onPointerMove={stopPointerEvent}
        onPointerUp={stopPointerEvent}
      >
        <span>{bounds.length} selected</span>
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title="Delete selected"
          aria-label={deleteLabel}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Html>
  );
}
