"use client";

import { Html } from "@react-three/drei";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Copy, Trash2 } from "lucide-react";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";

const EDIT_CONTROL_OFFSET_INCHES = 14;
const EDIT_CONTROL_Z_OFFSET_INCHES = 2;

type SceneEntityEditControlsProps = Readonly<{
  bounds: SceneEntityBounds | readonly SceneEntityBounds[];
  deleteLabel: string;
  onDelete: () => void;
  duplicateLabel?: string;
  onDuplicate?: () => void;
  selectedCountLabel?: string;
}>;

export function SceneEntityEditControls({
  bounds,
  duplicateLabel,
  deleteLabel,
  onDuplicate,
  onDelete,
  selectedCountLabel,
}: SceneEntityEditControlsProps) {
  const boundsList = Array.isArray(bounds) ? bounds : [bounds];

  if (boundsList.length === 0) {
    return null;
  }

  const anchorPointInches = createSceneEntityEditControlAnchor(boundsList);

  if (anchorPointInches === null) {
    return null;
  }

  function stopPointerEvent(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  const controlClassName = selectedCountLabel === undefined
    ? "flex items-center gap-1 rounded-lg border-2 border-cyan-400 bg-white px-2 py-1 shadow-lg"
    : "flex items-center gap-2 rounded-lg border-2 border-cyan-400 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-lg";

  return (
    <Html
      center
      position={[anchorPointInches.xInches, anchorPointInches.yInches, anchorPointInches.zInches]}
      style={{ pointerEvents: "auto", zIndex: 50 }}
    >
      <div
        className={controlClassName}
        onPointerDown={stopPointerEvent}
        onPointerMove={stopPointerEvent}
        onPointerUp={stopPointerEvent}
      >
        {selectedCountLabel !== undefined ? <span>{selectedCountLabel}</span> : null}
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

function createSceneEntityEditControlAnchor(
  boundsList: readonly SceneEntityBounds[],
): { xInches: number; yInches: number; zInches: number } | null {
  if (boundsList.length === 0) {
    return null;
  }

  const footprintPoints = boundsList.flatMap((bounds) => bounds.footprintCornersInches);
  const topPoints = boundsList.flatMap((bounds) => bounds.topCornersInches);

  if (footprintPoints.length === 0 || topPoints.length === 0) {
    return null;
  }

  const minXInches = Math.min(...footprintPoints.map((pointInches) => pointInches.xInches));
  const maxXInches = Math.max(...footprintPoints.map((pointInches) => pointInches.xInches));
  const minYInches = Math.min(...footprintPoints.map((pointInches) => pointInches.yInches));
  const maxZInches = Math.max(...topPoints.map((pointInches) => pointInches.zInches));

  return {
    xInches: (minXInches + maxXInches) / 2,
    yInches: minYInches - EDIT_CONTROL_OFFSET_INCHES,
    zInches: maxZInches + EDIT_CONTROL_Z_OFFSET_INCHES,
  };
}
