"use client";

import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getActiveWallElevationSegmentNavigationItem,
  getWallElevationSegmentFace,
  getWallElevationSegmentNavigationItems,
} from "@/engine/walls/wallSegmentElevationNavigation";
import type { WallFaceSide } from "@/engine/walls/placedWallSegmentTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { formatInchesLabel } from "../../formatting/kitchenEditorLabelFormatting";

export function WallElevationNavigator() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const showPreviousWallElevationSegment = useCallback(() => {
    useDesignSceneStore.getState().showPreviousWallElevationSegment();
  }, []);
  const showNextWallElevationSegment = useCallback(() => {
    useDesignSceneStore.getState().showNextWallElevationSegment();
  }, []);
  const showPreviousWallElevationSide = useCallback(() => {
    useDesignSceneStore.getState().showPreviousWallElevationSide();
  }, []);
  const showNextWallElevationSide = useCallback(() => {
    useDesignSceneStore.getState().showNextWallElevationSide();
  }, []);

  if (activeSceneViewMode !== "elevation") {
    return null;
  }

  const navigationItems = getWallElevationSegmentNavigationItems(placedWallGraphs);

  if (navigationItems.length === 0) {
    return (
      <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-md border border-slate-200 bg-white/95 px-2 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
        No wall elevations available.
      </div>
    );
  }

  const activeItem = getActiveWallElevationSegmentNavigationItem({
    items: navigationItems,
    activeWallElevationTarget,
  });

  if (activeItem === null) {
    return null;
  }

  const activeFaceSide = activeWallElevationTarget?.faceSide ?? activeItem.preferredViewFaceSide;
  const activeFace = getWallElevationSegmentFace(activeItem, activeFaceSide);
  const isSingleWallSegment = navigationItems.length <= 1;

  return (
    <div className="absolute left-2 top-2 z-20 w-48 rounded-md border border-slate-200 bg-white/95 p-1.5 text-[11px] text-slate-700 shadow-sm">
      <NavigatorRow
        label={`Wall Segment ${activeItem.segmentIndex + 1} / ${activeItem.totalSegmentCount}`}
        previousTitle="Previous wall segment"
        nextTitle="Next wall segment"
        onPrevious={showPreviousWallElevationSegment}
        onNext={showNextWallElevationSegment}
        disabled={isSingleWallSegment}
      />
      <NavigatorRow
        label={`${formatFaceSideLabel(activeFaceSide)} - ${formatInchesLabel(activeFace.lengthInches)}`}
        previousTitle="Previous wall side"
        nextTitle="Next wall side"
        onPrevious={showPreviousWallElevationSide}
        onNext={showNextWallElevationSide}
        disabled={false}
      />
    </div>
  );
}

type NavigatorRowProps = Readonly<{
  label: string;
  previousTitle: string;
  nextTitle: string;
  onPrevious: () => void;
  onNext: () => void;
  disabled: boolean;
}>;

function NavigatorRow({
  label,
  previousTitle,
  nextTitle,
  onPrevious,
  onNext,
  disabled,
}: NavigatorRowProps) {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
        title={previousTitle}
        onClick={onPrevious}
        disabled={disabled}
      >
        <ChevronLeft aria-hidden="true" size={13} strokeWidth={2} />
      </button>
      <div className="min-w-0 flex-1 truncate text-center font-medium text-slate-900">
        {label}
      </div>
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
        title={nextTitle}
        onClick={onNext}
        disabled={disabled}
      >
        <ChevronRight aria-hidden="true" size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

function formatFaceSideLabel(faceSide: WallFaceSide): string {
  return faceSide === "side-a" ? "Side A" : "Side B";
}
