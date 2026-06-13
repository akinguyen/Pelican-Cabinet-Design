"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { getWallSegmentElevationFaces } from "@/engine/walls/wallSegmentElevation";
import type { WallSegmentFace } from "@/engine/walls/wallSegmentTopologyTypes";
import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { formatInchesLabel } from "../../shared/formatInchesLabel";

export function WallElevationFaceNavigator() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const showPreviousWallElevationFace = useDesignSceneStore((state) => state.showPreviousWallElevationFace);
  const showNextWallElevationFace = useDesignSceneStore((state) => state.showNextWallElevationFace);

  if (activeSceneViewMode !== "elevation") {
    return null;
  }

  const faces = placedWallGraphs.flatMap((wallGraph) => getWallSegmentElevationFaces(buildConnectedWallGeometry(wallGraph)));

  if (faces.length === 0) {
    return (
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
        No wall elevations available.
      </div>
    );
  }

  const activeFace = getActiveWallSegmentElevationFaceFromFaces({ faces, activeWallElevationTarget });

  if (activeFace === null) {
    return null;
  }

  const activeFaceIndex = Math.max(0, faces.findIndex((face) => face.id === activeFace.id));
  const isSingleFace = faces.length <= 1;

  return (
    <div className="absolute left-3 top-3 w-72 rounded-lg border border-slate-200 bg-white/95 p-2 text-xs text-slate-700 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 font-semibold text-slate-500">Face</span>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
          title="Previous elevation face"
          onClick={showPreviousWallElevationFace}
          disabled={isSingleFace}
        >
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1 text-center font-medium text-slate-900">
          Segment {activeFaceIndex + 1} / {faces.length}
          <span className="ml-1 font-normal text-slate-500">
            {activeFace.side} · {formatInchesLabel(activeFace.lengthInches)}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
          title="Next elevation face"
          onClick={showNextWallElevationFace}
          disabled={isSingleFace}
        >
          <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}


function getActiveWallSegmentElevationFaceFromFaces(args: {
  faces: readonly WallSegmentFace[];
  activeWallElevationTarget: WallElevationTarget | null;
}): WallSegmentFace | null {
  if (args.faces.length === 0) {
    return null;
  }

  if (args.activeWallElevationTarget === null) {
    return args.faces[0];
  }

  return args.faces.find((face) => (
    face.wallGraphId === args.activeWallElevationTarget?.wallGraphId &&
    face.wallSegmentId === args.activeWallElevationTarget.wallSegmentId &&
    face.side === args.activeWallElevationTarget.faceSide
  )) ?? args.faces[0];
}
