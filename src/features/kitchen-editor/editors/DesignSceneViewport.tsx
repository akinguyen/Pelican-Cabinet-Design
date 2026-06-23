"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { createWallElevationCameraFrame } from "@/engine/walls/wallElevationCameraFrame";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { ElevationViewPaddingMaskOverlay } from "./elevation/ElevationViewPaddingMaskOverlay";
import { createWallElevationPaddingMaskFramePixels } from "./elevation/elevationViewPaddingMaskFrame";
import type { Rect2DPixels, Size2DPixels } from "./elevation/elevationViewPaddingMaskFrame";
import { WallElevationNavigator } from "./elevation/WallElevationNavigator";
import { DesignSceneCanvas } from "./shared/scene-canvas/DesignSceneCanvas";
import { SceneEntityWallMeasurementLabelsOverlay } from "../rendering/scene-entities/SceneEntityWallMeasurementLabelsOverlay";

const ELEVATION_MASK_EXIT_TRANSITION_DURATION_MS = 160;

type OutgoingElevationMaskState = Readonly<{
  wallFaceFramePixels: Rect2DPixels;
  viewportSizePixels: Size2DPixels;
  isFadingOut: boolean;
}>;

export function DesignSceneViewport() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportSizePixels = useElementSizePixels(viewportRef);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const activeElevationViewZone = useMemo(
    () => getWallElevationViewZoneForTarget({
      placedWallGraphs,
      activeWallElevationTarget,
    }),
    [activeWallElevationTarget, placedWallGraphs],
  );
  const wallFaceFramePixels = useMemo(() => {
    if (activeSceneViewMode !== "elevation" || activeElevationViewZone === null) {
      return null;
    }

    return createWallElevationPaddingMaskFramePixels({
      cameraFrame: createWallElevationCameraFrame({
        viewZone: activeElevationViewZone,
        viewportWidthPixels: viewportSizePixels.widthPixels,
        viewportHeightPixels: viewportSizePixels.heightPixels,
      }),
      viewZone: activeElevationViewZone,
      viewportSizePixels,
    });
  }, [activeElevationViewZone, activeSceneViewMode, viewportSizePixels]);
  const outgoingElevationMask = useOutgoingElevationMask({
    activeSceneViewMode,
    viewportSizePixels,
    wallFaceFramePixels,
  });
  const clearSelection = useCallback(() => {
    useDesignSceneStore.getState().clearSelection();
  }, []);

  return (
    <div ref={viewportRef} className="relative h-full min-h-0">
      <DesignSceneCanvas />
      {outgoingElevationMask !== null ? (
        <ElevationViewPaddingMaskOverlay
          viewportSizePixels={outgoingElevationMask.viewportSizePixels}
          wallFaceFramePixels={outgoingElevationMask.wallFaceFramePixels}
          opacity={outgoingElevationMask.isFadingOut ? 0 : 1}
          isInteractive={false}
          transitionDurationMs={ELEVATION_MASK_EXIT_TRANSITION_DURATION_MS}
        />
      ) : null}
      {activeSceneViewMode === "elevation" ? (
        <ElevationViewPaddingMaskOverlay
          viewportSizePixels={viewportSizePixels}
          wallFaceFramePixels={wallFaceFramePixels}
          onEmptyPointerDown={clearSelection}
        />
      ) : null}
      {activeSceneViewMode === "elevation" ? (
        <SceneEntityWallMeasurementLabelsOverlay
          viewportSizePixels={viewportSizePixels}
          wallFaceFramePixels={wallFaceFramePixels}
        />
      ) : null}
      <WallElevationNavigator />
    </div>
  );
}

function useOutgoingElevationMask(args: {
  activeSceneViewMode: SceneViewMode;
  viewportSizePixels: Size2DPixels;
  wallFaceFramePixels: Rect2DPixels | null;
}): OutgoingElevationMaskState | null {
  const previousSceneViewModeRef = useRef<SceneViewMode>(args.activeSceneViewMode);
  const lastElevationMaskRef = useRef<Readonly<{
    wallFaceFramePixels: Rect2DPixels;
    viewportSizePixels: Size2DPixels;
  }> | null>(null);
  const [outgoingElevationMask, setOutgoingElevationMask] = useState<OutgoingElevationMaskState | null>(null);

  useEffect(() => {
    if (args.activeSceneViewMode === "elevation" && args.wallFaceFramePixels !== null) {
      lastElevationMaskRef.current = {
        wallFaceFramePixels: args.wallFaceFramePixels,
        viewportSizePixels: args.viewportSizePixels,
      };
      setOutgoingElevationMask(null);
    }
  }, [args.activeSceneViewMode, args.viewportSizePixels, args.wallFaceFramePixels]);

  useEffect(() => {
    const previousSceneViewMode = previousSceneViewModeRef.current;
    previousSceneViewModeRef.current = args.activeSceneViewMode;

    if (previousSceneViewMode !== "elevation" || args.activeSceneViewMode === "elevation") {
      return;
    }

    const lastElevationMask = lastElevationMaskRef.current;

    if (lastElevationMask === null) {
      return;
    }

    let animationFrameId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      setOutgoingElevationMask(null);
    }, ELEVATION_MASK_EXIT_TRANSITION_DURATION_MS);

    setOutgoingElevationMask({
      ...lastElevationMask,
      isFadingOut: false,
    });

    animationFrameId = window.requestAnimationFrame(() => {
      setOutgoingElevationMask((currentMask) => currentMask === null
        ? null
        : {
            ...currentMask,
            isFadingOut: true,
          });
    });

    return () => {
      window.clearTimeout(timeoutId);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [args.activeSceneViewMode]);

  return outgoingElevationMask;
}

function useElementSizePixels(elementRef: RefObject<HTMLElement | null>): Size2DPixels {
  const [sizePixels, setSizePixels] = useState<Size2DPixels>({
    widthPixels: 0,
    heightPixels: 0,
  });

  useEffect(() => {
    const element = elementRef.current;

    if (element === null) {
      return;
    }

    const observedElement = element;

    function updateSizePixels() {
      setSizePixels({
        widthPixels: observedElement.clientWidth,
        heightPixels: observedElement.clientHeight,
      });
    }

    updateSizePixels();

    const resizeObserver = new ResizeObserver(updateSizePixels);
    resizeObserver.observe(observedElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef]);

  return sizePixels;
}
