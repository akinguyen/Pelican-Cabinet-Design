"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { getPlacedWallElevationSides } from "@/engine/walls/elevation/wallElevationGeometry";
import { formatInchesLabel } from "../../shared/formatInchesLabel";

export function WallElevationEdgeNavigator() {
  const activeEditorView = useDesignSceneStore((state) => state.activeEditorView);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeWallElevationEdgeIndex = useDesignSceneStore((state) => state.activeWallElevationEdgeIndex);
  const showPreviousWallElevationSide = useDesignSceneStore((state) => state.showPreviousWallElevationSide);
  const showNextWallElevationSide = useDesignSceneStore((state) => state.showNextWallElevationSide);

  if (activeEditorView !== "elevation") {
    return null;
  }

  const selectedPlacedWall = activeSelection?.kind === "placed-wall"
    ? placedWalls.find((placedWall) => placedWall.id === activeSelection.placedWallId) ?? null
    : null;

  if (selectedPlacedWall === null) {
    return (
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
        Select a wall to view its elevation sides.
      </div>
    );
  }

  const viewableSides = getPlacedWallElevationSides(selectedPlacedWall);

  if (viewableSides.length === 0) {
    return (
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
        No viewable edges are checked for this wall.
      </div>
    );
  }

  const activeViewableSide = viewableSides.find(
    (side) => side.edgeIndex === activeWallElevationEdgeIndex,
  ) ?? viewableSides[0];
  const activeViewableSideIndex = viewableSides.findIndex(
    (side) => side.edgeIndex === activeViewableSide.edgeIndex,
  );

  return (
    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 text-sm text-slate-700 shadow-sm">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        title="Previous wall side"
        onClick={showPreviousWallElevationSide}
      >
        <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
      </button>
      <div className="min-w-32 text-center">
        <div className="font-semibold text-slate-900">
          Side {activeViewableSideIndex + 1} / {viewableSides.length}
        </div>
        <div className="text-xs text-slate-500">
          Edge {activeViewableSide.edgeIndex + 1} - {formatInchesLabel(activeViewableSide.lengthInches)}
        </div>
      </div>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        title="Next wall side"
        onClick={showNextWallElevationSide}
      >
        <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
