"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import { createWallElevationCameraFrame } from "@/engine/walls/wallElevationCameraFrame";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";
import type { WallOpeningDraftPointInches } from "@/engine/walls/openings/wallOpeningDraftTypes";

const WALL_OPENING_DRAFT_RECTANGLE_CLASS_NAME =
  "absolute border-2 border-dashed border-red-500 bg-red-500/10 shadow-[0_0_0_1px_rgba(255,255,255,0.6)]";

type ScreenPointPixels = Readonly<{
  xPixels: number;
  yPixels: number;
}>;

type WallOpeningScreenDraftPixels = Readonly<{
  startPixels: ScreenPointPixels;
  currentPixels: ScreenPointPixels;
}>;

export function WallOpeningScreenDraftLayer() {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [screenDraftPixels, setScreenDraftPixels] = useState<WallOpeningScreenDraftPixels | null>(null);
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const startWallOpeningDraft = useDesignSceneStore((state) => state.startWallOpeningDraft);
  const updateWallOpeningDraft = useDesignSceneStore((state) => state.updateWallOpeningDraft);
  const commitWallOpeningDraft = useDesignSceneStore((state) => state.commitWallOpeningDraft);
  const viewZone = useMemo(
    () => getWallElevationViewZoneForTarget({
      placedWallGraphs,
      activeWallElevationTarget,
    }),
    [activeWallElevationTarget, placedWallGraphs],
  );
  const canDrawWallOpening =
    canManuallyEditScene(workspaceMode) &&
    activeSceneViewMode === "elevation" &&
    activeToolbarTool === "draw-countertop-cutout-rectangle" &&
    activeWallElevationTarget !== null &&
    viewZone !== null;

  useEffect(() => {
    if (activeSceneOperation?.kind !== "wall-opening-draft") {
      setScreenDraftPixels(null);
    }
  }, [activeSceneOperation]);

  if (!canDrawWallOpening || viewZone === null) {
    return null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || layerRef.current === null || viewZone === null) {
      return;
    }

    const facePointInches = createWallOpeningFacePointFromPointer({
      event,
      layerElement: layerRef.current,
      viewZone,
    });
    const screenPointPixels = createScreenPointFromPointer({
      event,
      layerElement: layerRef.current,
    });

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setScreenDraftPixels({
      startPixels: screenPointPixels,
      currentPixels: screenPointPixels,
    });
    startWallOpeningDraft({
      wallGraphId: viewZone.wallGraphId,
      wallSegmentId: viewZone.wallSegmentId,
      faceSide: viewZone.faceSide,
      startFacePointInches: facePointInches,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      activeSceneOperation?.kind !== "wall-opening-draft" ||
      layerRef.current === null ||
      screenDraftPixels === null ||
      viewZone === null
    ) {
      return;
    }

    const facePointInches = createWallOpeningFacePointFromPointer({
      event,
      layerElement: layerRef.current,
      viewZone,
    });
    const currentPixels = createScreenPointFromPointer({
      event,
      layerElement: layerRef.current,
    });

    event.preventDefault();
    event.stopPropagation();
    setScreenDraftPixels({
      ...screenDraftPixels,
      currentPixels,
    });
    updateWallOpeningDraft(facePointInches);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeSceneOperation?.kind !== "wall-opening-draft") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setScreenDraftPixels(null);
    commitWallOpeningDraft();
  }

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 z-20 cursor-crosshair touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {screenDraftPixels === null ? null : (
        <div
          className={WALL_OPENING_DRAFT_RECTANGLE_CLASS_NAME}
          style={createDraftRectangleStyle(screenDraftPixels)}
        />
      )}
    </div>
  );
}

function createWallOpeningFacePointFromPointer(args: {
  event: ReactPointerEvent<HTMLDivElement>;
  layerElement: HTMLDivElement;
  viewZone: WallElevationViewZone;
}): WallOpeningDraftPointInches {
  const layerBoundsPixels = args.layerElement.getBoundingClientRect();
  const localPointPixels = createScreenPointFromPointer({
    event: args.event,
    layerElement: args.layerElement,
  });
  const cameraFrame = createWallElevationCameraFrame({
    viewZone: args.viewZone,
  });
  const normalizedX = localPointPixels.xPixels / layerBoundsPixels.width;
  const normalizedY = localPointPixels.yPixels / layerBoundsPixels.height;
  const cameraXInches = cameraFrame.leftInches +
    normalizedX * (cameraFrame.rightInches - cameraFrame.leftInches);
  const cameraZInches = cameraFrame.topInches -
    normalizedY * (cameraFrame.topInches - cameraFrame.bottomInches);

  return {
    xInchesAlongFace: cameraXInches + args.viewZone.faceLengthInches / 2,
    zInchesFromFloor: cameraZInches + args.viewZone.wallHeightInches / 2,
  };
}

function createScreenPointFromPointer(args: {
  event: ReactPointerEvent<HTMLDivElement>;
  layerElement: HTMLDivElement;
}): ScreenPointPixels {
  const layerBoundsPixels = args.layerElement.getBoundingClientRect();

  return {
    xPixels: args.event.clientX - layerBoundsPixels.left,
    yPixels: args.event.clientY - layerBoundsPixels.top,
  };
}

function createDraftRectangleStyle(
  screenDraftPixels: WallOpeningScreenDraftPixels,
): Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}> {
  const left = Math.min(screenDraftPixels.startPixels.xPixels, screenDraftPixels.currentPixels.xPixels);
  const top = Math.min(screenDraftPixels.startPixels.yPixels, screenDraftPixels.currentPixels.yPixels);
  const width = Math.abs(screenDraftPixels.currentPixels.xPixels - screenDraftPixels.startPixels.xPixels);
  const height = Math.abs(screenDraftPixels.currentPixels.yPixels - screenDraftPixels.startPixels.yPixels);

  return {
    left,
    top,
    width,
    height,
  };
}
