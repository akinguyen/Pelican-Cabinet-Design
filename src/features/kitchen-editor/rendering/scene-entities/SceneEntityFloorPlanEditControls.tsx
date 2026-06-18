"use client";

import { Html } from "@react-three/drei";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Copy, Trash2 } from "lucide-react";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";

const EDIT_CONTROL_Z_INCHES = 12;

type SceneEntityFloorPlanEditControlsProps = Readonly<{
  bounds: SceneEntityBounds;
  deleteLabel: string;
  onDelete: () => void;
  duplicateLabel?: string;
  onDuplicate?: () => void;
}>;

export function SceneEntityFloorPlanEditControls({
  bounds,
  duplicateLabel,
  deleteLabel,
  onDuplicate,
  onDelete,
}: SceneEntityFloorPlanEditControlsProps) {
  const topYInches = Math.min(...bounds.footprintCornersInches.map((pointInches) => pointInches.yInches));
  const centerXInches = bounds.footprint.centerPointInches.xInches;

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
        className="flex items-center gap-1 rounded-lg border-2 border-cyan-400 bg-white px-2 py-1 shadow-lg"
        onPointerDown={stopPointerEvent}
        onPointerMove={stopPointerEvent}
        onPointerUp={stopPointerEvent}
      >
        {onDuplicate !== undefined && duplicateLabel !== undefined ? (
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-700"
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate"
            aria-label={duplicateLabel}
          >
            <Copy className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title="Delete"
          aria-label={deleteLabel}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Html>
  );
}
