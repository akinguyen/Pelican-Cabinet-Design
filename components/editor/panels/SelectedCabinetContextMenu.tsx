"use client";

import { Trash2 } from "lucide-react";
import type { Point } from "../types";

type SelectedCabinetContextMenuProps = {
  position: Point;
  onDelete: () => void;
  onDragStart: (
    event: React.PointerEvent<HTMLDivElement>,
    startPosition: Point
  ) => void;
  onDragMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function SelectedCabinetContextMenu({
  position,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: SelectedCabinetContextMenuProps) {
  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={82}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[74px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected cabinet menu"
          className="flex w-6 shrink-0 cursor-grab items-center justify-center bg-[#0fb8d2] active:cursor-grabbing"
          onPointerDown={(event) => onDragStart(event, position)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex flex-col gap-1">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>

        <button
          type="button"
          aria-label="Delete selected cabinet"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </foreignObject>
  );
}
