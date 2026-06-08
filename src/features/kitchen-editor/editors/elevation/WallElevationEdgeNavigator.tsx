"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { getActivePlacedWallElevationView, getPlacedWallElevationWallViews } from "@/engine/walls/elevation/wallElevationGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { formatInchesLabel } from "../../shared/formatInchesLabel";

export function WallElevationEdgeNavigator() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
  const activeWallElevationWallId = useDesignSceneStore((state) => state.activeWallElevationWallId);
  const activeWallElevationEdgeIndex = useDesignSceneStore((state) => state.activeWallElevationEdgeIndex);
  const setActiveWallElevationWall = useDesignSceneStore((state) => state.setActiveWallElevationWall);
  const showPreviousWallElevationSide = useDesignSceneStore((state) => state.showPreviousWallElevationSide);
  const showNextWallElevationSide = useDesignSceneStore((state) => state.showNextWallElevationSide);

  if (activeSceneViewMode !== "elevation") {
    return null;
  }

  const wallViews = getPlacedWallElevationWallViews(placedWalls);

  if (wallViews.length === 0) {
    return (
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
        {placedWalls.length === 0
          ? "No wall elevations available."
          : "No viewable wall edges selected."}
      </div>
    );
  }

  const activeElevationView = getActivePlacedWallElevationView({
    placedWalls,
    activeWallElevationWallId,
    activeWallElevationEdgeIndex,
  });

  if (activeElevationView === null) {
    return null;
  }

  const edgeCount = activeElevationView.wallView.viewableSides.length;
  const isSingleEdge = edgeCount <= 1;

  return (
    <div className="absolute left-3 top-3 w-64 rounded-lg border border-slate-200 bg-white/95 p-2 text-xs text-slate-700 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="w-9 shrink-0 font-semibold text-slate-500">Wall</span>
        <select
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          value={activeElevationView.wallView.placedWallId}
          onChange={(event) => setActiveWallElevationWall(event.target.value)}
        >
          {wallViews.map((wallView) => (
            <option key={wallView.placedWallId} value={wallView.placedWallId}>
              Wall {wallView.wallIndex + 1}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="w-9 shrink-0 font-semibold text-slate-500">Edge</span>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
          title="Previous wall edge"
          onClick={showPreviousWallElevationSide}
          disabled={isSingleEdge}
        >
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1 text-center font-medium text-slate-900">
          Edge {activeElevationView.sideIndex + 1} / {edgeCount}
          <span className="ml-1 font-normal text-slate-500">
            {formatInchesLabel(activeElevationView.side.lengthInches)}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
          title="Next wall edge"
          onClick={showNextWallElevationSide}
          disabled={isSingleEdge}
        >
          <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
