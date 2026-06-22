"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { createWallElevationCameraFrame } from "@/engine/walls/wallElevationCameraFrame";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { ElevationViewPaddingMaskOverlay } from "./elevation/ElevationViewPaddingMaskOverlay";
import { createWallElevationPaddingMaskFramePixels } from "./elevation/elevationViewPaddingMaskFrame";
import type { Size2DPixels } from "./elevation/elevationViewPaddingMaskFrame";
import { WallElevationNavigator } from "./elevation/WallElevationNavigator";
import { DesignSceneCanvas } from "./shared/scene-canvas/DesignSceneCanvas";
import { SceneEntityWallMeasurementLabelsOverlay } from "../rendering/scene-entities/SceneEntityWallMeasurementLabelsOverlay";

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
  const clearSelection = useCallback(() => {
    useDesignSceneStore.getState().clearSelection();
  }, []);

  return (
    <div ref={viewportRef} className="relative h-full min-h-0">
      <DesignSceneCanvas />
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
